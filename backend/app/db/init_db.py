"""Database initialization script."""
from __future__ import annotations

import asyncio

from app.core.config import settings
from app.db.connection import db_manager
from app.db.models import Base


async def init_database() -> None:
    """Initialize database schema."""
    if not settings.database_url:
        raise ValueError("DATABASE_URL not configured")
    
    db_manager.initialize(settings.database_url)
    
    async with db_manager.engine.begin() as conn:
        # Create all tables
        await conn.run_sync(Base.metadata.create_all)
    
    print("✅ Database schema initialized successfully")


async def drop_all_tables() -> None:
    """Drop all tables (for development only)."""
    if not settings.database_url:
        raise ValueError("DATABASE_URL not configured")
    
    db_manager.initialize(settings.database_url)
    
    async with db_manager.engine.begin() as conn:
        # Drop all tables
        await conn.run_sync(Base.metadata.drop_all)
    
    print("⚠️  All tables dropped")


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--drop":
        asyncio.run(drop_all_tables())
    else:
        asyncio.run(init_database())

