"""LLM-based affiliation extraction for geographic data."""

from __future__ import annotations

import json
import logging
from typing import Any

from app.phase1.llm import OpenAIClient
from app.phase2.models import GeoData

logger = logging.getLogger(__name__)


AFFILIATION_EXTRACTION_PROMPT = """You are a geographic data extractor for academic affiliations.

Extract the following from each affiliation string:
- country: Full country name (e.g., "United States", "United Kingdom", "China")
- city: City name if present (e.g., "Boston", "London", "Beijing")
- institution: Primary institution name if present (e.g., "Harvard Medical School", "MIT")

Rules:
1. Return exact matches from the text, don't invent information
2. If a field is missing or unclear, return null
3. Use full country names, not abbreviations (USA → United States)
4. confidence: "high" if all fields clear, "medium" if some unclear, "low" if very ambiguous, "none" if no geographic info

Return a JSON array with one object per affiliation in the EXACT same order as input:
[
  {"country": "United States", "city": "Boston", "institution": "Massachusetts General Hospital", "confidence": "high"},
  {"country": "China", "city": "Beijing", "institution": null, "confidence": "medium"},
  ...
]

Affiliations to process:
"""


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
        
        # Format affiliations as numbered list
        numbered_list = "\n".join(
            f"{i+1}. {aff}" for i, aff in enumerate(affiliations)
        )
        
        prompt = AFFILIATION_EXTRACTION_PROMPT + numbered_list
        
        try:
            # Use the complete_text method from OpenAIClient
            content = await self.llm_client.complete_text(
                prompt=prompt,
                temperature=0.0  # Deterministic
            )
            if not content:
                logger.error("Empty response from LLM")
                return self._fallback_results(affiliations)
            
            # Parse JSON response
            results = self._parse_llm_response(content, affiliations)
            return results
            
        except Exception as e:
            logger.error(f"LLM extraction failed: {e}")
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

