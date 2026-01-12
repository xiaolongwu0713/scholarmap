"""Data access layer for database operations."""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    AffiliationCache,
    Authorship,
    GeocodingCache,
    InstitutionGeo,
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
    
    async def count_user_projects(self, user_id: str) -> int:
        """Count total number of projects for a user."""
        result = await self.session.execute(
            select(func.count()).select_from(Project).where(Project.user_id == user_id)
        )
        return result.scalar() or 0


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
    
    async def count_project_runs(self, project_id: str) -> int:
        """Count total number of runs for a project."""
        result = await self.session.execute(
            select(func.count()).select_from(Run).where(Run.project_id == project_id)
        )
        return result.scalar() or 0
    
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
    
    async def bulk_upsert_papers(
        self,
        papers_data: list[dict[str, Any]]
    ) -> None:
        """Bulk insert or update papers using PostgreSQL ON CONFLICT DO UPDATE.
        
        Handles PostgreSQL asyncpg parameter limit (32767) by batching upserts.
        
        Args:
            papers_data: List of dicts with keys: pmid, year, title, doi, xml_stored
        """
        if not papers_data:
            return
        
        # PostgreSQL asyncpg has a limit of 32767 parameters per query
        # Each paper has 5 fields, so max ~6553 records per batch
        # Use 5000 as a safe batch size
        BATCH_SIZE = 5000
        
        # Process in batches to avoid parameter limit
        for i in range(0, len(papers_data), BATCH_SIZE):
            batch = papers_data[i:i + BATCH_SIZE]
            stmt = insert(Paper.__table__).values(batch)
            stmt = stmt.on_conflict_do_update(
                index_elements=['pmid'],
                set_={
                    'year': stmt.excluded.year,
                    'title': stmt.excluded.title,
                    'doi': stmt.excluded.doi,
                    'xml_stored': stmt.excluded.xml_stored
                }
            )
            await self.session.execute(stmt)


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
    
    async def bulk_insert_authorships(
        self,
        authorships_data: list[dict[str, Any]]
    ) -> None:
        """Bulk insert authorship records using batch insert.
        
        This is much faster than individual insert_authorship() calls for large datasets.
        Handles PostgreSQL asyncpg parameter limit (32767) by batching inserts.
        
        Args:
            authorships_data: List of dicts with authorship fields. affiliations_raw should
                            already be JSON-encoded strings.
        """
        if not authorships_data:
            return
        
        # PostgreSQL asyncpg has a limit of 32767 parameters per query
        # Each authorship has 17 fields, so max ~1927 records per batch
        # Use 1500 as a safe batch size
        BATCH_SIZE = 1500
        num_fields = 17  # Number of fields in Authorship model
        
        # Process in batches to avoid parameter limit
        for i in range(0, len(authorships_data), BATCH_SIZE):
            batch = authorships_data[i:i + BATCH_SIZE]
            stmt = insert(Authorship.__table__).values(batch)
            await self.session.execute(stmt)
    
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
        
        # Then bulk insert new links
        if pmids:
            run_papers_data = [
                {"run_id": run_id, "pmid": pmid}
                for pmid in pmids
            ]
            # PostgreSQL asyncpg has a limit of 32767 parameters per query
            # Each RunPaper has 2 fields, so max ~16383 records per batch
            # Use 10000 as a safe batch size
            BATCH_SIZE = 10000
            
            # Process in batches to avoid parameter limit
            for i in range(0, len(run_papers_data), BATCH_SIZE):
                batch = run_papers_data[i:i + BATCH_SIZE]
                stmt = insert(RunPaper.__table__).values(batch)
                await self.session.execute(stmt)
    
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
    
    async def get_batch_cached(self, affiliation_raws: list[str]) -> dict[str, AffiliationCache]:
        """Batch fetch cached affiliation data for multiple affiliations."""
        if not affiliation_raws:
            return {}
        
        result = await self.session.execute(
            select(AffiliationCache).where(
                AffiliationCache.affiliation_raw.in_(affiliation_raws)
            )
        )
        caches = result.scalars().all()
        return {cache.affiliation_raw: cache for cache in caches}
    
    async def cache_affiliations(
        self,
        affiliation_map: dict[str, dict[str, str | None]]
    ) -> None:
        """Cache multiple affiliation extractions using batch UPSERT operation.
        
        Uses PostgreSQL ON CONFLICT DO UPDATE for efficient batch insert/update.
        Handles PostgreSQL asyncpg parameter limit (32767) by batching upserts.
        This is much faster than individual merge() calls (2545 records in one operation
        instead of 2545 separate database round-trips).
        """
        if not affiliation_map:
            return
        
        # Prepare data for batch upsert
        cache_records = []
        for affiliation_raw, geo_data in affiliation_map.items():
            cache_records.append({
                "affiliation_raw": affiliation_raw,
                "country": geo_data.get("country"),
                "city": geo_data.get("city"),
                "institution": geo_data.get("institution"),
                "confidence": geo_data.get("confidence", "none")
            })
        
        # PostgreSQL asyncpg has a limit of 32767 parameters per query
        # Each cache record has 5 fields, so max ~6553 records per batch
        # Use 5000 as a safe batch size
        BATCH_SIZE = 5000
        
        # Process in batches to avoid parameter limit
        for i in range(0, len(cache_records), BATCH_SIZE):
            batch = cache_records[i:i + BATCH_SIZE]
            # Use PostgreSQL UPSERT (ON CONFLICT DO UPDATE) for efficient batch operation
            # This handles both inserts and updates in a single database operation
            stmt = insert(AffiliationCache.__table__).values(batch)
            stmt = stmt.on_conflict_do_update(
                index_elements=['affiliation_raw'],
                set_={
                    'country': stmt.excluded.country,
                    'city': stmt.excluded.city,
                    'institution': stmt.excluded.institution,
                    'confidence': stmt.excluded.confidence
                }
            )
            await self.session.execute(stmt)


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
        longitude: float | None,
        affiliation: str | None = None,
        max_affiliations: int = 50
    ) -> None:
        """Cache a geocoded location.
        
        Args:
            location_key: Location cache key
            latitude: Latitude coordinate
            longitude: Longitude coordinate
            affiliation: Optional affiliation text to add to the affiliations array
            max_affiliations: Maximum number of affiliations to store (default: 50)
        """
        from sqlalchemy import select
        
        # Use SELECT FOR UPDATE to handle concurrent updates
        result = await self.session.execute(
            select(GeocodingCache)
            .where(GeocodingCache.location_key == location_key)
            .with_for_update()
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            # Update existing record
            existing.latitude = latitude
            existing.longitude = longitude
            
            # Update affiliations array if affiliation is provided
            if affiliation:
                current_affiliations = existing.affiliations or []
                # Add affiliation if not already present (case-insensitive)
                affiliation_lower = affiliation.lower()
                if not any(aff.lower() == affiliation_lower for aff in current_affiliations):
                    current_affiliations.append(affiliation)
                    # Limit to max_affiliations (keep most recent)
                    if len(current_affiliations) > max_affiliations:
                        current_affiliations = current_affiliations[-max_affiliations:]
                    existing.affiliations = current_affiliations
        else:
            # Create new record
            affiliations = [affiliation] if affiliation else None
            cache = GeocodingCache(
                location_key=location_key,
                latitude=latitude,
                longitude=longitude,
                affiliations=affiliations
            )
            self.session.add(cache)
    
    async def cache_locations_batch(
        self,
        locations: dict[str, tuple[float | None, float | None]],
        affiliations: dict[str, str | None] | None = None,
        max_affiliations: int = 50
    ) -> None:
        """Batch cache multiple locations.
        
        Args:
            locations: Dict mapping location_key -> (latitude, longitude)
            affiliations: Optional dict mapping location_key -> affiliation text
            max_affiliations: Maximum number of affiliations to store per location (default: 50)
        """
        from sqlalchemy import select
        
        # Process each location with SELECT FOR UPDATE for thread safety
        for location_key, (latitude, longitude) in locations.items():
            affiliation = affiliations.get(location_key) if affiliations else None
            
            # Use SELECT FOR UPDATE to handle concurrent updates
            result = await self.session.execute(
                select(GeocodingCache)
                .where(GeocodingCache.location_key == location_key)
                .with_for_update()
            )
            existing = result.scalar_one_or_none()
            
            if existing:
                # Update existing record
                existing.latitude = latitude
                existing.longitude = longitude
                
                # Update affiliations array if affiliation is provided
                if affiliation:
                    current_affiliations = existing.affiliations or []
                    # Add affiliation if not already present (case-insensitive)
                    affiliation_lower = affiliation.lower()
                    if not any(aff.lower() == affiliation_lower for aff in current_affiliations):
                        current_affiliations.append(affiliation)
                        # Limit to max_affiliations (keep most recent)
                        if len(current_affiliations) > max_affiliations:
                            current_affiliations = current_affiliations[-max_affiliations:]
                        existing.affiliations = current_affiliations
            else:
                # Create new record
                affiliations_list = [affiliation] if affiliation else None
                cache = GeocodingCache(
                    location_key=location_key,
                    latitude=latitude,
                    longitude=longitude,
                    affiliations=affiliations_list
                )
                self.session.add(cache)


class InstitutionGeoRepository:
    """Repository for institution geographic information operations."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def get_by_name(self, name: str) -> InstitutionGeo | None:
        """Get institution by exact name match (normalized_name or aliases).
        
        Note: Matching is done ONLY on normalized_name and aliases, NOT on primary_name.
        The input name should be normalized before calling this method.
        
        If multiple matches are found, returns the first one (by institution_id).
        
        Args:
            name: Normalized institution name to match
        
        Returns:
            InstitutionGeo if matched, None otherwise
        """
        from app.phase2.text_utils import normalize_text
        from sqlalchemy import or_
        
        # Normalize input name
        name_normalized = normalize_text(name)
        if not name_normalized:
            return None
        
        # Match on normalized_name or aliases (both are already normalized)
        # Use order_by to ensure deterministic results, and first() to get only one result
        result = await self.session.execute(
            select(InstitutionGeo).where(
                or_(
                    InstitutionGeo.normalized_name == name_normalized,
                    InstitutionGeo.aliases.contains([name_normalized])  # JSONB array contains (normalized alias)
                )
            ).order_by(InstitutionGeo.institution_id).limit(1)
        )
        return result.scalar_one_or_none()
    
    async def search_by_name(self, name: str, similarity_threshold: float = 0.8) -> list[InstitutionGeo]:
        """Search institutions by name (fuzzy matching).
        
        Note: Matching is done ONLY on normalized_name and aliases, NOT on primary_name.
        The input name should be normalized before calling this method.
        
        Args:
            name: Institution name to search (will be normalized)
            similarity_threshold: Minimum similarity score (0-1)
        
        Returns:
            List of matching institutions, sorted by relevance
        """
        from app.phase2.text_utils import normalize_text
        from sqlalchemy import or_, func as sql_func
        
        # Normalize input name
        name_normalized = normalize_text(name)
        if not name_normalized:
            return []
        
        # First try exact match or contains match on normalized_name
        result = await self.session.execute(
            select(InstitutionGeo).where(
                or_(
                    InstitutionGeo.normalized_name.contains(name_normalized),  # Partial match on normalized_name
                    InstitutionGeo.aliases.contains([name_normalized])  # Exact match in aliases (normalized)
                )
            )
        )
        exact_matches = list(result.scalars().all())
        
        # For fuzzy matching, we'll do it in Python for better control
        # This is a simple implementation - can be enhanced with pg_trgm extension
        all_institutions = await self.session.execute(select(InstitutionGeo))
        all_insts = list(all_institutions.scalars().all())
        
        # Score matches based on normalized_name and aliases
        scored_matches = []
        for inst in all_insts:
            # Skip if already in exact matches
            if inst in exact_matches:
                continue
            
            # Check normalized_name (already normalized)
            normalized = inst.normalized_name
            if name_normalized in normalized or normalized in name_normalized:
                score = min(len(name_normalized), len(normalized)) / max(len(name_normalized), len(normalized))
                if score >= similarity_threshold:
                    scored_matches.append((inst, score))
                    continue
            
            # Check aliases (already normalized)
            if inst.aliases:
                for alias in inst.aliases:
                    if name_normalized in alias or alias in name_normalized:
                        score = min(len(name_normalized), len(alias)) / max(len(name_normalized), len(alias))
                        if score >= similarity_threshold:
                            scored_matches.append((inst, score))
                            break
        
        # Combine exact matches (score = 1.0) with fuzzy matches
        exact_scores = [(inst, 1.0) for inst in exact_matches if inst not in [m[0] for m in scored_matches]]
        all_scored = exact_scores + scored_matches
        
        # Sort by score descending
        all_scored.sort(key=lambda x: x[1], reverse=True)
        return [inst for inst, _ in all_scored]
    
    async def get_by_ror_id(self, ror_id: str) -> InstitutionGeo | None:
        """Get institution by ROR ID."""
        result = await self.session.execute(
            select(InstitutionGeo).where(InstitutionGeo.ror_id == ror_id)
        )
        return result.scalar_one_or_none()
    
    async def insert_institution(
        self,
        primary_name: str,
        normalized_name: str | None = None,
        country: str | None = None,
        city: str | None = None,
        aliases: list[str] | None = None,
        qs_rank: int | None = None,
        ror_id: str | None = None,
        source: str = "manual"
    ) -> InstitutionGeo:
        """Insert a new institution.
        
        Args:
            primary_name: Official institution name (required)
            normalized_name: Normalized version of primary_name (required, will be generated if not provided)
            country: Country name (required if not provided)
            city: City name (optional)
            aliases: List of normalized aliases (optional)
            qs_rank: QS ranking (optional)
            ror_id: ROR ID (optional)
            source: Data source (default: 'manual')
        """
        # Generate normalized_name if not provided
        if normalized_name is None:
            from app.phase2.text_utils import normalize_text
            normalized_name = normalize_text(primary_name)
        
        institution = InstitutionGeo(
            primary_name=primary_name,
            normalized_name=normalized_name,
            aliases=aliases,
            country=country or "",  # Will fail if None, but keep as is for now
            city=city,
            qs_rank=qs_rank,
            ror_id=ror_id,
            source=source
        )
        self.session.add(institution)
        await self.session.flush()
        return institution
    
    async def bulk_insert_institutions(self, institutions: list[dict[str, Any]]) -> None:
        """Bulk insert institutions.
        
        Args:
            institutions: List of dicts with keys: primary_name, normalized_name (optional), country, city, aliases, qs_rank, ror_id, source
        """
        from app.phase2.text_utils import normalize_text
        
        for inst_data in institutions:
            primary_name = inst_data["primary_name"]
            normalized_name = inst_data.get("normalized_name")
            if normalized_name is None:
                normalized_name = normalize_text(primary_name)
            
            institution = InstitutionGeo(
                primary_name=primary_name,
                normalized_name=normalized_name,
                aliases=inst_data.get("aliases"),
                country=inst_data["country"],
                city=inst_data.get("city"),
                qs_rank=inst_data.get("qs_rank"),
                ror_id=inst_data.get("ror_id"),
                source=inst_data.get("source", "manual")
            )
            self.session.add(institution)
    
    async def update_institution(self, institution_id: int, **kwargs) -> InstitutionGeo | None:
        """Update institution fields."""
        institution = await self.session.get(InstitutionGeo, institution_id)
        if not institution:
            return None
        
        for key, value in kwargs.items():
            if hasattr(institution, key):
                setattr(institution, key, value)
        
        await self.session.flush()
        return institution
    
    async def get_all(self) -> list[InstitutionGeo]:
        """Get all institutions."""
        result = await self.session.execute(select(InstitutionGeo))
        return list(result.scalars().all())
    
    async def auto_add_institution(
        self,
        institution_name: str,
        country: str,
        city: str | None = None,
        affiliation_text: str | None = None
    ) -> InstitutionGeo | None:
        """Automatically add an institution after successful extraction.
        
        This is called when:
        1. Institution matcher fails to find a match in institution_geo
        2. Fallback extraction (rule-based or LLM) successfully extracts country, city, and institution
        3. We want to save this new institution for future matches
        
        Args:
            institution_name: Extracted institution name (will be used as primary_name)
            country: Extracted country name (required)
            city: Extracted city name (optional)
            affiliation_text: Original affiliation text (optional, can be used to extract additional aliases)
        
        Returns:
            InstitutionGeo if successfully added, None if failed or already exists
        """
        if not institution_name or not country:
            return None
        
        from app.phase2.text_utils import normalize_text, extract_abbreviation
        
        # Generate normalized_name from institution_name
        normalized_name = normalize_text(institution_name)
        if not normalized_name:
            return None
        
        # Check if already exists (by normalized_name or primary_name)
        # First check by normalized_name
        existing = await self.get_by_name(institution_name)
        if existing:
            # Already exists, don't add
            return None
        
        # Also check by primary_name to avoid duplicates
        result = await self.session.execute(
            select(InstitutionGeo).where(
                InstitutionGeo.primary_name == institution_name
            )
        )
        if result.scalar_one_or_none():
            # Already exists with same primary_name, don't add
            return None
        
        # Generate aliases if affiliation_text is provided
        aliases = None
        if affiliation_text:
            # Extract abbreviation from affiliation text (might be different from institution_name)
            abbrev = extract_abbreviation(affiliation_text)
            if abbrev:
                normalized_abbrev = normalize_text(abbrev)
                if normalized_abbrev and normalized_abbrev != normalized_name:
                    aliases = [normalized_abbrev]
        
        # Add new institution with source='auto_added'
        institution = InstitutionGeo(
            primary_name=institution_name,
            normalized_name=normalized_name,
            aliases=aliases,
            country=country,
            city=city,
            qs_rank=None,  # No QS rank for auto-added institutions
            ror_id=None,
            source="auto_added"  # Mark as automatically added
        )
        self.session.add(institution)
        await self.session.flush()
        
        return institution

