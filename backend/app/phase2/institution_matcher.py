"""Institution matcher for QS top 500 and major research institutions."""
from __future__ import annotations

import logging
import re
from typing import Any

from app.db.connection import db_manager
from app.db.models import InstitutionGeo
from app.db.repository import InstitutionGeoRepository
from app.phase2.models import GeoData
from app.phase2.text_utils import normalize_text

logger = logging.getLogger(__name__)


class InstitutionMatcher:
    """Match affiliations to known institutions for accurate geographic data."""
    
    def __init__(self) -> None:
        """Initialize institution matcher."""
        self._cache: dict[str, GeoData | None] = {}  # Simple in-memory cache
        self._institutions_loaded: bool = False  # Whether institutions are preloaded
        self._normalized_name_index: dict[str, InstitutionGeo] = {}  # normalized_name -> InstitutionGeo
        self._alias_index: dict[str, InstitutionGeo] = {}  # alias -> InstitutionGeo
    
    async def _load_institutions_to_memory(self, session=None) -> None:
        """Load all institutions from database into memory indexes.
        
        This significantly speeds up batch matching by avoiding repeated database queries.
        """
        if self._institutions_loaded:
            return
        
        try:
            if session is not None:
                repo = InstitutionGeoRepository(session)
                all_institutions = await repo.get_all()
            else:
                async with db_manager.session() as session:
                    repo = InstitutionGeoRepository(session)
                    all_institutions = await repo.get_all()
            
            # Build indexes
            self._normalized_name_index.clear()
            self._alias_index.clear()
            
            for inst in all_institutions:
                # Index by normalized_name
                if inst.normalized_name:
                    self._normalized_name_index[inst.normalized_name] = inst
                
                # Index by aliases
                if inst.aliases:
                    for alias in inst.aliases:
                        if alias:  # Skip empty aliases
                            # Only store first match (in case of duplicates, prefer earlier one)
                            if alias not in self._alias_index:
                                self._alias_index[alias] = inst
            
            self._institutions_loaded = True
            logger.info(
                f"   Loaded {len(all_institutions)} institutions to memory "
                f"({len(self._normalized_name_index)} normalized names, "
                f"{len(self._alias_index)} aliases)"
            )
        except Exception as e:
            logger.warning(f"Failed to load institutions to memory: {e}")
            # Continue with database queries if loading fails
    
    async def match_institution(
        self,
        affiliation_text: str,
        session=None,
        skip_fuzzy: bool = False
    ) -> GeoData | None:
        """
        Match an affiliation text to a known institution.
        
        The matching process:
        1. Extracts potential institution names from the affiliation text
        2. Normalizes and matches each extracted name against normalized_name and aliases (normalized) in database
        3. Optionally uses fuzzy matching if no exact match is found
        4. Does NOT use primary_name for matching
        
        Args:
            affiliation_text: Raw affiliation string
            session: Optional database session (for batch operations)
            skip_fuzzy: If True, skip fuzzy matching (faster but less accurate)
        
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
            # If institutions are preloaded, use memory indexes (much faster)
            if self._institutions_loaded:
                # Extract potential institution names from affiliation and match
                potential_names = self._extract_potential_institution_names(affiliation_text)
                for name in potential_names:
                    name_normalized = normalize_text(name)
                    if name_normalized:
                        matched = (
                            self._normalized_name_index.get(name_normalized) or
                            self._alias_index.get(name_normalized)
                        )
                        if matched:
                            geo = GeoData(
                                country=matched.country,
                                city=matched.city,
                                institution=matched.primary_name,
                                confidence="high"
                            )
                            self._cache[affiliation_normalized] = geo
                            return geo
                
                # Fuzzy match skipped for memory-based matching (too complex and slow)
                # If fuzzy matching is needed, fall back to database queries
                
                # No match found in memory, return None
                self._cache[affiliation_normalized] = None
                return None
            
            # Fall back to database queries (for single matches or if preloading failed)
            async def _match_with_repo(repo: InstitutionGeoRepository) -> GeoData | None:
                """Internal helper to perform matching with a repository."""
                # Extract potential institution names from affiliation and match
                potential_names = self._extract_potential_institution_names(affiliation_text)
                for name in potential_names:
                    matched = await repo.get_by_name(name)
                    if matched:
                        geo = GeoData(
                            country=matched.country,
                            city=matched.city,
                            institution=matched.primary_name,
                            confidence="high"
                        )
                        self._cache[affiliation_normalized] = geo
                        return geo
                
                # Fuzzy match (skip if requested for performance)
                if not skip_fuzzy and len(affiliation_text) > 10:
                    matches = await repo.search_by_name(affiliation_text, similarity_threshold=0.7)
                    if matches:
                        matched = matches[0]
                        geo = GeoData(
                            country=matched.country,
                            city=matched.city,
                            institution=matched.primary_name,
                            confidence="medium"
                        )
                        self._cache[affiliation_normalized] = geo
                        return geo
                
                return None
            
            if session is not None:
                repo = InstitutionGeoRepository(session)
                matched = await _match_with_repo(repo)
                if matched:
                    return matched
            else:
                # Create new session (slower, but compatible with existing code)
                async with db_manager.session() as session:
                    repo = InstitutionGeoRepository(session)
                    matched = await _match_with_repo(repo)
                    if matched:
                        return matched
            
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
        
        Optimized for performance:
        - Preloads all institutions to memory (avoids database queries)
        - Reuses a single database session for loading (only once)
        - Skips fuzzy matching (too slow for batch processing)
        - Only uses partial matching (extracting potential institution names)
        
        Args:
            affiliations: List of affiliation strings
        
        Returns:
            Dict mapping affiliation -> GeoData (only for successful matches)
        """
        results: dict[str, GeoData] = {}
        total = len(affiliations)
        
        if total == 0:
            return results
        
        # Preload all institutions to memory (only once, much faster for batch operations)
        async with db_manager.session() as session:
            await self._load_institutions_to_memory(session=session)
        
        # Log progress periodically (every 10% or every 100 items, whichever is more frequent)
        log_interval = max(1, min(total // 10, 100))
        matches_found = 0
        
        # Now use memory indexes (no database queries needed)
        for idx, aff in enumerate(affiliations):
            matched = await self.match_institution(aff, skip_fuzzy=True)
            if matched:
                results[aff] = matched
                matches_found += 1
            
            # Log progress periodically
            if (idx + 1) % log_interval == 0 or (idx + 1) == total:
                percentage = 100 * (idx + 1) // total
                logger.info(
                    f"   institution_geo table matching progress: {idx + 1}/{total} "
                    f"({percentage}%), matches found: {matches_found}"
                )
        
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

