#!/usr/bin/env python3
"""Fix ALL department-only records globally."""

import asyncio
import sys
from pathlib import Path

repo_root = Path(__file__).parent.parent
sys.path.insert(0, str(repo_root))
sys.path.insert(0, str(repo_root / "backend"))

from sqlalchemy import text, select
from app.db.connection import db_manager
from app.db.models import Authorship, AffiliationCache
from app.phase2.rule_based_extractor import RuleBasedExtractor


async def fix_all():
    db_manager.initialize()
    
    try:
        async with db_manager.session() as session:
            print("\n" + "="*80)
            print("Fixing ALL Department-Only Records (Global)")
            print("="*80 + "\n")
            
            # Get all records with department-only institution
            query = select(Authorship).where(
                Authorship.institution.like('Department of %')
            )
            
            result = await session.execute(query)
            records = result.scalars().all()
            
            print(f"Found {len(records)} total records with 'Department of...' as institution")
            
            # Filter to only those without actual institution name
            dept_only_records = []
            for rec in records:
                inst = rec.institution or ""
                # Check if it's ONLY a department name (no university/hospital/institute/college)
                if not any(keyword in inst.lower() for keyword in 
                          ['university', 'hospital', 'institute', 'college', 'clinic']):
                    dept_only_records.append(rec)
            
            print(f"Found {len(dept_only_records)} records with department-only (no institution)\n")
            
            if len(dept_only_records) == 0:
                print("No records to fix!")
                return
            
            # Create extractor
            extractor = RuleBasedExtractor()
            
            # Group by affiliation
            affil_to_records = {}
            for rec in dept_only_records:
                affil = rec.affiliation_raw_joined
                if affil not in affil_to_records:
                    affil_to_records[affil] = []
                affil_to_records[affil].append(rec)
            
            print(f"Unique affiliations to re-parse: {len(affil_to_records)}\n")
            
            # Parse and update
            updated_count = 0
            for i, (affil, recs) in enumerate(affil_to_records.items(), 1):
                if i <= 5 or i % 50 == 0:
                    print(f"[{i}/{len(affil_to_records)}] {affil[:60]}...")
                
                # Parse
                parsed = await extractor.extract_batch([affil])
                geo = parsed[0]
                
                if i <= 5:
                    print(f"  → {geo.country} / {geo.city} / {geo.institution}")
                
                # Update records
                for rec in recs:
                    rec.country = geo.country
                    rec.city = geo.city
                    rec.institution = geo.institution
                    rec.affiliation_confidence = geo.confidence
                    updated_count += 1
                
                # Update or create cache
                cache_query = select(AffiliationCache).where(
                    AffiliationCache.affiliation_raw == affil
                )
                cache_result = await session.execute(cache_query)
                cache_rec = cache_result.scalar_one_or_none()
                
                if cache_rec:
                    cache_rec.country = geo.country
                    cache_rec.city = geo.city
                    cache_rec.institution = geo.institution
                    cache_rec.confidence = geo.confidence
                else:
                    new_cache = AffiliationCache(
                        affiliation_raw=affil,
                        country=geo.country,
                        city=geo.city,
                        institution=geo.institution,
                        confidence=geo.confidence
                    )
                    session.add(new_cache)
                
                # Commit periodically
                if i % 100 == 0:
                    await session.commit()
                    print(f"  ... committed {i}/{len(affil_to_records)}")
            
            # Final commit
            await session.commit()
            
            print(f"\n{'='*80}")
            print(f"✅ Updated {updated_count} authorship records")
            print(f"✅ Updated {len(affil_to_records)} cache entries")
            print(f"{'='*80}\n")
            
    finally:
        await db_manager.close()


if __name__ == "__main__":
    asyncio.run(fix_all())

