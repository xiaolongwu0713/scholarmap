from __future__ import annotations

from collections import defaultdict

from app.phase1.models import Paper


def aggregate_by_doi(papers_by_source: dict[str, list[Paper]]) -> tuple[list[dict], dict[str, int]]:
    seen: dict[str, dict] = {}
    counts: dict[str, int] = {k: len(v) for k, v in papers_by_source.items()}

    for source, papers in papers_by_source.items():
        for p in papers:
            doi = (p.doi or "").strip().lower()
            if not doi:
                continue
            if doi not in seen:
                seen[doi] = {
                    "doi": doi,
                    "title": p.title,
                    "authors": p.authors,
                    "year": p.year,
                    "venue": p.venue,
                    "abstract": p.abstract,
                    "identifiers": {"doi": doi, "pmid": p.pmid},
                    "sources": [source],
                    "links": [{"source": source, "url": p.url}],
                }
            else:
                if source not in seen[doi]["sources"]:
                    seen[doi]["sources"].append(source)
                if p.url:
                    seen[doi]["links"].append({"source": source, "url": p.url})
                if not seen[doi].get("abstract") and p.abstract:
                    seen[doi]["abstract"] = p.abstract

    aggregated = list(seen.values())
    aggregated.sort(key=lambda x: (x.get("year") or 0, x.get("doi") or ""), reverse=True)
    return aggregated, counts


def serialize_papers(papers: list[Paper]) -> list[dict]:
    return [p.model_dump() for p in papers]

