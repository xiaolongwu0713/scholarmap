"""Business metrics against a real (in-memory SQLite) database."""
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
from app.db.models import Base, LLMUsage, PassPurchase, Project, Run, RunPaper, SearchUsage, User
from app.metrics import business_metrics

NOW = datetime(2026, 9, 29, 12, 0, tzinfo=timezone.utc)
ADMIN = "admin@example.com"


def user(uid, created_days_ago=30, **kw):
    return User(user_id=uid, email=f"{uid}@example.com", password_hash="x",
                created_at=NOW - timedelta(days=created_days_ago), **kw)


def run(rid, owner, days_ago=1):
    return [
        Project(project_id=f"p-{rid}", user_id=owner, name="p", created_at=NOW - timedelta(days=days_ago)),
        Run(run_id=rid, project_id=f"p-{rid}", description="d", created_at=NOW - timedelta(days=days_ago)),
    ]


def searches(uid, n, days_ago=1):
    return [SearchUsage(user_id=uid, run_id=f"s-{uid}-{i}", created_at=NOW - timedelta(days=days_ago))
            for i in range(n)]


async def compute(rows):
    engine = create_async_engine("sqlite+aiosqlite://")
    tables = [t.__table__ for t in (User, SearchUsage, Project, Run, RunPaper, LLMUsage, PassPurchase)]
    async with engine.begin() as conn:
        await conn.run_sync(lambda c: Base.metadata.create_all(c, tables=tables))
    async with async_sessionmaker(engine)() as session:
        session.add_all(rows)
        await session.commit()
        result = await business_metrics(session, days=7, now=NOW)
    await engine.dispose()
    return result


@pytest.fixture(autouse=True)
def admin_email(monkeypatch):
    monkeypatch.setattr(config.settings, "super_user_email", ADMIN)
    monkeypatch.setattr(config.settings, "llm_price_input_per_mtok", 2.0)
    monkeypatch.setattr(config.settings, "llm_price_output_per_mtok", 10.0)


def usage(run_id, prompt, completion):
    return LLMUsage(run_id=run_id, model="m", prompt_tokens=prompt, completion_tokens=completion,
                    created_at=NOW - timedelta(hours=2))


def test_funnel_counts():
    rows = [
        # Admin: excluded from everything
        User(user_id="admin", email=ADMIN, password_hash="x", created_at=NOW),
        *run("seo", "admin"), RunPaper(run_id="seo", pmid="1"), *searches("admin", 5),
        # New user whose search produced a map (activated), at the free limit
        user("new1", created_days_ago=2), *run("r1", "new1"), RunPaper(run_id="r1", pmid="1"),
        *searches("new1", 2),
        # New user whose search never finished
        user("new2", created_days_ago=3), *run("r2", "new2"), *searches("new2", 1),
        # Old monthly Pro user and a quarterly one who is canceling
        user("pro1", pro_until=NOW + timedelta(days=20), subscription_status="active",
             subscription_interval_months=1, subscription_amount_cents=2000),
        user("pro2", pro_until=NOW + timedelta(days=50), subscription_status="canceled",
             subscription_interval_months=3, subscription_amount_cents=5000,
             paddle_event_at=NOW - timedelta(days=1)),
        # Expired Pro: counts as free, not in MRR
        user("old", pro_until=NOW - timedelta(days=1), subscription_status="past_due",
             subscription_interval_months=1, subscription_amount_cents=2000),
    ]
    rows += [
        usage("r1", 1_000_000, 100_000),   # completed customer search: $2 + $1
        usage("r2", 500_000, 0),           # failed customer search: $1
        usage("seo", 1_000_000, 0),        # admin/SEO build: $2 (other)
        usage(None, 0, 100_000),           # unattributed call: $1 (other)
    ]
    m = asyncio.run(compute(rows))
    assert m["ai_cost_searches_usd"] == pytest.approx(4.0)
    assert m["ai_cost_per_completed_search_usd"] == pytest.approx(3.0)
    assert m["ai_cost_other_usd"] == pytest.approx(3.0)
    assert m["users_total"] == 5
    assert m["signups"] == 2
    assert (m["activated_signups"], m["activation_rate"]) == (1, 0.5)
    assert (m["searches"], m["searchers"]) == (3, 2)
    assert (m["runs_started"], m["runs_completed"], m["runs_failed"]) == (2, 1, 1)
    assert m["free_users_at_limit"] == 1
    assert (m["pro_active"], m["pro_monthly"], m["pro_quarterly"], m["pro_canceling"]) == (2, 1, 1, 1)
    assert m["mrr_usd"] == pytest.approx(20 + 50 / 3, abs=0.01)
    assert m["churned"] == 1


def test_empty_database_has_no_rates():
    m = asyncio.run(compute([]))
    assert m["signups"] == 0 and m["activation_rate"] is None and m["mrr_usd"] == 0


def test_breaks_signups_activation_and_paying_down_by_source():
    paid_until = NOW + timedelta(days=20)
    rows = [
        user("x1", created_days_ago=2, signup_source="xiaohongshu"),
        user("x2", created_days_ago=3, signup_source="xiaohongshu"),
        user("g1", created_days_ago=1, signup_source="google.com"),
        # Signed up before the window but paying now
        user("old", created_days_ago=60, signup_source="reddit", pro_until=paid_until,
             paddle_subscription_id="sub_1", subscription_status="active"),
        # Before attribution existed
        user("legacy", created_days_ago=4),
        *run("r1", "x1"),
        RunPaper(run_id="r1", pmid="1"),
    ]
    by_source = {row["source"]: row for row in asyncio.run(compute(rows))["by_source"]}
    assert by_source["xiaohongshu"] == {"source": "xiaohongshu", "signups": 2, "activated": 1, "paying": 0}
    assert by_source["google.com"]["signups"] == 1
    assert by_source["reddit"] == {"source": "reddit", "signups": 0, "activated": 0, "paying": 1}
    assert by_source["unknown"]["signups"] == 1


def test_test_accounts_are_left_out():
    paid_until = NOW + timedelta(days=20)
    rows = [
        user("real", created_days_ago=2), *run("r1", "real"), RunPaper(run_id="r1", pmid="1"),
        user("tester", created_days_ago=1, is_test=True, pro_until=paid_until, paddle_subscription_id="sub_t",
             subscription_status="active", subscription_interval_months=1, subscription_amount_cents=2000),
        *run("r2", "tester"), *searches("tester", 3),
        PassPurchase(transaction_id="txn_t", user_id="tester", days=90, earnings_usd_cents=4749,
                     created_at=NOW - timedelta(days=1)),
    ]
    m = asyncio.run(compute(rows))
    assert m["users_total"] == 1 and m["signups"] == 1
    assert m["runs_started"] == 1 and m["searches"] == 0
    assert m["pro_active"] == 0 and m["mrr_usd"] == 0
    assert m["pass_sales"] == 0
