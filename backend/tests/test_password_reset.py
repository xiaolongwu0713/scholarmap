"""Registration of a taken email, password reset by emailed code, and the code guess limit."""
from __future__ import annotations

import asyncio
import contextlib
import sys
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import pytest
from fastapi.testclient import TestClient

import app.main as main
from app.auth.repository import MAX_CODE_ATTEMPTS, EmailVerificationCodeRepository

EMAIL = "someone@example.com"
PASSWORD = "NewPass#2026"


class Store:
    def __init__(self):
        self.users: dict[str, SimpleNamespace] = {}
        self.codes: dict[str, str] = {}
        self.sent: list[str] = []


@pytest.fixture
def client(monkeypatch):
    store = Store()

    class FakeUsers:
        def __init__(self, session):
            pass

        async def get_user_by_email(self, email):
            return store.users.get(email)

        async def update_password(self, user, password_hash):
            user.password_hash = password_hash

    class FakeCodes:
        def __init__(self, session):
            pass

        async def create_code(self, email, code, expire_minutes=10):
            store.codes[email] = code

        async def verify_code(self, email, code):
            return store.codes.pop(email, None) == code

    async def fake_send(email, code):
        store.sent.append(email)

    @contextlib.asynccontextmanager
    async def fake_session():
        yield SimpleNamespace(commit=lambda: asyncio.sleep(0))

    monkeypatch.setattr(main, "UserRepository", FakeUsers)
    monkeypatch.setattr(main, "EmailVerificationCodeRepository", FakeCodes)
    monkeypatch.setattr(main, "send_verification_email", fake_send)
    monkeypatch.setattr(main.db_manager, "session", fake_session)
    c = TestClient(main.app)  # no context manager: skip lifespan (no real DB)
    c.store = store
    return c


def add_user(store, email=EMAIL):
    store.users[email] = SimpleNamespace(user_id="u1", email=email, password_hash="old")


def test_register_code_for_taken_email_points_to_login(client):
    add_user(client.store)
    r = client.post("/api/auth/send-verification-code", json={"email": EMAIL})
    assert r.status_code == 409
    assert "reset your password" in r.json()["detail"]
    assert client.store.sent == []


def test_reset_code_is_sent_only_to_existing_accounts(client):
    r = client.post("/api/auth/send-verification-code", json={"email": EMAIL, "purpose": "reset"})
    assert r.status_code == 200  # same answer, so accounts can't be enumerated
    assert client.store.sent == []

    add_user(client.store)
    r = client.post("/api/auth/send-verification-code", json={"email": EMAIL, "purpose": "reset"})
    assert r.status_code == 200
    assert client.store.sent == [EMAIL]


def test_reset_with_valid_code_sets_password_and_logs_in(client):
    add_user(client.store)
    client.store.codes[EMAIL] = "123456"
    r = client.post("/api/auth/reset-password",
                    json={"email": EMAIL, "verification_code": "123456", "password": PASSWORD})
    assert r.status_code == 200, r.text
    assert r.json()["access_token"]
    assert main.verify_password(PASSWORD, client.store.users[EMAIL].password_hash)


def test_reset_with_wrong_code_is_rejected(client):
    add_user(client.store)
    client.store.codes[EMAIL] = "123456"
    r = client.post("/api/auth/reset-password",
                    json={"email": EMAIL, "verification_code": "000000", "password": PASSWORD})
    assert r.status_code == 400
    assert client.store.users[EMAIL].password_hash == "old"


def test_code_is_burned_after_too_many_wrong_guesses():
    code = SimpleNamespace(code="123456", used=False, attempts=0)

    class Session:
        async def execute(self, query):
            return SimpleNamespace(scalar_one_or_none=lambda: None if code.used else code)

        async def flush(self):
            pass

    repo = EmailVerificationCodeRepository(Session())
    for _ in range(MAX_CODE_ATTEMPTS):
        assert asyncio.run(repo.verify_code(EMAIL, "000000")) is False
    # Even the right code no longer works
    assert asyncio.run(repo.verify_code(EMAIL, "123456")) is False
