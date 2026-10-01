"""Map data for the SEO field runs is cached; other projects' data is not."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import config
from app.phase2 import map_cache


def setup_function():
    map_cache.clear()


def test_caches_only_the_seo_project(monkeypatch):
    monkeypatch.setattr(config.settings, "seo_project_id", "seo")
    map_cache.put("seo", ("world", "r1"), [1])
    map_cache.put("user", ("world", "r2"), [2])
    assert map_cache.get("seo", ("world", "r1")) == [1]
    assert map_cache.get("user", ("world", "r2")) is None


def test_nothing_cached_without_an_seo_project(monkeypatch):
    monkeypatch.setattr(config.settings, "seo_project_id", "")
    map_cache.put("", ("world", "r1"), [1])
    assert map_cache.get("", ("world", "r1")) is None


def test_incomplete_data_expires_sooner(monkeypatch):
    monkeypatch.setattr(config.settings, "seo_project_id", "seo")
    now = [1000.0]
    monkeypatch.setattr(map_cache.time, "monotonic", lambda: now[0])
    map_cache.put("seo", ("world", "full"), [1])
    map_cache.put("seo", ("world", "partial"), [2], complete=False)
    now[0] += map_cache.INCOMPLETE_TTL_SECONDS + 1
    assert map_cache.get("seo", ("world", "full")) == [1]
    assert map_cache.get("seo", ("world", "partial")) is None


def test_size_is_bounded(monkeypatch):
    monkeypatch.setattr(config.settings, "seo_project_id", "seo")
    monkeypatch.setattr(map_cache, "MAX_ENTRIES", 2)
    for i in range(3):
        map_cache.put("seo", ("city", i), i)
    assert map_cache.get("seo", ("city", 0)) is None
    assert map_cache.get("seo", ("city", 2)) == 2


def test_has_coordinates():
    assert map_cache.has_coordinates([{"latitude": 1.0}])
    assert not map_cache.has_coordinates([{"latitude": 1.0}, {"latitude": None}])
