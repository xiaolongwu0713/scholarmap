from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        # Only use .env file in project root directory
        # Try both paths to support running from project root (.env) or backend/ directory (../.env)
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

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
    pubmed_api_key: str = ""
    
    # Database configuration
    database_url: str = ""  # PostgreSQL connection URL
    
    # Authentication
    jwt_secret_key: str = "change-this-secret-key-in-production"  # Should be set via environment variable
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60 * 24 * 7  # 7 days
    
    # Email configuration (for verification codes)
    # SendGrid API Key - can be set via environment variable or .env file
    sendgrid_api_key: str = ""  # Set via SENDGRID_API_KEY environment variable or .env file
    
    # Email sender address (used by SendGrid)
    email_from: str = "xiaolongwu0713@gmail.com"  # Sender email address for verification codes


settings = Settings()
