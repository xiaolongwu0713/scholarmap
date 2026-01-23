"""
Aggregation queries for geographic drill-down map visualization.

Drill-down hierarchy:
1. World → Countries (scholar count, paper count, institution count)
2. Country → Cities (scholar count, institution count)
3. City → Institutions (scholar count)
4. Institution → Scholars (individual scholar details)
"""

from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Any

from app.phase2.database import Database
from app.phase2.geocoding import Geocoder


# Country name normalization mapping
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
    "China (Mainland)": "China",
}


def normalize_country(country: str | None) -> str | None:
    """Normalize country names for consistent aggregation."""
    if not country:
        return None
    return COUNTRY_ALIASES.get(country, country)


class MapAggregator:
    """Aggregates authorship data for hierarchical map visualization."""
    
    def __init__(self, db: Database) -> None:
        self.db = db
        self.geocoder: Geocoder | None = None
    
    def _get_geocoder(self) -> Geocoder:
        """Lazy initialize geocoder."""
        if self.geocoder is None:
            self.geocoder = Geocoder(self.db.get_conn())
        return self.geocoder
    
    async def get_world_map(
        self,
        run_id: str,
        min_confidence: str = "low"
    ) -> list[dict[str, Any]]:
        """
        Get world-level map data: countries with scholar/paper/institution counts.
        
        Args:
            run_id: Run ID to filter by
            min_confidence: Minimum confidence level (high/medium/low/none)
        
        Returns:
            List of dicts with: country, scholar_count, paper_count, institution_count
        """
        confidence_filter = self._get_confidence_filter(min_confidence)
        
        conn = self.db.get_conn()
        try:
            # Get PMIDs for this run
            pmids = self._get_run_pmids(conn, run_id)
            if not pmids:
                return []
            
            pmid_filter = ",".join(f"'{p}'" for p in pmids)
            
            query = f"""
                SELECT 
                    country,
                    COUNT(DISTINCT author_name_raw || '|' || COALESCE(institution, '') || '|' || country) as scholar_count,
                    COUNT(DISTINCT pmid) as paper_count,
                    COUNT(DISTINCT institution) as institution_count
                FROM authorship
                WHERE country IS NOT NULL
                  AND pmid IN ({pmid_filter})
                  AND affiliation_confidence IN ({confidence_filter})
                GROUP BY country
                ORDER BY scholar_count DESC
            """
            
            rows = conn.execute(query).fetchall()
            
            results = []
            geocoder = self._get_geocoder()
            
            for row in rows:
                country = normalize_country(row["country"]) or row["country"]
                
                # Geocode country
                coords = await geocoder.geocode_country(country)
                
                results.append({
                    "country": country,
                    "scholar_count": row["scholar_count"],
                    "paper_count": row["paper_count"],
                    "institution_count": row["institution_count"],
                    "latitude": coords[0] if coords else None,
                    "longitude": coords[1] if coords else None
                })
            
            # Merge normalized countries
            results = self._merge_countries(results)
            
            return results
            
        finally:
            conn.close()
    
    async def get_country_map(
        self,
        run_id: str,
        country: str,
        min_confidence: str = "low"
    ) -> list[dict[str, Any]]:
        """
        Get country-level map data: cities with scholar/institution counts.
        
        Args:
            run_id: Run ID to filter by
            country: Country name to drill into
            min_confidence: Minimum confidence level
        
        Returns:
            List of dicts with: city, scholar_count, institution_count
        """
        confidence_filter = self._get_confidence_filter(min_confidence)
        country_normalized = normalize_country(country) or country
        
        conn = self.db.get_conn()
        try:
            pmids = self._get_run_pmids(conn, run_id)
            if not pmids:
                return []
            
            pmid_filter = ",".join(f"'{p}'" for p in pmids)
            
            query = f"""
                SELECT 
                    city,
                    COUNT(DISTINCT author_name_raw || '|' || COALESCE(institution, '') || '|' || country) as scholar_count,
                    COUNT(DISTINCT institution) as institution_count
                FROM authorship
                WHERE country = ?
                  AND city IS NOT NULL
                  AND pmid IN ({pmid_filter})
                  AND affiliation_confidence IN ({confidence_filter})
                GROUP BY city
                ORDER BY scholar_count DESC
            """
            
            rows = conn.execute(query, (country_normalized,)).fetchall()
            
            results = []
            geocoder = self._get_geocoder()
            
            for row in rows:
                city = row["city"]
                
                # Geocode city with country context
                coords = await geocoder.geocode_city(city, country_normalized)
                
                results.append({
                    "country": country_normalized,
                    "city": city,
                    "scholar_count": row["scholar_count"],
                    "institution_count": row["institution_count"],
                    "latitude": coords[0] if coords else None,
                    "longitude": coords[1] if coords else None
                })
            
            return results
            
        finally:
            conn.close()
    
    def get_city_map(
        self,
        run_id: str,
        country: str,
        city: str,
        min_confidence: str = "low"
    ) -> list[dict[str, Any]]:
        """
        Get city-level map data: institutions with scholar counts.
        
        Args:
            run_id: Run ID to filter by
            country: Country name
            city: City name to drill into
            min_confidence: Minimum confidence level
        
        Returns:
            List of dicts with: institution, scholar_count
        """
        confidence_filter = self._get_confidence_filter(min_confidence)
        country_normalized = normalize_country(country) or country
        
        conn = self.db.get_conn()
        try:
            pmids = self._get_run_pmids(conn, run_id)
            if not pmids:
                return []
            
            pmid_filter = ",".join(f"'{p}'" for p in pmids)
            
            query = f"""
                SELECT 
                    institution,
                    COUNT(DISTINCT author_name_raw || '|' || COALESCE(institution, '') || '|' || country) as scholar_count
                FROM authorship
                WHERE country = ?
                  AND city = ?
                  AND institution IS NOT NULL
                  AND pmid IN ({pmid_filter})
                  AND affiliation_confidence IN ({confidence_filter})
                GROUP BY institution
                ORDER BY scholar_count DESC
            """
            
            rows = conn.execute(query, (country_normalized, city)).fetchall()
            
            results = []
            for row in rows:
                results.append({
                    "country": country_normalized,
                    "city": city,
                    "institution": row["institution"],
                    "scholar_count": row["scholar_count"]
                })
            
            return results
            
        finally:
            conn.close()
    
    def get_institution_scholars(
        self,
        run_id: str,
        institution: str,
        country: str | None = None,
        city: str | None = None,
        min_confidence: str = "low",
        limit: int = 100,
        offset: int = 0
    ) -> dict[str, Any]:
        """
        Get scholar list for an institution with career metrics.
        
        Args:
            run_id: Run ID to filter by
            institution: Institution name
            country: Optional country filter
            city: Optional city filter
            min_confidence: Minimum confidence level
            limit: Max results per page
            offset: Pagination offset
        
        Returns:
            Dict with: scholars (list), total_count, limit, offset
        """
        confidence_filter = self._get_confidence_filter(min_confidence)
        country_normalized = normalize_country(country) if country else None
        
        conn = self.db.get_conn()
        try:
            pmids = self._get_run_pmids(conn, run_id)
            if not pmids:
                return {"scholars": [], "total_count": 0, "limit": limit, "offset": offset}
            
            pmid_filter = ",".join(f"'{p}'" for p in pmids)
            
            # Build WHERE clause
            where_clauses = [
                f"institution = ?",
                f"pmid IN ({pmid_filter})",
                f"affiliation_confidence IN ({confidence_filter})"
            ]
            params = [institution]
            
            if country_normalized:
                where_clauses.append("country = ?")
                params.append(country_normalized)
            
            if city:
                where_clauses.append("city = ?")
                params.append(city)
            
            where_clause = " AND ".join(where_clauses)
            
            # Get scholars with metrics
            query = f"""
                SELECT 
                    author_name_raw as name,
                    COUNT(DISTINCT pmid) as paper_count,
                    MIN(year) as career_start_year,
                    MAX(year) as career_end_year,
                    MIN(author_order) as min_order
                FROM authorship
                WHERE {where_clause}
                GROUP BY author_name_raw
                ORDER BY paper_count DESC, min_order ASC
                LIMIT ? OFFSET ?
            """
            
            rows = conn.execute(query, params + [limit, offset]).fetchall()
            
            scholars = []
            for row in rows:
                scholars.append({
                    "name": row["name"],
                    "paper_count": row["paper_count"],
                    "career_start_year": row["career_start_year"],
                    "career_end_year": row["career_end_year"],
                    "is_likely_pi": row["min_order"] == 1  # First author at least once
                })
            
            # Get total count
            count_query = f"""
                SELECT COUNT(DISTINCT author_name_raw) as total
                FROM authorship
                WHERE {where_clause}
            """
            total = conn.execute(count_query, params).fetchone()["total"]
            
            return {
                "scholars": scholars,
                "total_count": total,
                "limit": limit,
                "offset": offset
            }
            
        finally:
            conn.close()
    
    def _get_run_pmids(self, conn: sqlite3.Connection, run_id: str) -> list[str]:
        """Get all PMIDs for a run."""
        rows = conn.execute("""
            SELECT pmid FROM run_papers WHERE run_id = ?
        """, (run_id,)).fetchall()
        
        pmids = [row["pmid"] for row in rows]
        
        # Fallback: if no run_papers link, get all PMIDs (for testing)
        if not pmids:
            rows = conn.execute("SELECT pmid FROM papers").fetchall()
            pmids = [row["pmid"] for row in rows]
        
        return pmids
    
    def _get_confidence_filter(self, min_confidence: str) -> str:
        """Convert min_confidence to SQL IN clause values."""
        confidence_levels = {
            "high": ["'high'"],
            "medium": ["'high'", "'medium'"],
            "low": ["'high'", "'medium'", "'low'"],
            "none": ["'high'", "'medium'", "'low'", "'none'"]
        }
        return ",".join(confidence_levels.get(min_confidence, confidence_levels["low"]))
    
    def _merge_countries(self, results: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Merge countries with same normalized name."""
        merged: dict[str, dict[str, Any]] = {}
        
        for item in results:
            country = item["country"]
            if country in merged:
                merged[country]["scholar_count"] += item["scholar_count"]
                merged[country]["paper_count"] += item["paper_count"]
                merged[country]["institution_count"] += item["institution_count"]
            else:
                merged[country] = item.copy()
        
        return sorted(merged.values(), key=lambda x: x["scholar_count"], reverse=True)

