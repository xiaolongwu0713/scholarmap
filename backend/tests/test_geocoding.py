"""Geocoding must not cache rate-limit failures as 'place not found'."""
from __future__ import annotations

import asyncio
import contextlib
import sys
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import pytest
from geopy.exc import GeocoderRateLimited

import app.phase2.pg_geocoding as geo


@pytest.fixture(autouse=True)
def fast_limits(monkeypatch):
    monkeypatch.setattr(geo, "_MIN_INTERVAL", 0)
    monkeypatch.setattr(geo, "_RETRY_BACKOFF", (0, 0))
    monkeypatch.setattr(geo, "_rate_lock", asyncio.Lock())


class FakeCache:
    """Stands in for GeocodingCacheRepository; records what gets cached."""
    stored: list = []

    def __init__(self, session):
        pass

    async def get_cached(self, key):
        return None

    async def cache_location(self, key, lat, lon, **kw):
        FakeCache.stored.append((key, lat, lon))


@pytest.fixture
def cache(monkeypatch):
    FakeCache.stored = []

    @contextlib.asynccontextmanager
    async def session():
        yield SimpleNamespace(commit=lambda: asyncio.sleep(0))

    monkeypatch.setattr(geo, "GeocodingCacheRepository", FakeCache)
    monkeypatch.setattr(geo.db_manager, "session", session)
    return FakeCache


def geocoder_returning(behaviour):
    g = geo.PostgresGeocoder()
    g._geocoder = SimpleNamespace(geocode=behaviour)
    return g


def test_rate_limit_is_retried_then_succeeds():
    calls = []

    def flaky(q):
        calls.append(q)
        if len(calls) < 3:
            raise GeocoderRateLimited("429")
        return "ok"

    assert asyncio.run(geo._nominatim_call(lambda: flaky("x"))) == "ok"
    assert len(calls) == 3


def test_persistent_rate_limit_becomes_transient_error():
    def always_429(q):
        raise GeocoderRateLimited("429")

    with pytest.raises(geo.TransientGeocodingError):
        asyncio.run(geo._nominatim_call(lambda: always_429("x")))


def test_transient_failure_is_not_cached(cache):
    def always_429(q):
        raise GeocoderRateLimited("429")

    result = asyncio.run(geocoder_returning(always_429).get_coordinates("Bolivia"))
    assert result is None
    assert cache.stored == []


def test_genuine_not_found_is_cached_as_null(cache):
    result = asyncio.run(geocoder_returning(lambda q: None).get_coordinates("Atlantis"))
    assert result is None
    assert cache.stored == [("country:Atlantis", None, None)]


def test_success_is_cached(cache):
    loc = SimpleNamespace(latitude=1.5, longitude=2.5, raw={"address": {"country": "Bolivia"}})
    result = asyncio.run(geocoder_returning(lambda q: loc).get_coordinates("Bolivia"))
    assert result == (1.5, 2.5)
    assert cache.stored == [("country:Bolivia", 1.5, 2.5)]
