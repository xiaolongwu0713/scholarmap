#!/usr/bin/env python3
"""
Clean invalid geocoding cache entries where country validation would fail.

This script identifies and deletes cache entries where the city-country combination
doesn't make sense (e.g., "Boston, Germany").
"""

import asyncio
import logging
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.db.models import GeocodingCache
from config import settings

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Known invalid city-country combinations from the log
INVALID_COMBINATIONS = [
    # Format: (city, country, reason)
    ("Boston", "Germany", "Boston is in USA, not Germany"),
    ("Boston", "Israel", "Boston is in USA, not Israel"),
    ("Boston", "Italy", "Boston is in USA, not Italy"),
    ("Baltimore", "Japan", "Baltimore is in USA, not Japan"),
    ("San Francisco", "Andorra", "San Francisco is in USA, not Andorra"),
    ("San Francisco", "South Korea", "San Francisco is in USA, not South Korea"),
    ("Stanford", "Canada", "Stanford is in USA, not Canada"),
    ("Stanford", "Australia", "Stanford is in USA, not Australia"),
    ("New York", "Singapore", "New York is in USA, not Singapore"),
    ("Seattle", "Taiwan", "Seattle is in USA, not Taiwan"),
    ("Italy", "Andorra", "Italy is a country, not a city in Andorra"),
    ("Australia", "Singapore", "Australia is a country, not a city in Singapore"),
    # Add more as needed
]


async def clean_invalid_cache():
    """Delete invalid geocoding cache entries."""
    
    # Create engine
    engine = create_async_engine(
        settings.database_url_async,
        echo=False
    )
    
    # Create session factory
    async_session = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False
    )
    
    try:
        async with async_session() as session:
            total_deleted = 0
            
            for city, country, reason in INVALID_COMBINATIONS:
                # Generate cache key (same format as in pg_geocoding.py)
                location_key = f"city:{city},{country}"
                
                # Check if entry exists
                result = await session.execute(
                    select(GeocodingCache).where(
                        GeocodingCache.location_key == location_key
                    )
                )
                entry = result.scalar_one_or_none()
                
                if entry:
                    logger.info(
                        f"Deleting invalid cache entry: {location_key} "
                        f"(coords: {entry.latitude}, {entry.longitude}) - {reason}"
                    )
                    
                    # Delete the entry
                    await session.execute(
                        delete(GeocodingCache).where(
                            GeocodingCache.location_key == location_key
                        )
                    )
                    total_deleted += 1
                else:
                    logger.debug(f"Entry not found in cache: {location_key}")
            
            # Commit all deletions
            await session.commit()
            
            logger.info(f"✅ Cleanup complete: deleted {total_deleted} invalid cache entries")
            logger.info(f"These locations will be re-geocoded with country validation on next access")
            
    finally:
        await engine.dispose()


async def inspect_suspicious_entries():
    """Inspect all cache entries to find potentially invalid combinations."""
    
    engine = create_async_engine(
        settings.database_url_async,
        echo=False
    )
    
    async_session = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False
    )
    
    try:
        async with async_session() as session:
            # Get all city entries
            result = await session.execute(
                select(GeocodingCache).where(
                    GeocodingCache.location_key.like('city:%')
                )
            )
            entries = result.scalars().all()
            
            logger.info(f"Found {len(entries)} city cache entries")
            logger.info("\nSuspicious entries (for manual review):")
            logger.info("-" * 80)
            
            # Common US cities
            us_cities = {'boston', 'new york', 'san francisco', 'baltimore', 'stanford', 
                        'seattle', 'chicago', 'los angeles', 'philadelphia', 'houston'}
            
            suspicious_count = 0
            for entry in entries:
                # Parse location_key: "city:CityName,CountryName"
                if ',' in entry.location_key:
                    parts = entry.location_key.split(':', 1)[1].split(',', 1)
                    if len(parts) == 2:
                        city, country = parts
                        city_lower = city.lower()
                        country_lower = country.lower()
                        
                        # Check if US city is in non-US country
                        if city_lower in us_cities and country_lower not in ['united states', 'usa', 'us']:
                            suspicious_count += 1
                            logger.info(
                                f"  {entry.location_key} -> "
                                f"({entry.latitude}, {entry.longitude})"
                            )
            
            logger.info("-" * 80)
            logger.info(f"Found {suspicious_count} suspicious entries")
            
    finally:
        await engine.dispose()


async def main():
    """Main entry point."""
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == '--inspect':
        logger.info("🔍 Inspecting cache for suspicious entries...")
        await inspect_suspicious_entries()
    else:
        logger.info("🧹 Cleaning known invalid cache entries...")
        await clean_invalid_cache()
        logger.info("\nTo inspect all cache entries, run: python clean_invalid_geocoding_cache.py --inspect")


if __name__ == "__main__":
    asyncio.run(main())
