from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, Field


class AuthorName(BaseModel):
    """Parsed author name components from PubMed XML."""
    last_name: str = ""
    fore_name: str = ""
    initials: str = ""
    suffix: str = ""
    collective_name: str = ""
    
    @property
    def is_collective(self) -> bool:
        return bool(self.collective_name)
    
    @property
    def display_name(self) -> str:
        """Generate display name for UI."""
        if self.is_collective:
            return self.collective_name
        
        parts = []
        if self.last_name:
            parts.append(self.last_name)
        if self.fore_name:
            parts.append(self.fore_name)
        elif self.initials:
            parts.append(self.initials)
        
        return ", ".join(parts) if len(parts) > 1 else (parts[0] if parts else "Unknown")


class Affiliation(BaseModel):
    """Extracted affiliation information."""
    raw: str
    country: str | None = None
    city: str | None = None
    institution: str | None = None
    confidence: Literal["high", "medium", "low", "none"] = "none"


class ParsedAuthor(BaseModel):
    """Author with affiliations from XML parsing."""
    name: AuthorName
    affiliations_raw: list[str] = Field(default_factory=list)
    author_order: int  # 1-based


class ParsedPaper(BaseModel):
    """Paper metadata from PubMed XML."""
    pmid: str
    title: str = ""
    year: int | None = None
    doi: str | None = None
    authors: list[ParsedAuthor] = Field(default_factory=list)


class GeoData(BaseModel):
    """Geographic data extracted from affiliation."""
    country: str | None = None
    city: str | None = None
    institution: str | None = None
    confidence: Literal["high", "medium", "low", "none"] = "none"


class IngestStats(BaseModel):
    """Statistics from ingestion process."""
    run_id: str
    total_pmids: int
    pmids_cached: int
    pmids_fetched: int
    papers_parsed: int
    authorships_created: int
    unique_affiliations: int
    affiliations_with_country: int
    llm_calls_made: int
    errors: list[str] = Field(default_factory=list)

