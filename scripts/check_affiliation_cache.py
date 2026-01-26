#!/usr/bin/env python3
"""Check affiliation_cache for the problematic affiliation."""

import asyncio
import sys
from pathlib import Path

repo_root = Path(__file__).parent.parent
sys.path.insert(0, str(repo_root))
sys.path.insert(0, str(repo_root / "backend"))

from sqlalchemy import select, or_
from app.db.connection import db_manager
from app.db.models import AffiliationCache


async def check_cache():
    """Check if the affiliation is cached with wrong data."""
    
    target_affiliation = "Department of Neurosurgery, Union Hospital, Tongji Medical College, Huazhong University of Science and Technology, Wuhan, Hubei, China."
    
    db_manager.initialize()
    
    try:
        async with db_manager.session() as session:
            # Check exact match
            query = select(AffiliationCache).where(
                AffiliationCache.affiliation_raw == target_affiliation
            )
            
            result = await session.execute(query)
            record = result.scalar_one_or_none()
            
            print(f"\n{'='*80}")
            print(f"Checking Affiliation Cache")
            print(f"{'='*80}\n")
            
            if record:
                print(f"✓ Found cached record:\n")
                print(f"  Affiliation: {record.affiliation_raw[:100]}...")
                print(f"  Country: {record.country}")
                print(f"  City: {record.city}")
                print(f"  Institution: {record.institution}")
                print(f"  Confidence: {record.confidence}")
                print(f"  Created: {record.created_at}")
                print(f"\n❌ CACHE IS INCORRECT! This should be China/Wuhan, not {record.country}/{record.city}")
            else:
                print(f"❌ No cache found for this exact affiliation")
                
                # Check for similar affiliations
                query2 = select(AffiliationCache).where(
                    or_(
                        AffiliationCache.affiliation_raw.like("%Department of Neurosurgery%Union Hospital%"),
                        AffiliationCache.affiliation_raw.like("%Huazhong University%"),
                        AffiliationCache.city == "Rochester"
                    )
                ).limit(10)
                
                result2 = await session.execute(query2)
                similar = result2.scalars().all()
                
                if similar:
                    print(f"\n✓ Found {len(similar)} similar cached affiliations:")
                    for i, rec in enumerate(similar, 1):
                        print(f"\n  {i}. {rec.affiliation_raw[:80]}...")
                        print(f"     → {rec.country} / {rec.city} / {rec.institution}")
    
    finally:
        await db_manager.close()


if __name__ == "__main__":
    asyncio.run(check_cache())

