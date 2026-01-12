#!/usr/bin/env python3
"""
Script to trigger ingestion for a specific run.

⚠️  IMPORTANT: The email/password must be for the owner of the project that contains the run.
   The API will verify project ownership - if the project doesn't belong to the logged-in user,
   the request will fail with "Project not found" (404).
   
   EXCEPTION: Super users (configured in config.py) can access any project and run.

Usage:
    python scripts/trigger_ingestion.py <project_id> <run_id> [--email EMAIL] [--password PASSWORD] [--token TOKEN] [--base-url URL] [--skip-cache-clear]

Features:
    - Automatically clears affiliation_cache for the run before ingestion (ensures fresh re-parsing)
    - Use --skip-cache-clear to keep existing cache (faster, but won't re-parse affiliations)

Examples:
    # Basic usage (automatically clears cache for re-parsing)
    python scripts/trigger_ingestion.py ad280effc0b8 run_7b1d4766fd27 --email user@example.com --password mypassword
    python scripts/trigger_ingestion.py 6af7ac1b6254 13092a22728c --email xiaolongwu0713@gmail.com --password xiaowu
    
    # Using existing token
    python scripts/trigger_ingestion.py ad280effc0b8 run_7b1d4766fd27 --token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

    # Skip cache clearing (use existing cache, faster but won't re-parse)
    python scripts/trigger_ingestion.py ad280effc0b8 run_7b1d4766fd27 --email user@example.com --password mypassword --skip-cache-clear

    # Custom backend URL
    python scripts/trigger_ingestion.py ad280effc0b8 run_7b1d4766fd27 --email user@example.com --password mypassword --base-url http://localhost:8000
"""

import argparse
import sys
import time
from pathlib import Path

import httpx

# Add backend to path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir.parent))

# Import database utilities
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

async def clear_run_affiliation_cache(run_id: str) -> int:
    """
    Clear affiliation_cache entries for a specific run.
    
    This allows the run to be re-processed with updated parsing logic.
    
    Args:
        run_id: Run ID to clear cache for
    
    Returns:
        Number of cache entries cleared
    """
    # Import config to get DATABASE_URL
    import config
    settings = config.settings
    database_url = settings.database_url
    
    # Convert to async driver URL if needed
    # postgresql:// -> postgresql+asyncpg://
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    
    # Create async engine
    engine = create_async_engine(database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    try:
        async with async_session() as session:
            # Get all unique affiliations for this run
            query = text("""
                WITH run_affiliations AS (
                    SELECT DISTINCT unnest(string_to_array(affiliation_raw_joined, ' | ')) AS aff
                    FROM authorship a
                    JOIN run_papers rp ON a.pmid = rp.pmid
                    WHERE rp.run_id = :run_id
                      AND affiliation_raw_joined IS NOT NULL
                      AND affiliation_raw_joined != ''
                )
                DELETE FROM affiliation_cache
                WHERE affiliation_raw IN (SELECT aff FROM run_affiliations WHERE aff IS NOT NULL AND aff != '')
                RETURNING affiliation_raw
            """)
            
            result = await session.execute(query, {"run_id": run_id})
            deleted_rows = result.fetchall()
            count = len(deleted_rows)
            
            await session.commit()
            return count
    finally:
        await engine.dispose()


def login(base_url: str, email: str, password: str) -> str:
    """Login and get JWT token."""
    print(f"Logging in as {email}...")
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                f"{base_url}/api/auth/login",
                json={"email": email, "password": password}
            )
            response.raise_for_status()
            data = response.json()
            if not data.get("ok"):
                raise Exception(f"Login failed: {data.get('detail', 'Unknown error')}")
            token = data.get("access_token")
            if not token:
                raise Exception("No token in login response")
            print("✅ Login successful")
            return token
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 401:
            raise Exception("Invalid email or password")
        raise Exception(f"Login failed: HTTP {e.response.status_code}: {e.response.text}")
    except Exception as e:
        raise Exception(f"Login failed: {str(e)}")


