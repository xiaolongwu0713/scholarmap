#!/usr/bin/env python3
import asyncio, sys
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
            result = await session.execute(text("""
                SELECT DISTINCT institution, COUNT(*) as count
                FROM authorship
                WHERE country = 'United States' AND city = 'Rochester'
                  AND institution LIKE 'Department of %'
                GROUP BY institution
                ORDER BY count DESC
            """))
            records = result.fetchall()
            print(f"\nRochester departments: {len(records)}")
            for r in records:
                print(f"  {r[0]}: {r[1]} scholars")
    finally:
        await db_manager.close()

if __name__ == "__main__":
    asyncio.run(check())

