"""Geocoding service for converting location names to coordinates."""

from __future__ import annotations

import asyncio
import logging
import sqlite3
from typing import Tuple

import httpx

logger = logging.getLogger(__name__)


class Geocoder:
    """
    Geocoding service using Nominatim (OpenStreetMap).
    
    Features:
    - Database caching to avoid repeated API calls
    - Rate limiting (1 request per second for Nominatim)
    - Fallback to None if geocoding fails
    """
    
    NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
    USER_AGENT = "ScholarNet/1.0"
    RATE_LIMIT_DELAY = 1.0  # Nominatim requires 1 request per second
    
    def __init__(self, db_conn: sqlite3.Connection) -> None:
        self.conn = db_conn
        self._last_request_time = 0.0
        self._ensure_geocoding_table()
    
    def _ensure_geocoding_table(self) -> None:
        """Create geocoding cache table if it doesn't exist."""
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS geocoding_cache (
                location_name TEXT PRIMARY KEY,
                location_type TEXT,
                latitude REAL,
                longitude REAL,
                display_name TEXT,
                cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        self.conn.commit()
    
    async def _enforce_rate_limit(self) -> None:
        """Ensure we don't exceed Nominatim rate limit (1 rps)."""
        now = asyncio.get_event_loop().time()
        elapsed = now - self._last_request_time
        
        if elapsed < self.RATE_LIMIT_DELAY:
            await asyncio.sleep(self.RATE_LIMIT_DELAY - elapsed)
        
        self._last_request_time = asyncio.get_event_loop().time()
    
    def _get_cached(self, location_name: str, location_type: str) -> Tuple[float, float] | None:
        """Get coordinates from cache."""
        row = self.conn.execute("""
            SELECT latitude, longitude 
            FROM geocoding_cache 
            WHERE location_name = ? AND location_type = ?
        """, (location_name, location_type)).fetchone()
        
        if row and row[0] is not None and row[1] is not None:
            return (row[0], row[1])
        return None
    
    def _cache_result(
        self,
        location_name: str,
        location_type: str,
        latitude: float | None,
        longitude: float | None,
        display_name: str | None
    ) -> None:
        """Cache geocoding result."""
        self.conn.execute("""
            INSERT OR REPLACE INTO geocoding_cache 
            (location_name, location_type, latitude, longitude, display_name)
            VALUES (?, ?, ?, ?, ?)
        """, (location_name, location_type, latitude, longitude, display_name))
        self.conn.commit()
    
    async def geocode_country(self, country: str) -> Tuple[float, float] | None:
        """
        Geocode a country name to coordinates.
        
        Returns (latitude, longitude) or None if not found.
        """
        # Check cache first
        cached = self._get_cached(country, "country")
        if cached:
            return cached
        
        # Query Nominatim
        await self._enforce_rate_limit()
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    self.NOMINATIM_URL,
                    params={
                        "q": country,
                        "format": "json",
                        "limit": 1,
                        "addressdetails": 1
                    },
                    headers={"User-Agent": self.USER_AGENT},
                    timeout=10.0
                )
                
                response.raise_for_status()
                data = response.json()
                
                if data and len(data) > 0:
                    result = data[0]
                    lat = float(result["lat"])
                    lon = float(result["lon"])
                    display_name = result.get("display_name", "")
                    
                    # Cache result
                    self._cache_result(country, "country", lat, lon, display_name)
                    
                    logger.info(f"Geocoded country '{country}': ({lat}, {lon})")
                    return (lat, lon)
                else:
                    # Cache negative result to avoid repeated lookups
                    self._cache_result(country, "country", None, None, None)
                    logger.warning(f"Could not geocode country: {country}")
                    return None
                    
        except Exception as e:
            logger.error(f"Geocoding failed for country '{country}': {e}")
            return None
    
    async def geocode_city(self, city: str, country: str | None = None) -> Tuple[float, float] | None:
        """
        Geocode a city name to coordinates.
        
        Returns (latitude, longitude) or None if not found.
        """
        cache_key = f"{city}, {country}" if country else city
        
        # Check cache first
        cached = self._get_cached(cache_key, "city")
        if cached:
            return cached
        
        # Query Nominatim
        await self._enforce_rate_limit()
        
        try:
            # Build query with country context if available
            query = f"{city}, {country}" if country else city
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    self.NOMINATIM_URL,
                    params={
                        "q": query,
                        "format": "json",
                        "limit": 1,
                        "addressdetails": 1,
                        "featuretype": "city"
                    },
                    headers={"User-Agent": self.USER_AGENT},
                    timeout=10.0
                )
                
                response.raise_for_status()
                data = response.json()
                
                if data and len(data) > 0:
                    result = data[0]
                    lat = float(result["lat"])
                    lon = float(result["lon"])
                    display_name = result.get("display_name", "")
                    
                    # Cache result
                    self._cache_result(cache_key, "city", lat, lon, display_name)
                    
                    logger.info(f"Geocoded city '{query}': ({lat}, {lon})")
                    return (lat, lon)
                else:
                    # Cache negative result
                    self._cache_result(cache_key, "city", None, None, None)
                    logger.warning(f"Could not geocode city: {query}")
                    return None
                    
        except Exception as e:
            logger.error(f"Geocoding failed for city '{query}': {e}")
            return None
    
    async def geocode_institution(
        self,
        institution: str,
        city: str | None = None,
        country: str | None = None
    ) -> Tuple[float, float] | None:
        """
        Geocode an institution to coordinates.
        
        Returns (latitude, longitude) or None if not found.
        """
        cache_key = f"{institution}, {city}, {country}"
        
        # Check cache first
        cached = self._get_cached(cache_key, "institution")
        if cached:
            return cached
        
        # Query Nominatim
        await self._enforce_rate_limit()
        
        try:
            # Build query with context
            parts = [institution]
            if city:
                parts.append(city)
            if country:
                parts.append(country)
            query = ", ".join(parts)
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    self.NOMINATIM_URL,
                    params={
                        "q": query,
                        "format": "json",
                        "limit": 1,
                        "addressdetails": 1
                    },
                    headers={"User-Agent": self.USER_AGENT},
                    timeout=10.0
                )
                
                response.raise_for_status()
                data = response.json()
                
                if data and len(data) > 0:
                    result = data[0]
                    lat = float(result["lat"])
                    lon = float(result["lon"])
                    display_name = result.get("display_name", "")
                    
                    # Cache result
                    self._cache_result(cache_key, "institution", lat, lon, display_name)
                    
                    logger.info(f"Geocoded institution '{query}': ({lat}, {lon})")
                    return (lat, lon)
                else:
                    # Cache negative result
                    self._cache_result(cache_key, "institution", None, None, None)
                    logger.warning(f"Could not geocode institution: {query}")
                    return None
                    
        except Exception as e:
            logger.error(f"Geocoding failed for institution '{query}': {e}")
            return None

