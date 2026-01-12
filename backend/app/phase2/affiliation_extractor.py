"""LLM-based affiliation extraction for geographic data."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Protocol

from app.core.audit_log import append_log
from app.core.paths import prompts_dir
from app.db.connection import db_manager
from app.phase1.llm import OpenAIClient
from app.phase2.models import GeoData

logger = logging.getLogger(__name__)


class AffiliationExtractorProtocol(Protocol):
    """Protocol for affiliation extractors."""
    
    async def extract_batch(self, affiliations: list[str]) -> list[GeoData]:
        """Extract geographic data from a batch of affiliations."""
        ...
    
    async def extract_affiliations(
        self,
        affiliations: list[str],
        cache_lookup: Any = None
    ) -> dict[str, GeoData]:
        """Extract geographic data from all unique affiliations."""
        ...


def create_extractor(method: str = "llm") -> AffiliationExtractorProtocol:
    """
    Factory function to create an affiliation extractor based on configuration.
    
    Args:
        method: Extraction method, either "llm" or "rule_based"
    
    Returns:
        An instance of AffiliationExtractor or RuleBasedExtractor
    """
    if method == "rule_based":
        from app.phase2.rule_based_extractor import RuleBasedExtractor
        return RuleBasedExtractor()
    else:
        return AffiliationExtractor(batch_size=20)


def _read_prompt(path: Path) -> str:
    """Read prompt template from file."""
    return path.read_text(encoding="utf-8")


class AffiliationExtractor:
    """Batch affiliation extractor using LLM."""
    
    def __init__(self, batch_size: int = 20) -> None:
        self.batch_size = batch_size
        self.llm_client = OpenAIClient()
        from app.phase2.institution_matcher import InstitutionMatcher
        self.institution_matcher = InstitutionMatcher()
    
    async def extract_batch(
        self,
        affiliations: list[str]
    ) -> list[GeoData]:
        """
        Extract geographic data from a batch of affiliations.
        
        Args:
            affiliations: List of raw affiliation strings
        
        Returns:
            List of GeoData objects (same length and order as input)
        """
        if not affiliations:
            return []
        
        # Load prompt template from file
        prompt_path = prompts_dir() / "affiliation_extraction.md"
        template = _read_prompt(prompt_path)
        
        # Format affiliations as numbered list
        numbered_list = "\n".join(
            f"{i+1}. {aff}" for i, aff in enumerate(affiliations)
        )
        
        # Replace placeholder with actual affiliations
        prompt = template.replace("<<<AFFILIATIONS>>>", numbered_list)
        
        try:
            # Log full prompt
            append_log(
                "phase2.affiliation_extraction.prompt",
                {
                    "batch_size": len(affiliations),
                    "model": self.llm_client.model,
                    "prompt_file": str(prompt_path),
                    "full_prompt": prompt,
                },
            )
            
            # Use the complete_text method from OpenAIClient
            content = await self.llm_client.complete_text(
                prompt=prompt,
                temperature=0.0  # Deterministic
            )
            
            # Log raw JSON response for debugging
            append_log(
                "phase2.affiliation_extraction.response",
                {
                    "batch_size": len(affiliations),
                    "model": self.llm_client.model,
                    "raw_json_response": content,
                },
            )
            if not content:
                logger.error("Empty response from LLM")
                return self._fallback_results(affiliations)
            
            # Parse JSON response
            results = self._parse_llm_response(content, affiliations)
            return results
            
        except Exception as e:
            logger.error(f"LLM extraction failed: {e}", exc_info=True)
            return self._fallback_results(affiliations)
    
    def _parse_llm_response(
        self,
        content: str,
        affiliations: list[str]
    ) -> list[GeoData]:
        """Parse LLM JSON response into GeoData objects."""
        try:
            # Try to find JSON array in response
            start_idx = content.find("[")
            end_idx = content.rfind("]")
            
            if start_idx == -1 or end_idx == -1:
                raise ValueError("No JSON array found in response")
            
            json_str = content[start_idx:end_idx+1]
            data = json.loads(json_str)
            
            if not isinstance(data, list):
                raise ValueError("Response is not a JSON array")
            
            # Convert to GeoData objects
            results = []
            for item in data:
                geo = GeoData(
                    country=item.get("country"),
                    city=item.get("city"),
                    institution=item.get("institution"),
                    confidence=item.get("confidence", "low")
                )
                results.append(geo)
            
            # Ensure same length as input
            if len(results) != len(affiliations):
                logger.warning(
                    f"LLM returned {len(results)} results for {len(affiliations)} affiliations"
                )
                # Pad or truncate
                while len(results) < len(affiliations):
                    results.append(GeoData(confidence="none"))
                results = results[:len(affiliations)]
            
            return results
            
        except (json.JSONDecodeError, ValueError, KeyError) as e:
            logger.error(f"Failed to parse LLM response: {e}")
            return self._fallback_results(affiliations)
    
    def _fallback_results(self, affiliations: list[str]) -> list[GeoData]:
        """Return fallback GeoData when LLM fails."""
        return [GeoData(confidence="none") for _ in affiliations]
    
    async def extract_affiliations(
        self,
        affiliations: list[str],
        cache_lookup: Any = None,
        skip_institution_auto_add: bool = False
    ) -> tuple[dict[str, GeoData], dict[str, int]]:
        """
        Extract geographic data from all unique affiliations.
        
        Args:
            affiliations: List of unique affiliation strings
            cache_lookup: Optional function to check cache before LLM call
            skip_institution_auto_add: If True, don't auto-add to institution_geo, record as pending instead
        
        Returns:
            Tuple of (dict mapping affiliation_raw -> GeoData, statistics dict)
        """
        total = len(affiliations)
        result_map: dict[str, GeoData] = {}
        to_extract: list[str] = []
        
        # Statistics tracking
        stats = {
            "affiliation_cache_hits": 0,
            "institution_matcher_hits": 0,
            "llm_extractions": 0,
            "institution_geo_auto_added": 0,
            "affiliation_cache_updated": 0,
            "llm_calls": 0,
            "pending_auto_add": []  # New: track institutions pending validation
        }
        
        # Step 1: Check affiliation_cache table first
        logger.info(f"   Checking affiliation_cache table for {total} affiliations...")
        for aff in affiliations:
            if cache_lookup:
                # Support both sync and async cache_lookup
                import inspect
                if inspect.iscoroutinefunction(cache_lookup):
                    cached = await cache_lookup(aff)
                else:
                    cached = cache_lookup(aff)
                
                if cached:
                    result_map[aff] = cached
                    stats["affiliation_cache_hits"] += 1
                    continue
            
            to_extract.append(aff)
        
        if stats["affiliation_cache_hits"] > 0:
            logger.info(f"   ✅ affiliation_cache table: {stats['affiliation_cache_hits']} hits, {len(to_extract)} need extraction")
        
        # Step 2: Try institution_matcher for affiliations not in cache
        if to_extract:
            logger.info(f"   Trying institution_matcher (institution_geo table) for {len(to_extract)} affiliations...")
            institution_matches = await self.institution_matcher.match_batch(to_extract)
            stats["institution_matcher_hits"] = len(institution_matches)
            
            if stats["institution_matcher_hits"] > 0:
                logger.info(f"   ✅ institution_geo table: {stats['institution_matcher_hits']} matches found")
                # Add institution matches to result_map
                for aff, geo in institution_matches.items():
                    result_map[aff] = geo
                # Remove matched affiliations from to_extract
                to_extract = [aff for aff in to_extract if aff not in institution_matches]
        
        # Step 3: LLM extraction for remaining affiliations
        if not to_extract:
            logger.info(f"   ✅ All {total} affiliations found in cache/institution_geo")
            return result_map, stats
        
        stats["llm_extractions"] = len(to_extract)
        logger.info(
            f"   Extracting {len(to_extract)} affiliations via LLM "
            f"(affiliation_cache: {stats['affiliation_cache_hits']}, institution_geo: {stats['institution_matcher_hits']}) "
            f"in batches of {self.batch_size}"
        )
        
        # Process in batches
        total_batches = (len(to_extract) + self.batch_size - 1) // self.batch_size
        for i in range(0, len(to_extract), self.batch_size):
            batch = to_extract[i:i + self.batch_size]
            batch_num = i // self.batch_size + 1
            logger.info(f"   Processing LLM batch {batch_num}/{total_batches} ({len(batch)} affiliations)")
            
            batch_results = await self.extract_batch(batch)
            stats["llm_calls"] += 1
            
            # Map results back to affiliations and auto-add successful extractions to institution_geo
            for aff, geo in zip(batch, batch_results):
                result_map[aff] = geo
                
                # Auto-add to institution_geo if extraction was successful
                # Only add if: institution matcher failed (already checked above), 
                # and we successfully extracted country, city, and institution
                if geo.country and geo.institution:
                    if skip_institution_auto_add:
                        # Don't add immediately, record as pending for validation
                        stats["pending_auto_add"].append({
                            "affiliation_raw": aff,
                            "institution": geo.institution,
                            "country": geo.country,
                            "city": geo.city,
                        })
                    else:
                        # Original behavior: add immediately (backward compatible)
                        try:
                            async with db_manager.session() as session:
                                from app.db.repository import InstitutionGeoRepository
                                repo = InstitutionGeoRepository(session)
                                
                                # Check again if it exists (in case it was added between checks)
                                existing = await repo.get_by_name(geo.institution)
                                if not existing:
                                    # Auto-add the institution
                                    await repo.auto_add_institution(
                                        institution_name=geo.institution,
                                        country=geo.country,
                                        city=geo.city,
                                        affiliation_text=aff  # Pass original affiliation for alias extraction
                                    )
                                    await session.commit()
                                    stats["institution_geo_auto_added"] += 1
                                    logger.debug(f"Auto-added institution to institution_geo: {geo.institution} ({geo.country}, {geo.city})")
                        except Exception as e:
                            logger.warning(f"Failed to auto-add institution {geo.institution}: {e}")
                            # Don't fail the entire extraction if auto-add fails
        
        # Count affiliations that will be cached (LLM extractions that are not None)
        stats["affiliation_cache_updated"] = sum(
            1 for aff in to_extract 
            if aff in result_map and result_map[aff] and 
            (result_map[aff].country or result_map[aff].city or result_map[aff].institution)
        )
        
        logger.info(f"   ✅ LLM extraction complete: {len(to_extract)} affiliations processed")
        if stats["institution_geo_auto_added"] > 0:
            logger.info(f"      Auto-added to institution_geo table: {stats['institution_geo_auto_added']} institutions")
        if skip_institution_auto_add and len(stats["pending_auto_add"]) > 0:
            logger.info(f"      Pending validation: {len(stats['pending_auto_add'])} institutions")
        
        return result_map, stats

