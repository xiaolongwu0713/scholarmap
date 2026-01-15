"""Configuration settings for ScholarMap application."""

from __future__ import annotations
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        # Most configuration values are set directly in the class
        # openai_api_key and sendgrid_api_key can be loaded from .env file or environment variables
        # Environment variables take precedence over .env file, which takes precedence over defaults
        env_file=str(Path(__file__).parent / ".env"),  # Load from .env file in the same directory as config.py (repo root)
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # These keys can be loaded from .env file or environment variables
    # Priority: environment variable > .env file > default value
    openai_api_key: str = ""
    openai_model: str = "gpt-5.2"
    openai_reasoning_effort: str = "high"
    openai_api_base: str = "https://api.openai.com"

    scholarmap_data_dir: str = "./data"  # Relative to repository root
    scholarmap_max_results_per_source: int = 500
    scholarmap_enabled_sources: str = "pubmed"
    semantic_scholar_api_key: str = ""
    openalex_mailto: str = ""
    
    # Phase 2: PubMed ingestion
    # TODO: use 'Research Organization Registry'(ROR) to extract affiliations.
    # ROR is the most comprehensive and accurate source of organization information.
    # Without batch option, it is very slow. Solution is to dump ROR and use it as a local database.
    pubmed_api_key: str = ""
    affiliation_extraction_method: str = "rule_based"  # "llm" or "rule_based"
    
    # Geocoding cache configuration
    geocoding_cache_max_affiliations: int = 50  # Maximum number of affiliations to store per location in geocoding_cache
    
    # Database configuration
    database_url: str = "postgresql://scholarmap_db_user:eA7MfK5KbhHmwORToRe27Xa1ZHkXGRDM@dpg-d5408om3jp1c738ud660-a.virginia-postgres.render.com/scholarmap_db"
    
    # Authentication
    jwt_secret_key: str = "change-this-secret-key-in-production"  # Should be set via environment variable
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 10080  # 60 * 24 * 7 = 7 days
    
    # Email configuration (for verification codes)
    # Can be loaded from .env file or environment variables
    sendgrid_api_key: str = ""
    email_from: str = "xiaolongwu0713@gmail.com"  # Sender email address for verification codes
    
    # Super user configuration (can access all projects and runs)
    # Super users can access any project and run, bypassing ownership checks
    super_user_email: str = "xiaolongwu0713@gmail.com"
    super_user_password: str = "xiaowu"

    # Run sharing access control
    # True: require login + ownership for run access
    # False: allow public read-only access to run pages and data
    share_run_auth_check_enabled: bool = False
    
    # ============================================================================
    # User Quotas and Limits
    # ============================================================================
    # User tier definitions and their resource quotas
    # Format: {user_tier: {resource: limit}}
    # Special value -1 means unlimited
    #
    # User Tiers:
    # - super_user: Admin users with unlimited access
    # - regular_user: Standard registered users (current default)
    # - premium_user: Paid subscription users (future)
    # - free_user: Free tier users with strict limits (future)
    #
    # How to use:
    #   1. Get user tier: get_user_tier(user_email)
    #   2. Get quota: USER_QUOTAS[user_tier][resource_name]
    #   3. Check limit: current_count < quota (if quota != -1)
    
    # User quota configuration
    USER_QUOTAS: dict[str, dict[str, int]] = {
        # Super users: unlimited resources
        "super_user": {
            "max_projects": -1,              # -1 = unlimited
            "max_runs_per_project": -1,      # -1 = unlimited
            "max_papers_per_run": -1,        # -1 = unlimited (future use)
            "max_ingestion_per_day": -1,     # -1 = unlimited (future use)
        },
        
        # Regular users: moderate limits (current default for all registered users)
        "regular_user": {
            "max_projects": 1,              # Maximum 10 projects
            "max_runs_per_project": 1,      # Maximum 20 runs per project
            "max_papers_per_run": 500,      # Maximum 1000 papers per run (future use)
            "max_ingestion_per_day": 1,      # Maximum 5 ingestion operations per day (future use)
        },
        
        # Premium users: higher limits (future - for paid subscriptions)
        "premium_user": {
            "max_projects": 50,              # Maximum 50 projects
            "max_runs_per_project": 100,     # Maximum 100 runs per project
            "max_papers_per_run": 5000,      # Maximum 5000 papers per run
            "max_ingestion_per_day": 50,     # Maximum 50 ingestion operations per day
        },
        
        # Free users: strict limits (future - for free tier with stricter limits)
        "free_user": {
            "max_projects": 3,               # Maximum 3 projects
            "max_runs_per_project": 5,       # Maximum 5 runs per project
            "max_papers_per_run": 100,       # Maximum 100 papers per run
            "max_ingestion_per_day": 1,      # Maximum 1 ingestion operation per day
        },
    }
    
    # Default user tier for new users
    # When a new user registers, they are assigned this tier
    default_user_tier: str = "regular_user"
    
    # Quota error messages
    QUOTA_ERROR_MESSAGES: dict[str, str] = {
        "max_projects": "You have reached the maximum number of projects allowed for your account tier.",
        "max_runs_per_project": "You have reached the maximum number of runs allowed for this project.",
        "max_papers_per_run": "This run exceeds the maximum number of papers allowed for your account tier.",
        "max_ingestion_per_day": "You have reached the daily ingestion limit for your account tier.",
    }


settings = Settings()
