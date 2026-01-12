"""SQLAlchemy models for ScholarMap database."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import JSON, Boolean, DateTime, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Base class for all models."""
    pass


class User(Base):
    """User model."""
    __tablename__ = "users"
    
    user_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )


class EmailVerificationCode(Base):
    """Email verification code model."""
    __tablename__ = "email_verification_codes"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(10), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    __table_args__ = (
        Index("idx_email_code_active", "email", "code", "used"),
    )


class Project(Base):
    """Project model."""
    __tablename__ = "projects"
    
    project_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )


class Run(Base):
    """Run model."""
    __tablename__ = "runs"
    
    run_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    project_id: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        index=True
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    
    # Phase 1 data stored as JSON
    understanding: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    keywords: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    queries: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    results: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    retrieval_framework: Mapped[str | None] = mapped_column(Text, nullable=True)


class Paper(Base):
    """Paper model (Phase 2)."""
    __tablename__ = "papers"
    
    pmid: Mapped[str] = mapped_column(String(32), primary_key=True)
    year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    doi: Mapped[str | None] = mapped_column(String(255), nullable=True)
    xml_stored: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )


class Authorship(Base):
    """Authorship model (Phase 2)."""
    __tablename__ = "authorship"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    pmid: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    author_order: Mapped[int] = mapped_column(Integer, nullable=False)
    
    # Author identification
    author_name_raw: Mapped[str] = mapped_column(String(500), nullable=False)
    last_name: Mapped[str] = mapped_column(String(255), nullable=False)
    fore_name: Mapped[str] = mapped_column(String(255), nullable=False)
    initials: Mapped[str] = mapped_column(String(50), nullable=False)
    suffix: Mapped[str] = mapped_column(String(50), nullable=False)
    is_collective: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    collective_name: Mapped[str] = mapped_column(String(500), nullable=False)
    
    # Temporal
    year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    
    # Affiliation (raw)
    affiliations_raw: Mapped[str] = mapped_column(Text, nullable=False)  # JSON array
    affiliation_raw_joined: Mapped[str] = mapped_column(Text, nullable=False)
    has_author_affiliation: Mapped[bool] = mapped_column(Boolean, nullable=False)
    
    # Geographic extraction (from LLM)
    country: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    city: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    institution: Mapped[str | None] = mapped_column(String(500), nullable=True)
    affiliation_confidence: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="none"
    )
    
    __table_args__ = (
        Index("idx_authorship_pmid_order", "pmid", "author_order"),
        Index("idx_authorship_country_city", "country", "city"),
    )


class RunPaper(Base):
    """Run-Paper association (Phase 2)."""
    __tablename__ = "run_papers"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    pmid: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    added_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    
    __table_args__ = (
        Index("idx_run_papers_unique", "run_id", "pmid", unique=True),
    )


class AffiliationCache(Base):
    """Affiliation extraction cache (Phase 2)."""
    __tablename__ = "affiliation_cache"
    
    affiliation_raw: Mapped[str] = mapped_column(Text, primary_key=True)
    country: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str | None] = mapped_column(String(255), nullable=True)
    institution: Mapped[str | None] = mapped_column(String(500), nullable=True)
    confidence: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )


class GeocodingCache(Base):
    """Geocoding cache (Phase 2)."""
    __tablename__ = "geocoding_cache"
    
    location_key: Mapped[str] = mapped_column(String(500), primary_key=True)
    latitude: Mapped[float | None] = mapped_column(nullable=True)
    longitude: Mapped[float | None] = mapped_column(nullable=True)
    affiliations: Mapped[list[str] | None] = mapped_column(JSONB, nullable=True)  # Array of affiliation strings
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )


class InstitutionGeo(Base):
    """Institution geographic information (QS top 500 and major research institutions)."""
    __tablename__ = "institution_geo"
    
    institution_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    primary_name: Mapped[str] = mapped_column(Text, nullable=False)  # Official institution name
    normalized_name: Mapped[str] = mapped_column(Text, nullable=False, index=True)  # Normalized version of primary_name for matching
    aliases: Mapped[list[str] | None] = mapped_column(JSONB, nullable=True)  # Alternative names/variants (normalized)
    country: Mapped[str] = mapped_column(String(255), nullable=False)
    city: Mapped[str | None] = mapped_column(String(255), nullable=True)
    qs_rank: Mapped[int | None] = mapped_column(Integer, nullable=True)  # QS World University Ranking
    ror_id: Mapped[str | None] = mapped_column(String(50), nullable=True)  # Research Organization Registry ID
    source: Mapped[str] = mapped_column(String(50), nullable=False)  # 'qs', 'ror', 'manual', 'auto_added' (automatically added during extraction)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )
    
    # Indexes:
    # - normalized_name: index=True (for exact matching)
    # - aliases: GIN index on JSONB (for alias matching, created via SQL script)
    # - (country, city): composite index for geographic queries (created via SQL script)


class ResourceSnapshot(Base):
    """Resource snapshot for monitoring database metrics."""
    __tablename__ = "resource_snapshots"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    snapshot_date: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False, unique=True, index=True)  # Date only, unique per day
    snapshot_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)  # Actual execution time
    
    # Metric 1: Table row counts
    users_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    projects_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    runs_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    papers_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    authorship_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    run_papers_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    affiliation_cache_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    geocoding_cache_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    institution_geo_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    email_verification_codes_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    
    # Metric 2: Disk space (MB)
    total_disk_size_mb: Mapped[float] = mapped_column(nullable=False, default=0.0)
    users_disk_mb: Mapped[float] = mapped_column(nullable=False, default=0.0)
    projects_disk_mb: Mapped[float] = mapped_column(nullable=False, default=0.0)
    runs_disk_mb: Mapped[float] = mapped_column(nullable=False, default=0.0)
    papers_disk_mb: Mapped[float] = mapped_column(nullable=False, default=0.0)
    authorship_disk_mb: Mapped[float] = mapped_column(nullable=False, default=0.0)
    run_papers_disk_mb: Mapped[float] = mapped_column(nullable=False, default=0.0)
    affiliation_cache_disk_mb: Mapped[float] = mapped_column(nullable=False, default=0.0)
    geocoding_cache_disk_mb: Mapped[float] = mapped_column(nullable=False, default=0.0)
    institution_geo_disk_mb: Mapped[float] = mapped_column(nullable=False, default=0.0)
    email_verification_codes_disk_mb: Mapped[float] = mapped_column(nullable=False, default=0.0)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )


class UserActivity(Base):
    """User activity tracking for online user monitoring."""
    __tablename__ = "user_activity"
    
    user_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    last_active_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

