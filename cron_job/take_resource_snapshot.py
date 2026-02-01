#!/usr/bin/env python3
"""
Take a resource snapshot for monitoring.

This script:
1. Connects to the database
2. Collects table row counts and disk sizes
3. Saves snapshot to resource_snapshots table (UPSERT by date)

Usage:
    python cron_job/take_resource_snapshot.py

Designed to be run by cron daily at 09:00.
If run multiple times on the same day, it updates (not duplicates) the snapshot.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path
from datetime import datetime

# Add repo root and backend to path
repo_root = Path(__file__).resolve().parent.parent
backend_dir = repo_root / "backend"
sys.path.insert(0, str(repo_root))
sys.path.insert(0, str(backend_dir))

# Import config and dependencies
import config
from app.db.connection import db_manager
from app.db.resource_monitor_repository import ResourceMonitorRepository


async def main():
    """Main function to take resource snapshot."""
    settings = config.settings
    
    if not settings.database_url:
        print("ERROR: DATABASE_URL not configured")
        sys.exit(1)
    
    # Initialize database connection
    db_manager.initialize(settings.database_url)
    
    try:
        print("=" * 80)
        print(f"[{datetime.now().isoformat()}] Starting resource snapshot...")
        print("=" * 80)
        
        # Take snapshot
        async with db_manager.session() as session:
            repo = ResourceMonitorRepository(session)
            
            print("Collecting table row counts...")
            counts = await repo.get_table_row_counts()
            for table, count in counts.items():
                print(f"  {table}: {count:,} rows")
            
            print("\nCollecting disk sizes...")
            sizes = await repo.get_table_disk_sizes()
            total_size = sum(sizes.values())
            print(f"  Total: {total_size:.2f} MB")
            for table, size in sizes.items():
                print(f"  {table}: {size:.2f} MB")
            
            print("\nSaving snapshot...")
            snapshot = await repo.take_snapshot()
            
            print("=" * 80)
            print(f"✅ Snapshot saved successfully!")
            print(f"   Snapshot ID: {snapshot.id}")
            print(f"   Snapshot Date: {snapshot.snapshot_date}")
            print(f"   Snapshot Time: {snapshot.snapshot_time}")
            print(f"   Total Users: {snapshot.users_count}")
            print(f"   Total Runs: {snapshot.runs_count}")
            print(f"   Total Disk: {snapshot.total_disk_size_mb:.2f} MB")
            print("=" * 80)
        
    except Exception as e:
        print("=" * 80)
        print(f"❌ ERROR: Failed to take snapshot")
        print(f"   {type(e).__name__}: {e}")
        print("=" * 80)
        import traceback
        traceback.print_exc()
        sys.exit(1)
    
    finally:
        # Close database connection
        await db_manager.close()
        print("Database connection closed")


if __name__ == "__main__":
    asyncio.run(main())
