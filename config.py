"""Configuration settings for LabScout application."""

from __future__ import annotations
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        # Most configuration values are set directly in the class
        # openai_api_key and resend_api_key can be loaded from .env file or environment variables
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
    database_url: str = ""  # Set via DATABASE_URL env var
    
    # Authentication
    jwt_secret_key: str = "change-this-secret-key-in-production"  # Should be set via environment variable
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 10080  # 60 * 24 * 7 = 7 days
    
    # Email configuration (for verification codes)
    # Can be loaded from .env file or environment variables
    resend_api_key: str = ""  # RESEND_API_KEY; labscout.io is verified in Resend
    email_from: str = "LabScout <noreply@labscout.io>"  # Sender for verification codes
    
    # Super user configuration (can access all projects and runs)
    # Super users can access any project and run, bypassing ownership checks
    super_user_email: str = "xiaolongwu0713@gmail.com"
    super_user_password: str = ""  # Set via SUPER_USER_PASSWORD env var

    # Run sharing access control
    # True: require login + ownership for run access
    # False: allow public read-only access to run pages and data
    share_run_auth_check_enabled: bool = False

    # Public site URL (used for CORS and origin checks)
    frontend_url: str = "https://labscout.io"
    # Extra allowed CORS origins, comma-separated (e.g. old domain during migration)
    cors_extra_origins: str = ""

    # Public demo run and SEO project (readable without login)
    demo_project_id: str = "6af7ac1b6254"
    demo_run_id: str = "53e099cdb74e"

    @property
    def cors_allowed_origins(self) -> list[str]:
        extra = [o.strip().rstrip("/") for o in self.cors_extra_origins.split(",") if o.strip()]
        return ["http://localhost:3000", "http://localhost:8000", self.frontend_url.rstrip("/"), *extra]

    # ============================================================================
    # Plans and limits
    # ============================================================================
    # Tiers: super_user (admin, SUPER_USER_EMAIL), pro_user (active Paddle
    # subscription, users.pro_until in the future), free_user (everyone else).
    # -1 means unlimited. Keep in sync with PLANS in frontend/src/lib/site.ts.
    USER_QUOTAS: dict[str, dict[str, int]] = {
        "super_user": {
            "searches_per_week": -1,    # new custom searches in a rolling 7-day window
            "max_papers_per_run": -1,
            "list_limit": -1,           # institutions/researchers shown per location
        },
        "pro_user": {
            "searches_per_week": 30,
            "max_papers_per_run": 500,
            "list_limit": -1,
        },
        "free_user": {
            "searches_per_week": 2,
            "max_papers_per_run": 500,
            "list_limit": 10,
        },
    }

    default_user_tier: str = "free_user"

    QUOTA_ERROR_MESSAGES: dict[str, str] = {
        "searches_per_week": "You have used all custom searches for this 7-day period. Upgrade to Pro for more searches.",
        "max_papers_per_run": "This run exceeds the maximum number of papers allowed for your plan.",
    }

    # Paddle billing (sandbox or production). Secrets come from env vars.
    paddle_environment: str = "sandbox"   # "sandbox" | "production"
    paddle_api_key: str = ""              # PADDLE_API_KEY, server-side only
    paddle_webhook_secret: str = ""       # PADDLE_WEBHOOK_SECRET, from the notification destination


settings = Settings()
