"""Data access layer for database operations."""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    AffiliationCache,
    Authorship,
    GeocodingCache,
    Paper,
    Project,
    Run,
    RunPaper,
)


def _utc_now() -> datetime:
    """Get current UTC datetime."""
    return datetime.now(timezone.utc)


class ProjectRepository:
    """Repository for Project operations."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def list_projects(self, user_id: str) -> list[Project]:
        """List all projects for a user."""
        result = await self.session.execute(
            select(Project)
            .where(Project.user_id == user_id)
            .order_by(Project.created_at.desc())
        )
        return list(result.scalars().all())
    
    async def get_project(self, project_id: str, user_id: str | None = None) -> Project | None:
        """Get project by ID. Optionally filter by user_id."""
        query = select(Project).where(Project.project_id == project_id)
        if user_id is not None:
            query = query.where(Project.user_id == user_id)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()
    
    async def create_project(self, user_id: str, name: str) -> Project:
        """Create a new project."""
        project = Project(
            project_id=uuid.uuid4().hex[:12],
            user_id=user_id,
            name=name,
            created_at=_utc_now()
        )
        self.session.add(project)
        await self.session.flush()
        return project


class RunRepository:
    """Repository for Run operations."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def list_runs(self, project_id: str) -> list[Run]:
        """List all runs for a project."""
        result = await self.session.execute(
            select(Run)
            .where(Run.project_id == project_id)
            .order_by(Run.created_at.desc())
        )
        return list(result.scalars().all())
    
    async def get_run(self, run_id: str) -> Run | None:
        """Get run by ID."""
        result = await self.session.execute(
            select(Run).where(Run.run_id == run_id)
        )
        return result.scalar_one_or_none()
    
    async def create_run(self, project_id: str, description: str) -> Run:
        """Create a new run."""
        now = _utc_now()
        run = Run(
            run_id=uuid.uuid4().hex[:12],
            project_id=project_id,
            description=description,
            created_at=now,
            understanding={
                "created_at": now.isoformat(),
                "research_description": description,
                "clarification_rounds": [],
                "final_interpretation": "",
                "slots_raw": {
                    "research_goal": "",
                    "task": [],
                    "method_measurement": [],
                    "method_algorithm": [],
                    "subject_population": [],
                    "signal_feature": [],
                    "output_target": [],
                    "context": [],
                },
                "slots_normalized": {
                    "research_goal": "",
                    "task": [],
                    "method_measurement": [],
                    "method_algorithm": [],
                    "subject_population": [],
                    "signal_feature": [],
                    "output_target": [],
                    "context": [],
                },
            },
            keywords={"canonical_terms": [], "synonyms": {}, "updated_at": now.isoformat()},
            queries={"pubmed": "", "semantic_scholar": "", "openalex": "", "updated_at": now.isoformat()},
        )
        self.session.add(run)
        await self.session.flush()
        return run
    
    async def update_understanding(self, run_id: str, understanding: dict[str, Any]) -> None:
        """Update run understanding."""
        run = await self.get_run(run_id)
        if run:
            run.understanding = understanding
            await self.session.flush()
    
    async def update_keywords(self, run_id: str, keywords: dict[str, Any]) -> None:
        """Update run keywords."""
        run = await self.get_run(run_id)
        if run:
            run.keywords = keywords
            await self.session.flush()
    
    async def update_queries(self, run_id: str, queries: dict[str, Any]) -> None:
        """Update run queries."""
        run = await self.get_run(run_id)
        if run:
            run.queries = queries
            await self.session.flush()
    
    async def update_results(self, run_id: str, results: dict[str, Any]) -> None:
        """Update run results."""
        run = await self.get_run(run_id)
        if run:
            run.results = results
            await self.session.flush()
    
    async def update_retrieval_framework(self, run_id: str, framework: str) -> None:
        """Update run retrieval framework."""
        run = await self.get_run(run_id)
        if run:
            run.retrieval_framework = framework
            await self.session.flush()
    
    async def delete_run(self, run_id: str) -> None:
        """Delete a run and all associated data."""
        # Delete RunPaper associations first (foreign key constraint)
        await self.session.execute(
            delete(RunPaper).where(RunPaper.run_id == run_id)
        )
        # Delete the Run record
        await self.session.execute(
            delete(Run).where(Run.run_id == run_id)
        )


