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


def _abstract_from_inverted_index(inv: dict | None) -> str | None:
    if not inv:
        return None
    positions: dict[int, str] = {}
    for token, idxs in inv.items():
        for i in idxs:
            positions[int(i)] = token
    if not positions:
        return None
    return " ".join([positions[i] for i in sorted(positions.keys())])


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=8))
async def _get(client: httpx.AsyncClient, url: str, params: dict, headers: dict) -> httpx.Response:
    resp = await client.get(url, params=params, headers=headers)
    resp.raise_for_status()
    return resp


async def search_openalex(query: str, max_results: int) -> list[Paper]:
    if not query.strip():
        return []

    per_page = min(200, max_results)
    page = 1
    papers: list[Paper] = []

    headers = {"user-agent": "ScholarMap/0.1 (mailto:unknown)"}
    if settings.openalex_mailto:
        headers["user-agent"] = f"ScholarMap/0.1 (mailto:{settings.openalex_mailto})"

    async with httpx.AsyncClient(timeout=60) as client:
        while len(papers) < max_results:
            resp = await _get(
                client,
                "https://api.openalex.org/works",
                {
                    "search": query,
                    "per-page": str(per_page),
                    "page": str(page),
                    "mailto": settings.openalex_mailto or None,
                },
                headers,
            )
            data = resp.json()
            items = data.get("results", []) or []
            if not items:
                break
            for it in items:
                ids = it.get("ids") or {}
                doi = normalize_doi(ids.get("doi"))
                authors = []
                for a in it.get("authorships") or []:
                    author = a.get("author") or {}
                    if author.get("display_name"):
                        authors.append(author["display_name"])
                venue = None
                host = it.get("host_venue") or {}
                if host.get("display_name"):
                    venue = host["display_name"]
                abstract = _abstract_from_inverted_index(it.get("abstract_inverted_index"))
                papers.append(
                    Paper(
                        title=it.get("title") or "",
                        authors=authors,
                        year=it.get("publication_year"),
                        venue=venue,
                        abstract=abstract,
                        doi=doi,
                        pmid=None,
                        url=ids.get("openalex") or ids.get("doi"),
                        source="openalex",
                        raw={},
                    )
                )
                if len(papers) >= max_results:
                    break
            page += 1

            if len(items) < per_page:
                break
    return papers[:max_results]
