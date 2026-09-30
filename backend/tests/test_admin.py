"""Admin console: user list, account actions and their effect on quotas (in-memory SQLite)."""
from __future__ import annotations

import asyncio
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import config
from app import quota
from app.admin import AdminActionError, apply_action, list_users, recent_actions, recent_searches, user_detail
from app.db.models import AdminAction, Base, LLMUsage, PassPurchase, Project, Run, RunPaper, SearchUsage, User, UserActivity

NOW = datetime(2026, 9, 29, 12, 0, tzinfo=timezone.utc)
ADMIN = "admin@example.com"


@pytest.fixture(autouse=True)
def settings(monkeypatch):
    monkeypatch.setattr(config.settings, "super_user_email", ADMIN)
    monkeypatch.setattr(config.settings, "llm_price_input_per_mtok", 2.0)
    monkeypatch.setattr(config.settings, "llm_price_output_per_mtok", 10.0)
    monkeypatch.setattr(quota, "_now", lambda: NOW)


def user(uid, days_ago=10, email=None, **kw):
    return User(user_id=uid, email=email or f"{uid}@example.com", password_hash="x",
                created_at=NOW - timedelta(days=days_ago), **kw)


def search(uid, i, days_ago):
    return SearchUsage(user_id=uid, run_id=f"s-{uid}-{i}", created_at=NOW - timedelta(days=days_ago))


def run(rid, owner, days_ago=1, papers=0):
    rows = [
        Project(project_id=f"p-{rid}", user_id=owner, name="p", created_at=NOW - timedelta(days=days_ago)),
        Run(run_id=rid, project_id=f"p-{rid}", description=f"topic {rid}", created_at=NOW - timedelta(days=days_ago)),
    ]
    rows += [RunPaper(run_id=rid, pmid=str(1000 + i)) for i in range(papers)]
    return rows


def with_db(rows, fn):
    async def go():
        engine = create_async_engine("sqlite+aiosqlite://")
        tables = [t.__table__ for t in (User, SearchUsage, Project, Run, RunPaper, LLMUsage, UserActivity, AdminAction, PassPurchase)]
        async with engine.begin() as conn:
            await conn.run_sync(lambda c: Base.metadata.create_all(c, tables=tables))
        async with async_sessionmaker(engine, expire_on_commit=False)() as session:
            session.add_all(rows)
            await session.commit()
            result = await fn(session)
        await engine.dispose()
        return result
    return asyncio.run(go())


def test_list_users_shows_plan_and_usage():
    rows = [
        user("alice", days_ago=1),
        user("bob", days_ago=5, pro_until=NOW + timedelta(days=20), paddle_subscription_id="sub_1",
             subscription_status="active"),
        user("root", days_ago=90, email=ADMIN),
        search("alice", 0, 1), search("alice", 1, 3), search("alice", 2, 10),
        *run("r1", "alice", papers=3), *run("r2", "alice"),
        LLMUsage(run_id="r1", model="m", prompt_tokens=1_000_000, completion_tokens=100_000),
        UserActivity(user_id="alice", last_active_at=NOW - timedelta(minutes=3)),
    ]
    result = with_db(rows, lambda s: list_users(s, now=NOW))
    assert result["total"] == 3
    by_id = {u["user_id"]: u for u in result["users"]}
    assert [u["user_id"] for u in result["users"]] == ["alice", "bob", "root"]  # newest first

    alice = by_id["alice"]
    assert alice["plan"] == "free" and alice["search_limit"] == 2
    assert alice["searches_in_window"] == 2 and alice["searches_total"] == 3
    assert alice["runs_total"] == 2 and alice["runs_completed"] == 1
    assert alice["ai_cost_usd"] == pytest.approx(3.0)  # $2 input + $1 output
    assert alice["last_active_at"].startswith("2026-09-29T11:57")

    assert by_id["bob"]["plan"] == "pro" and by_id["bob"]["has_subscription"]
    assert by_id["root"]["tier"] == "super_user" and by_id["root"]["search_limit"] == -1


def test_list_users_filters():
    def rows():  # fresh objects per database
        return [
            user("alice", days_ago=1),
            user("bob", pro_until=NOW + timedelta(days=1)),
            user("carol", pro_until=NOW - timedelta(days=1), disabled_at=NOW - timedelta(days=2)),
        ]

    def ids(**kw):
        return sorted(u["user_id"] for u in with_db(rows(), lambda s: list_users(s, now=NOW, **kw))["users"])

    assert ids(plan="pro") == ["bob"]
    assert ids(plan="free") == ["alice", "carol"]
    assert ids(plan="disabled") == ["carol"]
    assert ids(q="ALI") == ["alice"]


