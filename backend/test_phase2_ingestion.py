#!/usr/bin/env python3
"""
Test script for Phase 2 ingestion pipeline.

Usage:
    python test_phase2_ingestion.py <project_id> <run_id>

Example:
    python test_phase2_ingestion.py ad280effc0b8 run_7b1d4766fd27
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from app.core.config import settings
from app.core.paths import get_data_dir
from app.core.storage import FileStore
from app.phase2.ingest import IngestionPipeline


async def test_ingestion(project_id: str, run_id: str, force_refresh: bool = False) -> None:
    """Test the full ingestion pipeline."""
    
    print("=" * 60)
    print("Phase 2 Ingestion Test")
    print("=" * 60)
    print(f"Project ID: {project_id}")
    print(f"Run ID: {run_id}")
    print(f"Force refresh: {force_refresh}")
    print(f"Data dir: {settings.scholarmap_data_dir}")
    print(f"PubMed API key: {'Yes' if settings.pubmed_api_key else 'No (rate limited to 3 rps)'}")
    print(f"OpenAI API key: {'Yes' if settings.openai_api_key else 'No (required!)'}")
    print("=" * 60)
    print()
    
    if not settings.openai_api_key:
        print("ERROR: OPENAI_API_KEY not set in .env")
        print("Affiliation extraction requires OpenAI API access.")
        return
    
    # Initialize
    data_dir = get_data_dir()
    store = FileStore(settings.scholarmap_data_dir)
    
    # Check project/run exists
    project = store.get_project(project_id)
    if not project:
        print(f"ERROR: Project {project_id} not found")
        return
    
    print(f"✓ Found project: {project.name}")
    
    # Check run exists
    try:
        understanding = store.read_run_file(project_id, run_id, "understanding.json")
        print(f"✓ Found run: {understanding.get('research_description', '')[:60]}...")
    except FileNotFoundError:
        print(f"ERROR: Run {run_id} not found")
        return
    
    # Check aggregated results exist
    try:
        results = store.read_run_file(project_id, run_id, "results_aggregated.json")
        num_papers = len(results.get("items", []))
        print(f"✓ Found {num_papers} papers in results_aggregated.json")
    except FileNotFoundError:
        print(f"ERROR: results_aggregated.json not found for run {run_id}")
        print("Please run Phase 1 first to generate paper results.")
        return
    
    if num_papers == 0:
        print("WARNING: No papers to ingest")
        return
    
    print()
    print("Starting ingestion...")
    print("-" * 60)
    
    # Run ingestion
    pipeline = IngestionPipeline(
        project_id=project_id,
        data_dir=data_dir,
        api_key=settings.pubmed_api_key or None
    )
    
    try:
        stats = await pipeline.ingest_run(
            run_id=run_id,
            store=store,
            force_refresh=force_refresh
        )
        
        print()
        print("=" * 60)
        print("Ingestion Complete!")
        print("=" * 60)
        print(f"Total PMIDs:                {stats.total_pmids}")
        print(f"PMIDs cached:               {stats.pmids_cached}")
        print(f"PMIDs fetched:              {stats.pmids_fetched}")
        print(f"Papers parsed:              {stats.papers_parsed}")
        print(f"Authorships created:        {stats.authorships_created}")
        print(f"Unique affiliations:        {stats.unique_affiliations}")
        print(f"Affiliations with country:  {stats.affiliations_with_country}")
        print(f"LLM calls made:             {stats.llm_calls_made}")
        
        if stats.errors:
            print()
            print("Errors:")
            for err in stats.errors:
                print(f"  - {err}")
        
        print()
        print(f"Database location:")
        print(f"  {data_dir / 'projects' / project_id / 'scholarmap.db'}")
        print()
        
        # Show some sample data
        from app.phase2.database import Database
        db = Database(project_id, data_dir)
        conn = db.get_conn()
        
        try:
            # Count by country
            rows = conn.execute("""
                SELECT country, COUNT(*) as count
                FROM authorship
                WHERE country IS NOT NULL
                GROUP BY country
                ORDER BY count DESC
                LIMIT 10
            """).fetchall()
            
            if rows:
                print("Top 10 countries:")
                for row in rows:
                    print(f"  {row['country']}: {row['count']} authorships")
            
        finally:
            conn.close()
        
    except Exception as e:
        print()
        print("=" * 60)
        print("INGESTION FAILED")
        print("=" * 60)
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()


def main() -> None:
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    
    project_id = sys.argv[1]
    run_id = sys.argv[2]
    force_refresh = "--force" in sys.argv
    
    asyncio.run(test_ingestion(project_id, run_id, force_refresh))


if __name__ == "__main__":
    main()
