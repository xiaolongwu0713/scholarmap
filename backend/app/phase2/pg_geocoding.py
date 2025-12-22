"""PostgreSQL-based geocoding (simplified, no cache)."""
from __future__ import annotations

import asyncio
import logging
from typing import Tuple

from geopy.adapters import AioHTTPAdapter
from geopy.geocoders import Nominatim

logger = logging.getLogger(__name__)


class PostgresGeocoder:
    """Async geocoder (no cache, always fresh)."""
    
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
        Get latitude/longitude for a location (no cache).
        
        Args:
            country: Country name
            city: City name (optional)
        
        Returns:
            Tuple of (latitude, longitude) or None if not found
        """
        try:
            query = f"{city}, {country}" if city else country
            geocoder = await self._get_geocoder()
            
            # Rate limiting
            await asyncio.sleep(self._rate_limit_delay)
            
            location = await geocoder.geocode(query)
            
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
