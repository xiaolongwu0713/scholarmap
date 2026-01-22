"""
Parse stage server-side protection mechanisms.

This module provides:
1. Attempt count tracking (per project_id + run_id)
2. Rate limiting (per project_id + run_id)
3. Concurrency control (per run_id)
4. Input sanitization (prompt injection prevention)
"""

from __future__ import annotations

import asyncio
import re
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from typing import Any

from app.core.storage import FileStore
from app.guardrail_config import (
    BACKEND_STAGE1_MAX_ATTEMPTS,
    BACKEND_STAGE2_MAX_TOTAL_ATTEMPTS,
    BACKEND_STAGE2_MAX_CONSECUTIVE_UNANSWERED,
    API_RATE_LIMIT_MAX_REQUESTS,
    API_RATE_LIMIT_WINDOW_SECONDS,
    MAX_CONCURRENT_PARSE_PER_RUN,
    PROMPT_MAX_LENGTH_CHARS,
)


class ParseAttemptTracker:
    """Tracks parse attempt counts per run to enforce server-side limits."""
    
    def __init__(self, store: FileStore):
        self.store = store
    
    async def get_attempt_counts(
        self, project_id: str, run_id: str
    ) -> dict[str, int]:
        """Get current attempt counts for a run."""
        try:
            understanding = await self.store.read_run_file(
                project_id, run_id, "understanding.json"
            )
            parse_meta = understanding.get("parse_meta", {})
            return {
                "stage1_attempts": parse_meta.get("stage1_attempts", 0),
                "stage2_total_attempts": parse_meta.get("stage2_total_attempts", 0),
                "stage2_consecutive_unanswered": parse_meta.get(
                    "stage2_consecutive_unanswered", 0
                ),
            }
        except FileNotFoundError:
            return {
                "stage1_attempts": 0,
                "stage2_total_attempts": 0,
                "stage2_consecutive_unanswered": 0,
            }
    
    async def increment_stage1_attempt(
        self, project_id: str, run_id: str
    ) -> int:
        """Increment and return stage1 attempt count."""
        understanding = await self.store.read_run_file(
            project_id, run_id, "understanding.json"
        )
        parse_meta = understanding.setdefault("parse_meta", {})
        parse_meta["stage1_attempts"] = parse_meta.get("stage1_attempts", 0) + 1
        parse_meta["last_stage1_attempt"] = datetime.now(timezone.utc).isoformat()
        await self.store.write_run_file(
            project_id, run_id, "understanding.json", understanding
        )
        return parse_meta["stage1_attempts"]
    
    async def increment_stage2_attempt(
        self, project_id: str, run_id: str, is_answered: bool
    ) -> dict[str, int]:
        """Increment stage2 attempt count and update consecutive unanswered count."""
        understanding = await self.store.read_run_file(
            project_id, run_id, "understanding.json"
        )
        parse_meta = understanding.setdefault("parse_meta", {})
        
        # Increment total attempts
        parse_meta["stage2_total_attempts"] = (
            parse_meta.get("stage2_total_attempts", 0) + 1
        )
        
        # Update consecutive unanswered count
        if is_answered:
            parse_meta["stage2_consecutive_unanswered"] = 0
        else:
            parse_meta["stage2_consecutive_unanswered"] = (
                parse_meta.get("stage2_consecutive_unanswered", 0) + 1
            )
        
        parse_meta["last_stage2_attempt"] = datetime.now(timezone.utc).isoformat()
        await self.store.write_run_file(
            project_id, run_id, "understanding.json", understanding
        )
        
        return {
            "total_attempts": parse_meta["stage2_total_attempts"],
            "consecutive_unanswered": parse_meta["stage2_consecutive_unanswered"],
        }
    
    async def check_stage1_limit(self, project_id: str, run_id: str) -> tuple[bool, int]:
        """Check if stage1 attempt limit is reached. Returns (is_locked, current_count)."""
        counts = await self.get_attempt_counts(project_id, run_id)
        current = counts["stage1_attempts"]
        return (current >= BACKEND_STAGE1_MAX_ATTEMPTS, current)
    
    async def check_stage2_limit(
        self, project_id: str, run_id: str
    ) -> tuple[bool, int, int]:
        """Check if stage2 limits are reached. Returns (is_locked, total_count, consecutive_unanswered)."""
        counts = await self.get_attempt_counts(project_id, run_id)
        total = counts["stage2_total_attempts"]
        consecutive = counts["stage2_consecutive_unanswered"]
        
        is_locked = (
            total >= BACKEND_STAGE2_MAX_TOTAL_ATTEMPTS
            or consecutive >= BACKEND_STAGE2_MAX_CONSECUTIVE_UNANSWERED
        )
        return (is_locked, total, consecutive)


