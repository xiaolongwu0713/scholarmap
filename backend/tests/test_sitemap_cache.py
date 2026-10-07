import asyncio
import time

import pytest

from app import seo_fields


@pytest.fixture(autouse=True)
def reset_cache(monkeypatch):
    monkeypatch.setattr(seo_fields, "_sitemap_cache", None)
    monkeypatch.setattr(seo_fields, "_sitemap_refresh_task", None)


def test_stale_cache_is_served_while_refreshing(monkeypatch):
    calls = []

    async def fake_compute(top_countries, top_cities):
        calls.append(1)
        await asyncio.sleep(0.05)
        return [{"slug": f"v{len(calls)}"}]

    monkeypatch.setattr(seo_fields, "_compute_sitemap_data", fake_compute)

    async def run():
        assert await seo_fields.sitemap_data() == [{"slug": "v1"}]  # cold: waits
        assert await seo_fields.sitemap_data() == [{"slug": "v1"}]  # fresh: no recompute
        assert len(calls) == 1
        old = time.monotonic() - seo_fields.SITEMAP_TTL_SECONDS - 1
        monkeypatch.setattr(seo_fields, "_sitemap_cache", (old, [{"slug": "v1"}]))
        assert await seo_fields.sitemap_data() == [{"slug": "v1"}]  # stale: returned at once
        await seo_fields._sitemap_refresh_task
        assert await seo_fields.sitemap_data() == [{"slug": "v2"}]

    asyncio.run(run())


def test_failed_refresh_keeps_serving_stale(monkeypatch):
    async def boom(top_countries, top_cities):
        raise RuntimeError("db down")

    monkeypatch.setattr(seo_fields, "_compute_sitemap_data", boom)
    old = time.monotonic() - seo_fields.SITEMAP_TTL_SECONDS - 1
    monkeypatch.setattr(seo_fields, "_sitemap_cache", (old, [{"slug": "old"}]))

    async def run():
        assert await seo_fields.sitemap_data() == [{"slug": "old"}]
        await asyncio.gather(seo_fields._sitemap_refresh_task, return_exceptions=True)
        assert await seo_fields.sitemap_data() == [{"slug": "old"}]

    asyncio.run(run())