def trigger_ingestion(
    base_url: str,
    project_id: str,
    run_id: str,
    token: str
) -> dict:
    """Trigger ingestion for a run."""
    url = f"{base_url}/api/projects/{project_id}/runs/{run_id}/ingest"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    data = {"force_refresh": False}  # Parameter is ignored by backend, but kept for API compatibility
    
    print(f"\n🚀 Triggering ingestion for run {run_id}...")
    
    try:
        # Use a longer timeout for ingestion (it can take several minutes)
        with httpx.Client(timeout=600.0) as client:
            response = client.post(url, json=data, headers=headers)
            response.raise_for_status()
            result = response.json()
            return result
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 401:
            raise Exception("Authentication failed - token may be expired")
        elif e.response.status_code == 404:
            raise Exception(f"Run not found: {run_id}")
        elif e.response.status_code == 500:
            error_detail = e.response.json().get("detail", "Unknown error")
            raise Exception(f"Ingestion failed: {error_detail}")
        raise Exception(f"HTTP {e.response.status_code}: {e.response.text}")
    except httpx.TimeoutException:
        raise Exception("Request timed out - ingestion may still be running in background")
    except Exception as e:
        raise Exception(f"Request failed: {str(e)}")


def format_stats(stats: dict) -> str:
    """Format ingestion stats for display."""
    lines = [
        "\n📊 Ingestion Statistics:",
        "=" * 60,
        f"  Run ID: {stats.get('run_id', 'N/A')}",
        f"  Total PMIDs: {stats.get('total_pmids', 0)}",
        f"  PMIDs Cached: {stats.get('pmids_cached', 0)}",
        f"  PMIDs Fetched: {stats.get('pmids_fetched', 0)}",
        f"  Papers Parsed: {stats.get('papers_parsed', 0)}",
        f"  Authorships Created: {stats.get('authorships_created', 0)}",
        f"  Unique Affiliations: {stats.get('unique_affiliations', 0)}",
        f"  Affiliations with Country: {stats.get('affiliations_with_country', 0)}",
        f"  LLM Calls Made: {stats.get('llm_calls_made', 0)}",
        "=" * 60,
    ]
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(
        description="Trigger ingestion for a specific run",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    parser.add_argument("project_id", help="Project ID")
    parser.add_argument("run_id", help="Run ID")
    parser.add_argument("--email", help="Email for login (required if --token not provided)")
    parser.add_argument("--password", help="Password for login (required if --token not provided)")
    parser.add_argument("--token", help="JWT token (alternative to --email/--password)")
    parser.add_argument("--skip-cache-clear", action="store_true", help="Skip clearing affiliation_cache (faster, but won't re-parse affiliations)")
    parser.add_argument("--base-url", default="http://localhost:8000", help="Backend base URL (default: http://localhost:8000)")
    
    args = parser.parse_args()
    
    # Validate arguments
    if not args.token and (not args.email or not args.password):
        parser.error("Either --token or both --email and --password must be provided")
    
    try:
        # Get token
        if args.token:
            token = args.token
            print("Using provided token")
        else:
            token = login(args.base_url, args.email, args.password)
        
        # Clear affiliation cache for this run (unless --skip-cache-clear is specified)
        if not args.skip_cache_clear:
            print(f"\n🧹 Clearing affiliation_cache for run {args.run_id}...")
            cleared_count = asyncio.run(clear_run_affiliation_cache(args.run_id))
            if cleared_count > 0:
                print(f"   ✅ Cleared {cleared_count} cached affiliation(s)")
                print(f"   → Affiliations will be re-parsed with latest extraction logic")
            else:
                print(f"   ℹ️  No cached affiliations found for this run")
        else:
            print(f"\n⚠️  Skipping cache clear (--skip-cache-clear enabled)")
            print(f"   → Existing cached affiliations will be reused (faster, but won't re-parse)")
        
        # Trigger ingestion
        result = trigger_ingestion(
            args.base_url,
            args.project_id,
            args.run_id,
            token
        )
        
        # Display results
        if "stats" in result:
            print(format_stats(result["stats"]))
            print("\n✅ Ingestion completed successfully!")
        else:
            print("\n✅ Ingestion completed!")
            print(f"Response: {result}")
            
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {str(e)}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

