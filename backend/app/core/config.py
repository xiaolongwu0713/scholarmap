from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
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
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 465  # Use SSL port 465 instead of STARTTLS port 587 (better for Render)
    smtp_user: str = "xiaolongwu0713@gmail.com"
    smtp_password: str = ""  # Should be set via environment variable (Gmail App Password)
    smtp_from_email: str = "xiaolongwu0713@gmail.com"
    smtp_use_ssl: bool = True  # Use SSL (port 465) instead of STARTTLS (port 587)


settings = Settings()
