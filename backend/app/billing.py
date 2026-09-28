"""Paddle Billing integration: webhook verification, subscription sync, customer portal."""
from __future__ import annotations

import hashlib
import hmac
import logging
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

repo_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(repo_root))

import config
from app.db.models import User

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


def apply_subscription(user: User, data: dict[str, Any], occurred_at: datetime | None, now: datetime | None = None) -> bool:
    """Update a user's plan from a Paddle subscription entity. Returns False if the event was stale."""
    if occurred_at and user.paddle_event_at and occurred_at < user.paddle_event_at:
        return False

    status = data.get("status")
    period = data.get("current_billing_period") or {}
    period_end = _parse_time(period.get("ends_at"))

    user.subscription_status = status
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


async def handle_event(session: AsyncSession, event: dict[str, Any]) -> str:
    """Apply a verified webhook event. Returns a short outcome string for logging."""
    event_type = event.get("event_type", "")
    data = event.get("data") or {}
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
