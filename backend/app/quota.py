"""Plan tiers and usage limits."""
from __future__ import annotations

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

# Add repo root to path to import config
repo_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(repo_root))

import config
from app.db.models import SearchUsage, User

SEARCH_WINDOW = timedelta(days=7)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def get_user_tier(user: User, now: datetime | None = None) -> str:
    """Return 'super_user', 'pro_user' or 'free_user' for a user."""
    settings = config.settings
    if user.email.lower().strip() == settings.super_user_email.lower().strip():
        return "super_user"
    now = now or _now()
    if any(until is not None and until > now for until in (user.pro_until, user.pass_until)):
        return "pro_user"
    return settings.default_user_tier


def _latest(*dates: datetime | None) -> str | None:
    present = [d for d in dates if d is not None]
    return max(present).isoformat() if present else None


def get_limit(tier: str, name: str) -> int:
    """Limit for a tier (-1 = unlimited). Raises KeyError for unknown tier/limit."""
    return config.settings.USER_QUOTAS[tier][name]


def get_search_limit(user: User, now: datetime | None = None) -> int:
    """Weekly search limit for this user: an admin override, else the plan's (-1 = unlimited)."""
    if user.search_limit_override is not None:
        return user.search_limit_override
    return get_limit(get_user_tier(user, now), "searches_per_week")


async def searches_in_window(session: AsyncSession, user: User, now: datetime | None = None) -> list[datetime]:
    """Start times of the user's searches in the current rolling window, oldest first.

    Searches before an admin quota reset don't count.
    """
    since = (now or _now()) - SEARCH_WINDOW
    if user.quota_reset_at is not None and user.quota_reset_at > since:
        since = user.quota_reset_at
    result = await session.execute(
        select(SearchUsage.created_at)
        .where(SearchUsage.user_id == user.user_id, SearchUsage.created_at > since)
        .order_by(SearchUsage.created_at)
    )
    return [row[0] for row in result.all()]


async def check_can_start_search(session: AsyncSession, user: User) -> tuple[bool, str | None]:
    """Whether the user may start another custom search now."""
    limit = get_search_limit(user)
    if limit == -1:
        return True, None
    used = len(await searches_in_window(session, user))
    if used >= limit:
        return False, config.settings.QUOTA_ERROR_MESSAGES["searches_per_week"]
    return True, None


async def record_search(session: AsyncSession, user_id: str, run_id: str) -> None:
    """Log a started search. Caller commits."""
    session.add(SearchUsage(user_id=user_id, run_id=run_id))


def next_slot_time(starts: list[datetime], limit: int) -> datetime | None:
    """When the next search becomes available if the user is at the limit, else None.

    A slot frees up 7 days after the search that must age out first — usually the
    oldest, but a later one if the user has more searches than the limit (downgrade).
    """
    if limit < 1 or len(starts) < limit:  # unlimited (-1), no searches allowed (0), or not at limit
        return None
    return starts[len(starts) - limit] + SEARCH_WINDOW


async def get_usage_summary(session: AsyncSession, user: User) -> dict:
    """Plan and search usage for the account/quota UI."""
    now = _now()
    tier = get_user_tier(user, now)
    limit = get_search_limit(user, now)
    starts = await searches_in_window(session, user, now)
    unlimited = limit == -1
    remaining = -1 if unlimited else max(0, limit - len(starts))
    next_slot_at = next_slot_time(starts, limit)
    return {
        "tier": tier,
        "plan": "pro" if tier in ("pro_user", "super_user") else "free",
        # When Pro ends: the later of the subscription period and any one-time pass
        "pro_until": _latest(user.pro_until, user.pass_until),
        "pass_until": user.pass_until.isoformat() if user.pass_until and user.pass_until > now else None,
        "has_subscription": bool(user.paddle_subscription_id) and user.subscription_status in ("active", "trialing", "past_due"),
        "subscription_status": user.subscription_status,
        "searches": {
            "limit": limit,
            "used": len(starts),
            "remaining": remaining,
            "unlimited": unlimited,
            "window_days": SEARCH_WINDOW.days,
            "next_slot_at": next_slot_at.isoformat() if next_slot_at else None,
        },
        "list_limit": get_limit(tier, "list_limit"),
        "can_export": tier in ("pro_user", "super_user"),
    }


def check_paper_limit(user: User, paper_count: int) -> tuple[bool, str | None]:
    """Whether a run's retrieved paper count is within the user's plan."""
    limit = get_limit(get_user_tier(user), "max_papers_per_run")
    if limit != -1 and paper_count >= limit:
        return False, config.settings.QUOTA_ERROR_MESSAGES["max_papers_per_run"]
    return True, None
