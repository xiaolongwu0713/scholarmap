"""One-time Pro passes: Paddle transaction.completed grants days, full refunds take them back."""
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
from app.billing import apply_pass_purchase, apply_pass_refund, apply_subscription, handle_event, pass_days
from app.db.models import AdminAction, Base, LLMUsage, PassPurchase, Project, Run, RunPaper, SearchUsage, User
from app.metrics import business_metrics

NOW = datetime(2026, 9, 30, 12, 0, tzinfo=timezone.utc)


@pytest.fixture(autouse=True)
def settings(monkeypatch):
    monkeypatch.setattr(config.settings, "super_user_email", "admin@example.com")
    monkeypatch.setattr(quota, "_now", lambda: NOW)


def txn(tid="txn_1", user_id="u1", days="90", quantity=1, subscription_id=None, earnings="4210"):
    return {
        "id": tid,
        "customer_id": "ctm_1",
        "subscription_id": subscription_id,
        "currency_code": "CNY",
        "custom_data": {"user_id": user_id},
        "items": [{"quantity": quantity, "price": {"id": "pri_pass", "billing_cycle": None, "custom_data": {"pass_days": days}}}],
        "details": {"totals": {"total": "34900"}, "payout_totals": {"earnings": earnings, "currency_code": "USD"}},
    }


def refund(tid="txn_1", kind="full", status="approved"):
    return {"id": "adj_1", "action": "refund", "type": kind, "status": status, "transaction_id": tid}


def aware(dt):
    return dt.replace(tzinfo=timezone.utc) if dt is not None and dt.tzinfo is None else dt


def with_db(rows, fn):
    async def go():
        engine = create_async_engine("sqlite+aiosqlite://")
        tables = [t.__table__ for t in (User, PassPurchase, SearchUsage, Project, Run, RunPaper, LLMUsage, AdminAction)]
        async with engine.begin() as conn:
            await conn.run_sync(lambda c: Base.metadata.create_all(c, tables=tables))
        async with async_sessionmaker(engine, expire_on_commit=False)() as session:
            session.add_all(rows)
            await session.commit()
            result = await fn(session)
        await engine.dispose()
        return result
    return asyncio.run(go())


def new_user(**kw):
    return User(user_id="u1", email="u1@example.com", password_hash="x", created_at=NOW - timedelta(days=5), **kw)


def test_pass_days_only_for_one_time_pass_prices():
    assert pass_days(txn()) == 90
    assert pass_days(txn(quantity=2)) == 180
    assert pass_days(txn(subscription_id="sub_1")) == 0  # a subscription renewal, handled by subscription events
    assert pass_days(txn(days="")) == 0
    assert pass_days(txn(days="abc")) == 0


def test_purchase_grants_90_days_once_and_records_it():
    async def fn(s):
        first = await apply_pass_purchase(s, txn(), NOW)
        again = await apply_pass_purchase(s, txn(), NOW)  # webhook retry
        await s.commit()
        user = await s.get(User, "u1")
        purchase = await s.get(PassPurchase, "txn_1")
        return first, again, aware(user.pass_until), user.paddle_customer_id, quota.get_user_tier(user, NOW), purchase

    first, again, until, customer, tier, purchase = with_db([new_user()], fn)
    assert (first, again) == ("pass applied", "duplicate")
    assert until == NOW + timedelta(days=90)
    assert customer == "ctm_1" and tier == "pro_user"
    assert (purchase.currency, purchase.amount_cents, purchase.earnings_usd_cents) == ("CNY", 34900, 4210)


def test_second_pass_stacks_on_remaining_time():
    async def fn(s):
        await apply_pass_purchase(s, txn("txn_1"), NOW)
        await apply_pass_purchase(s, txn("txn_2"), NOW + timedelta(days=10))
        return aware((await s.get(User, "u1")).pass_until)

    assert with_db([new_user()], fn) == NOW + timedelta(days=180)


def test_expired_pass_restarts_from_now():
    async def fn(s):
        await apply_pass_purchase(s, txn(), NOW)
        return aware((await s.get(User, "u1")).pass_until)

    assert with_db([new_user(pass_until=NOW - timedelta(days=3))], fn) == NOW + timedelta(days=90)


def test_subscription_cancel_does_not_cut_a_pass():
    async def fn(s):
        await apply_pass_purchase(s, txn(), NOW)
        user = await s.get(User, "u1")
        apply_subscription(user, {"id": "sub_1", "status": "canceled", "canceled_at": NOW.isoformat()}, NOW)
        return quota.get_user_tier(user, NOW + timedelta(days=30)), await quota.get_usage_summary(s, user)

    tier, summary = with_db([new_user()], fn)
    assert tier == "pro_user"
    assert summary["pass_until"].startswith("2026-12-29") and summary["pro_until"].startswith("2026-12-29")
    assert summary["has_subscription"] is False


def test_unknown_user_is_not_recorded():
    async def fn(s):
        outcome = await apply_pass_purchase(s, txn(user_id="ghost") | {"customer_id": "ctm_other"}, NOW)
        return outcome, await s.get(PassPurchase, "txn_1")

    assert with_db([new_user()], fn) == ("no user", None)


def test_full_refund_takes_the_days_back_once():
    async def fn(s):
        await apply_pass_purchase(s, txn("txn_1"), NOW)
        await apply_pass_purchase(s, txn("txn_2"), NOW)
        pending = await apply_pass_refund(s, refund(status="pending_approval"), NOW)
        done = await apply_pass_refund(s, refund(), NOW + timedelta(days=1))
        again = await apply_pass_refund(s, refund(), NOW + timedelta(days=1))
        return pending, done, again, aware((await s.get(User, "u1")).pass_until)

    pending, done, again, until = with_db([new_user()], fn)
    assert (pending, done, again) == ("refund pending_approval", "pass refunded", "duplicate")
    assert until == NOW + timedelta(days=90)  # the other pass remains


