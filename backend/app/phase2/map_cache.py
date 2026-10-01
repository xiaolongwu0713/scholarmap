"""In-memory cache of map data for the public (SEO field and demo) projects.

Their pages are rendered on demand (crawlers, ISR), and each render asks the backend for
map aggregations. A published field run never changes (a rebuild gets a new run id), and
demo runs change only when re-ingested by hand, so their answers are kept here instead of
being recomputed on the small database.
"""
from __future__ import annotations

import time
from typing import Any

import config

TTL_SECONDS = 86400
# Data with places still missing coordinates: geocoding fills them in on later requests
INCOMPLETE_TTL_SECONDS = 600
MAX_ENTRIES = 2000

_entries: dict[tuple, tuple[float, Any]] = {}


def _cacheable(project_id: str) -> bool:
    public = {config.settings.seo_project_id, config.settings.demo_project_id}
    return bool(project_id) and project_id in public


def get(project_id: str, key: tuple) -> Any | None:
    if not _cacheable(project_id):
        return None
    hit = _entries.get(key)
    if hit is None:
        return None
    if hit[0] <= time.monotonic():
        del _entries[key]
        return None
    return hit[1]


def put(project_id: str, key: tuple, value: Any, complete: bool = True) -> None:
    if not _cacheable(project_id):
        return
    now = time.monotonic()
    if key not in _entries and len(_entries) >= MAX_ENTRIES:
        for k in [k for k, (expires, _) in _entries.items() if expires <= now]:
            del _entries[k]
        while len(_entries) >= MAX_ENTRIES:
            del _entries[next(iter(_entries))]  # oldest first
    _entries[key] = (now + (TTL_SECONDS if complete else INCOMPLETE_TTL_SECONDS), value)


def has_coordinates(items: list[dict[str, Any]]) -> bool:
    return all(item.get("latitude") is not None for item in items)


def clear() -> None:
    _entries.clear()
