"""/api/admin/metrics must only answer with the metrics token or an admin login."""
from __future__ import annotations

import contextlib
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import pytest
from fastapi.testclient import TestClient

import app.main as main
import app.metrics as metrics

TOKEN = "metrics-route-test-token"


@pytest.fixture
def client(monkeypatch):
    async def fake_metrics(session, days=7):
        return {"window_days": days}

    @contextlib.asynccontextmanager
    async def fake_session():
        yield None

    monkeypatch.setattr(main.settings, "metrics_token", TOKEN)
    monkeypatch.setattr(metrics, "business_metrics", fake_metrics)
    monkeypatch.setattr(main.db_manager, "session", fake_session)
    return TestClient(main.app)  # no context manager: skip lifespan (no real DB)


def test_no_credentials_rejected(client):
    assert client.get("/api/admin/metrics").status_code == 401


def test_wrong_token_rejected(client):
    assert client.get("/api/admin/metrics", headers={"X-Metrics-Token": "nope"}).status_code == 401


def test_metrics_token_accepted(client):
    r = client.get("/api/admin/metrics?days=30", headers={"X-Metrics-Token": TOKEN})
    assert r.status_code == 200 and r.json() == {"window_days": 30}


def test_empty_configured_token_never_matches(client, monkeypatch):
    monkeypatch.setattr(main.settings, "metrics_token", "")
    assert client.get("/api/admin/metrics", headers={"X-Metrics-Token": ""}).status_code == 401
