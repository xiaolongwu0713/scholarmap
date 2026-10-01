"""Admin console: look up users, change their plan and search quota, and review recent searches.

Every change is written to the admin_actions audit log.
"""
from __future__ import annotations

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import config
from app.db.models import AdminAction, LLMUsage, PassPurchase, Project, Run, RunPaper, SearchUsage, User, UserActivity
from app.quota import SEARCH_WINDOW, get_search_limit, get_user_tier

ACTIONS = ("grant_pro", "revoke_pro", "set_search_limit", "reset_quota", "disable", "enable", "verify_email",
           "mark_test", "unmark_test")
# Paddle states in which the subscription will keep extending pro_until
LIVE_SUBSCRIPTION = ("active", "trialing", "past_due")


class AdminActionError(ValueError):
    """An admin action that can't be applied; the message is shown to the admin."""


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    if dt.tzinfo is None:  # SQLite drops the timezone
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def _aware(dt: datetime | None) -> datetime | None:
    return dt.replace(tzinfo=timezone.utc) if dt is not None and dt.tzinfo is None else dt


def _llm_cost(prompt: int, completion: int) -> float:
    s = config.settings
    return (prompt * s.llm_price_input_per_mtok + completion * s.llm_price_output_per_mtok) / 1_000_000


def _normalize(user: User) -> None:
    """Give datetimes loaded from SQLite back their UTC timezone so comparisons work."""
    for name in ("pro_until", "pass_until", "quota_reset_at", "disabled_at", "created_at"):
        setattr(user, name, _aware(getattr(user, name)))


def _user_row(user: User, now: datetime, window: list[datetime]) -> dict[str, Any]:
    tier = get_user_tier(user, now)
    limit = get_search_limit(user, now)
    return {
        "user_id": user.user_id,
        "email": user.email,
        "created_at": _iso(user.created_at),
        "email_verified": user.email_verified,
        "tier": tier,
        "plan": "pro" if tier in ("pro_user", "super_user") else "free",
        "pro_until": _iso(user.pro_until),
        "pass_until": _iso(user.pass_until),
        "subscription_status": user.subscription_status,
        "has_subscription": bool(user.paddle_subscription_id),
        "subscription_amount_cents": user.subscription_amount_cents,
        "subscription_interval_months": user.subscription_interval_months,
        "disabled": user.disabled_at is not None,
        "disabled_at": _iso(user.disabled_at),
        "is_test": bool(user.is_test),
        "search_limit": limit,
        "search_limit_override": user.search_limit_override,
        "quota_reset_at": _iso(user.quota_reset_at),
        "searches_in_window": len(window),
    }


async def _window_searches(session: AsyncSession, users: list[User], now: datetime) -> dict[str, list[datetime]]:
    """Searches that count toward each user's current weekly quota (after any reset)."""
    ids = [u.user_id for u in users]
    out: dict[str, list[datetime]] = {i: [] for i in ids}
    if not ids:
        return out
    rows = (await session.execute(
        select(SearchUsage.user_id, SearchUsage.created_at)
        .where(SearchUsage.user_id.in_(ids), SearchUsage.created_at > now - SEARCH_WINDOW)
    )).all()
    reset = {u.user_id: u.quota_reset_at for u in users}
    for uid, created in rows:
        created = _aware(created)
        if reset[uid] is None or created > reset[uid]:
            out[uid].append(created)
    return out


