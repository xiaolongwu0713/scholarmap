#!/usr/bin/env python3
"""
Run database migration for resource monitoring tables.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

# Add repo root and backend to path
repo_root = Path(__file__).resolve().parent.parent
backend_dir = repo_root / "backend"
sys.path.insert(0, str(repo_root))
sys.path.insert(0, str(backend_dir))

import config
from sqlalchemy import create_engine, text


def run_migration():
    """Execute the SQL migration script."""
    settings = config.settings
    
    if not settings.database_url:
        print("ERROR: DATABASE_URL not configured")
        sys.exit(1)
    
    # Read SQL script
    sql_file = repo_root / "scripts" / "create_resource_monitoring_tables.sql"
    with open(sql_file, "r") as f:
        sql_script = f.read()
    
    print(f"Connecting to database...")
    print(f"Executing migration: {sql_file.name}")
    
    # Create synchronous engine
    engine = create_engine(settings.database_url, echo=False)
    
    try:
        with engine.begin() as conn:
            # Execute SQL statements
            conn.execute(text(sql_script))
            print("✅ Migration completed successfully!")
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        engine.dispose()


if __name__ == "__main__":
    run_migration()
