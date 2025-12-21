"""SQLite schema for Phase 2: authorship and geographic mapping."""

from __future__ import annotations

import sqlite3
from pathlib import Path


# Schema version for migrations
SCHEMA_VERSION = 1


def get_db_path(project_id: str, data_dir: Path) -> Path:
    """Get database path for a project."""
    return data_dir / "projects" / project_id / "scholarnet.db"


def init_database(db_path: Path) -> None:
    """Initialize SQLite database with required schema."""
    db_path.parent.mkdir(parents=True, exist_ok=True)
    
    conn = sqlite3.connect(db_path)
    try:
        _create_tables(conn)
        _create_indexes(conn)
        conn.commit()
    finally:
        conn.close()


def _create_tables(conn: sqlite3.Connection) -> None:
    """Create all required tables."""
    
    # Schema metadata
    conn.execute("""
        CREATE TABLE IF NOT EXISTS schema_version (
            version INTEGER PRIMARY KEY,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    conn.execute("""
        INSERT OR IGNORE INTO schema_version (version) VALUES (?)
    """, (SCHEMA_VERSION,))
    
    # Papers table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS papers (
            pmid TEXT PRIMARY KEY,
            year INTEGER,
            title TEXT,
            doi TEXT,
            fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            xml_stored TEXT
        )
    """)
    
    # Authorship fact table (one row per author per paper)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS authorship (
            authorship_id INTEGER PRIMARY KEY AUTOINCREMENT,
            pmid TEXT NOT NULL,
            author_order INTEGER NOT NULL,
            
            -- Author name components
            author_name_raw TEXT NOT NULL,
            last_name TEXT,
            fore_name TEXT,
            initials TEXT,
            suffix TEXT,
            is_collective BOOLEAN DEFAULT 0,
            collective_name TEXT,
            
            -- Year denormalized for easy filtering
            year INTEGER,
            
            -- Raw affiliations (JSON array of strings)
            affiliations_raw TEXT,
            affiliation_raw_joined TEXT,
            has_author_affiliation BOOLEAN DEFAULT 0,
            
            -- Extracted geographic data (nullable)
            country TEXT,
            city TEXT,
            institution TEXT,
            affiliation_confidence TEXT CHECK(affiliation_confidence IN ('high', 'medium', 'low', 'none')),
            
            -- For future author disambiguation
            author_id TEXT,
            
            FOREIGN KEY (pmid) REFERENCES papers(pmid)
        )
    """)
    
    # Run-papers junction (track which papers belong to which run)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS run_papers (
            run_id TEXT NOT NULL,
            pmid TEXT NOT NULL,
            added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (run_id, pmid),
            FOREIGN KEY (pmid) REFERENCES papers(pmid)
        )
    """)
    
    # Affiliation lookup cache (for LLM extraction deduplication)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS affiliation_cache (
            affiliation_raw TEXT PRIMARY KEY,
            country TEXT,
            city TEXT,
            institution TEXT,
            confidence TEXT CHECK(confidence IN ('high', 'medium', 'low', 'none')),
            extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)


def _create_indexes(conn: sqlite3.Connection) -> None:
    """Create indexes for common queries."""
    
    # Authorship queries
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_authorship_pmid 
        ON authorship(pmid)
    """)
    
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_authorship_country 
        ON authorship(country)
    """)
    
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_authorship_year 
        ON authorship(year)
    """)
    
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_authorship_confidence 
        ON authorship(affiliation_confidence)
    """)
    
    # Run queries
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_run_papers_run_id 
        ON run_papers(run_id)
    """)
    
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_run_papers_pmid 
        ON run_papers(pmid)
    """)


def get_connection(db_path: Path) -> sqlite3.Connection:
    """Get a database connection with row factory."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