def test_grant_pro_extends_and_logs():
    async def fn(s):
        first = await apply_action(s, "root", "alice", "grant_pro", days=30, note="beta tester", now=NOW)
        second = await apply_action(s, "root", "alice", "grant_pro", days=10, now=NOW)
        return first, second, await recent_actions(s)

    first, second, log = with_db([user("alice")], fn)
    assert first["user"]["plan"] == "pro"
    assert second["user"]["pro_until"].startswith("2026-11-08")  # 30 + 10 days, stacked
    assert [a["action"] for a in log] == ["grant_pro", "grant_pro"]
    assert log[1]["detail"]["note"] == "beta tester" and log[0]["target_email"] == "alice@example.com"


def test_revoke_pro_refuses_live_subscription():
    rows = [
        user("paid", pro_until=NOW + timedelta(days=20), paddle_subscription_id="sub", subscription_status="active"),
        user("comp", pro_until=NOW + timedelta(days=20)),
    ]

    async def fn(s):
        with pytest.raises(AdminActionError, match="Paddle"):
            await apply_action(s, "root", "paid", "revoke_pro", now=NOW)
        return await apply_action(s, "root", "comp", "revoke_pro", now=NOW)

    assert with_db(rows, fn)["user"]["plan"] == "free"


@pytest.mark.parametrize("action,kw", [
    ("grant_pro", {"days": 0}),
    ("set_search_limit", {"limit": -5}),
    ("enable", {}),
    ("bogus", {}),
])
def test_invalid_actions_are_refused_and_not_logged(action, kw):
    async def fn(s):
        with pytest.raises(AdminActionError):
            await apply_action(s, "root", "alice", action, now=NOW, **kw)
        return await recent_actions(s)

    assert with_db([user("alice")], fn) == []


def test_admin_account_cannot_be_disabled():
    async def fn(s):
        with pytest.raises(AdminActionError):
            await apply_action(s, "root", "root", "disable", now=NOW)

    with_db([user("root", email=ADMIN)], fn)


def test_search_limit_override_and_quota_reset():
    rows = [user("alice"), search("alice", 0, 2), search("alice", 1, 1)]

    async def fn(s):
        alice = await s.get(User, "alice")
        blocked = await quota.check_can_start_search(s, alice)
        await apply_action(s, "root", "alice", "reset_quota", now=NOW)
        after_reset = await quota.check_can_start_search(s, alice)
        summary = await quota.get_usage_summary(s, alice)
        await apply_action(s, "root", "alice", "set_search_limit", limit=0, now=NOW)
        zero = await quota.check_can_start_search(s, alice)
        await apply_action(s, "root", "alice", "set_search_limit", limit=None, now=NOW)
        return blocked, after_reset, summary, zero, alice.search_limit_override

    blocked, after_reset, summary, zero, override = with_db(rows, fn)
    assert blocked[0] is False
    assert after_reset[0] is True and summary["searches"]["used"] == 0
    assert zero[0] is False
    assert override is None


def test_disable_enable_and_verify():
    async def fn(s):
        disabled = await apply_action(s, "root", "alice", "disable", now=NOW)
        enabled = await apply_action(s, "root", "alice", "enable", now=NOW)
        verified = await apply_action(s, "root", "alice", "verify_email", now=NOW)
        return disabled, enabled, verified

    disabled, enabled, verified = with_db([user("alice")], fn)
    assert disabled["user"]["disabled"] and not enabled["user"]["disabled"]
    assert verified["user"]["email_verified"]
    assert [a["action"] for a in verified["actions"]] == ["verify_email", "enable", "disable"]


def test_user_detail_and_recent_searches():
    rows = [
        user("alice"), user("root", email=ADMIN),
        *run("r1", "alice", days_ago=2, papers=2), *run("r2", "alice", days_ago=1), *run("seo", "root"),
        LLMUsage(run_id="r2", model="m", prompt_tokens=500_000, completion_tokens=0),
    ]

    async def fn(s):
        return await user_detail(s, "alice", NOW), await user_detail(s, "nobody", NOW), await recent_searches(s)

    detail, missing, searches = with_db(rows, fn)
    assert missing is None
    assert [r["run_id"] for r in detail["runs"]] == ["r2", "r1"]
    assert detail["runs"][1]["papers"] == 2 and detail["runs"][1]["completed"]
    assert detail["runs"][0]["ai_cost_usd"] == pytest.approx(1.0)
    assert {r["run_id"] for r in searches} == {"r1", "r2"}  # admin/SEO runs left out
