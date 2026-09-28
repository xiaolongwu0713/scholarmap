"""The country view reports scholars whose city couldn't be determined."""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db.models import Authorship, Base, RunPaper
from app.phase2.pg_aggregations import PostgresMapAggregator


def author(pmid, name, country, city):
    return Authorship(
        pmid=pmid, author_order=1, author_name_raw=name, last_name=name, fore_name="A", initials="A",
        suffix="", is_collective=False, collective_name="", affiliations_raw="[]", affiliation_raw_joined="",
        has_author_affiliation=True, affiliation_confidence="high", country=country, city=city, institution="X",
    )


def test_counts_only_this_runs_scholars_without_a_city():
    async def go():
        engine = create_async_engine("sqlite+aiosqlite://")
        async with engine.begin() as conn:
            await conn.run_sync(lambda c: Base.metadata.create_all(
                c, tables=[Authorship.__table__, RunPaper.__table__]))
        async with async_sessionmaker(engine)() as session:
            session.add_all([
                RunPaper(run_id="r1", pmid="1"), RunPaper(run_id="r1", pmid="2"),
                author("1", "Kim", "United States", "Boston"),
                author("1", "Lee", "United States", None),
                author("2", "Park", "United States", None),
                author("2", "Park", "United States", None),   # same scholar twice: counted once
                author("2", "Wu", "Singapore", None),          # other country
                author("9", "Other", "United States", None),   # other run's paper
            ])
            await session.commit()
            n = await PostgresMapAggregator().count_without_city(session, "r1", "United States")
        await engine.dispose()
        return n

    assert asyncio.run(go()) == 2
