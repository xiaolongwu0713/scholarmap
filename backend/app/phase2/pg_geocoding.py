"""PostgreSQL-based geocoding with caching."""
from __future__ import annotations

import asyncio
import logging
from typing import Tuple

from geopy.adapters import AioHTTPAdapter
from geopy.geocoders import Nominatim

from app.db.connection import db_manager
from app.db.repository import GeocodingCacheRepository

logger = logging.getLogger(__name__)


class PostgresGeocoder:
    """Async geocoder with PostgreSQL caching."""
    
    def __init__(self) -> None:
        self._geocoder: Nominatim | None = None
        self._rate_limit_delay = 1.0  # Nominatim requires 1 second between requests
    
    async def _get_geocoder(self) -> Nominatim:
        """Lazy initialize geocoder."""
        if self._geocoder is None:
            async with AioHTTPAdapter() as adapter:
                self._geocoder = Nominatim(
                    user_agent="ScholarMap/1.0",
                    adapter_factory=lambda: adapter,
                    timeout=10
                )
        return self._geocoder
    
    async def get_coordinates(
        self,
        country: str,
        city: str | None = None
    ) -> Tuple[float, float] | None:
        """
        Get latitude/longitude for a location.
        
        Args:
            country: Country name
            city: City name (optional)
        
        Returns:
            Tuple of (latitude, longitude) or None if not found
        """
        location_key = f"{country}|{city or ''}"
        
        # Check cache first
        async with db_manager.session() as session:
            cache_repo = GeocodingCacheRepository(session)
            cached = await cache_repo.get_cached(location_key)
            
            if cached:
                if cached.latitude and cached.longitude:
                    return (cached.latitude, cached.longitude)
                else:
                    # Cached as "not found"
                    return None
        
        # Geocode
        try:
            query = f"{city}, {country}" if city else country
            geocoder = await self._get_geocoder()
            
            # Rate limiting
            await asyncio.sleep(self._rate_limit_delay)
            
            location = await geocoder.geocode(query)
            
            if location:
                coords = (location.latitude, location.longitude)
                logger.info(f"Geocoded '{query}' -> {coords}")
            else:
                coords = None
                logger.warning(f"Could not geocode '{query}'")
            
            # Cache result
            async with db_manager.session() as session:
                cache_repo = GeocodingCacheRepository(session)
                await cache_repo.cache_location(
                    location_key=location_key,
                    latitude=coords[0] if coords else None,
                    longitude=coords[1] if coords else None
                )
            
            return coords
            
        except Exception as e:
            logger.error(f"Geocoding failed for '{location_key}': {e}")
            
            # Cache as failed
            async with db_manager.session() as session:
                cache_repo = GeocodingCacheRepository(session)
                await cache_repo.cache_location(
                    location_key=location_key,
                    latitude=None,
                    longitude=None
                )
            
            return None

