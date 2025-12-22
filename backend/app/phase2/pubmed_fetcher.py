"""PubMed EFetch client with rate limiting and caching."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

import httpx
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

logger = logging.getLogger(__name__)


class PubMedFetcher:
    """
    PubMed EFetch API client with rate limiting and retry logic.
    
    Rate limits:
    - Without API key: 3 requests/second
    - With API key: 10 requests/second
    
    Batch size: 100-200 PMIDs per request
    """
    
    EFETCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
    
    def __init__(
        self,
        api_key: str | None = None,
        batch_size: int = 150,
        rate_limit: float | None = None
    ) -> None:
        self.api_key = api_key
        self.batch_size = batch_size
        
        # Determine rate limit (requests per second)
        if rate_limit is not None:
            self.rate_limit = rate_limit
        elif api_key:
            self.rate_limit = 10.0  # 10 rps with API key
        else:
            self.rate_limit = 3.0   # 3 rps without API key
        
        self.min_interval = 1.0 / self.rate_limit
        self._last_request_time = 0.0
    
    async def _enforce_rate_limit(self) -> None:
        """Ensure we don't exceed rate limit."""
        now = asyncio.get_event_loop().time()
        elapsed = now - self._last_request_time
        
        if elapsed < self.min_interval:
            await asyncio.sleep(self.min_interval - elapsed)
        
        self._last_request_time = asyncio.get_event_loop().time()
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((httpx.HTTPStatusError, httpx.RequestError)),
        reraise=True,
    )
    async def _fetch_batch(
        self,
        client: httpx.AsyncClient,
        pmids: list[str]
    ) -> str:
        """Fetch a batch of PMIDs as XML."""
        await self._enforce_rate_limit()
        
        params: dict[str, Any] = {
            "db": "pubmed",
            "id": ",".join(pmids),
            "retmode": "xml",
            "rettype": "abstract",
        }
        
        if self.api_key:
            params["api_key"] = self.api_key
        
        logger.info(f"Fetching {len(pmids)} PMIDs from PubMed...")
        
        response = await client.get(self.EFETCH_URL, params=params, timeout=30.0)
        response.raise_for_status()
        
        return response.text
    
    async def fetch_pmids(
        self,
        pmids: list[str],
        progress_callback: Any = None
    ) -> list[str]:
        """
        Fetch multiple PMIDs in batches.
        
        Args:
            pmids: List of PubMed IDs to fetch
            progress_callback: Optional callback(current, total) for progress
        
        Returns:
            List of XML strings (one per batch)
        """
        if not pmids:
            return []
        
        batches = [
            pmids[i:i + self.batch_size]
            for i in range(0, len(pmids), self.batch_size)
        ]
        
        logger.info(
            f"Fetching {len(pmids)} PMIDs in {len(batches)} batches "
            f"(batch_size={self.batch_size}, rate_limit={self.rate_limit} rps)"
        )
        
        xml_results = []
        
        async with httpx.AsyncClient() as client:
            for i, batch in enumerate(batches):
                try:
                    xml = await self._fetch_batch(client, batch)
                    xml_results.append(xml)
                    
                    if progress_callback:
                        progress_callback(i + 1, len(batches))
                    
                    logger.info(f"Batch {i+1}/{len(batches)} completed")
                    
                except Exception as e:
                    logger.error(f"Failed to fetch batch {i+1}/{len(batches)}: {e}")
                    # Continue with other batches
                    continue
        
        logger.info(f"Fetched {len(xml_results)}/{len(batches)} batches successfully")
        return xml_results
    
    async def fetch_batch(self, pmids: list[str]) -> dict[str, str]:
        """
        Fetch multiple PMIDs and return as a dictionary mapping PMID to XML.
        
        Args:
            pmids: List of PubMed IDs to fetch
        
        Returns:
            Dictionary mapping PMID to XML string (each XML contains one article)
        """
        if not pmids:
            return {}
        
        # Fetch XML batches (each batch contains multiple articles)
        xml_batches = await self.fetch_pmids(pmids)
        
        # Parse each batch and extract individual articles
        result: dict[str, str] = {}
        
        for xml_text in xml_batches:
            try:
                import xml.etree.ElementTree as ET
                root = ET.fromstring(xml_text)
                
                # Extract each article from the batch
                for article_elem in root.findall(".//PubmedArticle"):
                    # Extract PMID
                    pmid_elem = article_elem.find(".//MedlineCitation/PMID")
                    if pmid_elem is not None and pmid_elem.text:
                        pmid = pmid_elem.text.strip()
                        # Wrap article in a minimal XML structure for parsing
                        # The parser expects PubmedArticleSet > PubmedArticle
                        article_xml = f'<?xml version="1.0"?><PubmedArticleSet>{ET.tostring(article_elem, encoding="unicode")}</PubmedArticleSet>'
                        result[pmid] = article_xml
            except Exception as e:
                logger.error(f"Failed to parse XML batch: {e}")
                continue
        
        logger.info(f"Extracted {len(result)} PMIDs from {len(xml_batches)} batches")
        return result

