#!/usr/bin/env python3
"""Apply every SQL file in scripts/migrations/ in name order (all must be idempotent).

Used as Render's pre-deploy command: python ../scripts/run_migrations.py
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from run_sql_script import run_sql_script  # noqa: E402

MIGRATIONS = Path(__file__).resolve().parent / "migrations"

if __name__ == "__main__":
    for sql in sorted(MIGRATIONS.glob("*.sql")):
        run_sql_script(str(sql))
