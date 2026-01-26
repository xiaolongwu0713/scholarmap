#!/usr/bin/env python3
"""Directly re-parse Rochester Department records."""

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


async def reparse():
    db_manager.initialize()
    
    try:
        async with db_manager.session() as session:
            print("\n" + "="*80)
            print("Re-parsing Rochester 'Department of Neurosurgery' Records")
            print("="*80 + "\n")
            
            # Get all problematic records
            query = select(Authorship).where(
                Authorship.country == "United States",
                Authorship.city == "Rochester",
                Authorship.institution == "Department of Neurosurgery"
            )
            
            result = await session.execute(query)
            records = result.scalars().all()
            
            print(f"Found {len(records)} records to re-parse\n")
            
            # Create extractor
            extractor = RuleBasedExtractor()
            
            # Group by affiliation to avoid duplicate parsing
            affil_to_records = {}
            for rec in records:
                affil = rec.affiliation_raw_joined
                if affil not in affil_to_records:
                    affil_to_records[affil] = []
                affil_to_records[affil].append(rec)
            
            print(f"Unique affiliations: {len(affil_to_records)}\n")
            
            # Parse each unique affiliation
            updated_count = 0
            for i, (affil, recs) in enumerate(affil_to_records.items(), 1):
                print(f"[{i}/{len(affil_to_records)}] Parsing: {affil[:80]}...")
                
                # Parse
                parsed = await extractor.extract_batch([affil])
                geo = parsed[0]
                
                print(f"  Result: {geo.country} / {geo.city} / {geo.institution}")
                
                # Update all records with this affiliation
                for rec in recs:
                    rec.country = geo.country
                    rec.city = geo.city
                    rec.institution = geo.institution
                    rec.affiliation_confidence = geo.confidence
                    updated_count += 1
                
                # Update cache
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
                    # Create new cache entry
                    new_cache = AffiliationCache(
                        affiliation_raw=affil,
                        country=geo.country,
                        city=geo.city,
                        institution=geo.institution,
                        confidence=geo.confidence
                    )
                    session.add(new_cache)
                
                # Commit periodically
                if i % 10 == 0:
                    await session.commit()
            
            # Final commit
            await session.commit()
            
            print(f"\n{'='*80}")
            print(f"✅ Updated {updated_count} authorship records")
            print(f"✅ Updated {len(affil_to_records)} cache entries")
            print(f"{'='*80}\n")
            
    finally:
        await db_manager.close()


if __name__ == "__main__":
    asyncio.run(reparse())