class PaperRepository:
    """Repository for Paper operations."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def get_cached_pmids(self, pmids: list[str]) -> set[str]:
        """Get PMIDs that already exist in database."""
        if not pmids:
            return set()
        
        result = await self.session.execute(
            select(Paper.pmid).where(Paper.pmid.in_(pmids))
        )
        return {row[0] for row in result.all()}
    
    async def insert_paper(
        self,
        pmid: str,
        year: int | None,
        title: str,
        doi: str | None,
        xml_stored: str | None = None
    ) -> None:
        """Insert or update a paper."""
        paper = Paper(
            pmid=pmid,
            year=year,
            title=title,
            doi=doi,
            xml_stored=xml_stored
        )
        await self.session.merge(paper)


class AuthorshipRepository:
    """Repository for Authorship operations."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def insert_authorship(
        self,
        pmid: str,
        author_order: int,
        author_name_raw: str,
        last_name: str,
        fore_name: str,
        initials: str,
        suffix: str,
        is_collective: bool,
        collective_name: str,
        year: int | None,
        affiliations_raw: list[str],
        affiliation_raw_joined: str,
        has_author_affiliation: bool,
        country: str | None = None,
        city: str | None = None,
        institution: str | None = None,
        affiliation_confidence: str = "none"
    ) -> None:
        """Insert an authorship record."""
        authorship = Authorship(
            pmid=pmid,
            author_order=author_order,
            author_name_raw=author_name_raw,
            last_name=last_name,
            fore_name=fore_name,
            initials=initials,
            suffix=suffix,
            is_collective=is_collective,
            collective_name=collective_name,
            year=year,
            affiliations_raw=json.dumps(affiliations_raw),
            affiliation_raw_joined=affiliation_raw_joined,
            has_author_affiliation=has_author_affiliation,
            country=country,
            city=city,
            institution=institution,
            affiliation_confidence=affiliation_confidence
        )
        self.session.add(authorship)
    
    async def get_authorships_by_pmids(self, pmids: list[str]) -> list[Authorship]:
        """Get authorships for given PMIDs."""
        if not pmids:
            return []
        result = await self.session.execute(
            select(Authorship).where(Authorship.pmid.in_(pmids))
        )
        return list(result.scalars().all())
    
    async def delete_authorships_by_pmids(self, pmids: list[str]) -> None:
        """Delete all authorships for given PMIDs."""
        if not pmids:
            return
        await self.session.execute(
            delete(Authorship).where(Authorship.pmid.in_(pmids))
        )


class RunPaperRepository:
    """Repository for Run-Paper associations."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def link_run_to_papers(self, run_id: str, pmids: list[str]) -> None:
        """Link a run to multiple papers."""
        # First, delete existing links for this run
        await self.session.execute(
            delete(RunPaper).where(RunPaper.run_id == run_id)
        )
        
        # Then insert new links
        for pmid in pmids:
            run_paper = RunPaper(run_id=run_id, pmid=pmid)
            self.session.add(run_paper)
    
    async def get_run_pmids(self, run_id: str) -> list[str]:
        """Get all PMIDs for a run."""
        result = await self.session.execute(
            select(RunPaper.pmid)
            .where(RunPaper.run_id == run_id)
            .order_by(RunPaper.added_at)
        )
        return [row[0] for row in result.all()]


class AffiliationCacheRepository:
    """Repository for affiliation cache operations."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def get_cached(self, affiliation_raw: str) -> AffiliationCache | None:
        """Get cached affiliation data."""
        result = await self.session.execute(
            select(AffiliationCache).where(
                AffiliationCache.affiliation_raw == affiliation_raw
            )
        )
        return result.scalar_one_or_none()
    
    async def cache_affiliations(
        self,
        affiliation_map: dict[str, dict[str, str | None]]
    ) -> None:
        """Cache multiple affiliation extractions."""
        for affiliation_raw, geo_data in affiliation_map.items():
            cache = AffiliationCache(
                affiliation_raw=affiliation_raw,
                country=geo_data.get("country"),
                city=geo_data.get("city"),
                institution=geo_data.get("institution"),
                confidence=geo_data.get("confidence", "none")
            )
            await self.session.merge(cache)


class GeocodingCacheRepository:
    """Repository for geocoding cache operations."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def get_cached(self, location_key: str) -> GeocodingCache | None:
        """Get cached geocoding data."""
        result = await self.session.execute(
            select(GeocodingCache).where(
                GeocodingCache.location_key == location_key
            )
        )
        return result.scalar_one_or_none()
    
    async def get_batch_cached(self, location_keys: list[str]) -> dict[str, GeocodingCache]:
        """Batch fetch cached geocoding data for multiple location keys.
        
        Returns a dict mapping location_key -> GeocodingCache (only for keys that exist in cache).
        """
        if not location_keys:
            return {}
        
        result = await self.session.execute(
            select(GeocodingCache).where(
                GeocodingCache.location_key.in_(location_keys)
            )
        )
        cached_items = result.scalars().all()
        return {item.location_key: item for item in cached_items}
    
    async def cache_location(
        self,
        location_key: str,
        latitude: float | None,
        longitude: float | None
    ) -> None:
        """Cache a geocoded location."""
        cache = GeocodingCache(
            location_key=location_key,
            latitude=latitude,
            longitude=longitude
        )
        await self.session.merge(cache)
    
    async def cache_locations_batch(
        self,
        locations: dict[str, tuple[float | None, float | None]]
    ) -> None:
        """Batch cache multiple locations.
        
        Args:
            locations: Dict mapping location_key -> (latitude, longitude)
        """
        for location_key, (latitude, longitude) in locations.items():
            cache = GeocodingCache(
                location_key=location_key,
                latitude=latitude,
                longitude=longitude
            )
            await self.session.merge(cache)

