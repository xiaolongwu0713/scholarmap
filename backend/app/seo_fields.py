"""Programmatic SEO field pages: build one data run per research field in the background.

Field definitions live in frontend/src/data/seo-fields.json (shared with the frontend).
A field either names an existing run (``runId``) or gets one built here from its
hand-written PubMed query: create run -> retrieve PubMed -> ingest authors/affiliations.
Build state is kept in the run's ``understanding`` JSON, so restarts resume safely.
"""
from __future__ import annotations

import asyncio
import ctypes
import gc
import json
import logging
import sys
import time
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
STALE_BUILD = timedelta(minutes=30)  # a "building" claim older than this was interrupted (e.g. by a deploy)
STARTUP_DELAY_SECONDS = 90     # let the service pass health checks first
RECHECK_SECONDS = 3600         # re-check for new or outdated fields hourly
PAUSE_BETWEEN_FIELDS_SECONDS = 60  # lets the small database and the web process recover
RETRY_SECONDS = 300            # after a failed pass (e.g. the database restarted), retry sooner
MAX_QUICK_RETRIES = 3          # then fall back to hourly, so a broken field can't loop forever
# Bump to rebuild every field (e.g. after a parser or geocoding fix). The previous
# run stays published until its replacement is ready.
BUILD_VERSION = 4


def load_field_definitions() -> list[dict[str, Any]]:
    return json.loads(FIELDS_FILE.read_text(encoding="utf-8"))["fields"]


def _seo_state(run) -> dict[str, Any]:
    return (run.understanding or {}).get("seo_field") or {}


def _run_slug(run) -> str | None:
    if run.description.startswith(RUN_PREFIX):
        return run.description[len(RUN_PREFIX):].split("]", 1)[0]
    return None


async def _runs_by_slug() -> dict[str, list]:
    from sqlalchemy import select
    from app.db.models import Run

    # Only the small columns: each run's `results` holds its full retrieval output, and
    # loading every SEO run's rows at once ran the web process out of memory.
    query = select(Run.run_id, Run.description, Run.created_at, Run.understanding).where(
        Run.project_id == config.settings.seo_project_id,
        Run.description.startswith(RUN_PREFIX),
    )
    async with db_manager.session() as session:
        runs = (await session.execute(query)).all()
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


SITEMAP_TTL_SECONDS = 3600
_sitemap_cache: tuple[float, list[dict[str, Any]]] | None = None
_sitemap_lock = asyncio.Lock()


async def sitemap_data(top_countries: int = 10, top_cities: int = 20) -> list[dict[str, Any]]:
    """Top countries and cities of each ready field, for sitemap and static-page URLs.

    One SQL query per field and no geocoding, so it stays fast as fields are added.
    Cities are over-supplied: the frontend drops invalid city names before picking its top 5.
    Cached for an hour.
    """
    global _sitemap_cache
    async with _sitemap_lock:
        if _sitemap_cache and time.monotonic() - _sitemap_cache[0] < SITEMAP_TTL_SECONDS:
            return _sitemap_cache[1]
        from sqlalchemy import func, select
        from app.db.models import Authorship, RunPaper
        from app.phase2.pg_aggregations import normalize_country

        scholar = func.count(func.distinct(func.concat(
            Authorship.author_name_raw, "|", func.coalesce(Authorship.institution, ""), "|", Authorship.country,
        )))
        data = []
        for field in await ready_fields():
            query = (
                select(Authorship.country, Authorship.city, scholar.label("n"))
                .join(RunPaper, RunPaper.pmid == Authorship.pmid)
                .where(RunPaper.run_id == field["run_id"], Authorship.country.isnot(None))
                .group_by(Authorship.country, Authorship.city)
            )
            async with db_manager.session() as session:
                rows = (await session.execute(query)).all()
            countries: dict[str, int] = {}
            cities = []
            for row in rows:
                country = normalize_country(row.country)
                if not country:
                    continue
                countries[country] = countries.get(country, 0) + row.n
                if row.city:
                    cities.append({"country": country, "city": row.city, "scholar_count": row.n})
            data.append({
                "slug": field["slug"],
                "countries": [
                    {"country": c, "scholar_count": n}
                    for c, n in sorted(countries.items(), key=lambda kv: -kv[1])[:top_countries]
                ],
                "cities": sorted(cities, key=lambda c: -c["scholar_count"])[:top_cities],
            })
        _sitemap_cache = (time.monotonic(), data)
        return data


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
    from app.llm_usage import current_run_id

    current_run_id.set(run_id)  # attribute any LLM calls during the build to this run
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
            run_id, status="ready", papers=papers, build_version=BUILD_VERSION,
            authorships=stats.authorships_created,
            finished_at=datetime.now(timezone.utc).isoformat(),
        )
        logger.info("SEO field %s: ready (%d papers, %d authorships)", slug, papers, stats.authorships_created)
        return "ready"
    except Exception as e:  # keep going with the other fields
        logger.error("SEO field %s failed: %s", slug, e, exc_info=True)
        await _mark_failed(run_id, e)
        return "failed"


