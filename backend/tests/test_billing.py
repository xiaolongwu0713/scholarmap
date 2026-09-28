"""Tests for plan tiers, search-slot timing and Paddle webhook handling."""
from __future__ import annotations

import hashlib
import hmac
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))          # backend/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))   # repo root (config.py)

import config
from app.billing import apply_subscription, verify_signature
from app.db.models import User
from app.quota import SEARCH_WINDOW, get_limit, get_user_tier, next_slot_time

NOW = datetime(2026, 9, 28, 12, 0, tzinfo=timezone.utc)
SECRET = "pdl_ntfset_test_secret"


def make_user(**kw) -> User:
    return User(user_id="u1", email=kw.pop("email", "someone@example.com"), password_hash="x", **kw)


def sign(body: bytes, ts: int, secret: str = SECRET) -> str:
    h1 = hmac.new(secret.encode(), f"{ts}:".encode() + body, hashlib.sha256).hexdigest()
    return f"ts={ts};h1={h1}"


# --- tiers ---------------------------------------------------------------

def test_new_user_is_free():
    assert get_user_tier(make_user(), NOW) == "free_user"


def test_pro_until_future_is_pro_and_past_is_free():
    assert get_user_tier(make_user(pro_until=NOW + timedelta(days=1)), NOW) == "pro_user"
    assert get_user_tier(make_user(pro_until=NOW - timedelta(seconds=1)), NOW) == "free_user"


def test_super_user_by_email(monkeypatch):
    monkeypatch.setattr(config.settings, "super_user_email", "Admin@Example.com")
    assert get_user_tier(make_user(email="admin@example.com"), NOW) == "super_user"


def test_plan_limits_match_agreed_plans():
    assert get_limit("free_user", "searches_per_week") == 2
    assert get_limit("pro_user", "searches_per_week") == 30
    assert get_limit("free_user", "list_limit") == 10
    assert get_limit("pro_user", "list_limit") == -1


# --- next search slot ----------------------------------------------------

def test_next_slot_none_below_limit_or_unlimited():
    starts = [NOW - timedelta(days=1)]
    assert next_slot_time(starts, 2) is None
    assert next_slot_time(starts * 5, -1) is None


def test_next_slot_is_oldest_plus_window_at_limit():
    starts = [NOW - timedelta(days=3), NOW - timedelta(days=1)]
    assert next_slot_time(starts, 2) == starts[0] + SEARCH_WINDOW


def test_next_slot_after_downgrade_waits_for_enough_to_expire():
    # 5 searches as Pro, now Free (limit 2): need 4 to age out, so wait for the 4th oldest
    starts = [NOW - timedelta(days=d) for d in (6, 5, 4, 3, 2)]
    assert next_slot_time(starts, 2) == starts[3] + SEARCH_WINDOW


# --- webhook signature ---------------------------------------------------

def test_valid_signature_accepted():
    body = b'{"event_type":"subscription.created"}'
    ts = int(NOW.timestamp())
    assert verify_signature(body, sign(body, ts), SECRET, now=ts + 10)


def test_tampered_body_rejected():
    body = b'{"a":1}'
    ts = int(NOW.timestamp())
    assert not verify_signature(b'{"a":2}', sign(body, ts), SECRET, now=ts)


def test_wrong_secret_rejected():
    body = b"{}"
    ts = int(NOW.timestamp())
    assert not verify_signature(body, sign(body, ts, "other"), SECRET, now=ts)


def test_old_timestamp_rejected():
    body = b"{}"
    ts = int(NOW.timestamp())
    assert not verify_signature(body, sign(body, ts), SECRET, now=ts + 301)


def test_missing_or_malformed_header_rejected():
    for header in (None, "", "garbage", "ts=abc;h1=00", "h1=00"):
        assert not verify_signature(b"{}", header, SECRET, now=NOW.timestamp())


def test_empty_secret_rejected():
    body = b"{}"
    ts = int(NOW.timestamp())
    assert not verify_signature(body, sign(body, ts, ""), "", now=ts)


def test_one_of_multiple_h1_signatures_may_match():
    body = b"{}"
    ts = int(NOW.timestamp())
    good = sign(body, ts).split(";h1=")[1]
    assert verify_signature(body, f"ts={ts};h1=deadbeef;h1={good}", SECRET, now=ts)


# --- subscription events -------------------------------------------------

def sub(status: str, ends: datetime | None = NOW + timedelta(days=30), **extra) -> dict:
    data = {"id": "sub_1", "customer_id": "ctm_1", "status": status, **extra}
    if ends:
        data["current_billing_period"] = {"starts_at": NOW.isoformat(), "ends_at": ends.isoformat().replace("+00:00", "Z")}
    return data


def test_active_subscription_grants_pro_until_period_end():
    user = make_user()
    assert apply_subscription(user, sub("active"), NOW)
    assert user.pro_until == NOW + timedelta(days=30)
    assert (user.paddle_subscription_id, user.paddle_customer_id, user.subscription_status) == ("sub_1", "ctm_1", "active")
    assert get_user_tier(user, NOW) == "pro_user"


def test_past_due_keeps_access_until_period_end():
    user = make_user()
    apply_subscription(user, sub("past_due"), NOW)
    assert get_user_tier(user, NOW) == "pro_user"


def test_canceled_ends_access_at_canceled_at():
    user = make_user(pro_until=NOW + timedelta(days=30))
    canceled_at = NOW + timedelta(days=2)
    apply_subscription(user, sub("canceled", ends=None, canceled_at=canceled_at.isoformat()), NOW)
    assert user.pro_until == canceled_at


def test_canceled_never_extends_access():
    user = make_user(pro_until=NOW)
    apply_subscription(user, sub("canceled", ends=None, canceled_at=(NOW + timedelta(days=5)).isoformat()), NOW)
    assert user.pro_until == NOW


def test_stale_event_is_ignored():
    user = make_user()
    apply_subscription(user, sub("active"), NOW)
    assert not apply_subscription(user, sub("canceled", ends=None, canceled_at=NOW.isoformat()), NOW - timedelta(minutes=1))
    assert user.subscription_status == "active"
    assert user.pro_until == NOW + timedelta(days=30)


def test_renewal_extends_access():
    user = make_user()
    apply_subscription(user, sub("active"), NOW)
    apply_subscription(user, sub("active", ends=NOW + timedelta(days=60)), NOW + timedelta(days=30))
    assert user.pro_until == NOW + timedelta(days=60)
