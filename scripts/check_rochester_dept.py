#!/usr/bin/env python3
"""Check Rochester 'Department of Neurosurgery' scholars."""

import asyncio
import sys
from pathlib import Path

repo_root = Path(__file__).parent.parent
sys.path.insert(0, str(repo_root))
sys.path.insert(0, str(repo_root / "backend"))

from sqlalchemy import text
from app.db.connection import db_manager


async def check():
    db_manager.initialize()
    
    try:
        async with db_manager.session() as session:
            # Check Rochester + Department of Neurosurgery
            result = await session.execute(text("""
                SELECT 
                    pmid,
                    author_name_raw,
                    country,
                    city,
                    institution,
                    affiliation_raw_joined
                FROM authorship
                WHERE country = 'United States'
                  AND city = 'Rochester'
                  AND institution = 'Department of Neurosurgery'
                LIMIT 20
            """))
            
            records = result.fetchall()
            
            print(f"\nRochester + 'Department of Neurosurgery': {len(records)} records\n")
            
            for rec in records[:5]:
                print(f"PMID {rec[0]}: {rec[1]}")
                print(f"  Location: {rec[2]} / {rec[3]}")
                print(f"  Institution: {rec[4]}")
                print(f"  Affiliation: {rec[5][:100]}...")
                print()
                
    finally:
        await db_manager.close()


if __name__ == "__main__":
    asyncio.run(check())

