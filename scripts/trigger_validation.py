#!/usr/bin/env python3
"""
Script to trigger affiliation validation and fix for a specific run.

⚠️  IMPORTANT: The email/password must be for the owner of the project that contains the run.
   The API will verify project ownership - if the project doesn't belong to the logged-in user,
   the request will fail with "Project not found" (404).
   
   EXCEPTION: Super users (configured in config.py) can access any project and run.

This script performs the following steps (as described in AFFILIATION_VALIDATION_FLOW.md):
1. Validates all authorships for geocoding failures
2. Identifies affiliations with extraction errors
3. Uses LLM to fix errors in batch
4. Updates affiliation_cache and geocoding_cache
5. Updates authorship records in database

Usage:
    python scripts/trigger_validation.py <project_id> <run_id> [--email EMAIL] [--password PASSWORD] [--token TOKEN] [--base-url URL]

Examples:
    # Using email/password
    python scripts/trigger_validation.py ad280effc0b8 run_7b1d4766fd27 --email user@example.com --password mypassword
    python scripts/trigger_validation.py 6af7ac1b6254 13092a22728c --emil xiaolongwu0713@gmail.com --password xiaowu
    # Using existing token
    python scripts/trigger_validation.py ad280effc0b8 run_7b1d4766fd27 --token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

    # Custom backend URL
    python scripts/trigger_validation.py ad280effc0b8 run_7b1d4766fd27 --email user@example.com --password mypassword --base-url http://localhost:8000
"""

import argparse
import sys
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


def trigger_validation(
    base_url: str,
    project_id: str,
    run_id: str,
    token: str
) -> dict:
    """Trigger affiliation validation and fix for a run."""
    url = f"{base_url}/api/projects/{project_id}/runs/{run_id}/validate-affiliations"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    print(f"\n🔍 Triggering affiliation validation for run {run_id}...")
    
    try:
        # Use a longer timeout for validation (it can take several minutes)
        with httpx.Client(timeout=600.0) as client:
            response = client.post(url, json={}, headers=headers)
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
            raise Exception(f"Validation failed: {error_detail}")
        raise Exception(f"HTTP {e.response.status_code}: {e.response.text}")
    except httpx.TimeoutException:
        raise Exception("Request timed out - validation may still be running in background")
    except Exception as e:
        raise Exception(f"Request failed: {str(e)}")


def format_stats(stats: dict) -> str:
    """Format validation stats for display."""
    lines = [
        "\n📊 Validation Statistics:",
        "=" * 60,
        f"  Total Authorships: {stats.get('total_authorships', 0)}",
        f"  Geocoding Cache Hits: {stats.get('geocoding_cache_hits', 0)}",
        f"  Geocoding Cache Misses: {stats.get('geocoding_cache_misses', 0)}",
        f"  Nominatim Successes: {stats.get('nominatim_successes', 0)}",
        f"  Nominatim Failures: {stats.get('nominatim_failures', 0)}",
        "",
        "  Fixes Applied:",
        f"    Affiliations Fixed: {stats.get('llm_fixes', 0)}",
        f"    Unique Error Affiliations: {stats.get('error_affiliations', 0)}",
        f"    Error PMIDs: {stats.get('error_pmids', 0)}",
        f"    LLM Batches: {stats.get('llm_batches', 0)}",
        "",
        "  Database Updates:",
        f"    Cache Updates: {stats.get('cache_updates', 0)}",
        f"    Authorship Updates: {stats.get('authorship_updates', 0)}",
        f"    Geocoding Updates: {stats.get('geocoding_updates', 0)}",
        "=" * 60,
    ]
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(
        description="Trigger affiliation validation and fix for a specific run",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    parser.add_argument("project_id", help="Project ID")
    parser.add_argument("run_id", help="Run ID")
    parser.add_argument("--email", help="Email for login (required if --token not provided)")
    parser.add_argument("--password", help="Password for login (required if --token not provided)")
    parser.add_argument("--token", help="JWT token (alternative to --email/--password)")
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
        
        # Trigger validation
        result = trigger_validation(
            args.base_url,
            args.project_id,
            args.run_id,
            token
        )
        
        # Display results
        if "stats" in result:
            print(format_stats(result["stats"]))
            print("\n✅ Validation completed successfully!")
        else:
            print("\n✅ Validation completed!")
            print(f"Response: {result}")
            
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {str(e)}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

