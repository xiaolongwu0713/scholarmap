"""PostgreSQL-based geocoding with global cache."""
from __future__ import annotations

import asyncio
import logging
import time
from concurrent.futures import ThreadPoolExecutor
from typing import Tuple

from geopy.exc import GeocoderQuotaExceeded, GeocoderTimedOut, GeocoderUnavailable
from geopy.geocoders import Nominatim

from app.db.connection import db_manager
from app.db.repository import GeocodingCacheRepository
from config import settings

logger = logging.getLogger(__name__)

# Nominatim's usage policy allows at most 1 request/second per application, so the
# limit is shared by every geocoder instance in the process (builder + web requests).
_MIN_INTERVAL = 1.1
_RETRY_BACKOFF = (30, 90, 240)  # seconds to wait after a rate-limit / outage
_rate_lock = asyncio.Lock()
_last_request = 0.0
_executor = ThreadPoolExecutor(max_workers=1)

# Errors that say "try later", not "this place doesn't exist". Never cached.
_TRANSIENT_ERRORS = (GeocoderQuotaExceeded, GeocoderTimedOut, GeocoderUnavailable, OSError)


class TransientGeocodingError(Exception):
    """Geocoding temporarily unavailable (rate limit, timeout, outage)."""


async def _nominatim_call(fn):
    """Run one Nominatim request under the shared rate limit, retrying transient errors."""
    global _last_request
    for attempt in range(len(_RETRY_BACKOFF) + 1):
        async with _rate_lock:
            wait = _MIN_INTERVAL - (time.monotonic() - _last_request)
            if wait > 0:
                await asyncio.sleep(wait)
            try:
                return await asyncio.get_running_loop().run_in_executor(_executor, fn)
            except _TRANSIENT_ERRORS as e:
                if attempt == len(_RETRY_BACKOFF):
                    raise TransientGeocodingError(str(e)) from e
                delay = _RETRY_BACKOFF[attempt]
                logger.warning("Nominatim unavailable (%s); pausing %ss before retry", e, delay)
                # Hold the lock while backing off so no other caller hammers the API
                await asyncio.sleep(delay)
            finally:
                _last_request = time.monotonic()

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
    "Korea, Republic of": "South Korea",  # Add this for Nominatim compatibility
    "People's Republic of China": "China",
    "PRC": "China",
    "China (Mainland)": "China",
    "Taiwan, Province of China": "Taiwan",  # Nominatim recognizes "Taiwan" better
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
    
    def _get_geocoder(self) -> Nominatim:
        """Lazy initialize geocoder (synchronous)."""
        if self._geocoder is None:
            self._geocoder = Nominatim(
                user_agent="LabScout/1.0",
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
        city: str | None = None,
        original_affiliation: str | None = None
    ) -> Tuple[float, float] | None:
        """Geocode location using external API (Nominatim) with strict country validation."""
        try:
            # Normalize country name before querying Nominatim
            country_normalized = normalize_country(country) or country
            
            geocoder = self._get_geocoder()
            
            # Use structured query to enforce country constraint
            if city:
                query_params = {
                    'city': city,
                    'country': country_normalized
                }
                query_str = f"{city}, {country_normalized}"
            else:
                query_params = {
                    'country': country_normalized
                }
                query_str = country_normalized
            
            location = await _nominatim_call(lambda: geocoder.geocode(query_params))
            
            if location:
                # Validate that the returned location matches the requested country
                # Check if country appears in the address
                address = location.raw.get('address', {})
                returned_country = address.get('country', '')
                
                # Normalize returned country for comparison
                returned_country_normalized = normalize_country(returned_country) or returned_country
                
                # Check if countries match
                if returned_country_normalized.lower() != country_normalized.lower():
                    logger.warning(
                        f"Country mismatch for '{query_str}': "
                        f"requested={country_normalized}, returned={returned_country} "
                        f"(coords: {location.latitude}, {location.longitude})"
                    )
                    # Try fallback: simple string query
                    logger.info(f"Attempting fallback query: '{query_str}'")
                    location_fallback = await _nominatim_call(lambda: geocoder.geocode(query_str))
                    if location_fallback:
                        fallback_address = location_fallback.raw.get('address', {})
                        fallback_country = fallback_address.get('country', '')
                        fallback_country_normalized = normalize_country(fallback_country) or fallback_country
                        
                        if fallback_country_normalized.lower() == country_normalized.lower():
                            coords = (location_fallback.latitude, location_fallback.longitude)
                            logger.info(f"Fallback success: '{query_str}' -> {coords} (country: {fallback_country})")
                            return coords
                    
                    # Both attempts failed to match country
                    if original_affiliation:
                        logger.warning(
                            f"Could not geocode '{query_str}' with country validation "
                            f"(from affiliation: {original_affiliation})"
                        )
                    else:
                        logger.warning(f"Could not geocode '{query_str}' with country validation")
                    return None
                
                coords = (location.latitude, location.longitude)
                logger.info(f"Geocoded '{query_str}' -> {coords} (verified country: {returned_country})")
                return coords
            else:
                # Log with original affiliation if available
                if original_affiliation:
                    logger.warning(f"Could not geocode '{query_str}' (from affiliation: {original_affiliation})")
                else:
                    logger.warning(f"Could not geocode '{query_str}'")
                return None
            
        except TransientGeocodingError:
            raise
        except Exception as e:
            if original_affiliation:
                logger.error(f"Geocoding failed for '{country}, {city}' (from affiliation: {original_affiliation}): {e}")
            else:
                logger.error(f"Geocoding failed for '{country}, {city}': {e}")
            return None
    
    async def get_coordinates(
        self,
        country: str,
        city: str | None = None,
        affiliation: str | None = None
    ) -> Tuple[float, float] | None:
        """
        Get latitude/longitude for a location (with global cache).
        
        Checks cache first, then falls back to external API if not cached.
        Results are stored in global cache for reuse across all projects/runs.
        
        Args:
            country: Country name
            city: City name (optional)
            affiliation: Optional affiliation text to store in cache
        
        Returns:
            Tuple of (latitude, longitude) or None if not found
        """
        location_key = self._make_location_key(country, city)
        
        # Check cache first
        try:
            async with db_manager.session() as session:
                cache_repo = GeocodingCacheRepository(session)
                cached = await cache_repo.get_cached(location_key)
                
                if cached:
                    # Cache hit - return cached result (even if null, to avoid repeated API calls)
                    if cached.latitude is not None and cached.longitude is not None:
                        logger.debug(f"Cache hit: {location_key} -> ({cached.latitude}, {cached.longitude})")
                        # Update affiliations array if affiliation is provided (even on cache hit)
                        if affiliation:
                            try:
                                await cache_repo.cache_location(
                                    location_key,
                                    cached.latitude,
                                    cached.longitude,
                                    affiliation=affiliation,
                                    max_affiliations=settings.geocoding_cache_max_affiliations
                                )
                                await session.commit()
                            except Exception as e:
                                logger.debug(f"Failed to update affiliations for {location_key}: {e}")
                        return (cached.latitude, cached.longitude)
                    else:
                        # Cache hit but coordinates are null - previously failed geocoding
                        # Return None immediately to avoid repeated API calls
                        logger.debug(f"Cache hit (null coordinates): {location_key} -> None (previously failed)")
                        # Still update affiliations array if needed
                        if affiliation:
                            try:
                                await cache_repo.cache_location(
                                    location_key,
                                    None,
                                    None,
                                    affiliation=affiliation,
                                    max_affiliations=settings.geocoding_cache_max_affiliations
                                )
                                await session.commit()
                            except Exception as e:
                                logger.debug(f"Failed to update affiliations for {location_key}: {e}")
                        return None
        except Exception as e:
            logger.warning(f"Cache lookup failed for {location_key}: {e}, falling back to API")
        
        # Cache miss - call external API
        try:
            coords = await self._geocode_external(country, city, original_affiliation=affiliation)
        except TransientGeocodingError as e:
            # Don't cache: the place may well exist, the service just refused us for now
            logger.error(f"Geocoding temporarily unavailable for {location_key}, not caching: {e}")
            return None
        
        # Store in cache (even if None, to avoid repeated failed lookups with rate limiting)
        try:
            async with db_manager.session() as session:
                cache_repo = GeocodingCacheRepository(session)
                await cache_repo.cache_location(
                    location_key,
                    coords[0] if coords else None,
                    coords[1] if coords else None,
                    affiliation=affiliation,
                    max_affiliations=settings.geocoding_cache_max_affiliations
                )
                await session.commit()
                logger.debug(f"Cached: {location_key} -> {coords}")
        except Exception as e:
            logger.warning(f"Cache store failed for {location_key}: {e}")
        
        return coords
