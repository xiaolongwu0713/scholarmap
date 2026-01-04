from __future__ import annotations

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

import sys
from pathlib import Path

# Add repo root to path to import config
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
import config
settings = config.settings
from app.phase1.models import Paper
from app.phase1.text_utils import normalize_doi


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=8))
async def _get(client: httpx.AsyncClient, url: str, params: dict, headers: dict) -> httpx.Response:
    resp = await client.get(url, params=params, headers=headers)
    resp.raise_for_status()
    return resp


async def search_semantic_scholar(query: str, max_results: int) -> list[Paper]:
    if not query.strip():
        return []
    base = "https://api.semanticscholar.org/graph/v1"
    headers: dict[str, str] = {}
    if settings.semantic_scholar_api_key:
        headers["x-api-key"] = settings.semantic_scholar_api_key

    fields = "title,authors,year,venue,abstract,externalIds,url,citationCount"
    limit = min(100, max_results)
    offset = 0
    papers: list[Paper] = []

    async with httpx.AsyncClient(timeout=60) as client:
        while offset < max_results:
            resp = await _get(
                client,
                f"{base}/paper/search",
                {"query": query, "limit": str(limit), "offset": str(offset), "fields": fields},
                headers,
            )
            data = resp.json()
            items = data.get("data", []) or []
            if not items:
                break
            for it in items:
                ext = it.get("externalIds") or {}
                doi = normalize_doi(ext.get("DOI") or ext.get("doi"))
                authors = [a.get("name", "") for a in (it.get("authors") or []) if a.get("name")]
                papers.append(
                    Paper(
                        title=it.get("title") or "",
                        authors=authors,
                        year=it.get("year"),
                        venue=it.get("venue"),
                        abstract=it.get("abstract"),
                        doi=doi,
                        pmid=str(ext.get("PubMed") or ext.get("PMID")) if (ext.get("PubMed") or ext.get("PMID")) else None,
                        url=it.get("url"),
                        source="semantic_scholar",
                        raw={"citationCount": it.get("citationCount")},
                    )
                )
            offset += len(items)
            if len(items) < limit:
                break
    return papers[:max_results]

