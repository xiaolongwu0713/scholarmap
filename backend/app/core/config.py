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

    scholarmap_data_dir: str = "./data"
    scholarmap_max_results_per_source: int = 500
    scholarmap_enabled_sources: str = "pubmed"
    semantic_scholar_api_key: str = ""
    openalex_mailto: str = ""
    
    # Phase 2: PubMed ingestion
    pubmed_api_key: str = ""
    
    # Database configuration
    database_url: str = ""  # PostgreSQL connection URL


settings = Settings()
