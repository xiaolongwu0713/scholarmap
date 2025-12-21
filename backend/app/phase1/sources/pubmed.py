from __future__ import annotations

import xml.etree.ElementTree as ET

import httpx
from tenacity import retry, retry_if_exception, stop_after_attempt, wait_exponential

from app.phase1.models import Paper
from app.phase1.text_utils import normalize_doi


def _should_retry(exc: BaseException) -> bool:
    if isinstance(exc, httpx.HTTPStatusError):
        status = exc.response.status_code
        return status in (429, 500, 502, 503, 504)
    if isinstance(exc, httpx.TransportError):
        return True
    return False


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=8), retry=retry_if_exception(_should_retry))
async def _request(client: httpx.AsyncClient, method: str, url: str, params: dict | None = None, data: dict | None = None) -> httpx.Response:
    resp = await client.request(method, url, params=params, data=data)
    resp.raise_for_status()
    return resp


def _text(el: ET.Element | None) -> str:
    if el is None or el.text is None:
        return ""
    return el.text.strip()


def _parse_pubmed_article(article: ET.Element) -> Paper:
    pmid = _text(article.find(".//MedlineCitation/PMID"))
    title = _text(article.find(".//Article/ArticleTitle"))
    abstract_parts = []
    for a in article.findall(".//Article/Abstract/AbstractText"):
        abstract_parts.append(" ".join(a.itertext()).strip())
    abstract = "\n".join([p for p in abstract_parts if p]) or None

    year = None
    year_text = _text(article.find(".//Article/Journal/JournalIssue/PubDate/Year"))
    if year_text.isdigit():
        year = int(year_text)

    venue = _text(article.find(".//Article/Journal/Title")) or None

    authors = []
    for au in article.findall(".//Article/AuthorList/Author"):
        last = _text(au.find("LastName"))
        fore = _text(au.find("ForeName"))
        if last and fore:
            authors.append(f"{fore} {last}")
        elif last:
            authors.append(last)

    doi = None
    for aid in article.findall(".//PubmedData/ArticleIdList/ArticleId"):
        if aid.attrib.get("IdType") == "doi":
            doi = normalize_doi(_text(aid))
            break

    url = f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/" if pmid else None

    return Paper(
        title=title,
        authors=authors,
        year=year,
        venue=venue,
        abstract=abstract,
        doi=doi,
        pmid=pmid or None,
        url=url,
        source="pubmed",
        raw={},
    )


async def search_pubmed(query: str, max_results: int) -> list[Paper]:
    if not query.strip():
        return []
    q = " ".join(query.split())
    base = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
    async with httpx.AsyncClient(timeout=60) as client:
        # Use POST to avoid 414 Request-URI Too Long for long queries
        esearch = await _request(
            client,
            "POST",
            f"{base}/esearch.fcgi",
            data={"db": "pubmed", "term": q, "retmax": str(max_results), "retmode": "json"},
        )
        ids = esearch.json().get("esearchresult", {}).get("idlist", [])
        if not ids:
            return []

        papers: list[Paper] = []
        batch_size = 200
        for i in range(0, len(ids), batch_size):
            batch = ids[i : i + batch_size]
            efetch = await _request(
                client,
                "POST",
                f"{base}/efetch.fcgi",
                data={"db": "pubmed", "id": ",".join(batch), "retmode": "xml"},
            )
            root = ET.fromstring(efetch.text)
            for article in root.findall(".//PubmedArticle"):
                try:
                    papers.append(_parse_pubmed_article(article))
                except Exception:
                    continue
        return papers[:max_results]
