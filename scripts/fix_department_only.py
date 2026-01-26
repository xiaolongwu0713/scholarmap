#!/usr/bin/env python3
"""Fix records where institution is only a department name."""

import asyncio
import sys
from pathlib import Path

repo_root = Path(__file__).parent.parent
sys.path.insert(0, str(repo_root))
sys.path.insert(0, str(repo_root / "backend"))

from sqlalchemy import text
from app.db.connection import db_manager


async def fix():
    db_manager.initialize()
    
    try:
        async with db_manager.session() as session:
            print("\n" + "="*80)
            print("Fixing 'Department Only' Institution Records")
            print("="*80 + "\n")
            
            # Step 1: Delete cache for generic department names
            print("Step 1: Deleting cache for generic department-only affiliations...")
            result1 = await session.execute(text("""
                DELETE FROM affiliation_cache
                WHERE institution ~ '^Department of [A-Z]'
                  AND institution NOT LIKE '%University%'
                  AND institution NOT LIKE '%Hospital%'
                  AND institution NOT LIKE '%Institute%'
                  AND institution NOT LIKE '%College%'
            """))
            await session.commit()
            print(f"✅ Deleted cache records\n")
            
            # Step 2: Fix authorship records with department-only institution
            print("Step 2: Fixing authorship records...")
            result2 = await session.execute(text("""
                UPDATE authorship
                SET affiliation_confidence = 'none'
                WHERE institution ~ '^Department of [A-Z]'
                  AND institution NOT LIKE '%University%'
                  AND institution NOT LIKE '%Hospital%'
                  AND institution NOT LIKE '%Institute%'
                  AND institution NOT LIKE '%College%'
                  AND affiliation_confidence != 'none'
            """))
            count = result2.rowcount
            await session.commit()
            print(f"✅ Updated {count} authorship records\n")
            
            # Step 3: Show samples
            print("Sample records to be re-validated:")
            result3 = await session.execute(text("""
                SELECT pmid, author_name_raw, country, city, institution, 
                       LEFT(affiliation_raw_joined, 80) as affiliation_short
                FROM authorship
                WHERE affiliation_confidence = 'none'
                  AND institution ~ '^Department of [A-Z]'
                LIMIT 5
            """))
            samples = result3.fetchall()
            
            for s in samples:
                print(f"\n  PMID {s[0]}: {s[1]}")
                print(f"    Current: {s[2]} / {s[3]} / {s[4]}")
                print(f"    Affiliation: {s[5]}...")
            
            print("\n" + "="*80)
            print(f"✅ Fixed {count} records")
            print("="*80 + "\n")
            print("Next: Run affiliation validation to re-parse these records\n")
            
    finally:
        await db_manager.close()


if __name__ == "__main__":
    asyncio.run(fix())

