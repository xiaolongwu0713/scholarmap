"""PostgreSQL-based geocoding with global cache."""
from __future__ import annotations

import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Tuple

from geopy.geocoders import Nominatim

from app.db.connection import db_manager
from app.db.repository import GeocodingCacheRepository

logger = logging.getLogger(__name__)

# Country name normalization (shared with pg_aggregations)
COUNTRY_ALIASES = {
    "USA": "United States",
    "US": "United States",
    "U.S.": "United States",
    "U.S.A.": "United States",
    "United States of America": "United States",
    "The Netherlands": "Netherlands",
    "UK": "United Kingdom",
    "U.K.": "United Kingdom",
    "Great Britain": "United Kingdom",
    "England": "United Kingdom",
    "Korea": "South Korea",
    "Republic of Korea": "South Korea",
    "People's Republic of China": "China",
    "PRC": "China",
}


def normalize_country(country: str | None) -> str | None:
    """Normalize country names."""
    if not country:
        return None
    return COUNTRY_ALIASES.get(country, country)


class PostgresGeocoder:
    """Async geocoder with global PostgreSQL cache."""
    
    def __init__(self) -> None:
        self._geocoder: Nominatim | None = None
        self._rate_limit_delay = 1.0  # Nominatim requires 1 second between requests
        self._executor = ThreadPoolExecutor(max_workers=1)  # Single worker for rate limiting
    
    def _get_geocoder(self) -> Nominatim:
        """Lazy initialize geocoder (synchronous)."""
        if self._geocoder is None:
            self._geocoder = Nominatim(
                user_agent="ScholarMap/1.0",
                timeout=10
            )
        return self._geocoder
    
    def _make_location_key(self, country: str, city: str | None = None) -> str:
        """Generate cache key for location."""
        country_normalized = normalize_country(country) or country
        if city:
            # Normalize city name (strip whitespace)
            city_normalized = city.strip()
            return f"city:{city_normalized},{country_normalized}"
        return f"country:{country_normalized}"
    
    @staticmethod
    def make_location_key(country: str, city: str | None = None) -> str:
        """Generate cache key for location (static method for external use)."""
        country_normalized = normalize_country(country) or country
        if city:
            city_normalized = city.strip()
            return f"city:{city_normalized},{country_normalized}"
        return f"country:{country_normalized}"
    
    async def _geocode_external(
        self,
        country: str,
        city: str | None = None
    ) -> Tuple[float, float] | None:
        """Geocode location using external API (Nominatim)."""
        try:
            query = f"{city}, {country}" if city else country
            
            # Rate limiting
            await asyncio.sleep(self._rate_limit_delay)
            
            # Run synchronous geocoding in thread pool
            loop = asyncio.get_event_loop()
            geocoder = self._get_geocoder()
            location = await loop.run_in_executor(
                self._executor,
                lambda: geocoder.geocode(query)
            )
            
            if location:
                coords = (location.latitude, location.longitude)
                logger.info(f"Geocoded '{query}' -> {coords}")
                return coords
            else:
                logger.warning(f"Could not geocode '{query}'")
                return None
            
        except Exception as e:
            logger.error(f"Geocoding failed for '{country}, {city}': {e}")
            return None
    
    async def get_coordinates(
        self,
        country: str,
        city: str | None = None
    ) -> Tuple[float, float] | None:
        """
        Get latitude/longitude for a location (with global cache).
        
        Checks cache first, then falls back to external API if not cached.
        Results are stored in global cache for reuse across all projects/runs.
        
        Args:
            country: Country name
            city: City name (optional)
        
        Returns:
            Tuple of (latitude, longitude) or None if not found
        """
        location_key = self._make_location_key(country, city)
        
        # Check cache first
        try:
            async with db_manager.session() as session:
                cache_repo = GeocodingCacheRepository(session)
                cached = await cache_repo.get_cached(location_key)
                
                if cached and cached.latitude is not None and cached.longitude is not None:
                    logger.debug(f"Cache hit: {location_key} -> ({cached.latitude}, {cached.longitude})")
                    return (cached.latitude, cached.longitude)
        except Exception as e:
            logger.warning(f"Cache lookup failed for {location_key}: {e}, falling back to API")
        
        # Cache miss - call external API
        coords = await self._geocode_external(country, city)
        
        # Store in cache (even if None, to avoid repeated failed lookups with rate limiting)
        try:
            async with db_manager.session() as session:
                cache_repo = GeocodingCacheRepository(session)
                await cache_repo.cache_location(
                    location_key,
                    coords[0] if coords else None,
                    coords[1] if coords else None
                )
                logger.debug(f"Cached: {location_key} -> {coords}")
        except Exception as e:
            logger.warning(f"Cache store failed for {location_key}: {e}")
        
        return coords
