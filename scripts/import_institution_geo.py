#!/usr/bin/env python3
"""Import institution geographic data from CSV/JSON file.

Usage:
    python scripts/import_institution_geo.py --file data/institutions.csv
    python scripts/import_institution_geo.py --file data/institutions.json --format json
    python scripts/import_institution_geo.py --file data/institutions.csv --dry-run
"""

import argparse
import csv
import json
import sys
from pathlib import Path

# Add backend to path (same pattern as other scripts)
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))  # Add backend to path for app imports
sys.path.insert(0, str(backend_dir.parent))  # Add repo root to path for config

from app.db.connection import db_manager
from app.db.repository import InstitutionGeoRepository
from app.phase2.text_utils import normalize_text, extract_abbreviation


def load_csv(file_path: Path) -> list[dict]:
    """Load institutions from CSV file.
    
    Expected CSV columns:
    - primary_name (required)
    - country (required)
    - city (optional)
    - aliases (optional, comma-separated or JSON array)
    - qs_rank (optional)
    - ror_id (optional)
    - source (optional, default: 'qs')
    """
    institutions = []
    with open(file_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Parse aliases if present
            aliases = None
            if row.get('aliases'):
                aliases_str = row['aliases'].strip()
                if aliases_str.startswith('['):
                    # JSON array format
                    try:
                        aliases = json.loads(aliases_str)
                    except json.JSONDecodeError:
                        # Fall back to comma-separated
                        aliases = [a.strip() for a in aliases_str.split(',') if a.strip()]
                else:
                    # Comma-separated format
                    aliases = [a.strip() for a in aliases_str.split(',') if a.strip()]
            
            # Parse qs_rank
            qs_rank = None
            if row.get('qs_rank'):
                try:
                    qs_rank = int(row['qs_rank'])
                except ValueError:
                    pass
            
            primary_name = row['primary_name'].strip()
            
            # Generate normalized_name from primary_name
            normalized_name = normalize_text(primary_name)
            
            # Normalize aliases if they exist, and optionally extract abbreviation
            normalized_aliases = []
            if aliases:
                for alias in aliases:
                    normalized_alias = normalize_text(alias)
                    if normalized_alias and normalized_alias not in normalized_aliases:
                        normalized_aliases.append(normalized_alias)
            
            # Optionally extract abbreviation from primary_name (e.g., "MIT" from "(MIT)")
            abbrev = extract_abbreviation(primary_name)
            if abbrev:
                normalized_abbrev = normalize_text(abbrev)
                if normalized_abbrev and normalized_abbrev not in normalized_aliases:
                    normalized_aliases.append(normalized_abbrev)
            
            inst = {
                'primary_name': primary_name,
                'normalized_name': normalized_name,
                'country': row['country'].strip(),
                'city': row.get('city', '').strip() or None,
                'aliases': normalized_aliases if normalized_aliases else None,
                'qs_rank': qs_rank,
                'ror_id': row.get('ror_id', '').strip() or None,
                'source': row.get('source', 'qs').strip() or 'qs'
            }
            institutions.append(inst)
    
    return institutions


def load_json(file_path: Path) -> list[dict]:
    """Load institutions from JSON file.
    
    Expected JSON format:
    [
        {
            "primary_name": "...",
            "country": "...",
            "city": "...",
            "aliases": ["...", "..."],
            "qs_rank": 1,
            "ror_id": "...",
            "source": "qs"
        },
        ...
    ]
    
    Returns list of dicts with normalized_name and normalized aliases added.
    """
    institutions = []
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    for item in data:
        primary_name = item['primary_name'].strip()
        
        # Generate normalized_name from primary_name
        normalized_name = normalize_text(primary_name)
        
        # Normalize aliases if they exist
        normalized_aliases = []
        if item.get('aliases'):
            for alias in item['aliases']:
                normalized_alias = normalize_text(alias)
                if normalized_alias and normalized_alias not in normalized_aliases:
                    normalized_aliases.append(normalized_alias)
        
        # Optionally extract abbreviation from primary_name
        abbrev = extract_abbreviation(primary_name)
        if abbrev:
            normalized_abbrev = normalize_text(abbrev)
            if normalized_abbrev and normalized_abbrev not in normalized_aliases:
                normalized_aliases.append(normalized_abbrev)
        
        inst = {
            'primary_name': primary_name,
            'normalized_name': normalized_name,
            'country': item['country'].strip(),
            'city': item.get('city', '').strip() or None,
            'aliases': normalized_aliases if normalized_aliases else None,
            'qs_rank': item.get('qs_rank'),
            'ror_id': item.get('ror_id'),
            'source': item.get('source', 'qs')
        }
        institutions.append(inst)
    
    return institutions


async def import_institutions(
    institutions: list[dict],
    dry_run: bool = False
) -> None:
    """Import institutions into database."""
    import logging
    logger = logging.getLogger(__name__)
    
    if dry_run:
        logger.info(f"DRY RUN: Would import {len(institutions)} institutions")
        for inst in institutions[:5]:  # Show first 5
            logger.info(f"  - {inst['primary_name']}")
            logger.info(f"    normalized: {inst.get('normalized_name', 'N/A')}")
            logger.info(f"    aliases: {inst.get('aliases', [])}")
            logger.info(f"    ({inst['country']}, {inst.get('city', 'N/A')})")
        if len(institutions) > 5:
            logger.info(f"  ... and {len(institutions) - 5} more")
        return
    
    # Initialize database manager if not already initialized
    if not db_manager._session_factory:
        import config
        db_manager.initialize(config.settings.database_url)
    
    async with db_manager.session() as session:
        repo = InstitutionGeoRepository(session)
        
        imported = 0
        skipped = 0
        errors = 0
        
        for inst in institutions:
            try:
                # Check if already exists (by primary_name)
                # Use a direct query on primary_name since normalized_name might have collisions
                from app.db.models import InstitutionGeo
                from sqlalchemy import select
                result = await session.execute(
                    select(InstitutionGeo).where(
                        InstitutionGeo.primary_name == inst['primary_name']
                    )
                )
                existing = result.scalar_one_or_none()
                if existing:
                    logger.debug(f"Skipping existing: {inst['primary_name']}")
                    skipped += 1
                    continue
                
                # Insert new institution (with normalized_name)
                await repo.insert_institution(
                    primary_name=inst['primary_name'],
                    normalized_name=inst['normalized_name'],
                    country=inst['country'],
                    city=inst.get('city'),
                    aliases=inst.get('aliases'),
                    qs_rank=inst.get('qs_rank'),
                    ror_id=inst.get('ror_id'),
                    source=inst.get('source', 'qs')
                )
                imported += 1
                
            except Exception as e:
                logger.error(f"Error importing {inst.get('primary_name', 'unknown')}: {e}")
                errors += 1
        
        await session.commit()
        
        logger.info(f"Import complete: {imported} imported, {skipped} skipped, {errors} errors")


async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Import institution geographic data from CSV/JSON file"
    )
    parser.add_argument(
        '--file',
        type=Path,
        required=True,
        help='Path to CSV or JSON file'
    )
    parser.add_argument(
        '--format',
        choices=['csv', 'json', 'auto'],
        default='auto',
        help='File format (auto-detect by extension if not specified)'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be imported without actually importing'
    )
    
    args = parser.parse_args()
    
    # Setup logging
    import logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    logger = logging.getLogger(__name__)
    
    # Determine file format
    file_format = args.format
    if file_format == 'auto':
        if args.file.suffix.lower() == '.json':
            file_format = 'json'
        elif args.file.suffix.lower() == '.csv':
            file_format = 'csv'
        else:
            logger.error(f"Cannot auto-detect format for {args.file.suffix}")
            sys.exit(1)
    
    # Load data
    logger.info(f"Loading institutions from {args.file} ({file_format} format)...")
    try:
        if file_format == 'csv':
            institutions = load_csv(args.file)
        else:
            institutions = load_json(args.file)
        
        logger.info(f"Loaded {len(institutions)} institutions")
        
        # Validate required fields
        required_fields = ['primary_name', 'country']
        invalid = []
        for i, inst in enumerate(institutions):
            for field in required_fields:
                if not inst.get(field):
                    invalid.append((i + 1, field))
        
        if invalid:
            logger.error(f"Validation failed: Missing required fields:")
            for line_num, field in invalid[:10]:
                logger.error(f"  Line {line_num}: missing '{field}'")
            if len(invalid) > 10:
                logger.error(f"  ... and {len(invalid) - 10} more errors")
            sys.exit(1)
        
        # Import
        try:
            await import_institutions(institutions, dry_run=args.dry_run)
            
            if not args.dry_run:
                logger.info("✅ Import completed successfully")
        finally:
            # Close database connection if initialized
            if db_manager._session_factory:
                await db_manager.close()
        
    except FileNotFoundError:
        logger.error(f"File not found: {args.file}")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    import asyncio
    asyncio.run(main())