def test_refund_never_ends_before_now_and_partial_refund_keeps_access():
    async def fn(s):
        await apply_pass_purchase(s, txn(), NOW)
        partial = await apply_pass_refund(s, refund(kind="partial"), NOW)
        full = await apply_pass_refund(s, refund(), NOW + timedelta(days=30))
        user = await s.get(User, "u1")
        return partial, full, aware(user.pass_until), quota.get_user_tier(user, NOW + timedelta(days=31))

    partial, full, until, tier = with_db([new_user()], fn)
    assert (partial, full) == ("partial refund", "pass refunded")
    assert until == NOW + timedelta(days=30) and tier == "free_user"


def test_handle_event_routes_transactions_and_adjustments():
    async def fn(s):
        bought = await handle_event(s, {"event_type": "transaction.completed", "data": txn()})
        renewal = await handle_event(s, {"event_type": "transaction.completed", "data": txn("txn_9", subscription_id="sub_1")})
        refunded = await handle_event(s, {"event_type": "adjustment.updated", "data": refund()})
        other = await handle_event(s, {"event_type": "customer.created", "data": {}})
        return bought, renewal, refunded, other

    assert with_db([new_user()], fn) == ("pass applied", "not a pass", "pass refunded", "ignored customer.created")


def test_metrics_count_pass_holders_and_sales():
    rows = [
        new_user(),
        User(user_id="u2", email="u2@example.com", password_hash="x", created_at=NOW - timedelta(days=40),
             pro_until=NOW + timedelta(days=10), paddle_subscription_id="sub_2", subscription_status="active",
             subscription_interval_months=1, subscription_amount_cents=2000),
    ]

    async def fn(s):
        await apply_pass_purchase(s, txn(), NOW - timedelta(days=1))
        await apply_pass_purchase(s, txn("txn_2", user_id="u2"), NOW - timedelta(days=2))  # subscriber also bought a pass
        await apply_pass_purchase(s, txn("txn_old", earnings="999"), NOW - timedelta(days=30))  # outside the window
        await s.commit()
        return await business_metrics(s, days=7, now=NOW)

    m = with_db(rows, fn)
    assert m["pro_active"] == 2 and m["pro_monthly"] == 1 and m["pro_pass"] == 1 and m["pro_comp"] == 0
    assert m["pass_sales"] == 2 and m["pass_earnings_usd"] == 84.2
    assert m["mrr_usd"] == 20.0


def test_paid_grants_access_and_completed_only_fills_in_earnings():
    async def fn(s):
        paid = txn(earnings=None)
        paid["details"]["payout_totals"] = None  # not known yet when the payment is captured
        first = await handle_event(s, {"event_type": "transaction.paid", "data": paid})
        second = await handle_event(s, {"event_type": "transaction.completed", "data": txn()})
        user = await s.get(User, "u1")
        return first, second, aware(user.pass_until), (await s.get(PassPurchase, "txn_1")).earnings_usd_cents

    first, second, until, earnings = with_db([new_user()], fn)
    assert (first, second) == ("pass applied", "duplicate")
    assert until is not None and earnings == 4210


def test_refund_review_is_tracked_and_reported():
    async def fn(s):
        await apply_pass_purchase(s, txn("txn_1"), NOW - timedelta(days=3))
        await apply_pass_purchase(s, txn("txn_2"), NOW - timedelta(days=3))
        await apply_pass_purchase(s, txn("txn_3"), NOW - timedelta(days=3))
        await apply_pass_refund(s, refund("txn_1", status="pending_approval") | {"created_at": (NOW - timedelta(hours=30)).isoformat()}, NOW)
        await apply_pass_refund(s, refund("txn_2", status="pending_approval") | {"created_at": (NOW - timedelta(hours=2)).isoformat()}, NOW)
        await apply_pass_refund(s, refund("txn_3", status="pending_approval"), NOW)
        rejected = await apply_pass_refund(s, refund("txn_3", status="rejected"), NOW)
        await s.commit()
        m = await business_metrics(s, days=7, now=NOW)
        statuses = {p.transaction_id: p.refund_status for p in [await s.get(PassPurchase, t) for t in ("txn_1", "txn_2", "txn_3")]}
        user = await s.get(User, "u1")
        return rejected, statuses, m, quota.get_user_tier(user, NOW)

    rejected, statuses, m, tier = with_db([new_user()], fn)
    assert rejected == "refund rejected"
    assert statuses == {"txn_1": "pending_approval", "txn_2": "pending_approval", "txn_3": "rejected"}
    assert m["pass_refunds_pending"] == 2 and m["pass_refunds_pending_over_24h"] == 1
    assert tier == "pro_user"  # access kept while Paddle reviews


def test_admin_detail_lists_passes_with_refund_state():
    from app.admin import user_detail

    async def fn(s):
        await apply_pass_purchase(s, txn(), NOW)
        await apply_pass_refund(s, refund(status="pending_approval"), NOW)
        await s.commit()
        return await user_detail(s, "u1", NOW)

    d = with_db([new_user()], fn)
    assert [(p["transaction_id"], p["refund_status"], p["amount_cents"], p["currency"]) for p in d["passes"]] == [
        ("txn_1", "pending_approval", 34900, "CNY")
    ]
    assert d["user"]["pass_until"] is not None