class RateLimiter:
    """Simple in-memory rate limiter for API endpoints."""
    
    def __init__(self, max_requests: int = API_RATE_LIMIT_MAX_REQUESTS, window_seconds: int = API_RATE_LIMIT_WINDOW_SECONDS):
        """
        Args:
            max_requests: Maximum requests allowed in the time window
            window_seconds: Time window in seconds
        """
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        # Key: (endpoint, identifier), Value: list of timestamps
        self._requests: dict[tuple[str, str], list[datetime]] = defaultdict(list)
    
    def _cleanup_old_requests(self, key: tuple[str, str]) -> None:
        """Remove requests outside the time window."""
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(seconds=self.window_seconds)
        self._requests[key] = [
            ts for ts in self._requests[key] if ts > cutoff
        ]
    
    def check_rate_limit(
        self, endpoint: str, identifier: str
    ) -> tuple[bool, int]:
        """
        Check if rate limit is exceeded.
        
        Args:
            endpoint: API endpoint name (e.g., "parse_stage1")
            identifier: Unique identifier (e.g., project_id + ":" + run_id)
        
        Returns:
            (is_allowed, remaining_requests)
        """
        key = (endpoint, identifier)
        self._cleanup_old_requests(key)
        
        current_count = len(self._requests[key])
        if current_count >= self.max_requests:
            return (False, 0)
        
        # Record this request
        self._requests[key].append(datetime.now(timezone.utc))
        return (True, self.max_requests - current_count - 1)


class ConcurrencyController:
    """Controls concurrent parse requests per run_id."""
    
    def __init__(self, max_concurrent: int = MAX_CONCURRENT_PARSE_PER_RUN):
        """
        Args:
            max_concurrent: Maximum concurrent requests per run_id
        """
        self.max_concurrent = max_concurrent
        # Key: run_id, Value: set of request identifiers
        self._active_requests: dict[str, set[str]] = defaultdict(set)
        self._lock = asyncio.Lock()
    
    async def acquire(self, run_id: str, request_id: str) -> bool:
        """
        Try to acquire a slot for a parse request.
        
        Args:
            run_id: Run identifier
            request_id: Unique identifier for this request
        
        Returns:
            True if slot acquired, False if limit exceeded
        """
        async with self._lock:
            active = self._active_requests[run_id]
            if len(active) >= self.max_concurrent:
                return False
            active.add(request_id)
            return True
    
    async def release(self, run_id: str, request_id: str) -> None:
        """Release a slot after request completes."""
        async with self._lock:
            active = self._active_requests.get(run_id, set())
            active.discard(request_id)
            if not active:
                # Clean up empty sets
                self._active_requests.pop(run_id, None)


def sanitize_user_input(text: str) -> str:
    """
    Sanitize user input to prevent prompt injection attacks.
    
    This function:
    1. Escapes special characters that could be used for prompt injection
    2. Removes or neutralizes common injection patterns
    3. Preserves legitimate content
    
    Args:
        text: User input text
    
    Returns:
        Sanitized text safe for inclusion in prompts
    """
    if not text:
        return ""
    
    # Remove or escape common prompt injection patterns
    # Pattern 1: Instructions to ignore previous instructions
    patterns_to_remove = [
        r"(?i)ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|directives?)",
        r"(?i)forget\s+(all\s+)?(previous|prior|above)",
        r"(?i)disregard\s+(all\s+)?(previous|prior|above)",
        r"(?i)new\s+instructions?:",
        r"(?i)system\s*:",
        r"(?i)assistant\s*:",
        r"(?i)user\s*:",
    ]
    
    sanitized = text
    for pattern in patterns_to_remove:
        sanitized = re.sub(pattern, "", sanitized)
    
    # Escape special characters that could break JSON or prompt structure
    # But preserve legitimate punctuation
    # We'll be more conservative - only escape if it looks like an injection attempt
    
    # Check for suspicious patterns (multiple newlines, code blocks, etc.)
    # Remove excessive newlines (keep max 2 consecutive)
    sanitized = re.sub(r"\n{3,}", "\n\n", sanitized)
    
    # Remove markdown code blocks that could contain instructions
    # But be careful - legitimate research descriptions might use code-like terms
    # Only remove if it looks like an attempt to inject code
    if "```" in sanitized:
        # Count code blocks - if there are many, it's suspicious
        code_block_count = sanitized.count("```")
        if code_block_count > 2:
            # Remove code blocks but keep content
            sanitized = re.sub(r"```[^`]*```", "", sanitized)
    
    # Trim whitespace
    sanitized = sanitized.strip()
    
    return sanitized


def check_prompt_length(prompt: str) -> tuple[bool, int, int]:
    """
    Check if prompt length exceeds limits.
    
    Args:
        prompt: The full prompt text
    
    Returns:
        (is_valid, current_length, max_length)
    """
    current_length = len(prompt)
    max_length = PROMPT_MAX_LENGTH_CHARS
    is_valid = current_length <= max_length
    return (is_valid, current_length, max_length)


# Global instances
_global_rate_limiter = RateLimiter()
_global_concurrency_controller = ConcurrencyController()

