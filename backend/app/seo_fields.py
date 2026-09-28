"""Programmatic SEO field pages: build one data run per research field in the background.

Field definitions live in frontend/src/data/seo-fields.json (shared with the frontend).
A field either names an existing run (``runId``) or gets one built here from its
hand-written PubMed query: create run -> retrieve PubMed -> ingest authors/affiliations.
Build state is kept in the run's ``understanding`` JSON, so restarts resume safely.
"""
from __future__ import annotations

import asyncio
import json
import logging
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

repo_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(repo_root))

import config
from app.db.connection import db_manager
from app.db.repository import RunRepository

logger = logging.getLogger(__name__)

FIELDS_FILE = repo_root / "frontend" / "src" / "data" / "seo-fields.json"
RUN_PREFIX = "[seo:"          # run.description starts with "[seo:<slug>]"
MIN_PAPERS = 100               # below this a field is too thin to publish
STALE_BUILD = timedelta(hours=3)  # a "building" claim older than this is retried
STARTUP_DELAY_SECONDS = 90     # let the service pass health checks first


def load_field_definitions() -> list[dict[str, Any]]:
    return json.loads(FIELDS_FILE.read_text(encoding="utf-8"))["fields"]


def _seo_state(run) -> dict[str, Any]:
    return (run.understanding or {}).get("seo_field") or {}


def _run_slug(run) -> str | None:
    if run.description.startswith(RUN_PREFIX):
        return run.description[len(RUN_PREFIX):].split("]", 1)[0]
    return None


async def _runs_by_slug() -> dict[str, list]:
    async with db_manager.session() as session:
        runs = await RunRepository(session).list_runs(config.settings.seo_project_id)
    by_slug: dict[str, list] = {}
    for run in runs:
        slug = _run_slug(run)
        if slug:
            by_slug.setdefault(slug, []).append(run)
    return by_slug


async def _set_state(run_id: str, **state: Any) -> None:
    async with db_manager.session() as session:
        repo = RunRepository(session)
        run = await repo.get_run(run_id)
        understanding = dict(run.understanding or {})
        understanding["seo_field"] = {**(understanding.get("seo_field") or {}), **state}
        await repo.update_understanding(run_id, understanding)
        await session.commit()


async def ready_fields() -> list[dict[str, Any]]:
    """Fields whose data is ready to publish, as {slug, run_id, project_id}."""
    project_id = config.settings.seo_project_id
    by_slug = await _runs_by_slug()
    ready = []
    for field in load_field_definitions():
        if field.get("runId"):
            ready.append({"slug": field["slug"], "run_id": field["runId"], "project_id": project_id})
            continue
        built = [r for r in by_slug.get(field["slug"], []) if _seo_state(r).get("status") == "ready"]
        if built:
            latest = max(built, key=lambda r: r.created_at)
            ready.append({"slug": field["slug"], "run_id": latest.run_id, "project_id": project_id})
    return ready


async def build_field(field: dict[str, Any], run_id: str | None = None) -> str:
    """Retrieve and ingest one field. Returns the final status."""
    from app.db.service import DatabaseStore
    from app.phase1.steps import step_retrieve
    from app.phase2.pg_ingest import PostgresIngestionPipeline

    store = DatabaseStore()
    project_id = config.settings.seo_project_id
    slug = field["slug"]
    if run_id is None:
        run = await store.create_run(project_id, f"{RUN_PREFIX}{slug}] {field['name']}")
        run_id = run.run_id
    now = datetime.now(timezone.utc).isoformat()
    await _set_state(run_id, status="building", started_at=now, query=field["pubmedQuery"])
    logger.info("SEO field %s: building in run %s", slug, run_id)

    try:
        await store.write_run_file(project_id, run_id, "queries.json", {
            "pubmed": field["pubmedQuery"], "pubmed_full": field["pubmedQuery"],
            "semantic_scholar": "", "openalex": "", "updated_at": now,
        })
        retrieved = await step_retrieve(store, project_id, run_id)
        papers = retrieved["counts"].get("pubmed", 0)
        if papers < MIN_PAPERS:
            await _set_state(run_id, status="too_small", papers=papers)
            logger.warning("SEO field %s: only %d papers, not publishing", slug, papers)
            return "too_small"

        stats = await PostgresIngestionPipeline(
            project_id=project_id, api_key=config.settings.pubmed_api_key or None
        ).ingest_run(run_id=run_id, store=store)
        await _set_state(
            run_id, status="ready", papers=papers,
            authorships=stats.authorships_created,
            finished_at=datetime.now(timezone.utc).isoformat(),
        )
        logger.info("SEO field %s: ready (%d papers, %d authorships)", slug, papers, stats.authorships_created)
        return "ready"
    except Exception as e:  # keep going with the other fields
        logger.error("SEO field %s failed: %s", slug, e, exc_info=True)
        await _set_state(run_id, status="failed", error=str(e)[:500])
        return "failed"


def _needs_build(runs: list) -> tuple[bool, str | None]:
    """Decide whether a field needs work; returns (build?, run_id to reuse)."""
    if not runs:
        return True, None
    latest = max(runs, key=lambda r: r.created_at)
    state = _seo_state(latest)
    status = state.get("status")
    if status in ("ready", "too_small"):
        return False, None
    if status == "building":
        started = datetime.fromisoformat(state.get("started_at", "1970-01-01T00:00:00+00:00"))
        if datetime.now(timezone.utc) - started < STALE_BUILD:
            return False, None  # another instance is on it
    return True, latest.run_id  # failed, stale, or created but never claimed


async def build_pending_fields() -> None:
    """Build every configured field that has no ready run yet, one at a time."""
    if not config.settings.seo_field_builder_enabled or not config.settings.database_url:
        return
    await asyncio.sleep(STARTUP_DELAY_SECONDS)
    try:
        fields = [f for f in load_field_definitions() if not f.get("runId")]
        by_slug = await _runs_by_slug()
    except Exception as e:
        logger.error("SEO field builder could not start: %s", e, exc_info=True)
        return
    for field in fields:
        build, run_id = _needs_build(by_slug.get(field["slug"], []))
        if build:
            await build_field(field, run_id)
            await asyncio.sleep(5)  # breathe between fields
    logger.info("SEO field builder: all configured fields processed")
