"""Database connection and session management."""
from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

import sys
from pathlib import Path

# Add repo root to path to import config
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
import config
settings = config.settings


class DatabaseManager:
    """Manages database connections and sessions."""
    
    def __init__(self) -> None:
        self._engine: AsyncEngine | None = None
        self._session_factory: async_sessionmaker[AsyncSession] | None = None
    
    def initialize(self, database_url: str | None = None) -> None:
        """Initialize the database engine and session factory."""
        url = database_url or settings.database_url
        if not url:
            raise ValueError("DATABASE_URL not configured")
        
        # Convert postgresql:// to postgresql+asyncpg://
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        
        self._engine = create_async_engine(
            url,
            echo=False,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20,
        )
        
        self._session_factory = async_sessionmaker(
            self._engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )
    
    async def close(self) -> None:
        """Close the database engine."""
        if self._engine:
            await self._engine.dispose()
    
    @asynccontextmanager
    async def session(self) -> AsyncGenerator[AsyncSession, None]:
        """Context manager for database sessions."""
        if not self._session_factory:
            raise RuntimeError("DatabaseManager not initialized")
        
        async with self._session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
    
    @property
    def engine(self) -> AsyncEngine:
        """Get the database engine."""
        if not self._engine:
            raise RuntimeError("DatabaseManager not initialized")
        return self._engine


# Global database manager instance
db_manager = DatabaseManager()

