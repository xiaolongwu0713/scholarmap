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


settings = Settings()
