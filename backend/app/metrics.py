"""Business metrics for the revenue funnel: signups -> searches -> paywall -> paid.

Everything excludes the admin account (it owns the SEO field and demo runs).
"""
from __future__ import annotations

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import and_, distinct, exists, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import config
from app.db.models import LLMUsage, PassPurchase, Project, Run, RunPaper, SearchUsage, User
from app.quota import SEARCH_WINDOW, get_limit


def _completed(run_id_col):
    """A search completed when its papers were linked, i.e. it produced a map."""
    return exists().where(RunPaper.run_id == run_id_col)


async def business_metrics(session: AsyncSession, days: int = 7, now: datetime | None = None) -> dict[str, Any]:
    now = now or datetime.now(timezone.utc)
    since = now - timedelta(days=days)
    admin = config.settings.super_user_email
    customer = User.email != admin

    async def scalar(query) -> int:
        return int((await session.execute(query)).scalar() or 0)

    users_total = await scalar(select(func.count()).select_from(User).where(customer))
    new_user_ids = select(User.user_id).where(customer, User.created_at >= since)
    signups = await scalar(select(func.count()).select_from(new_user_ids.subquery()))

    customer_ids = select(User.user_id).where(customer)
    searches = await scalar(
        select(func.count()).select_from(SearchUsage)
        .where(SearchUsage.created_at >= since, SearchUsage.user_id.in_(customer_ids))
    )
    searchers = await scalar(
        select(func.count(distinct(SearchUsage.user_id)))
        .where(SearchUsage.created_at >= since, SearchUsage.user_id.in_(customer_ids))
    )

    customer_runs = (
        select(Run.run_id)
        .join(Project, Project.project_id == Run.project_id)
        .where(Project.user_id.in_(customer_ids), Run.created_at >= since)
    )
    runs_started = await scalar(select(func.count()).select_from(customer_runs.subquery()))
    runs_completed = await scalar(
        select(func.count()).select_from(customer_runs.where(_completed(Run.run_id)).subquery())
    )
    # Started over an hour ago and still no map: failed or abandoned
    runs_failed = await scalar(
        select(func.count()).select_from(
            customer_runs.where(Run.created_at < now - timedelta(hours=1), ~_completed(Run.run_id)).subquery()
        )
    )

    # Activation: new users whose first searches actually produced a map
    activated = await scalar(
        select(func.count(distinct(Project.user_id)))
        .join(Run, Run.project_id == Project.project_id)
        .where(Project.user_id.in_(new_user_ids), _completed(Run.run_id))
    )

    # Paywall: free users who used their whole weekly allowance
    subscribed_now = and_(User.pro_until.is_not(None), User.pro_until > now)
    pass_now = and_(User.pass_until.is_not(None), User.pass_until > now)
    pro_now = or_(subscribed_now, pass_now)
    free_limit = get_limit("free_user", "searches_per_week")
    recent = (
        select(SearchUsage.user_id)
        .where(SearchUsage.created_at >= now - SEARCH_WINDOW)
        .group_by(SearchUsage.user_id)
        .having(func.count() >= free_limit)
    )
    at_limit = await scalar(
        select(func.count()).select_from(User).where(customer, ~pro_now, User.user_id.in_(recent))
    )

    # Subscribers and admin-granted Pro both run on pro_until; passes on pass_until
    pro_users = (await session.execute(
        select(User.subscription_status, User.subscription_interval_months, User.subscription_amount_cents,
               User.paddle_subscription_id)
        .where(customer, subscribed_now)
    )).all()
    pass_only = await scalar(
        select(func.count()).select_from(User)
        .where(customer, pass_now, or_(User.pro_until.is_(None), User.pro_until <= now))
    )
    pass_rows = (await session.execute(
        select(PassPurchase.earnings_usd_cents)
        .join(User, User.user_id == PassPurchase.user_id)
        .where(customer, PassPurchase.created_at >= since, PassPurchase.refunded_at.is_(None))
    )).all()
    mrr_cents = sum(
        cents / months for _, months, cents, _ in pro_users if months and cents is not None
    )
    churned = await scalar(
        select(func.count()).select_from(User)
        .where(customer, User.subscription_status == "canceled", User.paddle_event_at >= since)
    )

    # AI cost: customer searches started in the window vs everything else (SEO builds, admin, unattributed)
    price_in = config.settings.llm_price_input_per_mtok / 1_000_000
    price_out = config.settings.llm_price_output_per_mtok / 1_000_000

    async def ai_cost(*where) -> float:
        row = (await session.execute(
            select(func.coalesce(func.sum(LLMUsage.prompt_tokens), 0),
                   func.coalesce(func.sum(LLMUsage.completion_tokens), 0)).where(*where)
        )).one()
        return row[0] * price_in + row[1] * price_out

    customer_run_ids = customer_runs.subquery()
    completed_run_ids = customer_runs.where(_completed(Run.run_id)).subquery()
    ai_cost_searches = await ai_cost(LLMUsage.run_id.in_(select(customer_run_ids.c.run_id)))
    ai_cost_completed = await ai_cost(LLMUsage.run_id.in_(select(completed_run_ids.c.run_id)))
    admin_runs = (
        select(Run.run_id)
        .join(Project, Project.project_id == Run.project_id)
        .where(Project.user_id.not_in(customer_ids))
    )
    ai_cost_other = await ai_cost(
        LLMUsage.created_at >= since,
        LLMUsage.run_id.is_(None) | LLMUsage.run_id.in_(admin_runs),
    )

    # Channels: signups and activations in the window, and everyone paying now, by the
    # first-touch source recorded at signup ("unknown" for accounts made before tracking)
    source = func.coalesce(User.signup_source, "unknown")
    by_source: dict[str, dict[str, int]] = {}

    def add(rows, key: str) -> None:
        for name, count in rows:
            by_source.setdefault(name, {"signups": 0, "activated": 0, "paying": 0})[key] = count

    add((await session.execute(
        select(source, func.count()).where(customer, User.created_at >= since).group_by(source)
    )).all(), "signups")
    add((await session.execute(
        select(source, func.count(distinct(User.user_id)))
        .join(Project, Project.user_id == User.user_id)
        .join(Run, Run.project_id == Project.project_id)
        .where(User.user_id.in_(new_user_ids), _completed(Run.run_id))
        .group_by(source)
    )).all(), "activated")
    add((await session.execute(
        select(source, func.count())
        .where(customer, or_(and_(subscribed_now, User.paddle_subscription_id.is_not(None)), pass_now))
        .group_by(source)
    )).all(), "paying")

    def rate(part: int, whole: int) -> float | None:
        return round(part / whole, 3) if whole else None

    return {
        "window_days": days,
        "as_of": now.isoformat(),
        "users_total": users_total,
        "signups": signups,
        "activated_signups": activated,
        "activation_rate": rate(activated, signups),
        "searches": searches,
        "searchers": searchers,
        "runs_started": runs_started,
        "runs_completed": runs_completed,
        "runs_failed": runs_failed,
        "run_completion_rate": rate(runs_completed, runs_started),
        "free_users_at_limit": at_limit,
        "pro_active": len(pro_users) + pass_only,
        "pro_monthly": sum(1 for _, m, _, _ in pro_users if m == 1),
        "pro_quarterly": sum(1 for _, m, _, _ in pro_users if m == 3),
        "pro_canceling": sum(1 for s, _, _, _ in pro_users if s == "canceled"),
        # Pro granted by the admin, without a paid subscription
        "pro_comp": sum(1 for *_, sub in pro_users if not sub),
        # One-time 3-month passes: holders without a subscription, and sales in the window
        "pro_pass": pass_only,
        "pass_sales": len(pass_rows),
        "pass_earnings_usd": round(sum(c or 0 for (c,) in pass_rows) / 100, 2),
        # Refunds Paddle has not decided yet; flag the ones waiting over a day
        "pass_refunds_pending": await scalar(
            select(func.count()).select_from(PassPurchase).where(PassPurchase.refund_status == "pending_approval")
        ),
        "pass_refunds_pending_over_24h": await scalar(
            select(func.count()).select_from(PassPurchase).where(
                PassPurchase.refund_status == "pending_approval",
                PassPurchase.refund_requested_at < now - timedelta(hours=24),
            )
        ),
        "mrr_usd": round(mrr_cents / 100, 2),
        "churned": churned,
        "ai_cost_searches_usd": round(ai_cost_searches, 4),
        "ai_cost_per_completed_search_usd": round(ai_cost_completed / runs_completed, 4) if runs_completed else None,
        "ai_cost_other_usd": round(ai_cost_other, 4),
        "by_source": [
            {"source": name, **counts}
            for name, counts in sorted(by_source.items(), key=lambda kv: (-kv[1]["signups"], -kv[1]["paying"], kv[0]))
        ],
    }
