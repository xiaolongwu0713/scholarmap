"""Ingestion orchestrator for Phase 2: PubMed → Authorship table."""

from __future__ import annotations

import json
import logging
import sys
from pathlib import Path

# Add repo root to path to import config
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
import config
settings = config.settings
from app.core.storage import FileStore
from app.phase2.affiliation_extractor import create_extractor
from app.phase2.database import Database
from app.phase2.models import GeoData, IngestStats, ParsedPaper
from app.phase2.pubmed_fetcher import PubMedFetcher
from app.phase2.pubmed_parser import PubMedXMLParser

logger = logging.getLogger(__name__)


class IngestionPipeline:
    """
    Orchestrates the full ingestion pipeline:
    1. Load PMIDs from Phase 1 results
    2. Check cache (SQLite)
    3. Fetch missing PMIDs from PubMed
    4. Parse XML → papers + authorship
    5. Extract affiliations via LLM (batched)
    6. Write to database
    """
    
    def __init__(
        self,
        project_id: str,
        data_dir: Path,
        api_key: str | None = None
    ) -> None:
        self.project_id = project_id
        self.db = Database(project_id, data_dir)
        self.fetcher = PubMedFetcher(api_key=api_key)
        self.parser = PubMedXMLParser()
        self.extractor = create_extractor(settings.affiliation_extraction_method)
    
    async def ingest_run(
        self,
        run_id: str,
        store: FileStore,
        force_refresh: bool = False
    ) -> IngestStats:
        """
        Ingest all papers from a Phase 1 run.
        
        Args:
            run_id: Run ID to ingest
            store: FileStore to read Phase 1 results
            force_refresh: If True, re-fetch even if cached
        
        Returns:
            IngestStats with metrics
        """
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
            pmids = self._load_pmids_from_run(run_id, store)
            stats.total_pmids = len(pmids)
            
            if not pmids:
                logger.warning(f"No PMIDs found for run {run_id}")
                return stats
            
            logger.info(f"Found {len(pmids)} PMIDs from Phase 1 results")
            
            # Step 2: Check cache
            if force_refresh:
                pmids_to_fetch = pmids
                stats.pmids_cached = 0
            else:
                cached = self.db.get_cached_pmids(pmids)
                pmids_to_fetch = [p for p in pmids if p not in cached]
                stats.pmids_cached = len(cached)
            
            stats.pmids_fetched = len(pmids_to_fetch)
            
            if pmids_to_fetch:
                logger.info(
                    f"Fetching {len(pmids_to_fetch)} PMIDs "
                    f"(cached: {stats.pmids_cached})"
                )
                
                # Step 3: Fetch XML from PubMed
                xml_batches = await self.fetcher.fetch_pmids(pmids_to_fetch)
                
                # Step 4: Parse XML
                all_papers: list[ParsedPaper] = []
                for xml in xml_batches:
                    papers = self.parser.parse_xml_batch(xml)
                    all_papers.extend(papers)
                
                stats.papers_parsed = len(all_papers)
                logger.info(f"Parsed {len(all_papers)} papers")
                
                # Step 5: Extract unique affiliations
                affiliation_map = await self._extract_affiliations(all_papers, stats)
                
                # Step 6: Write to database
                self._write_to_database(all_papers, affiliation_map, stats)
            
            else:
                logger.info("All PMIDs already cached")
            
            # Step 7: Link run to papers
            conn = self.db.get_conn()
            try:
                self.db.link_run_to_papers(conn, run_id, pmids)
                conn.commit()
            finally:
                conn.close()
            
            logger.info(
                f"Ingestion complete: {stats.papers_parsed} papers, "
                f"{stats.authorships_created} authorships, "
                f"{stats.affiliations_with_country}/{stats.unique_affiliations} "
                f"affiliations with country"
            )
            
            return stats
            
        except Exception as e:
            logger.error(f"Ingestion failed: {e}", exc_info=True)
            stats.errors.append(str(e))
            raise
    
    def _load_pmids_from_run(
        self,
        run_id: str,
        store: FileStore
    ) -> list[str]:
        """Load PMIDs from Phase 1 results_aggregated.json."""
        try:
            data = store.read_run_file(self.project_id, run_id, "results_aggregated.json")
            items = data.get("items", [])
            
            pmids = []
            for item in items:
                pmid = item.get("identifiers", {}).get("pmid")
                if pmid:
                    pmids.append(str(pmid))
            
            return pmids
            
        except FileNotFoundError:
            logger.error(f"results_aggregated.json not found for run {run_id}")
            return []
    
    async def _extract_affiliations(
        self,
        papers: list[ParsedPaper],
        stats: IngestStats
    ) -> dict[str, GeoData]:
        """
        Extract geographic data from all unique affiliations.
        
        Returns mapping: affiliation_raw -> GeoData
        """
        # Collect all unique affiliations
        unique_affiliations: set[str] = set()
        
        for paper in papers:
            for author in paper.authors:
                for aff in author.affiliations_raw:
                    if aff:
                        unique_affiliations.add(aff)
        
        stats.unique_affiliations = len(unique_affiliations)
        
        if not unique_affiliations:
            logger.info("No affiliations to extract")
            return {}
        
        logger.info(f"Extracting {len(unique_affiliations)} unique affiliations")
        
        # Extract with caching
        affiliation_map = await self.extractor.extract_affiliations(
            list(unique_affiliations),
            cache_lookup=self.db.get_cached_affiliation
        )
        
        # Update cache
        self.db.cache_affiliations(affiliation_map)
        
        # Count successes
        stats.affiliations_with_country = sum(
            1 for geo in affiliation_map.values()
            if geo.country
        )
        
        # Estimate LLM calls (only for LLM-based extraction)
        if settings.affiliation_extraction_method == "llm":
            stats.llm_calls_made = (len(unique_affiliations) + 19) // 20
        else:
            stats.llm_calls_made = 0
        
        return affiliation_map
    
    def _write_to_database(
        self,
        papers: list[ParsedPaper],
        affiliation_map: dict[str, GeoData],
        stats: IngestStats
    ) -> None:
        """Write parsed papers and authorships to database."""
        conn = self.db.get_conn()
        
        try:
            for paper in papers:
                # Insert paper
                self.db.insert_paper(
                    conn=conn,
                    pmid=paper.pmid,
                    year=paper.year,
                    title=paper.title,
                    doi=paper.doi
                )
                
                # Insert authorships
                for author in paper.authors:
                    # Get geo data from first affiliation (primary affiliation)
                    geo = self._get_primary_geo(author.affiliations_raw, affiliation_map)
                    
                    # Determine confidence
                    has_aff = len(author.affiliations_raw) > 0
                    confidence = geo.confidence if has_aff else "none"
                    
                    # Join affiliations
                    aff_joined = " | ".join(author.affiliations_raw) if author.affiliations_raw else ""
                    
                    self.db.insert_authorship(
                        conn=conn,
                        pmid=paper.pmid,
                        author_order=author.author_order,
                        author_name_raw=author.name.display_name,
                        last_name=author.name.last_name,
                        fore_name=author.name.fore_name,
                        initials=author.name.initials,
                        suffix=author.name.suffix,
                        is_collective=author.name.is_collective,
                        collective_name=author.name.collective_name,
                        year=paper.year,
                        affiliations_raw=author.affiliations_raw,
                        affiliation_raw_joined=aff_joined,
                        has_author_affiliation=has_aff,
                        country=geo.country,
                        city=geo.city,
                        institution=geo.institution,
                        affiliation_confidence=confidence
                    )
                    
                    stats.authorships_created += 1
            
            conn.commit()
            logger.info(f"Wrote {len(papers)} papers and {stats.authorships_created} authorships to database")
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Database write failed: {e}")
            raise
        finally:
            conn.close()
    
    def _get_primary_geo(
        self,
        affiliations: list[str],
        affiliation_map: dict[str, GeoData]
    ) -> GeoData:
        """
        Get geo data from primary (first) affiliation.
        
        For MVP, we use only the first affiliation to avoid double-counting.
        """
        if not affiliations:
            return GeoData(confidence="none")
        
        primary = affiliations[0]
        return affiliation_map.get(primary, GeoData(confidence="none"))

