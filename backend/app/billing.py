"""Paddle Billing integration: webhook verification, subscription sync, customer portal."""
from __future__ import annotations

import hashlib
import hmac
import logging
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import httpx
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

repo_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(repo_root))

import config
from app.db.models import PassPurchase, User

logger = logging.getLogger(__name__)

SIGNATURE_TOLERANCE_SECONDS = 300
# Statuses in which the customer keeps access until the end of the current billing period
ACCESS_STATUSES = {"active", "trialing", "past_due"}


def api_base_url() -> str:
    if config.settings.paddle_environment == "production":
        return "https://api.paddle.com"
    return "https://sandbox-api.paddle.com"


def verify_signature(raw_body: bytes, header: str | None, secret: str, now: float | None = None) -> bool:
    """Verify a Paddle-Signature header ("ts=...;h1=...")."""
    if not header or not secret:
        return False
    parts: dict[str, list[str]] = {}
    for item in header.split(";"):
        key, sep, value = item.partition("=")
        if sep:
            parts.setdefault(key.strip(), []).append(value.strip())
    ts_values = parts.get("ts")
    signatures = parts.get("h1")
    if not ts_values or not signatures:
        return False
    ts = ts_values[0]
    try:
        if abs((now or time.time()) - int(ts)) > SIGNATURE_TOLERANCE_SECONDS:
            return False
    except ValueError:
        return False
    expected = hmac.new(secret.encode(), f"{ts}:".encode() + raw_body, hashlib.sha256).hexdigest()
    return any(hmac.compare_digest(expected, sig) for sig in signatures)


