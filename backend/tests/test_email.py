"""Verification email is sent through Resend with the configured sender."""
from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import httpx
import pytest

import app.auth.auth as auth


def run_with_transport(monkeypatch, handler, api_key="re_test"):
    monkeypatch.setattr(auth.settings, "resend_api_key", api_key)
    real_client = httpx.AsyncClient
    monkeypatch.setattr(auth.httpx, "AsyncClient",
                        lambda **kw: real_client(transport=httpx.MockTransport(handler), **kw))
    asyncio.run(auth.send_verification_email("user@example.com", "123456"))


def test_sends_code_via_resend(monkeypatch):
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["url"] = str(request.url)
        seen["auth"] = request.headers["Authorization"]
        seen["body"] = json.loads(request.content)
        return httpx.Response(200, json={"id": "email_1"})

    run_with_transport(monkeypatch, handler)
    assert seen["url"] == "https://api.resend.com/emails"
    assert seen["auth"] == "Bearer re_test"
    assert seen["body"]["to"] == ["user@example.com"]
    assert seen["body"]["from"] == auth.settings.email_from
    assert "123456" in seen["body"]["text"]


def test_provider_error_raises(monkeypatch):
    with pytest.raises(Exception, match="Resend returned 403"):
        run_with_transport(monkeypatch, lambda r: httpx.Response(403, json={"message": "domain not verified"}))


def test_without_key_prints_code_instead_of_sending(monkeypatch, capsys):
    def handler(request):  # must not be called
        raise AssertionError("no HTTP call expected without a key")

    run_with_transport(monkeypatch, handler, api_key="")
    assert "123456" in capsys.readouterr().out
