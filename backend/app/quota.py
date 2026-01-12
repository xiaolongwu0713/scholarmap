"""User quota management utilities."""
from __future__ import annotations

import sys
from pathlib import Path

# Add repo root to path to import config
repo_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(repo_root))

import config
from app.db.models import User


def get_user_tier(user_email: str) -> str:
    """
    Get user tier based on user email.
    
    Args:
        user_email: User's email address
        
    Returns:
        User tier string: 'super_user', 'regular_user', 'premium_user', or 'free_user'
    """
    settings = config.settings
    
    # Check if super user
    if user_email == settings.super_user_email:
        return "super_user"
    
    # TODO: In the future, check user's subscription tier from database
    # For example:
    # - Query user.subscription_tier from database
    # - Or check user.is_premium flag
    # user = get_user_from_db(user_email)
    # if user.subscription_tier == "premium":
    #     return "premium_user"
    # elif user.subscription_tier == "free":
    #     return "free_user"
    
    # For now, all non-super users are regular users
    return settings.default_user_tier


def get_quota(user_tier: str, quota_name: str) -> int:
    """
    Get quota value for a specific user tier and quota type.
    
    Args:
        user_tier: User tier ('super_user', 'regular_user', etc.)
        quota_name: Quota name ('max_projects', 'max_runs_per_project', etc.)
        
    Returns:
        Quota value (-1 means unlimited)
        
    Raises:
        KeyError: If user_tier or quota_name is invalid
    """
    settings = config.settings
    
    if user_tier not in settings.USER_QUOTAS:
        raise KeyError(f"Invalid user tier: {user_tier}")
    
    if quota_name not in settings.USER_QUOTAS[user_tier]:
        raise KeyError(f"Invalid quota name: {quota_name}")
    
    return settings.USER_QUOTAS[user_tier][quota_name]


def check_quota(user_email: str, quota_name: str, current_count: int) -> tuple[bool, str | None]:
    """
    Check if user has reached their quota limit.
    
    Args:
        user_email: User's email address
        quota_name: Quota name to check ('max_projects', 'max_runs_per_project', etc.)
        current_count: Current count of the resource
        
    Returns:
        Tuple of (is_allowed, error_message)
        - is_allowed: True if within quota, False if exceeded
        - error_message: Error message if quota exceeded, None otherwise
    """
    settings = config.settings
    
    # Get user tier
    user_tier = get_user_tier(user_email)
    
    # Get quota limit
    quota_limit = get_quota(user_tier, quota_name)
    
    # -1 means unlimited
    if quota_limit == -1:
        return True, None
    
    # Check if current count exceeds quota
    if current_count >= quota_limit:
        error_message = settings.QUOTA_ERROR_MESSAGES.get(
            quota_name,
            f"You have reached the maximum limit for {quota_name}."
        )
        return False, error_message
    
    return True, None


def get_remaining_quota(user_email: str, quota_name: str, current_count: int) -> int:
    """
    Get remaining quota for a user.
    
    Args:
        user_email: User's email address
        quota_name: Quota name ('max_projects', 'max_runs_per_project', etc.)
        current_count: Current count of the resource
        
    Returns:
        Remaining quota (-1 means unlimited)
    """
    user_tier = get_user_tier(user_email)
    quota_limit = get_quota(user_tier, quota_name)
    
    # -1 means unlimited
    if quota_limit == -1:
        return -1
    
    remaining = quota_limit - current_count
    return max(0, remaining)


def get_user_quota_summary(user_email: str, current_counts: dict[str, int]) -> dict:
    """
    Get a summary of user's quotas and current usage.
    
    Args:
        user_email: User's email address
        current_counts: Dictionary of current resource counts
                       e.g., {"projects": 3, "runs": 15}
        
    Returns:
        Dictionary with quota information:
        {
            "tier": "regular_user",
            "quotas": {
                "max_projects": {
                    "limit": 10,
                    "current": 3,
                    "remaining": 7,
                    "unlimited": False
                },
                ...
            }
        }
    """
    settings = config.settings
    user_tier = get_user_tier(user_email)
    user_quotas = settings.USER_QUOTAS[user_tier]
    
    quota_summary = {
        "tier": user_tier,
        "quotas": {}
    }
    
    # Map quota names to current count keys
    quota_mapping = {
        "max_projects": "projects",
        "max_runs_per_project": "runs",
        "max_papers_per_run": "papers",
        "max_ingestion_per_day": "ingestion_today",
    }
    
    for quota_name, quota_limit in user_quotas.items():
        current_key = quota_mapping.get(quota_name, quota_name)
        current = current_counts.get(current_key, 0)
        
        is_unlimited = quota_limit == -1
        remaining = -1 if is_unlimited else max(0, quota_limit - current)
        
        quota_summary["quotas"][quota_name] = {
            "limit": quota_limit,
            "current": current,
            "remaining": remaining,
            "unlimited": is_unlimited,
        }
    
    return quota_summary


# Convenience functions for common quota checks

async def check_can_create_project(user_email: str, current_project_count: int) -> tuple[bool, str | None]:
    """
    Check if user can create a new project.
    
    Args:
        user_email: User's email address
        current_project_count: User's current number of projects
        
    Returns:
        Tuple of (can_create, error_message)
    """
    return check_quota(user_email, "max_projects", current_project_count)


async def check_can_create_run(user_email: str, project_id: str, current_run_count: int) -> tuple[bool, str | None]:
    """
    Check if user can create a new run in a project.
    
    Args:
        user_email: User's email address
        project_id: Project ID (for logging/auditing)
        current_run_count: Current number of runs in the project
        
    Returns:
        Tuple of (can_create, error_message)
    """
    return check_quota(user_email, "max_runs_per_project", current_run_count)
