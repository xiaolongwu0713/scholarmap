"""PostgreSQL database adapter for Phase 2 (replaces SQLite)."""
from __future__ import annotations

import json
from typing import Any

from sqlalchemy import select

from app.db.connection import db_manager
from app.db.repository import (
    AffiliationCacheRepository,
    AuthorshipRepository,
    GeocodingCacheRepository,
    PaperRepository,
    RunPaperRepository,
)
from app.phase2.models import GeoData


class PostgresDatabase:
    """PostgreSQL database wrapper for Phase 2 operations."""
    
    def __init__(self, project_id: str) -> None:
        """Initialize with project ID (compatibility with old interface)."""
        self.project_id = project_id
    
    async def get_cached_pmids(self, pmids: list[str]) -> set[str]:
        """Get PMIDs that are already in the database."""
        async with db_manager.session() as session:
            repo = PaperRepository(session)
            return await repo.get_cached_pmids(pmids)
    
    async def insert_paper(
        self,
        pmid: str,
        year: int | None,
        title: str,
        doi: str | None,
        xml_stored: str | None = None
    ) -> None:
        """Insert a paper record."""
        async with db_manager.session() as session:
            repo = PaperRepository(session)
            await repo.insert_paper(pmid, year, title, doi, xml_stored)
    
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
        async with db_manager.session() as session:
            repo = AuthorshipRepository(session)
            await repo.insert_authorship(
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
                affiliations_raw=affiliations_raw,
                affiliation_raw_joined=affiliation_raw_joined,
                has_author_affiliation=has_author_affiliation,
                country=country,
                city=city,
                institution=institution,
                affiliation_confidence=affiliation_confidence
            )
    
    async def link_run_to_papers(self, run_id: str, pmids: list[str]) -> None:
        """Link a run to its papers."""
        async with db_manager.session() as session:
            repo = RunPaperRepository(session)
            await repo.link_run_to_papers(run_id, pmids)
    
    async def get_cached_affiliation(self, affiliation_raw: str) -> GeoData | None:
        """Get cached geo data for an affiliation string."""
        async with db_manager.session() as session:
            repo = AffiliationCacheRepository(session)
            cache = await repo.get_cached(affiliation_raw)
            if cache:
                return GeoData(
                    country=cache.country,
                    city=cache.city,
                    institution=cache.institution,
                    confidence=cache.confidence
                )
            return None
    
    async def get_batch_cached_affiliations(self, affiliation_raws: list[str]) -> dict[str, GeoData]:
        """Batch get cached geo data for multiple affiliation strings."""
        if not affiliation_raws:
            return {}
        
        async with db_manager.session() as session:
            repo = AffiliationCacheRepository(session)
            caches = await repo.get_batch_cached(affiliation_raws)
            result = {}
            for affiliation_raw, cache in caches.items():
                result[affiliation_raw] = GeoData(
                    country=cache.country,
                    city=cache.city,
                    institution=cache.institution,
                    confidence=cache.confidence
                )
            return result
    
    async def cache_affiliations(self, affiliation_map: dict[str, GeoData]) -> None:
        """Cache extracted affiliation geo data."""
        async with db_manager.session() as session:
            repo = AffiliationCacheRepository(session)
            geo_map = {
                aff: {
                    "country": geo.country,
                    "city": geo.city,
                    "institution": geo.institution,
                    "confidence": geo.confidence
                }
                for aff, geo in affiliation_map.items()
            }
            await repo.cache_affiliations(geo_map)
    
    async def get_run_pmids(self, run_id: str) -> list[str]:
        """Get all PMIDs for a run."""
        async with db_manager.session() as session:
            repo = RunPaperRepository(session)
            return await repo.get_run_pmids(run_id)
    
    # Context manager support for transaction-like operations
    async def begin_transaction(self):
        """Begin a transaction (returns async context manager)."""
        return db_manager.session()
    
    async def execute_in_transaction(
        self,
        papers: list[tuple],
        authorships: list[tuple],
        run_id: str,
        pmids: list[str]
    ) -> None:
        """Execute multiple inserts in a single transaction."""
        async with db_manager.session() as session:
            paper_repo = PaperRepository(session)
            authorship_repo = AuthorshipRepository(session)
            run_paper_repo = RunPaperRepository(session)
            
            # Insert papers
            for paper_data in papers:
                await paper_repo.insert_paper(*paper_data)
            
            # Insert authorships
            for auth_data in authorships:
                await authorship_repo.insert_authorship(*auth_data)
            
            # Link run to papers
            await run_paper_repo.link_run_to_papers(run_id, pmids)

