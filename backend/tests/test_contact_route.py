"""/api/contact: public team contact form that emails each lead to the team inbox."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import pytest
from fastapi.testclient import TestClient

import app.contact as contact
import app.main as main

FORM = {"name": "Ada", "email": "Ada@Pharma.example", "company": "Pharma Co",
        "message": "Map CAR-T investigators in Germany", "source": "industry_hero"}


@pytest.fixture
def sent(monkeypatch):
    emails = []

    async def fake_send(to, subject, text, reply_to=None):
        emails.append({"to": to, "subject": subject, "text": text, "reply_to": reply_to})
        return True

    monkeypatch.setattr(contact, "_send_email", fake_send)
    monkeypatch.setattr(contact, "_recent", contact.defaultdict(contact.deque))
    return emails


@pytest.fixture
def client():
    return TestClient(main.app)  # no context manager: skip lifespan (no real DB)


def test_lead_is_emailed_to_the_team_with_reply_to_the_sender(client, sent):
    res = client.post("/api/contact", json=FORM)
    assert res.status_code == 200
    assert len(sent) == 1
    assert sent[0]["to"] == main.settings.contact_email
    assert sent[0]["reply_to"] == "ada@pharma.example"
    assert sent[0]["subject"] == "LabScout for my team: Pharma Co"
    assert "Map CAR-T investigators in Germany" in sent[0]["text"]


def test_honeypot_is_accepted_but_not_sent(client, sent):
    assert client.post("/api/contact", json={**FORM, "website": "http://spam.example"}).status_code == 200
    assert sent == []


def test_invalid_email_rejected(client, sent):
    assert client.post("/api/contact", json={**FORM, "email": "not-an-email"}).status_code == 400
    assert sent == []


def test_rate_limited_per_ip(client, sent):
    codes = [client.post("/api/contact", json=FORM, headers={"X-Forwarded-For": "203.0.113.9"}).status_code
             for _ in range(contact.MAX_PER_IP + 1)]
    assert codes[:-1] == [200] * contact.MAX_PER_IP
    assert codes[-1] == 429


def test_send_failure_reports_502(client, monkeypatch):
    async def broken(*args, **kwargs):
        raise Exception("Resend down")

    monkeypatch.setattr(contact, "_send_email", broken)
    monkeypatch.setattr(contact, "_recent", contact.defaultdict(contact.deque))
    assert client.post("/api/contact", json=FORM).status_code == 502
