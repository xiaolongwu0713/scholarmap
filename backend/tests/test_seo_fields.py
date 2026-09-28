"""SEO field builder: config validity and build decisions."""
from __future__ import annotations

import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from app.seo_fields import BUILD_VERSION, RUN_PREFIX, _needs_build, _run_slug, _superseded_runs, load_field_definitions

NOW = datetime.now(timezone.utc)


def run(state=None, created=NOW, run_id="r1", slug="gene-therapy"):
    understanding = {"seo_field": state} if state else None
    return SimpleNamespace(run_id=run_id, created_at=created, understanding=understanding,
                           description=f"{RUN_PREFIX}{slug}] Gene Therapy")


def test_field_definitions_are_valid():
    fields = load_field_definitions()
    slugs = [f["slug"] for f in fields]
    assert len(slugs) == len(set(slugs)), "duplicate slugs"
    for f in fields:
        assert re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", f["slug"]), f["slug"]
        assert f["name"] and f["description"] and f["keywords"]
        assert f.get("runId") or f.get("pubmedQuery"), f"{f['slug']} needs runId or pubmedQuery"


def test_slug_parsed_from_run_description():
    assert _run_slug(run()) == "gene-therapy"
    assert _run_slug(SimpleNamespace(description="Normal user search")) is None


def test_no_run_means_build_new():
    assert _needs_build([]) == (True, None)


def test_current_ready_or_too_small_is_left_alone():
    assert _needs_build([run({"status": "ready", "build_version": BUILD_VERSION})]) == (False, None)
    assert _needs_build([run({"status": "too_small", "build_version": BUILD_VERSION})]) == (False, None)


def test_outdated_build_is_rebuilt_in_new_run():
    assert _needs_build([run({"status": "ready"})]) == (True, None)  # pre-versioning = v1
    assert _needs_build([run({"status": "ready", "build_version": BUILD_VERSION - 1})]) == (True, None)


def test_failed_run_is_retried_in_place():
    assert _needs_build([run({"status": "failed"}, run_id="bad")]) == (True, "bad")


def test_recent_building_claim_is_respected_but_stale_one_retried():
    fresh = run({"status": "building", "started_at": (NOW - timedelta(minutes=10)).isoformat()})
    stale = run({"status": "building", "started_at": (NOW - timedelta(minutes=45)).isoformat()}, run_id="old")
    assert _needs_build([fresh]) == (False, None)
    assert _needs_build([stale]) == (True, "old")


def test_unclaimed_run_is_reused():
    assert _needs_build([run(None, run_id="orphan")]) == (True, "orphan")


def test_latest_run_decides():
    old_failed = run({"status": "failed"}, created=NOW - timedelta(days=1), run_id="a")
    new_ready = run({"status": "ready", "build_version": BUILD_VERSION}, created=NOW, run_id="b")
    assert _needs_build([old_failed, new_ready]) == (False, None)


def test_runs_older_than_the_published_one_are_superseded():
    old_ready = run({"status": "ready"}, created=NOW - timedelta(days=2), run_id="old")
    old_failed = run({"status": "failed"}, created=NOW - timedelta(days=1), run_id="bad")
    published = run({"status": "ready", "build_version": BUILD_VERSION}, created=NOW - timedelta(hours=1), run_id="live")
    building = run({"status": "building", "started_at": NOW.isoformat()}, created=NOW, run_id="next")
    assert sorted(_superseded_runs([old_ready, old_failed, published, building])) == ["bad", "old"]


def test_nothing_is_superseded_without_a_published_run():
    assert _superseded_runs([run({"status": "failed"}, run_id="a"), run({"status": "building"}, run_id="b")]) == []