async def list_users(
    session: AsyncSession,
    q: str = "",
    plan: str = "all",
    limit: int = 50,
    offset: int = 0,
    now: datetime | None = None,
) -> dict[str, Any]:
    """One page of users, newest first, with their usage."""
    now = now or _now()
    admin = config.settings.super_user_email
    where = []
    if q.strip():
        where.append(User.email.ilike(f"%{q.strip()}%"))
    if plan == "pro":
        where.append(or_(User.email == admin, User.pro_until > now, User.pass_until > now))
    elif plan == "free":
        # Spelled out rather than negated: NOT on a NULL date would drop never-paid users
        where.append(
            (User.email != admin)
            & or_(User.pro_until.is_(None), User.pro_until <= now)
            & or_(User.pass_until.is_(None), User.pass_until <= now)
        )
    elif plan == "disabled":
        where.append(User.disabled_at.is_not(None))

    total = int((await session.execute(select(func.count()).select_from(User).where(*where))).scalar() or 0)
    users = list((await session.execute(
        select(User).where(*where).order_by(User.created_at.desc()).limit(limit).offset(offset)
    )).scalars())
    for u in users:
        _normalize(u)
    ids = [u.user_id for u in users]

    async def per_user(query) -> dict[str, Any]:
        if not ids:
            return {}
        return {row[0]: row[1:] for row in (await session.execute(query)).all()}

    searches_total = await per_user(
        select(SearchUsage.user_id, func.count()).where(SearchUsage.user_id.in_(ids)).group_by(SearchUsage.user_id)
    )
    runs = await per_user(
        select(Project.user_id, func.count(Run.run_id))
        .join(Run, Run.project_id == Project.project_id)
        .where(Project.user_id.in_(ids)).group_by(Project.user_id)
    )
    completed = await per_user(
        select(Project.user_id, func.count(func.distinct(RunPaper.run_id)))
        .join(Run, Run.project_id == Project.project_id)
        .join(RunPaper, RunPaper.run_id == Run.run_id)
        .where(Project.user_id.in_(ids)).group_by(Project.user_id)
    )
    cost = await per_user(
        select(Project.user_id, func.sum(LLMUsage.prompt_tokens), func.sum(LLMUsage.completion_tokens))
        .join(Run, Run.project_id == Project.project_id)
        .join(LLMUsage, LLMUsage.run_id == Run.run_id)
        .where(Project.user_id.in_(ids)).group_by(Project.user_id)
    )
    active = await per_user(select(UserActivity.user_id, UserActivity.last_active_at).where(UserActivity.user_id.in_(ids)))
    window = await _window_searches(session, users, now)

    rows = []
    for u in users:
        row = _user_row(u, now, window[u.user_id])
        prompt, completion = cost.get(u.user_id, (0, 0))
        row.update({
            "searches_total": int(searches_total.get(u.user_id, (0,))[0]),
            "runs_total": int(runs.get(u.user_id, (0,))[0]),
            "runs_completed": int(completed.get(u.user_id, (0,))[0]),
            "ai_cost_usd": round(_llm_cost(prompt or 0, completion or 0), 4),
            "last_active_at": _iso(active.get(u.user_id, (None,))[0]),
        })
        rows.append(row)
    return {"total": total, "users": rows}


async def _runs(session: AsyncSession, where, limit: int) -> list[dict[str, Any]]:
    """Recent runs with owner, whether they produced a map, paper count and AI cost."""
    runs = (await session.execute(
        select(Run.run_id, Run.project_id, Run.description, Run.created_at, User.user_id, User.email)
        .join(Project, Project.project_id == Run.project_id)
        .join(User, User.user_id == Project.user_id, isouter=True)
        .where(*where)
        .order_by(Run.created_at.desc())
        .limit(limit)
    )).all()
    ids = [r.run_id for r in runs]
    papers: dict[str, int] = {}
    cost: dict[str, float] = {}
    if ids:
        papers = dict((await session.execute(
            select(RunPaper.run_id, func.count()).where(RunPaper.run_id.in_(ids)).group_by(RunPaper.run_id)
        )).all())
        for rid, p, c in (await session.execute(
            select(LLMUsage.run_id, func.sum(LLMUsage.prompt_tokens), func.sum(LLMUsage.completion_tokens))
            .where(LLMUsage.run_id.in_(ids)).group_by(LLMUsage.run_id)
        )).all():
            cost[rid] = _llm_cost(p or 0, c or 0)
    return [
        {
            "run_id": r.run_id,
            "project_id": r.project_id,
            "user_id": r.user_id,
            "email": r.email,
            "description": (r.description or "")[:300],
            "created_at": _iso(r.created_at),
            "papers": int(papers.get(r.run_id, 0)),
            "completed": r.run_id in papers,
            "ai_cost_usd": round(cost.get(r.run_id, 0.0), 4),
        }
        for r in runs
    ]


async def recent_searches(session: AsyncSession, limit: int = 50, include_admin: bool = False) -> list[dict[str, Any]]:
    where = [] if include_admin else [User.email != config.settings.super_user_email]
    return await _runs(session, where, limit)


async def recent_actions(session: AsyncSession, limit: int = 50, target_user_id: str | None = None) -> list[dict[str, Any]]:
    where = [AdminAction.target_user_id == target_user_id] if target_user_id else []
    actions = list((await session.execute(
        select(AdminAction).where(*where).order_by(AdminAction.created_at.desc(), AdminAction.id.desc()).limit(limit)
    )).scalars())
    ids = {a.target_user_id for a in actions if a.target_user_id}
    emails = dict((await session.execute(select(User.user_id, User.email).where(User.user_id.in_(ids)))).all()) if ids else {}
    return [
        {
            "id": a.id,
            "action": a.action,
            "target_user_id": a.target_user_id,
            "target_email": emails.get(a.target_user_id),
            "detail": a.detail,
            "created_at": _iso(a.created_at),
        }
        for a in actions
    ]