def _parse_time(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


async def _find_user(session: AsyncSession, data: dict[str, Any]) -> User | None:
    """Locate the user a subscription belongs to: custom_data.user_id first, then Paddle IDs."""
    user_id = (data.get("custom_data") or {}).get("user_id")
    if user_id:
        user = await session.get(User, user_id)
        if user:
            return user
    conditions = []
    if data.get("id"):
        conditions.append(User.paddle_subscription_id == data["id"])
    if data.get("customer_id"):
        conditions.append(User.paddle_customer_id == data["customer_id"])
    if not conditions:
        return None
    result = await session.execute(select(User).where(or_(*conditions)))
    return result.scalars().first()


def _price(data: dict[str, Any]) -> tuple[int | None, int | None]:
    """Billing period in months and price per period in cents, from a subscription entity."""
    cycle = data.get("billing_cycle") or {}
    per_unit = {"month": 1, "year": 12}.get(cycle.get("interval"))
    if not per_unit:
        return None, None
    months = per_unit * int(cycle.get("frequency") or 1)
    cents = 0
    for item in data.get("items") or []:
        amount = ((item.get("price") or {}).get("unit_price") or {}).get("amount")
        if amount is not None:
            cents += int(amount) * int(item.get("quantity") or 1)
    return months, cents


def apply_subscription(user: User, data: dict[str, Any], occurred_at: datetime | None, now: datetime | None = None) -> bool:
    """Update a user's plan from a Paddle subscription entity. Returns False if the event was stale."""
    if occurred_at and user.paddle_event_at and occurred_at < user.paddle_event_at:
        return False

    status = data.get("status")
    period = data.get("current_billing_period") or {}
    period_end = _parse_time(period.get("ends_at"))

    user.subscription_status = status
    months, amount_cents = _price(data)
    if months:
        user.subscription_interval_months = months
        user.subscription_amount_cents = amount_cents
    user.paddle_subscription_id = data.get("id") or user.paddle_subscription_id
    user.paddle_customer_id = data.get("customer_id") or user.paddle_customer_id

    if status in ACCESS_STATUSES and period_end:
        user.pro_until = period_end
    elif status in ("canceled", "paused"):
        ended = _parse_time(data.get("canceled_at") or data.get("paused_at")) or now or datetime.now(timezone.utc)
        if user.pro_until is None or ended < user.pro_until:
            user.pro_until = ended

    if occurred_at:
        user.paddle_event_at = occurred_at
    return True


def pass_days(data: dict[str, Any]) -> int:
    """Days of Pro a one-time transaction buys: prices carry custom_data.pass_days (0 = not a pass)."""
    if data.get("subscription_id"):
        return 0
    days = 0
    for item in data.get("items") or []:
        price = item.get("price") or {}
        if price.get("billing_cycle"):
            continue
        try:
            per_unit = int((price.get("custom_data") or {}).get("pass_days") or 0)
        except (TypeError, ValueError):
            per_unit = 0
        days += per_unit * int(item.get("quantity") or 1)
    return days


def _cents(value: Any) -> int | None:
    try:
        return int(value) if value is not None else None
    except (TypeError, ValueError):
        return None


async def apply_pass_purchase(session: AsyncSession, data: dict[str, Any], now: datetime | None = None) -> str:
    """Extend a user's Pro pass for a completed one-time transaction (once per transaction)."""
    days = pass_days(data)
    if not days:
        return "not a pass"
    transaction_id = data.get("id")
    if not transaction_id:
        return "no transaction id"
    details = data.get("details") or {}
    payout = details.get("payout_totals") or {}
    earnings = _cents(payout.get("earnings")) if payout.get("currency_code") == "USD" else None
    existing = await session.get(PassPurchase, transaction_id)
    if existing is not None:
        # transaction.paid grants access first; transaction.completed later brings the final payout figures
        if existing.earnings_usd_cents is None and earnings is not None:
            existing.earnings_usd_cents = earnings
        return "duplicate"
    user = await _find_user(session, {"custom_data": data.get("custom_data"), "customer_id": data.get("customer_id")})
    if user is None:
        logger.warning("Paddle pass %s: no matching user", transaction_id)
        return "no user"

    now = now or datetime.now(timezone.utc)
    start = user.pass_until if user.pass_until and user.pass_until > now else now
    user.pass_until = start + timedelta(days=days)
    user.paddle_customer_id = user.paddle_customer_id or data.get("customer_id")
    totals = details.get("totals") or {}
    session.add(PassPurchase(
        transaction_id=transaction_id,
        user_id=user.user_id,
        days=days,
        currency=data.get("currency_code"),
        amount_cents=_cents(totals.get("total")),
        earnings_usd_cents=earnings,
        created_at=now,
    ))
    logger.info("Paddle pass %s: +%d days for user %s (pass_until=%s)", transaction_id, days, user.user_id, user.pass_until)
    return "pass applied"


async def apply_pass_refund(session: AsyncSession, data: dict[str, Any], now: datetime | None = None) -> str:
    """Track a pass refund through Paddle's review; take the days back once a full refund is approved."""
    if data.get("action") != "refund":
        return "not a refund"
    purchase = await session.get(PassPurchase, data.get("transaction_id") or "")
    if purchase is None:
        return "not a pass"
    if purchase.refunded_at is not None:
        return "duplicate"
    now = now or datetime.now(timezone.utc)
    status = data.get("status")
    if status != "approved":
        # pending_approval (access kept while Paddle reviews), rejected or reversed
        purchase.refund_status = status
        if status == "pending_approval" and purchase.refund_requested_at is None:
            purchase.refund_requested_at = _parse_time(data.get("created_at")) or now
        return f"refund {status}"
    if data.get("type") != "full":
        purchase.refund_status = "approved_partial"
        logger.warning("Paddle partial refund on pass %s: access left unchanged", purchase.transaction_id)
        return "partial refund"
    purchase.refund_status = "approved"
    purchase.refunded_at = now
    user = await session.get(User, purchase.user_id)
    if user is not None and user.pass_until is not None:
        remaining = user.pass_until - timedelta(days=purchase.days)
        user.pass_until = remaining if remaining > now else now
    logger.info("Paddle pass %s refunded: -%d days for user %s", purchase.transaction_id, purchase.days, purchase.user_id)
    return "pass refunded"


async def handle_event(session: AsyncSession, event: dict[str, Any]) -> str:
    """Apply a verified webhook event. Returns a short outcome string for logging."""
    event_type = event.get("event_type", "")
    data = event.get("data") or {}
    # "paid" arrives as soon as the payment is captured (WeChat Pay: minutes before "completed")
    if event_type in ("transaction.paid", "transaction.completed"):
        outcome = await apply_pass_purchase(session, data)
        await session.commit()
        return outcome
    if event_type in ("adjustment.created", "adjustment.updated"):
        outcome = await apply_pass_refund(session, data)
        await session.commit()
        return outcome
    if not event_type.startswith("subscription."):
        return f"ignored {event_type}"

    user = await _find_user(session, data)
    if user is None:
        logger.warning("Paddle %s for subscription %s: no matching user", event_type, data.get("id"))
        return "no user"

    applied = apply_subscription(user, data, _parse_time(event.get("occurred_at")))
    await session.commit()
    outcome = "applied" if applied else "stale"
    logger.info("Paddle %s for user %s: %s (status=%s, pro_until=%s)",
                event_type, user.user_id, outcome, user.subscription_status, user.pro_until)
    return outcome


async def create_portal_url(customer_id: str, subscription_id: str | None) -> str:
    """Create a Paddle customer portal session and return its URL."""
    settings = config.settings
    if not settings.paddle_api_key:
        raise RuntimeError("PADDLE_API_KEY not configured")
    body = {"subscription_ids": [subscription_id]} if subscription_id else {}
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            f"{api_base_url()}/customers/{customer_id}/portal-sessions",
            headers={"Authorization": f"Bearer {settings.paddle_api_key}"},
            json=body,
        )
        resp.raise_for_status()
    return resp.json()["data"]["urls"]["general"]["overview"]
