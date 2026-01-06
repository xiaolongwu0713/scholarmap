#!/usr/bin/env python3
"""
Script to trigger ingestion for a specific run.

⚠️  IMPORTANT: The email/password must be for the owner of the project that contains the run.
   The API will verify project ownership - if the project doesn't belong to the logged-in user,
   the request will fail with "Project not found" (404).
   
   EXCEPTION: Super users (configured in config.py) can access any project and run.

Usage:
    python scripts/trigger_ingestion.py <project_id> <run_id> [--email EMAIL] [--password PASSWORD] [--token TOKEN] [--force] [--base-url URL]

Examples:
    # Using email/password
    python scripts/trigger_ingestion.py ad280effc0b8 run_7b1d4766fd27 --email user@example.com --password mypassword

    # Using existing token
    python scripts/trigger_ingestion.py ad280effc0b8 run_7b1d4766fd27 --token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

    # Force refresh (ignore cache)
    python scripts/trigger_ingestion.py ad280effc0b8 run_7b1d4766fd27 --email user@example.com --password mypassword --force

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
    token: str,
    force_refresh: bool = False
) -> dict:
    """Trigger ingestion for a run."""
    url = f"{base_url}/api/projects/{project_id}/runs/{run_id}/ingest"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    data = {"force_refresh": force_refresh}
    
    print(f"\n🚀 Triggering ingestion for run {run_id}...")
    if force_refresh:
        print("   (Force refresh enabled - will ignore cache)")
    
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
    parser.add_argument("--force", action="store_true", help="Force refresh (ignore cache)")
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
        
        # Trigger ingestion
        result = trigger_ingestion(
            args.base_url,
            args.project_id,
            args.run_id,
            token,
            force_refresh=args.force
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

