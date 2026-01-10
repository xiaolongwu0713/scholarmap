#!/usr/bin/env python3
"""Script to add normalized_name column to institution_geo table and populate it.

This script:
1. Adds normalized_name column if it doesn't exist
2. Populates normalized_name for all existing records
3. Normalizes aliases for all existing records
4. Creates index on normalized_name

Usage:
    python scripts/add_normalized_name_column.py
"""

import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(backend_dir.parent))

import config
from app.db.connection import db_manager
from app.phase2.text_utils import normalize_text


async def add_normalized_name_column():
    """Add normalized_name column and populate it for all existing records."""
    # Initialize database manager
    db_manager.initialize(config.settings.database_url)
    
    try:
        async with db_manager.session() as session:
            from sqlalchemy import text
            
            # Step 1: Add normalized_name column if it doesn't exist
            print("Adding normalized_name column...")
            await session.execute(text("""
                ALTER TABLE institution_geo 
                ADD COLUMN IF NOT EXISTS normalized_name TEXT
            """))
            await session.commit()
            print("✅ Column added (or already exists)")
            
            # Step 2: Get all institutions
            from app.db.models import InstitutionGeo
            from sqlalchemy import select
            
            result = await session.execute(select(InstitutionGeo))
            institutions = result.scalars().all()
            
            print(f"Processing {len(institutions)} institutions...")
            
            # Step 3: Populate normalized_name and normalize aliases for each institution
            updated_count = 0
            for inst in institutions:
                # Generate normalized_name from primary_name
                normalized_name = normalize_text(inst.primary_name)
                
                # Normalize aliases if they exist
                normalized_aliases = None
                if inst.aliases:
                    normalized_aliases = []
                    for alias in inst.aliases:
                        normalized_alias = normalize_text(alias)
                        if normalized_alias and normalized_alias not in normalized_aliases:
                            normalized_aliases.append(normalized_alias)
                    # Keep original aliases if they were provided, but also ensure normalized versions exist
                    # Actually, we'll replace aliases with normalized versions to ensure consistency
                    normalized_aliases = normalized_aliases if normalized_aliases else None
                
                # Update institution
                inst.normalized_name = normalized_name
                if normalized_aliases is not None:
                    inst.aliases = normalized_aliases
                
                updated_count += 1
                if updated_count % 100 == 0:
                    print(f"  Processed {updated_count}/{len(institutions)} records...")
                    await session.flush()
            
            # Commit all changes
            await session.commit()
            print(f"✅ Updated {updated_count} institutions")
            
            # Step 4: Make normalized_name NOT NULL (after all records are populated)
            print("Making normalized_name NOT NULL...")
            await session.execute(text("""
                ALTER TABLE institution_geo 
                ALTER COLUMN normalized_name SET NOT NULL
            """))
            await session.commit()
            print("✅ normalized_name is now NOT NULL")
            
            # Step 5: Create index on normalized_name
            print("Creating index on normalized_name...")
            await session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_institution_normalized_name 
                ON institution_geo (normalized_name)
            """))
            await session.commit()
            print("✅ Index created")
            
            print("\n✅ All done! normalized_name column is ready for use.")
    
    finally:
        await db_manager.close()


if __name__ == '__main__':
    import asyncio
    asyncio.run(add_normalized_name_column())
