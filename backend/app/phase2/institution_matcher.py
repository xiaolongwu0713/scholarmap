"""Institution matcher for QS top 500 and major research institutions."""
from __future__ import annotations

import logging
import re
from typing import Any

from app.db.connection import db_manager
from app.db.repository import InstitutionGeoRepository
from app.phase2.models import GeoData
from app.phase2.text_utils import normalize_text

logger = logging.getLogger(__name__)


class InstitutionMatcher:
    """Match affiliations to known institutions for accurate geographic data."""
    
    def __init__(self) -> None:
        """Initialize institution matcher."""
        self._cache: dict[str, GeoData | None] = {}  # Simple in-memory cache
    
    async def match_institution(
        self,
        affiliation_text: str
    ) -> GeoData | None:
        """
        Match an affiliation text to a known institution.
        
        The matching process:
        1. Normalizes the affiliation text
        2. Extracts potential institution names from the affiliation
        3. Matches against normalized_name and aliases (normalized) in database
        4. Does NOT use primary_name for matching
        
        Args:
            affiliation_text: Raw affiliation string
        
        Returns:
            GeoData if matched, None otherwise
        """
        if not affiliation_text or not affiliation_text.strip():
            return None
        
        # Check cache first (use normalized version for cache key)
        affiliation_normalized = normalize_text(affiliation_text)
        if not affiliation_normalized:
            return None
        
        if affiliation_normalized in self._cache:
            return self._cache[affiliation_normalized]
        
        try:
            async with db_manager.session() as session:
                repo = InstitutionGeoRepository(session)
                
                # Strategy 1: Exact match on normalized_name or aliases
                # repo.get_by_name() will normalize the input and match against normalized_name and aliases
                matched = await repo.get_by_name(affiliation_text)
                if matched:
                    geo = GeoData(
                        country=matched.country,
                        city=matched.city,
                        institution=matched.primary_name,  # Return primary_name for display
                        confidence="high"
                    )
                    self._cache[affiliation_normalized] = geo
                    return geo
                
                # Strategy 2: Partial match (affiliation contains institution name)
                # Extract potential institution names from affiliation
                potential_names = self._extract_potential_institution_names(affiliation_text)
                
                for name in potential_names:
                    # repo.get_by_name() will normalize the input and match against normalized_name and aliases
                    matched = await repo.get_by_name(name)
                    if matched:
                        geo = GeoData(
                            country=matched.country,
                            city=matched.city,
                            institution=matched.primary_name,  # Return primary_name for display
                            confidence="high"
                        )
                        self._cache[affiliation_normalized] = geo
                        return geo
                
                # Strategy 3: Fuzzy match (similarity-based)
                # Only search if affiliation is reasonably long (likely contains institution name)
                if len(affiliation_text) > 10:
                    # repo.search_by_name() will normalize the input and match against normalized_name and aliases
                    matches = await repo.search_by_name(affiliation_text, similarity_threshold=0.7)
                    if matches:
                        # Use the first (highest scored) match
                        matched = matches[0]
                        geo = GeoData(
                            country=matched.country,
                            city=matched.city,
                            institution=matched.primary_name,  # Return primary_name for display
                            confidence="medium"  # Lower confidence for fuzzy matches
                        )
                        self._cache[affiliation_normalized] = geo
                        return geo
                
                # No match found
                self._cache[affiliation_normalized] = None
                return None
                
        except Exception as e:
            logger.warning(f"Institution matching failed for '{affiliation_text}': {e}")
            return None
    
    async def match_batch(
        self,
        affiliations: list[str]
    ) -> dict[str, GeoData]:
        """
        Batch match multiple affiliations.
        
        Args:
            affiliations: List of affiliation strings
        
        Returns:
            Dict mapping affiliation -> GeoData (only for successful matches)
        """
        results: dict[str, GeoData] = {}
        
        for aff in affiliations:
            matched = await self.match_institution(aff)
            if matched:
                results[aff] = matched
        
        return results
    
    def _extract_potential_institution_names(self, affiliation_text: str) -> list[str]:
        """
        Extract potential institution names from affiliation text.
        
        Common patterns:
        - "Department of X, University of Y"
        - "X University, Y"
        - "X Institute, Y"
        - "X School, Y"
        """
        names: list[str] = []
        
        # Remove common prefixes/suffixes
        text = affiliation_text.strip()
        
        # Pattern 1: Extract text before first comma (often institution name)
        if "," in text:
            parts = [p.strip() for p in text.split(",")]
            # First part is often institution
            if parts[0]:
                names.append(parts[0])
            # Second part might also be institution if it contains "University", "Institute", etc.
            if len(parts) > 1:
                second_part = parts[1]
                if any(keyword in second_part for keyword in ["University", "Institute", "College", "School", "Hospital"]):
                    names.append(second_part)
        
        # Pattern 2: Extract text containing institution keywords
        institution_keywords = [
            r"University of [^,]+",
            r"[^,]+ University",
            r"[^,]+ Institute",
            r"[^,]+ College",
            r"[^,]+ School",
            r"[^,]+ Hospital",
            r"[^,]+ Medical Center",
        ]
        
        for pattern in institution_keywords:
            matches = re.findall(pattern, text, re.IGNORECASE)
            names.extend(matches)
        
        # Remove duplicates and normalize
        unique_names = []
        seen = set()
        for name in names:
            normalized = name.strip()
            if normalized and normalized.lower() not in seen:
                seen.add(normalized.lower())
                unique_names.append(normalized)
        
        return unique_names

