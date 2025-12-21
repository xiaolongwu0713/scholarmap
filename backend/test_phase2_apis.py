#!/usr/bin/env python3
"""
Test script for Phase 2B map aggregation APIs.

Tests all 4 drill-down levels:
1. World → Countries
2. Country → Cities  
3. City → Institutions
4. Institution → Scholars
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.core.config import settings
from app.core.paths import get_data_dir
from app.phase2.aggregations import MapAggregator
from app.phase2.database import Database


def test_aggregations(project_id: str, run_id: str) -> None:
    """Test all aggregation levels."""
    
    print("=" * 70)
    print("Phase 2B: Map Aggregation API Test")
    print("=" * 70)
    print(f"Project ID: {project_id}")
    print(f"Run ID: {run_id}")
    print("=" * 70)
    print()
    
    # Initialize
    data_dir = get_data_dir()
    db = Database(project_id, data_dir)
    aggregator = MapAggregator(db)
    
    # Test 1: World map
    print("Test 1: World Map (Countries)")
    print("-" * 70)
    
    world_data = aggregator.get_world_map(run_id, min_confidence="low")
    
    if not world_data:
        print("⚠️  No world data found. Make sure ingestion completed successfully.")
        return
    
    print(f"Found {len(world_data)} countries")
    print()
    print("Top 10 countries:")
    for i, country in enumerate(world_data[:10], 1):
        print(f"  {i:2}. {country['country']:20} - "
              f"{country['scholar_count']:4} scholars, "
              f"{country['paper_count']:3} papers, "
              f"{country['institution_count']:3} institutions")
    
    print()
    
    # Test 2: Country map (drill into top country)
    if world_data:
        top_country = world_data[0]["country"]
        print(f"Test 2: Country Map (Cities in {top_country})")
        print("-" * 70)
        
        country_data = aggregator.get_country_map(run_id, top_country, min_confidence="low")
        
        print(f"Found {len(country_data)} cities")
        print()
        
        if country_data:
            print("Top 10 cities:")
            for i, city in enumerate(country_data[:10], 1):
                print(f"  {i:2}. {city['city']:25} - "
                      f"{city['scholar_count']:3} scholars, "
                      f"{city['institution_count']:3} institutions")
        else:
            print(f"  No cities found for {top_country} (possibly missing city data)")
        
        print()
        
        # Test 3: City map (drill into top city)
        if country_data:
            top_city = country_data[0]["city"]
            print(f"Test 3: City Map (Institutions in {top_city}, {top_country})")
            print("-" * 70)
            
            city_data = aggregator.get_city_map(run_id, top_country, top_city, min_confidence="low")
            
            print(f"Found {len(city_data)} institutions")
            print()
            
            if city_data:
                print("Top 10 institutions:")
                for i, inst in enumerate(city_data[:10], 1):
                    print(f"  {i:2}. {inst['institution'][:50]:50} - "
                          f"{inst['scholar_count']:3} scholars")
            else:
                print(f"  No institutions found for {top_city}")
            
            print()
            
            # Test 4: Institution scholars (drill into top institution)
            if city_data:
                top_institution = city_data[0]["institution"]
                print(f"Test 4: Institution Scholars")
                print(f"Institution: {top_institution}")
                print("-" * 70)
                
                scholar_data = aggregator.get_institution_scholars(
                    run_id=run_id,
                    institution=top_institution,
                    country=top_country,
                    city=top_city,
                    min_confidence="low",
                    limit=20
                )
                
                scholars = scholar_data["scholars"]
                total = scholar_data["total_count"]
                
                print(f"Found {total} scholars (showing first {len(scholars)})")
                print()
                
                if scholars:
                    print("Scholar details:")
                    for i, scholar in enumerate(scholars, 1):
                        pi_marker = "👑 " if scholar["is_likely_pi"] else "   "
                        print(f"  {i:2}. {pi_marker}{scholar['name']:30} - "
                              f"{scholar['paper_count']:2} papers, "
                              f"career: {scholar['career_start_year'] or '?'}-{scholar['career_end_year'] or '?'}")
                else:
                    print("  No scholars found")
    
    print()
    print("=" * 70)
    print("✅ All aggregation tests completed!")
    print("=" * 70)
    print()
    
    # Summary
    print("API Endpoints Ready:")
    print(f"  GET /api/projects/{project_id}/runs/{run_id}/map/world")
    print(f"  GET /api/projects/{project_id}/runs/{run_id}/map/country/{{country}}")
    print(f"  GET /api/projects/{project_id}/runs/{run_id}/map/city/{{country}}/{{city}}")
    print(f"  GET /api/projects/{project_id}/runs/{run_id}/map/institution?institution={{name}}")
    print()
    
    # Example curl commands
    print("Example curl commands:")
    print()
    print(f'  # World map')
    print(f'  curl "http://localhost:8000/api/projects/{project_id}/runs/{run_id}/map/world"')
    print()
    print(f'  # US cities')
    print(f'  curl "http://localhost:8000/api/projects/{project_id}/runs/{run_id}/map/country/United%20States"')
    print()
    
    if world_data and country_data:
        city_encoded = country_data[0]["city"].replace(" ", "%20")
        print(f'  # Institutions in {country_data[0]["city"]}')
        print(f'  curl "http://localhost:8000/api/projects/{project_id}/runs/{run_id}/map/city/United%20States/{city_encoded}"')
    print()


def main() -> None:
    if len(sys.argv) < 3:
        print("Usage: python test_phase2_apis.py <project_id> <run_id>")
        print("Example: python test_phase2_apis.py ad280effc0b8 run_7b1d4766fd27")
        sys.exit(1)
    
    project_id = sys.argv[1]
    run_id = sys.argv[2]
    
    test_aggregations(project_id, run_id)


if __name__ == "__main__":
    main()