async def user_detail(session: AsyncSession, user_id: str, now: datetime | None = None) -> dict[str, Any] | None:
    now = now or _now()
    user = await session.get(User, user_id)
    if user is None:
        return None
    _normalize(user)
    window = await _window_searches(session, [user], now)
    passes = (await session.execute(
        select(PassPurchase).where(PassPurchase.user_id == user_id).order_by(PassPurchase.created_at.desc())
    )).scalars()
    return {
        "user": _user_row(user, now, window[user_id]),
        "passes": [
            {
                "transaction_id": p.transaction_id,
                "created_at": _iso(p.created_at),
                "days": p.days,
                "currency": p.currency,
                "amount_cents": p.amount_cents,
                "refund_status": p.refund_status,
                "refund_requested_at": _iso(p.refund_requested_at),
                "refunded_at": _iso(p.refunded_at),
            }
            for p in passes
        ],
        "runs": await _runs(session, [Project.user_id == user_id], 50),
        "actions": await recent_actions(session, 30, target_user_id=user_id),
    }


async def apply_action(
    session: AsyncSession,
    admin_user_id: str,
    user_id: str,
    action: str,
    days: int | None = None,
    limit: int | None = None,
    note: str | None = None,
    now: datetime | None = None,
) -> dict[str, Any]:
    """Change one user account and log it. Raises AdminActionError when the change isn't allowed."""
    now = now or _now()
    if action not in ACTIONS:
        raise AdminActionError(f"Unknown action: {action}")
    user = await session.get(User, user_id)
    if user is None:
        raise AdminActionError("User not found")
    _normalize(user)
    is_admin = user.email.lower().strip() == config.settings.super_user_email.lower().strip()
    detail: dict[str, Any] = {}

    if action == "grant_pro":
        if days is None or not 1 <= days <= 3650:
            raise AdminActionError("Days must be between 1 and 3650")
        start = user.pro_until if user.pro_until and user.pro_until > now else now
        detail = {"days": days, "before": _iso(user.pro_until)}
        user.pro_until = start + timedelta(days=days)
        detail["after"] = _iso(user.pro_until)
    elif action == "revoke_pro":
        if user.paddle_subscription_id and user.subscription_status in LIVE_SUBSCRIPTION:
            raise AdminActionError(
                "This user has a live Paddle subscription, which would restore Pro at the next renewal. "
                "Cancel the subscription in Paddle instead."
            )
        active = [d for d in (user.pro_until, user.pass_until) if d and d > now]
        if not active:
            raise AdminActionError("This user doesn't have Pro")
        # Ends admin-granted Pro and any one-time pass (refund the pass in Paddle separately)
        detail = {"before": _iso(user.pro_until), "pass_before": _iso(user.pass_until)}
        if user.pro_until and user.pro_until > now:
            user.pro_until = now
        if user.pass_until and user.pass_until > now:
            user.pass_until = now
    elif action == "set_search_limit":
        if limit is not None and not -1 <= limit <= 10000:
            raise AdminActionError("Limit must be -1 (unlimited), 0 or a positive number up to 10000")
        detail = {"before": user.search_limit_override, "after": limit}
        user.search_limit_override = limit
    elif action == "reset_quota":
        detail = {"before": _iso(user.quota_reset_at)}
        user.quota_reset_at = now
    elif action == "disable":
        if is_admin:
            raise AdminActionError("The admin account can't be disabled")
        if user.disabled_at is not None:
            raise AdminActionError("Already disabled")
        user.disabled_at = now
    elif action == "enable":
        if user.disabled_at is None:
            raise AdminActionError("This account isn't disabled")
        user.disabled_at = None
    elif action == "verify_email":
        if user.email_verified:
            raise AdminActionError("Email is already verified")
        user.email_verified = True
    elif action == "mark_test":
        if user.is_test:
            raise AdminActionError("Already marked as a test account")
        user.is_test = True
    elif action == "unmark_test":
        if not user.is_test:
            raise AdminActionError("This isn't marked as a test account")
        user.is_test = False

    if note:
        detail["note"] = note[:500]
    session.add(AdminAction(admin_user_id=admin_user_id, target_user_id=user_id, action=action,
                            detail=detail or None, created_at=now))
    await session.commit()
    result = await user_detail(session, user_id, now)
    assert result is not None
    return result
