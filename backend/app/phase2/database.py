"""Database utilities for Phase 2."""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any

from app.phase2.models import GeoData
from app.phase2.schema import get_connection, get_db_path, init_database


class Database:
    """Database wrapper for Phase 2 operations."""
    
    def __init__(self, project_id: str, data_dir: Path) -> None:
        self.db_path = get_db_path(project_id, data_dir)
        self.project_id = project_id
        
        # Initialize schema if needed
        if not self.db_path.exists():
            init_database(self.db_path)
    
    def get_conn(self) -> sqlite3.Connection:
        """Get a new database connection."""
        return get_connection(self.db_path)
    
    def get_cached_pmids(self, pmids: list[str]) -> set[str]:
        """Get PMIDs that are already in the database."""
        if not pmids:
            return set()
        
        conn = self.get_conn()
        try:
            placeholders = ",".join("?" * len(pmids))
            query = f"SELECT pmid FROM papers WHERE pmid IN ({placeholders})"
            rows = conn.execute(query, pmids).fetchall()
            return {row["pmid"] for row in rows}
        finally:
            conn.close()
    
    def insert_paper(
        self,
        conn: sqlite3.Connection,
        pmid: str,
        year: int | None,
        title: str,
        doi: str | None,
        xml_stored: str | None = None
    ) -> None:
        """Insert a paper record."""
        conn.execute("""
            INSERT OR REPLACE INTO papers (pmid, year, title, doi, xml_stored)
            VALUES (?, ?, ?, ?, ?)
        """, (pmid, year, title, doi, xml_stored))
    
    def insert_authorship(
        self,
        conn: sqlite3.Connection,
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
        conn.execute("""
            INSERT INTO authorship (
                pmid, author_order, author_name_raw,
                last_name, fore_name, initials, suffix,
                is_collective, collective_name,
                year,
                affiliations_raw, affiliation_raw_joined, has_author_affiliation,
                country, city, institution, affiliation_confidence
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            pmid, author_order, author_name_raw,
            last_name, fore_name, initials, suffix,
            is_collective, collective_name,
            year,
            json.dumps(affiliations_raw), affiliation_raw_joined, has_author_affiliation,
            country, city, institution, affiliation_confidence
        ))
    
    def link_run_to_papers(
        self,
        conn: sqlite3.Connection,
        run_id: str,
        pmids: list[str]
    ) -> None:
        """Link a run to its papers."""
        for pmid in pmids:
            conn.execute("""
                INSERT OR IGNORE INTO run_papers (run_id, pmid)
                VALUES (?, ?)
            """, (run_id, pmid))
    
    def get_cached_affiliation(self, affiliation_raw: str) -> GeoData | None:
        """Get cached geo data for an affiliation string."""
        conn = self.get_conn()
        try:
            row = conn.execute("""
                SELECT country, city, institution, confidence
                FROM affiliation_cache
                WHERE affiliation_raw = ?
            """, (affiliation_raw,)).fetchone()
            
            if row:
                return GeoData(
                    country=row["country"],
                    city=row["city"],
                    institution=row["institution"],
                    confidence=row["confidence"]
                )
            return None
        finally:
            conn.close()
    
    def cache_affiliations(self, affiliation_map: dict[str, GeoData]) -> None:
        """Cache extracted affiliation geo data."""
        conn = self.get_conn()
        try:
            for affiliation_raw, geo in affiliation_map.items():
                conn.execute("""
                    INSERT OR REPLACE INTO affiliation_cache
                    (affiliation_raw, country, city, institution, confidence)
                    VALUES (?, ?, ?, ?, ?)
                """, (affiliation_raw, geo.country, geo.city, geo.institution, geo.confidence))
            conn.commit()
        finally:
            conn.close()
    
    def get_run_pmids(self, run_id: str) -> list[str]:
        """Get all PMIDs for a run."""
        conn = self.get_conn()
        try:
            rows = conn.execute("""
                SELECT pmid FROM run_papers
                WHERE run_id = ?
                ORDER BY added_at
            """, (run_id,)).fetchall()
            return [row["pmid"] for row in rows]
        finally:
            conn.close()

