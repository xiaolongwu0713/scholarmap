"""PostgreSQL-based geocoding (simplified, no cache)."""
from __future__ import annotations

import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Tuple

from geopy.geocoders import Nominatim

logger = logging.getLogger(__name__)


class PostgresGeocoder:
    """Async geocoder (no cache, always fresh)."""
    
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
