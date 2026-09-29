"""Admin routes are super-user only, and disabled accounts can't sign in or use their token."""
from __future__ import annotations

import asyncio
import contextlib
import sys
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import pytest
from fastapi.testclient import TestClient

import app.auth.middleware as middleware
import app.main as main

ADMIN = "admin@example.com"
PASSWORD = "Secret#2026"


@pytest.fixture
def client(monkeypatch):
    users = {
        "u1": SimpleNamespace(user_id="u1", email="user@example.com", password_hash=main.get_password_hash(PASSWORD),
                              disabled_at=None),
        "admin": SimpleNamespace(user_id="admin", email=ADMIN, password_hash="x", disabled_at=None),
    }

    class FakeUsers:
        def __init__(self, session):
            pass

        async def get_user_by_id(self, user_id):
            return users.get(user_id)

        async def get_user_by_email(self, email):
            return next((u for u in users.values() if u.email == email), None)

    class FakeActivity:
        def __init__(self, session):
            pass

        async def update_activity(self, user_id):
            pass

    @contextlib.asynccontextmanager
    async def fake_session():
        yield SimpleNamespace(commit=lambda: asyncio.sleep(0))

    async def fake_list_users(session, **kw):
        return {"total": 0, "users": []}

    import app.admin as admin
    monkeypatch.setattr(main.settings, "super_user_email", ADMIN)
    monkeypatch.setattr(main, "UserRepository", FakeUsers)
    monkeypatch.setattr(middleware, "UserRepository", FakeUsers)
    monkeypatch.setattr(middleware, "UserActivityRepository", FakeActivity)
    monkeypatch.setattr(main.db_manager, "session", fake_session)
    monkeypatch.setattr(admin, "list_users", fake_list_users)
    c = TestClient(main.app)  # no context manager: skip lifespan (no real DB)
    c.users = users
    return c


def auth(user_id):
    return {"Authorization": f"Bearer {main.create_access_token(data={'sub': user_id})}"}


def test_admin_routes_need_the_super_user(client):
    assert client.get("/api/admin/users").status_code == 401
    assert client.get("/api/admin/users", headers=auth("u1")).status_code == 403
    assert client.post("/api/admin/users/u1/actions", json={"action": "grant_pro", "days": 30},
                       headers=auth("u1")).status_code == 403
    r = client.get("/api/admin/users", headers=auth("admin"))
    assert r.status_code == 200 and r.json() == {"total": 0, "users": []}


def test_disabled_account_cannot_log_in_or_use_old_token(client):
    login = {"email": "user@example.com", "password": PASSWORD}
    assert client.post("/api/auth/login", json=login).status_code == 200
    assert client.get("/api/admin/users", headers=auth("u1")).status_code == 403  # signed in, just not admin

    client.users["u1"].disabled_at = datetime.now(timezone.utc)
    r = client.post("/api/auth/login", json=login)
    assert r.status_code == 403 and "disabled" in r.json()["detail"]
    assert client.get("/api/admin/users", headers=auth("u1")).status_code == 401