async def _mark_failed(run_id: str, error: Exception) -> None:
    """Record the failure so the run is retried in place, not left 'building' for 30 minutes.

    The database itself may be what failed, so try a few times before giving up.
    """
    for attempt in range(3):
        try:
            await _set_state(run_id, status="failed", error=str(error)[:500])
            return
        except Exception as e:
            logger.warning("SEO run %s: could not record failure (attempt %d): %s", run_id, attempt + 1, e)
            await asyncio.sleep(20)


def _superseded_runs(runs: list) -> list[str]:
    """Runs older than the field's published (latest ready) run: safe to delete.

    Each run keeps its full retrieval output, so rebuilds would otherwise fill the database.
    A newer run (a build in progress) is kept.
    """
    ready = [r for r in runs if _seo_state(r).get("status") == "ready"]
    if not ready:
        return []
    published = max(ready, key=lambda r: r.created_at)
    return [r.run_id for r in runs if r.created_at < published.created_at]


async def _prune_superseded_runs() -> None:
    from app.db.service import DatabaseStore

    store = DatabaseStore()
    for slug, runs in (await _runs_by_slug()).items():
        for run_id in _superseded_runs(runs):
            await store.delete_run(config.settings.seo_project_id, run_id)
            logger.info("SEO field %s: deleted superseded run %s", slug, run_id)


def _release_memory() -> None:
    """Hand memory freed by an ingest back to the OS.

    Builds run inside the web process, which Render kills above 512 MB.
    """
    gc.collect()
    try:
        ctypes.CDLL("libc.so.6").malloc_trim(0)
    except OSError:
        pass  # not glibc (e.g. local macOS)
    try:
        with open("/proc/self/status") as f:
            rss = next(line.split()[1] for line in f if line.startswith("VmRSS:"))
        logger.info("SEO field builder: process memory %d MB", int(rss) // 1024)
    except (OSError, StopIteration):
        pass


def _needs_build(runs: list) -> tuple[bool, str | None]:
    """Decide whether a field needs work; returns (build?, run_id to reuse)."""
    if not runs:
        return True, None
    latest = max(runs, key=lambda r: r.created_at)
    state = _seo_state(latest)
    status = state.get("status")
    if status in ("ready", "too_small"):
        if state.get("build_version", 1) < BUILD_VERSION:
            return True, None  # outdated: rebuild in a fresh run
        return False, None
    if status == "building":
        started = datetime.fromisoformat(state.get("started_at", "1970-01-01T00:00:00+00:00"))
        if datetime.now(timezone.utc) - started < STALE_BUILD:
            return False, None  # another instance is on it
    return True, latest.run_id  # failed, stale, or created but never claimed


async def build_pending_fields() -> None:
    """Build every configured field that has no ready run yet, one at a time; re-check hourly."""
    if not config.settings.seo_field_builder_enabled or not config.settings.database_url:
        return
    await asyncio.sleep(STARTUP_DELAY_SECONDS)
    quick_retries = 0
    while True:
        failed = False
        try:
            await _prune_superseded_runs()
            fields = [f for f in load_field_definitions() if not f.get("runId")]
            by_slug = await _runs_by_slug()
            for field in fields:
                build, run_id = _needs_build(by_slug.get(field["slug"], []))
                if build:
                    failed |= await build_field(field, run_id) == "failed"
                    _release_memory()
                    await asyncio.sleep(PAUSE_BETWEEN_FIELDS_SECONDS)
            logger.info("SEO field builder: pass complete%s", " with failures" if failed else "")
        except asyncio.CancelledError:
            raise
        except Exception as e:
            failed = True
            logger.error("SEO field builder pass failed: %s", e, exc_info=True)
        quick_retries = quick_retries + 1 if failed else 0
        await asyncio.sleep(RETRY_SECONDS if 0 < quick_retries <= MAX_QUICK_RETRIES else RECHECK_SECONDS)
