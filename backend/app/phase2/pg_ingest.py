"""PostgreSQL-based ingestion pipeline for Phase 2."""
from __future__ import annotations

import json
import logging
from typing import Any

from app.db.connection import db_manager
from app.db.repository import (
    AffiliationCacheRepository,
    AuthorshipRepository,
    PaperRepository,
    RunPaperRepository,
)
from app.db.service import DatabaseStore
from app.phase2.affiliation_extractor import AffiliationExtractor
from app.phase2.models import GeoData, IngestStats, ParsedPaper
from app.phase2.pubmed_fetcher import PubMedFetcher
from app.phase2.pubmed_parser import PubMedXMLParser

logger = logging.getLogger(__name__)


class PostgresIngestionPipeline:
    """Async ingestion pipeline for PostgreSQL."""
    
    def __init__(
        self,
        project_id: str,
        api_key: str | None = None
    ) -> None:
        self.project_id = project_id
        self.fetcher = PubMedFetcher(api_key=api_key)
        self.parser = PubMedXMLParser()
        self.extractor = AffiliationExtractor(batch_size=20)
    
    async def ingest_run(
        self,
        run_id: str,
        store: DatabaseStore,
        force_refresh: bool = False
    ) -> IngestStats:
        """Ingest all papers from a Phase 1 run."""
        logger.info(f"Starting ingestion for run {run_id}")
        
        stats = IngestStats(
            run_id=run_id,
            total_pmids=0,
            pmids_cached=0,
            pmids_fetched=0,
            papers_parsed=0,
            authorships_created=0,
            unique_affiliations=0,
            affiliations_with_country=0,
            llm_calls_made=0
        )
        
        try:
            # Step 1: Load PMIDs from Phase 1 results
            pmids = await self._load_pmids_from_run(run_id, store)
            stats.total_pmids = len(pmids)
            
            if not pmids:
                logger.warning(f"No PMIDs found for run {run_id}")
                return stats
            
            logger.info(f"Found {len(pmids)} PMIDs from Phase 1 results")
            
            # Step 2: Check cache
            async with db_manager.session() as session:
                paper_repo = PaperRepository(session)
                
                if force_refresh:
                    pmids_to_fetch = pmids
                    stats.pmids_cached = 0
                else:
                    cached = await paper_repo.get_cached_pmids(pmids)
                    pmids_to_fetch = [p for p in pmids if p not in cached]
                    stats.pmids_cached = len(cached)
            
            stats.pmids_fetched = len(pmids_to_fetch)
            
            if pmids_to_fetch:
                logger.info(
                    f"Fetching {len(pmids_to_fetch)} PMIDs "
                    f"(cached: {stats.pmids_cached})"
                )
                
                # Step 3: Fetch from PubMed
                xml_results = await self.fetcher.fetch_batch(pmids_to_fetch)
                logger.info(f"Fetched {len(xml_results)} PubMed XML records")
                
                # Step 4: Parse XML
                parsed_papers = []
                for pmid, xml_text in xml_results.items():
                    try:
                        papers = self.parser.parse_articles(xml_text)
                        parsed_papers.extend(papers)
                    except Exception as e:
                        logger.error(f"Failed to parse XML for PMID {pmid}: {e}")
                
                stats.papers_parsed = len(parsed_papers)
                logger.info(f"Parsed {len(parsed_papers)} papers")
                
                # Step 5: Extract affiliations via LLM
                affiliation_data = await self._extract_affiliations(parsed_papers)
                stats.unique_affiliations = affiliation_data["unique_count"]
                stats.affiliations_with_country = affiliation_data["with_country"]
                stats.llm_calls_made = affiliation_data["llm_calls"]
                
                # Step 6: Write to database
                await self._write_to_database(
                    parsed_papers,
                    affiliation_data["geo_map"],
                    run_id,
                    pmids
                )
                
                stats.authorships_created = sum(
                    len(p.authorships) for p in parsed_papers
                )
            
            logger.info(f"Ingestion complete: {stats}")
            return stats
            
        except Exception as e:
            logger.error(f"Ingestion failed: {e}", exc_info=True)
            raise
    
    async def _load_pmids_from_run(
        self,
        run_id: str,
        store: DatabaseStore
    ) -> list[str]:
        """Load PMIDs from Phase 1 results."""
        try:
            results = await store.read_run_file(self.project_id, run_id, "results.json")
            pmids = []
            
            for source in ["pubmed", "semantic_scholar", "openalex"]:
                source_results = results.get(source, {})
                if isinstance(source_results, dict):
                    papers = source_results.get("results", [])
                    for paper in papers:
                        pmid = paper.get("pubmed_id") or paper.get("pmid")
                        if pmid:
                            pmids.append(str(pmid))
            
            return list(set(pmids))
        except Exception as e:
            logger.error(f"Failed to load PMIDs from run {run_id}: {e}")
            return []
    
    async def _extract_affiliations(
        self,
        papers: list[ParsedPaper]
    ) -> dict[str, Any]:
        """Extract geographic data from affiliations using LLM."""
        # Collect unique affiliation strings
        unique_affiliations = set()
        for paper in papers:
            for auth in paper.authorships:
                if auth.affiliation_raw_joined:
                    unique_affiliations.add(auth.affiliation_raw_joined)
        
        if not unique_affiliations:
            return {
                "geo_map": {},
                "unique_count": 0,
                "with_country": 0,
                "llm_calls": 0
            }
        
        # Check cache
        geo_map: dict[str, GeoData] = {}
        to_extract = []
        
        async with db_manager.session() as session:
            cache_repo = AffiliationCacheRepository(session)
            
            for aff in unique_affiliations:
                cached = await cache_repo.get_cached(aff)
                if cached:
                    geo_map[aff] = GeoData(
                        country=cached.country,
                        city=cached.city,
                        institution=cached.institution,
                        confidence=cached.confidence
                    )
                else:
                    to_extract.append(aff)
        
        # Extract new ones via LLM
        llm_calls = 0
        if to_extract:
            logger.info(f"Extracting {len(to_extract)} affiliations via LLM")
            extracted = await self.extractor.extract_batch(to_extract)
            geo_map.update(extracted)
            llm_calls = len(to_extract) // self.extractor.batch_size + 1
            
            # Cache new extractions
            async with db_manager.session() as session:
                cache_repo = AffiliationCacheRepository(session)
                cache_data = {
                    aff: {
                        "country": geo.country,
                        "city": geo.city,
                        "institution": geo.institution,
                        "confidence": geo.confidence
                    }
                    for aff, geo in extracted.items()
                }
                await cache_repo.cache_affiliations(cache_data)
        
        with_country = sum(1 for g in geo_map.values() if g.country)
        
        return {
            "geo_map": geo_map,
            "unique_count": len(unique_affiliations),
            "with_country": with_country,
            "llm_calls": llm_calls
        }
    
    async def _write_to_database(
        self,
        papers: list[ParsedPaper],
        geo_map: dict[str, GeoData],
        run_id: str,
        all_pmids: list[str]
    ) -> None:
        """Write papers and authorships to database."""
        async with db_manager.session() as session:
            paper_repo = PaperRepository(session)
            auth_repo = AuthorshipRepository(session)
            run_paper_repo = RunPaperRepository(session)
            
            # Insert papers
            for paper in papers:
                await paper_repo.insert_paper(
                    pmid=paper.pmid,
                    year=paper.year,
                    title=paper.title,
                    doi=paper.doi,
                    xml_stored=None  # Don't store XML in PostgreSQL
                )
            
            # Insert authorships
            for paper in papers:
                for auth in paper.authorships:
                    geo = geo_map.get(auth.affiliation_raw_joined)
                    
                    await auth_repo.insert_authorship(
                        pmid=paper.pmid,
                        author_order=auth.author_order,
                        author_name_raw=auth.author_name_raw,
                        last_name=auth.last_name,
                        fore_name=auth.fore_name,
                        initials=auth.initials,
                        suffix=auth.suffix,
                        is_collective=auth.is_collective,
                        collective_name=auth.collective_name,
                        year=paper.year,
                        affiliations_raw=auth.affiliations_raw,
                        affiliation_raw_joined=auth.affiliation_raw_joined,
                        has_author_affiliation=auth.has_author_affiliation,
                        country=geo.country if geo else None,
                        city=geo.city if geo else None,
                        institution=geo.institution if geo else None,
                        affiliation_confidence=geo.confidence if geo else "none"
                    )
            
            # Link run to papers
            await run_paper_repo.link_run_to_papers(run_id, all_pmids)
            
            logger.info("Database write complete")

