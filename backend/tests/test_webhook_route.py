"""The webhook route must be reachable without a login token and must enforce the Paddle signature."""
from __future__ import annotations

import contextlib
import hashlib
import hmac
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import pytest
from fastapi.testclient import TestClient

import app.billing as billing
import app.main as main

SECRET = "pdl_ntfset_route_test"
BODY = b'{"event_type":"subscription.activated","occurred_at":"2026-09-28T12:00:00Z","data":{"id":"sub_1"}}'


def signed(body: bytes, secret: str = SECRET) -> dict:
    ts = int(time.time())
    h1 = hmac.new(secret.encode(), f"{ts}:".encode() + body, hashlib.sha256).hexdigest()
    return {"Paddle-Signature": f"ts={ts};h1={h1}", "Content-Type": "application/json"}


@pytest.fixture
def client(monkeypatch):
    calls = []

    async def fake_handle_event(session, event):
        calls.append(event["event_type"])
        return "applied"

    @contextlib.asynccontextmanager
    async def fake_session():
        yield None

    monkeypatch.setattr(main.settings, "paddle_webhook_secret", SECRET)
    monkeypatch.setattr(billing, "handle_event", fake_handle_event)
    monkeypatch.setattr(main.db_manager, "session", fake_session)
    c = TestClient(main.app)  # no context manager: skip lifespan (no real DB)
    c.calls = calls
    return c


def test_valid_webhook_is_accepted_without_login(client):
    r = client.post("/api/billing/webhook", content=BODY, headers=signed(BODY))
    assert r.status_code == 200, r.text
    assert client.calls == ["subscription.activated"]


def test_bad_signature_is_rejected(client):
    r = client.post("/api/billing/webhook", content=BODY, headers=signed(BODY, "wrong-secret"))
    assert r.status_code == 401
    assert client.calls == []


def test_missing_secret_config_returns_503(client, monkeypatch):
    monkeypatch.setattr(main.settings, "paddle_webhook_secret", "")
    r = client.post("/api/billing/webhook", content=BODY, headers=signed(BODY))
    assert r.status_code == 503


def test_other_billing_routes_still_need_login(client):
    r = client.post("/api/billing/portal")
    assert r.status_code == 401
