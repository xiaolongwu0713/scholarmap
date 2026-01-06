"""PostgreSQL aggregation queries for geographic drill-down."""
from __future__ import annotations

from typing import Any

from sqlalchemy import and_, func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.connection import db_manager
from app.db.models import Authorship, RunPaper
from app.phase2.pg_geocoding import PostgresGeocoder

# Country name normalization
COUNTRY_ALIASES = {
    "USA": "United States",
    "US": "United States",
    "U.S.": "United States",
    "U.S.A.": "United States",
    "United States of America": "United States",
    "The Netherlands": "Netherlands",
    "UK": "United Kingdom",
    "U.K.": "United Kingdom",
    "Great Britain": "United Kingdom",
    "England": "United Kingdom",
    "Korea": "South Korea",
    "Republic of Korea": "South Korea",
    "People's Republic of China": "China",
    "PRC": "China",
}


def normalize_country(country: str | None) -> str | None:
    """Normalize country names."""
    if not country:
        return None
    return COUNTRY_ALIASES.get(country, country)


class PostgresMapAggregator:
    """Async aggregator for PostgreSQL."""
    
    def __init__(self) -> None:
        self.geocoder: PostgresGeocoder | None = None
    
    def _get_geocoder(self) -> PostgresGeocoder:
        """Lazy initialize geocoder."""
        if self.geocoder is None:
            self.geocoder = PostgresGeocoder()
        return self.geocoder
    
    async def get_world_map(
        self,
        run_id: str,
        min_confidence: str = "low"
    ) -> list[dict[str, Any]]:
        """Get world-level map data."""
        confidence_levels = self._get_confidence_levels(min_confidence)
        
        async with db_manager.session() as session:
            # Get PMIDs for this run
            pmids = await self._get_run_pmids(session, run_id)
            if not pmids:
                return []
            
            # Aggregate by country
            query = select(
                Authorship.country,
                func.count(
                    func.distinct(
                        func.concat(
                            Authorship.author_name_raw,
                            '|',
                            func.coalesce(Authorship.institution, ''),
                            '|',
                            Authorship.country
                        )
                    )
                ).label('scholar_count'),
                func.count(func.distinct(Authorship.pmid)).label('paper_count'),
                func.count(func.distinct(Authorship.institution)).label('institution_count')
            ).where(
                and_(
                    Authorship.country.isnot(None),
                    Authorship.pmid.in_(pmids),
                    Authorship.affiliation_confidence.in_(confidence_levels)
                )
            ).group_by(
                Authorship.country
            ).order_by(
                text('scholar_count DESC')
            )
            
            result = await session.execute(query)
            rows = result.all()
            
            # Merge countries with same normalized name first
            country_map: dict[str, dict[str, Any]] = {}
            for row in rows:
                country = normalize_country(row.country)
                if not country:
                    continue
                
                if country in country_map:
                    # Aggregate counts
                    country_map[country]["scholar_count"] += row.scholar_count
                    country_map[country]["paper_count"] += row.paper_count
                    country_map[country]["institution_count"] += row.institution_count
                else:
                    country_map[country] = {
                        "country": country,
                        "scholar_count": row.scholar_count,
                        "paper_count": row.paper_count,
                        "institution_count": row.institution_count,
                        "latitude": None,
                        "longitude": None
                    }
            
            # Batch fetch all coordinates from cache
            from app.db.repository import GeocodingCacheRepository
            from app.phase2.pg_geocoding import PostgresGeocoder
            
            country_keys = [PostgresGeocoder.make_location_key(country, None) for country in country_map.keys()]
            
            cached_coords: dict[str, tuple[float, float] | None] = {}
            to_geocode: list[str] = []
            
            async with db_manager.session() as session:
                cache_repo = GeocodingCacheRepository(session)
                cached_items = await cache_repo.get_batch_cached(country_keys)
                
                for country, location_key in zip(country_map.keys(), country_keys):
                    cached = cached_items.get(location_key)
                    if cached and cached.latitude is not None and cached.longitude is not None:
                        cached_coords[country] = (cached.latitude, cached.longitude)
                    else:
                        to_geocode.append(country)
            
            # Geocode only the missing ones (this will handle caching internally)
            if to_geocode:
                geocoder = self._get_geocoder()
                import asyncio
                # Note: get_coordinates handles caching, but for uncached items it will make API calls
                # The rate limiting in _geocode_external will still apply, so we geocode sequentially
                # to respect rate limits. For cached items, this is fast.
                for country in to_geocode:
                    coords = await geocoder.get_coordinates(country, None)
                    cached_coords[country] = coords
            
            # Apply coordinates to country_map
            for country in country_map:
                coords = cached_coords.get(country)
                if coords:
                    country_map[country]["latitude"] = coords[0]
                    country_map[country]["longitude"] = coords[1]
            
            # Convert to list and sort by scholar_count
            items = list(country_map.values())
            items.sort(key=lambda x: x["scholar_count"], reverse=True)
            
            return items
    
    async def get_country_map(
        self,
        run_id: str,
        country: str,
        min_confidence: str = "low"
    ) -> list[dict[str, Any]]:
        """Get country-level map data (cities)."""
        confidence_levels = self._get_confidence_levels(min_confidence)
        country_normalized = normalize_country(country)
        
        async with db_manager.session() as session:
            pmids = await self._get_run_pmids(session, run_id)
            if not pmids:
                return []
            
            query = select(
                Authorship.city,
                func.count(
                    func.distinct(
                        func.concat(
                            Authorship.author_name_raw,
                            '|',
                            func.coalesce(Authorship.institution, ''),
                            '|',
                            Authorship.country
                        )
                    )
                ).label('scholar_count'),
                func.count(func.distinct(Authorship.institution)).label('institution_count'),
                func.min(Authorship.affiliation_raw_joined).label('sample_affiliation')
            ).where(
                and_(
                    Authorship.country == country_normalized,
                    Authorship.city.isnot(None),
                    Authorship.pmid.in_(pmids),
                    Authorship.affiliation_confidence.in_(confidence_levels)
                )
            ).group_by(
                Authorship.city
            ).order_by(
                text('scholar_count DESC')
            )
            
            result = await session.execute(query)
            rows = result.all()
            
            # Build city map with data (without coordinates yet)
            city_map: dict[str, dict[str, Any]] = {}
            for row in rows:
                city_map[row.city] = {
                    "city": row.city,
                    "scholar_count": row.scholar_count,
                    "institution_count": row.institution_count,
                    "latitude": None,
                    "longitude": None,
                    "sample_affiliation": row.sample_affiliation
                }
            
            # Batch fetch all coordinates from cache
            from app.db.repository import GeocodingCacheRepository
            from app.phase2.pg_geocoding import PostgresGeocoder
            
            city_keys = [PostgresGeocoder.make_location_key(country_normalized, city) for city in city_map.keys()]
            
            cached_coords: dict[str, tuple[float, float] | None] = {}
            to_geocode: list[str] = []
            
            async with db_manager.session() as session:
                cache_repo = GeocodingCacheRepository(session)
                cached_items = await cache_repo.get_batch_cached(city_keys)
                
                for city, location_key in zip(city_map.keys(), city_keys):
                    cached = cached_items.get(location_key)
                    if cached and cached.latitude is not None and cached.longitude is not None:
                        cached_coords[city] = (cached.latitude, cached.longitude)
                    else:
                        to_geocode.append(city)
            
            # Geocode only the missing ones and batch cache the results
            if to_geocode:
                geocoder = self._get_geocoder()
                new_cache_entries: dict[str, tuple[float | None, float | None]] = {}
                
                # Geocode sequentially to respect rate limits
                for city in to_geocode:
                    # Get sample affiliation for this city for better error logging
                    sample_affiliation = city_map.get(city, {}).get("sample_affiliation")
                    coords = await geocoder._geocode_external(
                        country_normalized, 
                        city,
                        original_affiliation=sample_affiliation
                    )
                    cached_coords[city] = coords
                    location_key = PostgresGeocoder.make_location_key(country_normalized, city)
                    new_cache_entries[location_key] = (coords[0] if coords else None, coords[1] if coords else None)
                
                # Batch save all new cache entries
                if new_cache_entries:
                    async with db_manager.session() as session:
                        cache_repo = GeocodingCacheRepository(session)
                        await cache_repo.cache_locations_batch(new_cache_entries)
                        await session.commit()
            
            # Apply coordinates to city_map
            for city in city_map:
                coords = cached_coords.get(city)
                if coords:
                    city_map[city]["latitude"] = coords[0]
                    city_map[city]["longitude"] = coords[1]
                # Remove sample_affiliation from output (it was only for logging)
                city_map[city].pop("sample_affiliation", None)
            
            # Convert to list and sort by scholar_count
            items = list(city_map.values())
            items.sort(key=lambda x: x["scholar_count"], reverse=True)
            
            return items
    
    async def get_city_map(
        self,
        run_id: str,
        country: str,
        city: str,
        min_confidence: str = "low"
    ) -> list[dict[str, Any]]:
        """Get city-level map data (institutions)."""
        confidence_levels = self._get_confidence_levels(min_confidence)
        country_normalized = normalize_country(country)
        
        async with db_manager.session() as session:
            pmids = await self._get_run_pmids(session, run_id)
            if not pmids:
                return []
            
            query = select(
                Authorship.institution,
                func.count(
                    func.distinct(
                        func.concat(
                            Authorship.author_name_raw,
                            '|',
                            func.coalesce(Authorship.institution, ''),
                            '|',
                            Authorship.country
                        )
                    )
                ).label('scholar_count')
            ).where(
                and_(
                    Authorship.country == country_normalized,
                    Authorship.city == city,
                    Authorship.institution.isnot(None),
                    Authorship.pmid.in_(pmids),
                    Authorship.affiliation_confidence.in_(confidence_levels)
                )
            ).group_by(
                Authorship.institution
            ).order_by(
                text('scholar_count DESC')
            )
            
            result = await session.execute(query)
            rows = result.all()
            
            return [
                {
                    "country": country_normalized,
                    "city": city,
                    "institution": row.institution,
                    "scholar_count": row.scholar_count
                }
                for row in rows
            ]
    
    async def get_institution_scholars(
        self,
        run_id: str,
        country: str,
        city: str,
        institution: str,
        min_confidence: str = "low"
    ) -> list[dict[str, Any]]:
        """Get scholars at a specific institution."""
        confidence_levels = self._get_confidence_levels(min_confidence)
        country_normalized = normalize_country(country)
        
        async with db_manager.session() as session:
            pmids = await self._get_run_pmids(session, run_id)
            if not pmids:
                return []
            
            # Get distinct authors
            author_query = select(
                Authorship.author_name_raw,
                func.count(func.distinct(Authorship.pmid)).label('paper_count')
            ).where(
                and_(
                    Authorship.country == country_normalized,
                    Authorship.city == city,
                    Authorship.institution == institution,
                    Authorship.pmid.in_(pmids),
                    Authorship.affiliation_confidence.in_(confidence_levels)
                )
            ).group_by(
                Authorship.author_name_raw
            ).order_by(
                text('paper_count DESC')
            )
            
            result = await session.execute(author_query)
            author_rows = result.all()
            
            # For each author, get their papers with details
            from app.db.models import Paper
            scholars_data = []
            for author_row in author_rows:
                author_name = author_row.author_name_raw
                
                # Get PMIDs for this author at this institution
                pmids_query = select(Authorship.pmid).where(
                    and_(
                        Authorship.author_name_raw == author_name,
                        Authorship.country == country_normalized,
                        Authorship.city == city,
                        Authorship.institution == institution,
                        Authorship.pmid.in_(pmids),
                        Authorship.affiliation_confidence.in_(confidence_levels)
                    )
                ).distinct()
                
                pmids_result = await session.execute(pmids_query)
                author_pmids = [row[0] for row in pmids_result.all()]
                
                # Get paper details
                papers_query = select(Paper).where(Paper.pmid.in_(author_pmids))
                papers_result = await session.execute(papers_query)
                papers = papers_result.scalars().all()
                
                scholars_data.append({
                    "scholar_name": author_name,
                    "paper_count": author_row.paper_count,
                    "papers": [
                        {
                            "pmid": paper.pmid,
                            "title": paper.title,
                            "year": paper.year,
                            "doi": paper.doi
                        }
                        for paper in papers
                    ]
                })
            
            return scholars_data
    
    async def _get_run_pmids(
        self,
        session: AsyncSession,
        run_id: str
    ) -> list[str]:
        """Get all PMIDs for a run."""
        query = select(RunPaper.pmid).where(RunPaper.run_id == run_id)
        result = await session.execute(query)
        return [row[0] for row in result.all()]
    
    def _get_confidence_levels(self, min_confidence: str) -> list[str]:
        """Get confidence levels to include based on minimum."""
        levels_map = {
            "high": ["high"],
            "medium": ["high", "medium"],
            "low": ["high", "medium", "low", "none"],  # Include "none" for "low" to show fallback data
            "none": ["high", "medium", "low", "none"]
        }
        return levels_map.get(min_confidence, ["high", "medium", "low", "none"])

