#!/usr/bin/env python3
"""
Run arbitrary SQL script against the database.

Usage:
    python scripts/run_sql_script.py <sql_file_path>
    
Example:
    python scripts/run_sql_script.py scripts/fix_china_mainland_country.sql
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Add repo root and backend to path
repo_root = Path(__file__).resolve().parent.parent
backend_dir = repo_root / "backend"
sys.path.insert(0, str(repo_root))
sys.path.insert(0, str(backend_dir))

import config
from sqlalchemy import create_engine, text


def run_sql_script(sql_file_path: str, dry_run: bool = False):
    """Execute an SQL script against the database."""
    settings = config.settings
    
    if not settings.database_url:
        print("ERROR: DATABASE_URL not configured")
        sys.exit(1)
    
    # Resolve SQL file path
    sql_path = Path(sql_file_path)
    if not sql_path.is_absolute():
        # Try relative to repo root first
        sql_path = repo_root / sql_file_path
    
    if not sql_path.exists():
        print(f"ERROR: SQL file not found: {sql_file_path}")
        sys.exit(1)
    
    # Read SQL script
    with open(sql_path, "r", encoding="utf-8") as f:
        sql_script = f.read()
    
    print(f"{'='*60}")
    print(f"SQL Script: {sql_path.name}")
    print(f"Path: {sql_path}")
    print(f"Size: {len(sql_script)} bytes")
    print(f"{'='*60}")
    
    if dry_run:
        print("\n🔍 DRY RUN MODE - SQL script content:")
        print(f"{'='*60}")
        print(sql_script)
        print(f"{'='*60}")
        print("\n✅ Dry run complete. No database changes made.")
        return
    
    print(f"\n🔌 Connecting to database...")
    
    # Create synchronous engine
    engine = create_engine(settings.database_url, echo=False)
    
    try:
        print(f"⚙️  Executing SQL script...")
        with engine.begin() as conn:
            # Split by semicolons and execute each statement
            # This handles multiple statements in the script
            statements = [s.strip() for s in sql_script.split(';') if s.strip()]
            
            for i, statement in enumerate(statements, 1):
                # Skip comments and empty statements
                if statement.startswith('--') or not statement:
                    continue
                
                try:
                    result = conn.execute(text(statement))
                    
                    # Try to fetch results if it's a SELECT statement
                    if statement.strip().upper().startswith('SELECT'):
                        rows = result.fetchall()
                        if rows:
                            print(f"\n📊 Query {i} results ({len(rows)} rows):")
                            for row in rows[:10]:  # Limit to first 10 rows
                                print(f"   {dict(row._mapping)}")
                            if len(rows) > 10:
                                print(f"   ... and {len(rows) - 10} more rows")
                    else:
                        print(f"✓ Statement {i} executed")
                        
                except Exception as e:
                    print(f"⚠️  Statement {i} error: {e}")
                    # Continue with next statement for some statements like CREATE TEMP TABLE
                    if "already exists" not in str(e) and "does not exist" not in str(e):
                        raise
            
            print(f"\n✅ Migration completed successfully!")
            
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        engine.dispose()


def main():
    parser = argparse.ArgumentParser(
        description="Run SQL script against the database",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python scripts/run_sql_script.py scripts/fix_china_mainland_country.sql
  python scripts/run_sql_script.py scripts/fix_china_mainland_country.sql --dry-run
        """
    )
    parser.add_argument(
        "sql_file",
        help="Path to SQL file (absolute or relative to repo root)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print SQL script content without executing"
    )
    
    args = parser.parse_args()
    run_sql_script(args.sql_file, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
