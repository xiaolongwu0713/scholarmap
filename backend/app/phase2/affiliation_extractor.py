"""LLM-based affiliation extraction for geographic data."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Protocol

from app.core.audit_log import append_log
from app.core.paths import prompts_dir
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
        cache_lookup: Any = None
    ) -> dict[str, GeoData]:
        """
        Extract geographic data from all unique affiliations.
        
        Args:
            affiliations: List of unique affiliation strings
            cache_lookup: Optional function to check cache before LLM call
        
        Returns:
            Dict mapping affiliation_raw -> GeoData
        """
        result_map: dict[str, GeoData] = {}
        to_extract: list[str] = []
        
        # Check cache first
        for aff in affiliations:
            if cache_lookup:
                cached = cache_lookup(aff)
                if cached:
                    result_map[aff] = cached
                    continue
            
            to_extract.append(aff)
        
        if not to_extract:
            logger.info("All affiliations found in cache")
            return result_map
        
        logger.info(
            f"Extracting {len(to_extract)} affiliations "
            f"(cached: {len(result_map)}) in batches of {self.batch_size}"
        )
        
        # Process in batches
        for i in range(0, len(to_extract), self.batch_size):
            batch = to_extract[i:i + self.batch_size]
            logger.info(f"Processing batch {i//self.batch_size + 1}/{(len(to_extract)-1)//self.batch_size + 1}")
            
            batch_results = await self.extract_batch(batch)
            
            # Map results back to affiliations
            for aff, geo in zip(batch, batch_results):
                result_map[aff] = geo
        
        logger.info(f"Extraction complete: {len(result_map)} affiliations processed")
        return result_map

