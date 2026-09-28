#!/usr/bin/env python3
"""Apply every SQL file in scripts/migrations/ in name order (all must be idempotent).

Used as Render's pre-deploy command: python ../scripts/run_migrations.py
"""
from __future__ import annotations

import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from run_sql_script import config, run_sql_script  # noqa: E402
from sqlalchemy import create_engine, text  # noqa: E402

MIGRATIONS = Path(__file__).resolve().parent / "migrations"


def wait_for_database(attempts: int = 10, delay: int = 20) -> None:
    """The small database restarts now and then; don't fail a deploy on a short outage."""
    url = config.settings.database_url.replace("postgresql://", "postgresql+psycopg2://", 1)
    engine = create_engine(url)
    try:
        for attempt in range(1, attempts + 1):
            try:
                with engine.connect() as conn:
                    conn.execute(text("SELECT 1"))
                return
            except Exception as e:
                if attempt == attempts:
                    raise
                print(f"Database not reachable (attempt {attempt}/{attempts}): {e.__class__.__name__}; retrying in {delay}s")
                time.sleep(delay)
    finally:
        engine.dispose()


if __name__ == "__main__":
    wait_for_database()
    for sql in sorted(MIGRATIONS.glob("*.sql")):
        run_sql_script(str(sql))
