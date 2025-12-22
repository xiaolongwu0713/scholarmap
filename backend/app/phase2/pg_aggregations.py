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
            
            # Add geocoding and merge normalized countries
            geocoder = self._get_geocoder()
            country_map: dict[str, dict[str, Any]] = {}
            
            for row in rows:
                country = normalize_country(row.country)
                if not country:
                    continue
                
                # Merge countries with same normalized name
                if country in country_map:
                    # Aggregate counts
                    country_map[country]["scholar_count"] += row.scholar_count
                    country_map[country]["paper_count"] += row.paper_count
                    country_map[country]["institution_count"] += row.institution_count
                else:
                    # First occurrence, get coordinates
                    coords = await geocoder.get_coordinates(country, None)
                    country_map[country] = {
                        "country": country,
                        "scholar_count": row.scholar_count,
                        "paper_count": row.paper_count,
                        "institution_count": row.institution_count,
                        "latitude": coords[0] if coords else None,
                        "longitude": coords[1] if coords else None
                    }
            
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
                func.count(func.distinct(Authorship.institution)).label('institution_count')
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
            
            # Add geocoding
            geocoder = self._get_geocoder()
            items = []
            for row in rows:
                coords = await geocoder.get_coordinates(country_normalized, row.city)
                items.append({
                    "city": row.city,
                    "scholar_count": row.scholar_count,
                    "institution_count": row.institution_count,
                    "latitude": coords[0] if coords else None,
                    "longitude": coords[1] if coords else None
                })
            
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
            
            query = select(
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
            
            result = await session.execute(query)
            rows = result.all()
            
            return [
                {
                    "scholar_name": row.author_name_raw,
                    "paper_count": row.paper_count
                }
                for row in rows
            ]
    
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

