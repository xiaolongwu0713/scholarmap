"""Record OpenAI token usage per search run, to know what a search costs.

Calls are attributed to a run through `current_run_id`, set for every request under
/api/projects/{project}/runs/{run}/ (RunContextMiddleware) and by the SEO field builder.
Background tasks started from such a request inherit it. Recording never fails a call.
"""
from __future__ import annotations

import logging
import re
from contextvars import ContextVar
from typing import Any

logger = logging.getLogger(__name__)

current_run_id: ContextVar[str | None] = ContextVar("llm_run_id", default=None)

_RUN_PATH = re.compile(r"^/api/projects/[^/]+/runs/([^/]+)")


def token_counts(usage: dict[str, Any] | None) -> tuple[int, int]:
    """(input, output) tokens from a chat/completions or responses `usage` object."""
    if not usage:
        return 0, 0
    prompt = usage.get("prompt_tokens", usage.get("input_tokens")) or 0
    completion = usage.get("completion_tokens", usage.get("output_tokens")) or 0
    return int(prompt), int(completion)


async def record_usage(model: str, usage: dict[str, Any] | None, run_id: str | None = None) -> None:
    prompt, completion = token_counts(usage)
    if not (prompt or completion):
        return
    try:
        from app.db.connection import db_manager
        from app.db.models import LLMUsage

        async with db_manager.session() as session:
            session.add(LLMUsage(
                run_id=run_id or current_run_id.get(),
                model=model,
                prompt_tokens=prompt,
                completion_tokens=completion,
            ))
            await session.commit()
    except Exception as e:
        logger.warning("Could not record LLM usage: %s", e)


class RunContextMiddleware:
    """Pure ASGI middleware: attribute LLM calls in run requests to that run."""

    def __init__(self, app) -> None:
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            match = _RUN_PATH.match(scope.get("path", ""))
            if match:
                token = current_run_id.set(match.group(1))
                try:
                    return await self.app(scope, receive, send)
                finally:
                    current_run_id.reset(token)
        return await self.app(scope, receive, send)
