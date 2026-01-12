"""Repository for resource monitoring operations."""
from __future__ import annotations

from datetime import datetime, timezone, date, timedelta
from typing import Any

from sqlalchemy import delete, select, func, text, insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.db.models import (
    ResourceSnapshot,
    UserActivity,
    User,
    Project,
    Run,
    Paper,
    Authorship,
    RunPaper,
    AffiliationCache,
    GeocodingCache,
    InstitutionGeo,
    EmailVerificationCode,
)


def _utc_now() -> datetime:
    """Get current UTC datetime."""
    return datetime.now(timezone.utc)


class ResourceMonitorRepository:
    """Repository for resource monitoring operations."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def get_table_row_counts(self) -> dict[str, int]:
        """Get row counts for all tables."""
        counts = {}
        
        # Count each table
        tables = [
            ("users", User),
            ("projects", Project),
            ("runs", Run),
            ("papers", Paper),
            ("authorship", Authorship),
            ("run_papers", RunPaper),
            ("affiliation_cache", AffiliationCache),
            ("geocoding_cache", GeocodingCache),
            ("institution_geo", InstitutionGeo),
            ("email_verification_codes", EmailVerificationCode),
        ]
        
        for name, model in tables:
            result = await self.session.execute(select(func.count()).select_from(model))
            counts[name] = result.scalar() or 0
        
        return counts
    
    async def get_table_disk_sizes(self) -> dict[str, float]:
        """Get disk sizes (MB) for all tables."""
        # Query PostgreSQL system tables for disk usage
        query = text("""
            SELECT 
                tablename,
                pg_total_relation_size(schemaname||'.'||tablename) / (1024.0 * 1024.0) AS size_mb
            FROM pg_tables
            WHERE schemaname = 'public'
            AND tablename IN (
                'users', 'projects', 'runs', 'papers', 'authorship', 
                'run_papers', 'affiliation_cache', 'geocoding_cache', 
                'institution_geo', 'email_verification_codes'
            )
        """)
        
        result = await self.session.execute(query)
        rows = result.fetchall()
        
        sizes = {row[0]: float(row[1]) for row in rows}
        
        # Ensure all tables are present (default to 0 if not found)
        table_names = [
            "users", "projects", "runs", "papers", "authorship",
            "run_papers", "affiliation_cache", "geocoding_cache",
            "institution_geo", "email_verification_codes"
        ]
        
        for name in table_names:
            if name not in sizes:
                sizes[name] = 0.0
        
        return sizes
    
    async def take_snapshot(self) -> ResourceSnapshot:
        """
        Take a resource snapshot and save to database.
        Uses UPSERT to ensure only one snapshot per day.
        """
        now = _utc_now()
        today = now.date()
        
        # Get metrics
        counts = await self.get_table_row_counts()
        sizes = await self.get_table_disk_sizes()
        total_size = sum(sizes.values())
        
        # Prepare snapshot data
        snapshot_data = {
            "snapshot_date": today,
            "snapshot_time": now,
            # Row counts
            "users_count": counts["users"],
            "projects_count": counts["projects"],
            "runs_count": counts["runs"],
            "papers_count": counts["papers"],
            "authorship_count": counts["authorship"],
            "run_papers_count": counts["run_papers"],
            "affiliation_cache_count": counts["affiliation_cache"],
            "geocoding_cache_count": counts["geocoding_cache"],
            "institution_geo_count": counts["institution_geo"],
            "email_verification_codes_count": counts["email_verification_codes"],
            # Disk sizes
            "total_disk_size_mb": total_size,
            "users_disk_mb": sizes["users"],
            "projects_disk_mb": sizes["projects"],
            "runs_disk_mb": sizes["runs"],
            "papers_disk_mb": sizes["papers"],
            "authorship_disk_mb": sizes["authorship"],
            "run_papers_disk_mb": sizes["run_papers"],
            "affiliation_cache_disk_mb": sizes["affiliation_cache"],
            "geocoding_cache_disk_mb": sizes["geocoding_cache"],
            "institution_geo_disk_mb": sizes["institution_geo"],
            "email_verification_codes_disk_mb": sizes["email_verification_codes"],
        }
        
        # UPSERT: Insert or update if snapshot_date already exists
        stmt = pg_insert(ResourceSnapshot).values(**snapshot_data)
        stmt = stmt.on_conflict_do_update(
            index_elements=["snapshot_date"],
            set_={
                "snapshot_time": stmt.excluded.snapshot_time,
                "users_count": stmt.excluded.users_count,
                "projects_count": stmt.excluded.projects_count,
                "runs_count": stmt.excluded.runs_count,
                "papers_count": stmt.excluded.papers_count,
                "authorship_count": stmt.excluded.authorship_count,
                "run_papers_count": stmt.excluded.run_papers_count,
                "affiliation_cache_count": stmt.excluded.affiliation_cache_count,
                "geocoding_cache_count": stmt.excluded.geocoding_cache_count,
                "institution_geo_count": stmt.excluded.institution_geo_count,
                "email_verification_codes_count": stmt.excluded.email_verification_codes_count,
                "total_disk_size_mb": stmt.excluded.total_disk_size_mb,
                "users_disk_mb": stmt.excluded.users_disk_mb,
                "projects_disk_mb": stmt.excluded.projects_disk_mb,
                "runs_disk_mb": stmt.excluded.runs_disk_mb,
                "papers_disk_mb": stmt.excluded.papers_disk_mb,
                "authorship_disk_mb": stmt.excluded.authorship_disk_mb,
                "run_papers_disk_mb": stmt.excluded.run_papers_disk_mb,
                "affiliation_cache_disk_mb": stmt.excluded.affiliation_cache_disk_mb,
                "geocoding_cache_disk_mb": stmt.excluded.geocoding_cache_disk_mb,
                "institution_geo_disk_mb": stmt.excluded.institution_geo_disk_mb,
                "email_verification_codes_disk_mb": stmt.excluded.email_verification_codes_disk_mb,
                "updated_at": now,
            }
        ).returning(ResourceSnapshot)
        
        result = await self.session.execute(stmt)
        snapshot = result.scalar_one()
        await self.session.commit()
        
        return snapshot
    
    async def get_snapshots(self, days: int = 30) -> list[ResourceSnapshot]:
        """Get resource snapshots for the last N days."""
        cutoff_date = date.today() - timedelta(days=days)
        
        result = await self.session.execute(
            select(ResourceSnapshot)
            .where(ResourceSnapshot.snapshot_date >= cutoff_date)
            .order_by(ResourceSnapshot.snapshot_date.asc())
        )
        
        return list(result.scalars().all())
    
    async def cleanup_old_snapshots(self, keep_days: int = 90) -> int:
        """Delete snapshots older than keep_days. Returns count of deleted rows."""
        cutoff_date = date.today() - timedelta(days=keep_days)
        
        result = await self.session.execute(
            delete(ResourceSnapshot)
            .where(ResourceSnapshot.snapshot_date < cutoff_date)
        )
        
        await self.session.commit()
        return result.rowcount or 0


class UserActivityRepository:
    """Repository for user activity tracking."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def update_activity(self, user_id: str) -> None:
        """Update last activity time for a user (UPSERT)."""
        now = _utc_now()
        
        stmt = pg_insert(UserActivity).values(
            user_id=user_id,
            last_active_at=now,
            created_at=now,
            updated_at=now
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=["user_id"],
            set_={
                "last_active_at": stmt.excluded.last_active_at,
                "updated_at": stmt.excluded.updated_at,
            }
        )
        
        await self.session.execute(stmt)
        await self.session.commit()
    
    async def get_online_user_count(self, minutes: int = 5) -> int:
        """Get count of users active in the last N minutes."""
        cutoff_time = _utc_now() - timedelta(minutes=minutes)
        
        result = await self.session.execute(
            select(func.count(func.distinct(UserActivity.user_id)))
            .where(UserActivity.last_active_at > cutoff_time)
        )
        
        return result.scalar() or 0
    
    async def cleanup_old_activity(self, keep_days: int = 30) -> int:
        """Delete activity records older than keep_days. Returns count of deleted rows."""
        cutoff_time = _utc_now() - timedelta(days=keep_days)
        
        result = await self.session.execute(
            delete(UserActivity)
            .where(UserActivity.last_active_at < cutoff_time)
        )
        
        await self.session.commit()
        return result.rowcount or 0
