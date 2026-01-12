#!/usr/bin/env python3
"""
Diagnose geographic data errors in the database.

This script helps identify the root cause of incorrect geographic extractions
by tracing through all related database tables and generating fix SQL.

Usage:
    python scripts/diagnose_geo_error.py --country "Morocco" --city "U.S.A"
    python scripts/diagnose_geo_error.py --country "Morocco" --city "Cambridge"
    python scripts/diagnose_geo_error.py --country "Israel" --city "Urbana-Champaign"
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path
from typing import Any

# Add backend and project root to path
project_root = Path(__file__).resolve().parent.parent
backend_dir = project_root / "backend"
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(project_root))

from sqlalchemy import select, func
from app.db.connection import db_manager
from app.db.models import Authorship, AffiliationCache, InstitutionGeo, GeocodingCache


def print_section(title: str, char: str = "=") -> None:
    """Print a section header."""
    print(f"\n{char * 80}")
    print(f"{title.center(80)}")
    print(f"{char * 80}")


def print_subsection(title: str) -> None:
    """Print a subsection header."""
    print(f"\n[{title}]")
    print("─" * 80)


async def query_authorships(country: str, city: str) -> list[dict[str, Any]]:
    """Query authorship records matching the given country and city."""
    async with db_manager.session() as session:
        stmt = (
            select(Authorship)
            .where(Authorship.country == country)
            .where(Authorship.city == city)
            .order_by(Authorship.pmid)
        )
        result = await session.execute(stmt)
        authorships = result.scalars().all()
        
        records = []
        for auth in authorships:
            # Parse affiliations_raw JSON
            try:
                affiliations = json.loads(auth.affiliations_raw) if auth.affiliations_raw else []
            except (json.JSONDecodeError, TypeError):
                affiliations = []
            
            records.append({
                "id": auth.id,
                "pmid": auth.pmid,
                "author_name": auth.author_name_raw,
                "affiliations": affiliations,
                "affiliation_joined": auth.affiliation_raw_joined,
                "country": auth.country,
                "city": auth.city,
                "institution": auth.institution,
                "confidence": auth.affiliation_confidence,
            })
        
        return records


async def query_affiliation_cache(country: str, city: str) -> list[dict[str, Any]]:
    """Query affiliation_cache records matching the given country and city."""
    async with db_manager.session() as session:
        stmt = (
            select(AffiliationCache)
            .where(AffiliationCache.country == country)
            .where(AffiliationCache.city == city)
        )
        result = await session.execute(stmt)
        cache_entries = result.scalars().all()
        
        records = []
        for entry in cache_entries:
            records.append({
                "affiliation_raw": entry.affiliation_raw,
                "country": entry.country,
                "city": entry.city,
                "institution": entry.institution,
                "confidence": entry.confidence,
            })
        
        return records


async def query_institution_geo(country: str, city: str) -> list[dict[str, Any]]:
    """Query institution_geo records matching the given country and city."""
    async with db_manager.session() as session:
        stmt = (
            select(InstitutionGeo)
            .where(InstitutionGeo.country == country)
        )
        if city:
            stmt = stmt.where(InstitutionGeo.city == city)
        
        stmt = stmt.order_by(InstitutionGeo.created_at.desc())
        
        result = await session.execute(stmt)
        institutions = result.scalars().all()
        
        records = []
        for inst in institutions:
            records.append({
                "institution_id": inst.institution_id,
                "primary_name": inst.primary_name,
                "normalized_name": inst.normalized_name,
                "country": inst.country,
                "city": inst.city,
                "source": inst.source,
                "created_at": inst.created_at,
            })
        
        return records


async def query_geocoding_cache(country: str, city: str) -> dict[str, Any] | None:
    """Query geocoding_cache for the location key."""
    from app.phase2.pg_geocoding import PostgresGeocoder
    
    location_key = PostgresGeocoder.make_location_key(country, city)
    
    async with db_manager.session() as session:
        stmt = select(GeocodingCache).where(GeocodingCache.location_key == location_key)
        result = await session.execute(stmt)
        cache_entry = result.scalar_one_or_none()
        
        if cache_entry:
            return {
                "location_key": cache_entry.location_key,
                "latitude": cache_entry.latitude,
                "longitude": cache_entry.longitude,
                "affiliations": cache_entry.affiliations or [],
                "created_at": cache_entry.created_at,
            }
        
        return None


def analyze_error(affiliation_raw: str) -> str:
    """Analyze the affiliation string to identify the error cause."""
    errors = []
    
    # Check for state abbreviations
    state_codes = ["MA", "CA", "NY", "TX", "IL", "PA", "OH", "MI", "FL", "GA"]
    for code in state_codes:
        if f", {code} " in affiliation_raw or f", {code}." in affiliation_raw or affiliation_raw.endswith(f", {code}"):
            errors.append(f'"{code}" (US state) misinterpreted as country code')
    
    # Check for common country codes in the wrong context
    if "IL" in affiliation_raw and "Illinois" not in affiliation_raw:
        errors.append('"IL" (Illinois state) misinterpreted as Israel country code')
    
    # Check for "and" being interpreted as Andorra
    if " and" in affiliation_raw.lower() or affiliation_raw.lower().endswith(" and."):
        errors.append('"and" misinterpreted as Andorra country code')
    
    return " | ".join(errors) if errors else "Unknown error - manual review needed"


def generate_fix_sql(
    authorships: list[dict],
    cache_entries: list[dict],
    institutions: list[dict],
    geocoding: dict | None,
    country: str,
    city: str
) -> str:
    """Generate SQL statements to fix the errors."""
    sql_parts = []
    
    sql_parts.append("-- ========================================")
    sql_parts.append(f"-- FIX SQL for: country='{country}', city='{city}'")
    sql_parts.append("-- ========================================\n")
    
    # Step 1: Fix authorship records
    if authorships:
        pmids = sorted(set(auth["pmid"] for auth in authorships))
        pmid_list = ", ".join(pmids)
        
        sql_parts.append("-- Step 1: Delete incorrect authorship records")
        sql_parts.append("-- CAUTION: This will delete the records. Review carefully!")
        sql_parts.append("-- Recommended: Re-run ingestion instead to regenerate correct data\n")
        sql_parts.append(f"DELETE FROM authorship")
        sql_parts.append(f"WHERE country = '{country}'")
        sql_parts.append(f"  AND city = '{city}';")
        sql_parts.append(f"-- Affected PMIDs: {pmid_list}")
        sql_parts.append(f"-- Total records: {len(authorships)}\n")
    
    # Step 2: Delete affiliation_cache entries
    if cache_entries:
        sql_parts.append("-- Step 2: Delete incorrect affiliation_cache entries")
        sql_parts.append("DELETE FROM affiliation_cache")
        sql_parts.append(f"WHERE country = '{country}'")
        sql_parts.append(f"  AND city = '{city}';")
        sql_parts.append(f"-- Total entries: {len(cache_entries)}\n")
    
    # Step 3: Delete institution_geo entries
    if institutions:
        inst_ids = [str(inst["institution_id"]) for inst in institutions]
        sql_parts.append("-- Step 3: Delete incorrect institution_geo entries")
        sql_parts.append("-- Review the institution names before deleting!\n")
        for inst in institutions:
            sql_parts.append(f"-- ID {inst['institution_id']}: {inst['primary_name']} (source: {inst['source']})")
        sql_parts.append(f"\nDELETE FROM institution_geo")
        sql_parts.append(f"WHERE institution_id IN ({', '.join(inst_ids)});")
        sql_parts.append(f"-- Total institutions: {len(institutions)}\n")
    
    # Step 4: Delete geocoding_cache entry
    if geocoding:
        sql_parts.append("-- Step 4: Delete incorrect geocoding_cache entry")
        sql_parts.append(f"DELETE FROM geocoding_cache")
        sql_parts.append(f"WHERE location_key = '{geocoding['location_key']}';")
        sql_parts.append("")
    
    # Step 5: Recommendation
    sql_parts.append("-- ========================================")
    sql_parts.append("-- RECOMMENDED NEXT STEPS")
    sql_parts.append("-- ========================================")
    sql_parts.append("-- 1. Review and execute the above SQL statements")
    sql_parts.append("-- 2. Re-run ingestion to regenerate correct data:")
    sql_parts.append("--    python scripts/trigger_ingestion.py <project_id> <run_id> --email <email> --password <password>")
    sql_parts.append("-- 3. The new delayed-add mechanism will prevent adding incorrect data to institution_geo")
    
    return "\n".join(sql_parts)


async def diagnose(country: str, city: str) -> None:
    """Main diagnosis function."""
    print_section("GEO ERROR DIAGNOSIS", "=")
    print(f"Query: country='{country}', city='{city}'")
    
    # Query all related data
    authorships = await query_authorships(country, city)
    cache_entries = await query_affiliation_cache(country, city)
    institutions = await query_institution_geo(country, city)
    geocoding = await query_geocoding_cache(country, city)
    
    # Display results
    print_subsection(f"1. AUTHORSHIP RECORDS ({len(authorships)} records found)")
    
    if not authorships:
        print("No records found.")
    else:
        for idx, auth in enumerate(authorships, 1):
            print(f"\nRecord #{idx}:")
            print(f"  ID: {auth['id']}")
            print(f"  PMID: {auth['pmid']}")
            print(f"  Author: {auth['author_name']}")
            print(f"  Affiliations (raw JSON): {json.dumps(auth['affiliations'][:2], ensure_ascii=False)[:200]}...")
            print(f"  Primary affiliation: {auth['affiliation_joined'][:150] if auth['affiliation_joined'] else 'N/A'}...")
            print(f"  Extracted: country='{auth['country']}', city='{auth['city']}', institution='{auth['institution']}'")
            print(f"  Confidence: {auth['confidence']}")
            
            if idx >= 5:  # Limit display to first 5
                print(f"\n... and {len(authorships) - 5} more records")
                break
    
    print_subsection(f"2. AFFILIATION_CACHE RECORDS ({len(cache_entries)} unique affiliations)")
    
    if not cache_entries:
        print("No cache entries found.")
    else:
        for idx, entry in enumerate(cache_entries, 1):
            print(f"\nCached #{idx}:")
            print(f"  Affiliation: {entry['affiliation_raw'][:200]}...")
            print(f"  Cached as: country='{entry['country']}', city='{entry['city']}', institution='{entry['institution']}'")
            print(f"  Confidence: {entry['confidence']}")
            print(f"  Error analysis: {analyze_error(entry['affiliation_raw'])}")
            
            if idx >= 3:  # Limit display to first 3
                print(f"\n... and {len(cache_entries) - 3} more entries")
                break
    
    print_subsection(f"3. INSTITUTION_GEO RECORDS ({len(institutions)} institutions found)")
    
    if not institutions:
        print("No institution_geo records found.")
    else:
        for idx, inst in enumerate(institutions, 1):
            error_marker = "❌ ERROR" if inst['source'] == 'auto_added' else "✓"
            print(f"\nInstitution #{idx}:")
            print(f"  ID: {inst['institution_id']}")
            print(f"  Name: {inst['primary_name']}")
            print(f"  Country: {inst['country']} ({error_marker})")
            print(f"  City: {inst['city']}")
            print(f"  Source: {inst['source']}")
            print(f"  Created: {inst['created_at']}")
    
    print_subsection(f"4. GEOCODING_CACHE RECORD")
    
    if not geocoding:
        print("No geocoding_cache entry found.")
    else:
        status = "✓ NULL (geocoding failed)" if geocoding['latitude'] is None else f"({geocoding['latitude']}, {geocoding['longitude']})"
        print(f"\nLocation: {country}, {city}")
        print(f"  Coordinates: {status}")
        print(f"  Affiliations: {len(geocoding['affiliations'])} cached")
        print(f"  Created at: {geocoding['created_at']}")
        if geocoding['affiliations']:
            print(f"  Sample: {geocoding['affiliations'][0][:150]}...")
    
    # Generate fix SQL
    print_section("SUGGESTED FIXES", "=")
    
    if not authorships and not cache_entries and not institutions:
        print("No errors found to fix.")
    else:
        fix_sql = generate_fix_sql(authorships, cache_entries, institutions, geocoding, country, city)
        print(fix_sql)
        
        # Save to file
        output_file = Path(__file__).parent / f"fix_{country.lower().replace(' ', '_')}_{city.lower().replace(' ', '_')}.sql"
        output_file.write_text(fix_sql, encoding="utf-8")
        print(f"\n\n✅ Fix SQL saved to: {output_file}")
    
    print("\n" + "=" * 80)


async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Diagnose geographic data errors in the database",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python scripts/diagnose_geo_error.py --country "Morocco" --city "Cambridge"
    python scripts/diagnose_geo_error.py --country "Morocco" --city "U.S.A"
    python scripts/diagnose_geo_error.py --country "Israel" --city "Urbana-Champaign"
        """
    )
    parser.add_argument("--country", required=True, help="Country name (exact match)")
    parser.add_argument("--city", required=True, help="City name (exact match)")
    
    args = parser.parse_args()
    
    # Initialize database connection
    from config import settings
    db_manager.initialize(settings.database_url)
    
    try:
        await diagnose(args.country, args.city)
    except Exception as e:
        print(f"\n❌ Error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        # Close database connection
        await db_manager.close()


if __name__ == "__main__":
    asyncio.run(main())
