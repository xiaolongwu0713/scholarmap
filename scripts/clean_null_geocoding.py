#!/usr/bin/env python3
"""
Script to clean null geocoding cache records for a specific run.

This script:
1. Finds all null geocoding_cache records that are used by a specific run
2. Deletes those null records to force re-geocoding during validation
3. This allows validation to re-attempt geocoding after LLM fixes affiliations

⚠️  IMPORTANT: This script deletes data from the database. Use with caution.

⚠️  NOTE: Make sure you're in the correct Python environment with dependencies installed.
   If you see "ModuleNotFoundError", install dependencies:
   cd backend && pip install -r requirements.txt

Usage:
    python scripts/clean_null_geocoding.py <run_id> [--dry-run] [--database-url URL]

Examples:
    # Dry run (show what would be deleted without actually deleting)
    python scripts/clean_null_geocoding.py run_7b1d4766fd27 --dry-run

    # Actually delete null records
    python scripts/clean_null_geocoding.py run_7b1d4766fd27

    # Custom database URL
    python scripts/clean_null_geocoding.py run_7b1d4766fd27 --database-url postgresql://...
"""

import argparse
import sys
from pathlib import Path

# Add backend to path (same pattern as setup_super_user.py)
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))  # Add backend to path for app imports
sys.path.insert(0, str(backend_dir.parent))  # Add repo root to path for config

import config
settings = config.settings
from app.db.connection import db_manager
from app.db.models import Authorship, GeocodingCache, RunPaper
from app.db.repository import AuthorshipRepository, RunPaperRepository
from app.phase2.pg_geocoding import PostgresGeocoder
from sqlalchemy import and_, select


async def find_null_geocoding_for_run(run_id: str) -> list[str]:
    """Find all location_keys with null coordinates used by a run."""
    async with db_manager.session() as session:
        # Get PMIDs for this run
        run_paper_repo = RunPaperRepository(session)
        pmids = await run_paper_repo.get_run_pmids(run_id)
        
        if not pmids:
            print(f"⚠️  No PMIDs found for run {run_id}")
            return []
        
        # Get all authorships for these PMIDs
        auth_repo = AuthorshipRepository(session)
        authorships = await auth_repo.get_authorships_by_pmids(pmids)
        
        # Collect unique location keys with null coordinates
        null_location_keys = set()
        for auth in authorships:
            if not auth.country:
                continue
            
            location_key = PostgresGeocoder.make_location_key(
                auth.country,
                auth.city
            )
            null_location_keys.add(location_key)
        
        # Check which of these are actually null in geocoding_cache
        if not null_location_keys:
            return []
        
        result = await session.execute(
            select(GeocodingCache).where(
                and_(
                    GeocodingCache.location_key.in_(list(null_location_keys)),
                    GeocodingCache.latitude.is_(None)
                )
            )
        )
        null_records = result.scalars().all()
        
        return [record.location_key for record in null_records]


async def delete_null_geocoding(location_keys: list[str], dry_run: bool = False) -> int:
    """Delete null geocoding cache records."""
    if not location_keys:
        print("No null geocoding records to delete")
        return 0
    
    if dry_run:
        print(f"\n🔍 DRY RUN: Would delete {len(location_keys)} null geocoding records:")
        for key in sorted(location_keys):
            print(f"   - {key}")
        return len(location_keys)
    
    async with db_manager.session() as session:
        result = await session.execute(
            select(GeocodingCache).where(
                GeocodingCache.location_key.in_(location_keys)
            )
        )
        records = result.scalars().all()
        
        deleted_count = 0
        for record in records:
            await session.delete(record)
            deleted_count += 1
        
        await session.commit()
        return deleted_count


async def main():
    parser = argparse.ArgumentParser(
        description="Clean null geocoding cache records for a specific run",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    parser.add_argument("run_id", help="Run ID")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be deleted without actually deleting")
    parser.add_argument("--database-url", help="Database URL (default: from config)")
    
    args = parser.parse_args()
    
    # Initialize database
    db_url = args.database_url or settings.database_url
    if not db_url:
        print("❌ Error: DATABASE_URL not configured", file=sys.stderr)
        sys.exit(1)
    
    db_manager.initialize(db_url)
    
    try:
        print(f"🔍 Finding null geocoding records for run {args.run_id}...")
        null_keys = await find_null_geocoding_for_run(args.run_id)
        
        if not null_keys:
            print("✅ No null geocoding records found for this run")
            return
        
        print(f"📊 Found {len(null_keys)} null geocoding records")
        
        deleted = await delete_null_geocoding(null_keys, dry_run=args.dry_run)
        
        if args.dry_run:
            print(f"\n✅ Dry run complete: {deleted} records would be deleted")
            print("   Run without --dry-run to actually delete")
        else:
            print(f"\n✅ Deleted {deleted} null geocoding records")
            print("   You can now run trigger_validation.py to re-validate and fix")
            
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        await db_manager.close()


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())

