"""LLM usage is attributed to the run of the request and never breaks the call."""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import app.llm_usage as llm_usage
from app.llm_usage import RunContextMiddleware, current_run_id, token_counts


def test_token_counts_from_both_api_shapes():
    assert token_counts({"prompt_tokens": 120, "completion_tokens": 30}) == (120, 30)  # chat/completions
    assert token_counts({"input_tokens": 50, "output_tokens": 7}) == (50, 7)          # responses
    assert token_counts(None) == (0, 0)


def run_request(path):
    seen = {}

    async def app(scope, receive, send):
        seen["run_id"] = current_run_id.get()

    asyncio.run(RunContextMiddleware(app)({"type": "http", "path": path}, None, None))
    return seen["run_id"]


def test_run_requests_are_attributed_to_their_run():
    assert run_request("/api/projects/p1/runs/abc123/query-build") == "abc123"
    assert run_request("/api/projects/p1/runs/abc123") == "abc123"


def test_other_requests_are_not_attributed():
    assert run_request("/api/projects/p1") is None
    assert run_request("/api/text-validate/validate") is None


def test_recording_failure_does_not_raise(monkeypatch):
    class Broken:
        def session(self):
            raise RuntimeError("database down")

    import app.db.connection as connection
    monkeypatch.setattr(connection, "db_manager", Broken())
    asyncio.run(llm_usage.record_usage("m", {"prompt_tokens": 5, "completion_tokens": 1}, "r1"))
