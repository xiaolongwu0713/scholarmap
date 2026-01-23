#!/usr/bin/env python3
"""
Normalize country names in the database.
Run this after updating COUNTRY_NORMALIZATIONS in rule_based_extractor.py
"""

import asyncio
import sys
from pathlib import Path

# Add repo root to path (for config.py)
repo_root = Path(__file__).parent.parent
sys.path.insert(0, str(repo_root))

# Add backend to path (for app modules)
sys.path.insert(0, str(repo_root / "backend"))

from sqlalchemy import text
from app.db.connection import db_manager

# Country name mappings (should match COUNTRY_NORMALIZATIONS in rule_based_extractor.py)
COUNTRY_MAPPINGS = {
    "Iran, Islamic Republic of": "Iran",
    "Korea, Republic of": "South Korea",
    "Korea, Democratic People's Republic of": "North Korea",
    "Venezuela, Bolivarian Republic of": "Venezuela",
    "Tanzania, United Republic of": "Tanzania",
    "Bolivia, Plurinational State of": "Bolivia",
    "Moldova, Republic of": "Moldova",
    "Macedonia, the former Yugoslav Republic of": "North Macedonia",
    "Congo, the Democratic Republic of the": "Democratic Republic of the Congo",
    "Lao People's Democratic Republic": "Laos",
    "Syrian Arab Republic": "Syria",
    "Viet Nam": "Vietnam",
}


async def normalize_countries():
    """Update all country names in the database"""
    
    try:
        total_updated = 0
        
        # Tables to update: authorship, affiliation_cache, institution_geo
        tables = ["authorship", "affiliation_cache", "institution_geo"]
        
        async with db_manager.session() as session:
            for table in tables:
                table_updates = 0
                for old_name, new_name in COUNTRY_MAPPINGS.items():
                    query = text(f"""
                        UPDATE {table}
                        SET country = :new_name
                        WHERE country = :old_name
                    """)
                    result = await session.execute(
                        query,
                        {"old_name": old_name, "new_name": new_name}
                    )
                    count = result.rowcount
                    if count > 0:
                        print(f"✓ {table}: Updated {count} rows from '{old_name}' → '{new_name}'")
                        table_updates += count
                
                print(f"  Total for {table}: {table_updates} rows updated")
                total_updated += table_updates
            
            # Commit all changes
            await session.commit()
        
        print(f"\n✅ Successfully updated {total_updated} rows across all tables")
        
        # Show summary
        print("\n📊 Current distribution after normalization:")
        async with db_manager.session() as session:
            for table in tables:
                print(f"\n{table}:")
                normalized_names = list(set(COUNTRY_MAPPINGS.values()))
                
                # Build IN clause with individual parameters
                placeholders = ','.join([f":name{i}" for i in range(len(normalized_names))])
                query = text(f"""
                    SELECT country, COUNT(*) as count
                    FROM {table}
                    WHERE country IN ({placeholders})
                    GROUP BY country
                    ORDER BY count DESC
                """)
                
                params = {f"name{i}": name for i, name in enumerate(normalized_names)}
                result = await session.execute(query, params)
                rows = result.fetchall()
                
                if rows:
                    for row in rows:
                        print(f"  {row[0]}: {row[1]}")
                else:
                    print(f"  (no records with normalized names)")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    print("🔄 Starting country name normalization...")
    print(f"📝 Will normalize {len(COUNTRY_MAPPINGS)} country name variations\n")
    
    # Show what will be changed
    print("Mappings to apply:")
    for old_name, new_name in COUNTRY_MAPPINGS.items():
        print(f"  '{old_name}' → '{new_name}'")
    
    response = input("\n⚠️  Proceed with updates? (yes/no): ")
    if response.lower() != 'yes':
        print("Aborted.")
        return False
    
    # Initialize database
    db_manager.initialize()
    
    try:
        success = await normalize_countries()
        return success
    finally:
        await db_manager.close()


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)

