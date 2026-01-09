#!/usr/bin/env python3
"""Script to create institution_geo table from SQL file.

Usage:
    python scripts/create_institution_geo_table.py
"""

import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(backend_dir.parent))

import config
from app.db.connection import db_manager


async def create_table():
    """Create institution_geo table from SQL file."""
    # Initialize database manager
    db_manager.initialize(config.settings.database_url)
    
    try:
        # Read SQL file
        sql_file = Path(__file__).parent / "create_institution_geo_table.sql"
        with open(sql_file, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        # Use asyncpg directly to execute multi-statement SQL
        import asyncpg
        
        # Get database URL and convert to asyncpg format
        db_url = config.settings.database_url
        if db_url.startswith("postgresql://"):
            db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
        
        # Parse connection string
        from urllib.parse import urlparse
        parsed = urlparse(db_url.replace("postgresql+asyncpg://", "postgresql://"))
        
        # Connect and execute
        conn = await asyncpg.connect(
            host=parsed.hostname,
            port=parsed.port or 5432,
            user=parsed.username,
            password=parsed.password,
            database=parsed.path.lstrip('/')
        )
        
        try:
            # Execute the entire SQL script
            await conn.execute(sql_content)
            print("✅ Table creation completed successfully!")
        finally:
            await conn.close()
    
    finally:
        await db_manager.close()


if __name__ == '__main__':
    import asyncio
    asyncio.run(create_table())

