#!/usr/bin/env python3
"""Debug script to check run data in database."""
import asyncio
import sys

from app.db.connection import db_manager
from app.core.config import settings
from app.db.repository import RunRepository


async def debug_run_data(run_id: str):
    """Debug a specific run's data."""
    if not settings.database_url:
        print("❌ DATABASE_URL not configured!")
        print("   Set DATABASE_URL in .env file")
        return
    
    db_manager.initialize(settings.database_url)
    
    async with db_manager.session() as session:
        repo = RunRepository(session)
        run = await repo.get_run(run_id)
        
        if not run:
            print(f"❌ Run {run_id} not found")
            return
        
        print(f"✅ Run found: {run_id}")
        print(f"   Description: {run.description[:50]}...")
        print()
        
        # Check results
        if run.results:
            print("📊 Results data:")
            print(f"   Keys: {list(run.results.keys())}")
            print()
            
            # Check each source
            for source in ["pubmed", "semantic_scholar", "openalex", "aggregated"]:
                if source in run.results:
                    data = run.results[source]
                    count = data.get("count", 0)
                    items = data.get("items", [])
                    print(f"   {source.upper()}:")
                    print(f"      Count: {count}")
                    print(f"      Items length: {len(items)}")
                    if items:
                        print(f"      First item keys: {list(items[0].keys())}")
                else:
                    print(f"   {source.upper()}: ❌ Not found")
        else:
            print("❌ No results data")
        
        print()
        
        # Check other files
        print("📁 Other data:")
        if run.understanding:
            print(f"   ✅ understanding.json ({len(str(run.understanding))} chars)")
        if run.keywords:
            print(f"   ✅ keywords.json")
        if run.queries:
            print(f"   ✅ queries.json")
        if run.retrieval_framework:
            print(f"   ✅ retrieval_framework.json ({len(run.retrieval_framework)} chars)")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python debug_run_data.py <run_id>")
        print("\nExample:")
        print("  python debug_run_data.py fbb331212f9a")
        sys.exit(1)
    
    run_id = sys.argv[1]
    asyncio.run(debug_run_data(run_id))

