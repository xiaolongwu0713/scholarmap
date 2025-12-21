"""Test database connection and basic operations."""
import asyncio
import sys

from app.core.config import settings
from app.db.connection import db_manager
from app.db.init_db import init_database
from app.db.repository import ProjectRepository, RunRepository


async def test_connection():
    """Test PostgreSQL connection and basic CRUD operations."""
    print("=" * 60)
    print("Testing PostgreSQL Connection")
    print("=" * 60)
    
    # Check if DATABASE_URL is configured
    if not settings.database_url:
        print("❌ DATABASE_URL not configured!")
        print("   Set DATABASE_URL environment variable and try again.")
        return False
    
    print(f"✓ DATABASE_URL configured: {settings.database_url[:50]}...")
    
    try:
        # Initialize database
        print("\n1. Initializing database schema...")
        await init_database()
        print("✓ Database schema initialized")
        
        # Test connection
        print("\n2. Testing database connection...")
        async with db_manager.session() as session:
            from sqlalchemy import text
            result = await session.execute(text("SELECT 1"))
            row = result.scalar()
            assert row == 1
        print("✓ Database connection successful")
        
        # Test CRUD operations
        print("\n3. Testing CRUD operations...")
        
        # Create a test project
        async with db_manager.session() as session:
            repo = ProjectRepository(session)
            project = await repo.create_project("Test Project")
            print(f"✓ Created project: {project.project_id}")
            
            # List projects
            projects = await repo.list_projects()
            print(f"✓ Listed {len(projects)} project(s)")
            
            # Get project
            retrieved = await repo.get_project(project.project_id)
            assert retrieved is not None
            print(f"✓ Retrieved project: {retrieved.name}")
        
        # Create a test run
        async with db_manager.session() as session:
            run_repo = RunRepository(session)
            run = await run_repo.create_run(
                project.project_id,
                "Test research description"
            )
            print(f"✓ Created run: {run.run_id}")
            
            # List runs
            runs = await run_repo.list_runs(project.project_id)
            print(f"✓ Listed {len(runs)} run(s)")
            
            # Get run
            retrieved_run = await run_repo.get_run(run.run_id)
            assert retrieved_run is not None
            print(f"✓ Retrieved run: {retrieved_run.description[:50]}...")
        
        # Test run data updates
        print("\n4. Testing run data updates...")
        async with db_manager.session() as session:
            run_repo = RunRepository(session)
            
            # Update understanding
            await run_repo.update_understanding(run.run_id, {
                "research_description": "Test",
                "slots_normalized": {}
            })
            print("✓ Updated understanding")
            
            # Update keywords
            await run_repo.update_keywords(run.run_id, {
                "canonical_terms": ["test", "keyword"],
                "synonyms": {}
            })
            print("✓ Updated keywords")
            
            # Verify updates
            updated_run = await run_repo.get_run(run.run_id)
            assert updated_run.understanding is not None
            assert updated_run.keywords is not None
            print("✓ Verified updates")
        
        print("\n" + "=" * 60)
        print("✅ All tests passed!")
        print("=" * 60)
        return True
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        await db_manager.close()


if __name__ == "__main__":
    success = asyncio.run(test_connection())
    sys.exit(0 if success else 1)

