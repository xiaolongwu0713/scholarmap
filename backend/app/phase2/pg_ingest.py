"""PostgreSQL-based ingestion pipeline for Phase 2 (simplified, no cache)."""
from __future__ import annotations

import logging
from typing import Any

import sys
from pathlib import Path

# Add repo root to path to import config
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
import config
settings = config.settings
from app.db.connection import db_manager
from app.db.repository import (
    AuthorshipRepository,
    PaperRepository,
    RunPaperRepository,
)
from app.db.service import DatabaseStore
from app.phase2.affiliation_extractor import create_extractor
from app.phase2.models import GeoData, IngestStats, ParsedPaper
from app.phase2.pubmed_fetcher import PubMedFetcher
from app.phase2.pubmed_parser import PubMedXMLParser
from app.phase2.pg_database import PostgresDatabase

logger = logging.getLogger(__name__)


class PostgresIngestionPipeline:
    """Async ingestion pipeline for PostgreSQL (no cache, always fresh)."""
    
    def __init__(
        self,
        project_id: str,
        api_key: str | None = None
    ) -> None:
        self.project_id = project_id
        self.fetcher = PubMedFetcher(api_key=api_key)
        self.parser = PubMedXMLParser()
        self.extractor = create_extractor(settings.affiliation_extraction_method)
        self.db = PostgresDatabase(project_id)
    
    async def ingest_run(
        self,
        run_id: str,
        store: DatabaseStore,
        force_refresh: bool = False  # Ignored, always fresh
    ) -> IngestStats:
        """Ingest all papers from a Phase 1 run (always processes everything)."""
        logger.info("─" * 80)
        logger.info(f"📥 INGESTION STEP 1: Starting ingestion for run {run_id}")
        logger.info(f"   Project ID: {self.project_id}")
        logger.info(f"   Force refresh: {force_refresh}")
        logger.info("─" * 80)
        
        stats = IngestStats(
            run_id=run_id,
            total_pmids=0,
            pmids_cached=0,  # Always 0, no cache
            pmids_fetched=0,
            papers_parsed=0,
            authorships_created=0,
            unique_affiliations=0,
            affiliations_with_country=0,
            llm_calls_made=0
        )
        
        try:
            # Step 1: Load PMIDs from Phase 1 results
            logger.info("📥 INGESTION STEP 1: Loading PMIDs from Phase 1 results...")
            pmids = await self._load_pmids_from_run(run_id, store)
            stats.total_pmids = len(pmids)
            
            if not pmids:
                logger.warning(f"⚠️  No PMIDs found for run {run_id}")
                return stats
            
            logger.info(f"✅ INGESTION STEP 1 COMPLETE: Found {len(pmids)} PMIDs")
            
            # Step 2: Always fetch everything (no cache check)
            stats.pmids_fetched = len(pmids)
            logger.info("─" * 80)
            logger.info(f"📥 INGESTION STEP 2: Fetching {len(pmids)} PMIDs from PubMed...")
            
            # Step 3: Fetch from PubMed
            xml_results = await self.fetcher.fetch_batch(pmids)
            logger.info(f"✅ INGESTION STEP 2 COMPLETE: Fetched {len(xml_results)} PubMed XML records")
            
            # Step 4: Parse XML
            logger.info("─" * 80)
            logger.info("📥 INGESTION STEP 3: Parsing XML into structured papers...")
            parsed_papers = []
            for pmid, xml_text in xml_results.items():
                try:
                    papers = self.parser.parse_articles(xml_text)
                    parsed_papers.extend(papers)
                except Exception as e:
                    logger.error(f"❌ Failed to parse XML for PMID {pmid}: {e}")
            
            stats.papers_parsed = len(parsed_papers)
            logger.info(f"✅ INGESTION STEP 3 COMPLETE: Parsed {len(parsed_papers)} papers")
            
            # Step 5: Extract affiliations
            logger.info("─" * 80)
            method_name = "rule-based" if settings.affiliation_extraction_method == "rule_based" else "LLM"
            logger.info(f"📥 INGESTION STEP 4: Extracting affiliations via {method_name}...")
            affiliation_data = await self._extract_affiliations(parsed_papers)
            stats.unique_affiliations = affiliation_data["unique_count"]
            stats.affiliations_with_country = affiliation_data["with_country"]
            stats.llm_calls_made = affiliation_data["llm_calls"]
            logger.info(f"✅ INGESTION STEP 4 COMPLETE: Extracted {len(affiliation_data['geo_map'])} affiliations")
            logger.info(f"   Unique affiliations: {stats.unique_affiliations}")
            logger.info(f"   With country: {stats.affiliations_with_country}")
            logger.info(f"   LLM calls: {stats.llm_calls_made}")
            
            # Step 6: Write to database
            logger.info("─" * 80)
            logger.info("📥 INGESTION STEP 5: Writing to database...")
            await self._write_to_database(
                parsed_papers,
                affiliation_data["geo_map"],
                run_id,
                pmids
            )
            
            stats.authorships_created = sum(
                len(p.authors) for p in parsed_papers
            )
            logger.info(f"✅ INGESTION STEP 5 COMPLETE: Created {stats.authorships_created} authorships")
            
            logger.info("─" * 80)
            logger.info(f"✅ INGESTION COMPLETE - Run: {run_id}")
            logger.info(f"   Total PMIDs: {stats.total_pmids}")
            logger.info(f"   Papers parsed: {stats.papers_parsed}")
            logger.info(f"   Authorships created: {stats.authorships_created}")
            logger.info(f"   Unique affiliations: {stats.unique_affiliations}")
            logger.info(f"   Affiliations with country: {stats.affiliations_with_country}")
            logger.info(f"   LLM calls made: {stats.llm_calls_made}")
            logger.info("─" * 80)
            
            # Step 7: Validate and fix affiliation extraction errors
            if settings.affiliation_extraction_method == "rule_based":
                logger.info("─" * 80)
                logger.info("📥 INGESTION STEP 6: Starting post-ingestion validation and LLM fallback...")
                try:
                    from app.phase2.affiliation_validator import AffiliationValidator
                    validator = AffiliationValidator()
                    validation_stats = await validator.validate_and_fix_run(run_id, self.project_id)
                    logger.info("✅ INGESTION STEP 6 COMPLETE: Validation and fixes completed")
                    logger.info(
                        f"   Affiliations fixed: {validation_stats.get('llm_fixes', 0)}"
                    )
                    logger.info(
                        f"   Geocoding failures found: {validation_stats.get('nominatim_failures', 0)}"
                    )
                    logger.info("─" * 80)
                except Exception as e:
                    logger.error(f"❌ Validation and fix failed: {e}", exc_info=True)
                    # Don't fail ingestion if validation fails
            
            return stats
            
        except Exception as e:
            logger.error("─" * 80)
            logger.error(f"❌ INGESTION FAILED - Run: {run_id}")
            logger.error(f"   Error: {e}", exc_info=True)
            logger.error("─" * 80)
            raise
    
    async def _load_pmids_from_run(
        self,
        run_id: str,
        store: DatabaseStore
    ) -> list[str]:
        """Load PMIDs from Phase 1 results."""
        pmids = []
        
        # Try reading from individual result files first
        for source_file in ["results_pubmed.json", "results_semantic_scholar.json", "results_openalex.json"]:
            try:
                source_data = await store.read_run_file(self.project_id, run_id, source_file)
                if source_data and isinstance(source_data, dict):
                    papers = source_data.get("items", [])
                    for paper in papers:
                        # Try multiple field names for PMID
                        pmid = paper.get("pmid") or paper.get("pubmed_id") or paper.get("identifiers", {}).get("pmid")
                        if pmid:
                            pmids.append(str(pmid))
            except FileNotFoundError:
                # File doesn't exist, skip
                continue
            except Exception as e:
                logger.warning(f"Failed to read {source_file}: {e}")
                continue
        
        # Fallback: try reading from results.json (old format)
        if not pmids:
            try:
                results = await store.read_run_file(self.project_id, run_id, "results.json")
                if results and isinstance(results, dict):
                    for source in ["pubmed", "semantic_scholar", "openalex"]:
                        source_results = results.get(source, {})
                        if isinstance(source_results, dict):
                            papers = source_results.get("results", []) or source_results.get("items", [])
                            for paper in papers:
                                pmid = paper.get("pubmed_id") or paper.get("pmid") or paper.get("identifiers", {}).get("pmid")
                                if pmid:
                                    pmids.append(str(pmid))
            except FileNotFoundError:
                logger.warning(f"results.json not found for run {run_id}")
            except Exception as e:
                logger.error(f"Failed to load PMIDs from results.json: {e}")
        
        unique_pmids = list(set(pmids))
        logger.info(f"   Loaded {len(unique_pmids)} unique PMIDs from run {run_id}")
        return unique_pmids
    
    async def _extract_affiliations(
        self,
        papers: list[ParsedPaper]
    ) -> dict[str, Any]:
        """Extract geographic data from affiliations (no cache)."""
        # Collect unique affiliation strings
        unique_affiliations = set()
        for paper in papers:
            for author in paper.authors:
                for aff in author.affiliations_raw:
                    if aff:
                        unique_affiliations.add(aff)
        
        if not unique_affiliations:
            return {
                "geo_map": {},
                "unique_count": 0,
                "with_country": 0,
                "llm_calls": 0
            }
        
        method_name = "rule-based" if settings.affiliation_extraction_method == "rule_based" else "LLM"
        logger.info(f"   Extracting {len(unique_affiliations)} affiliations via {method_name} (with cache)")
        
        # Extract affiliations with cache lookup
        affiliation_list = list(unique_affiliations)
        
        # Use batch cache lookup for better performance
        if settings.affiliation_extraction_method == "rule_based":
            # For rule-based, use batch cache lookup
            geo_map = await self.extractor.extract_affiliations(
                affiliation_list,
                cache_lookup=self.db.get_batch_cached_affiliations
            )
        else:
            # For LLM, use individual cache lookup (already optimized with batching)
            geo_map = await self.extractor.extract_affiliations(
                affiliation_list,
                cache_lookup=self.db.get_cached_affiliation
            )
        
        # Cache the extracted results (update cache with new extractions)
        if geo_map:
            await self.db.cache_affiliations(geo_map)
            logger.info(f"   Cached {len(geo_map)} affiliation extraction results")
        
        with_country = sum(1 for g in geo_map.values() if g.country)
        
        # Calculate LLM calls (only for LLM-based extraction)
        llm_calls = 0
        if settings.affiliation_extraction_method == "llm":
            # Estimate LLM calls (batch size = 20)
            llm_calls = (len(affiliation_list) + 19) // 20
        
        logger.info(f"   Extraction complete: {len(geo_map)} affiliations, {with_country} with country")
        
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
            
            # Delete existing data for this run first (to allow re-processing)
            logger.info(f"   Clearing existing data for run {run_id}...")
            # Get PMIDs for this run (if any exist)
            existing_pmids = await run_paper_repo.get_run_pmids(run_id)
            if existing_pmids:
                # Delete authorships for these PMIDs
                await auth_repo.delete_authorships_by_pmids(existing_pmids)
                logger.info(f"   Deleted authorships for {len(existing_pmids)} existing PMIDs")
            # Note: run_papers will be deleted in link_run_to_papers()
            
            # Insert papers (upsert)
            logger.info(f"   Inserting/updating {len(papers)} papers...")
            for paper in papers:
                await paper_repo.insert_paper(
                    pmid=paper.pmid,
                    year=paper.year,
                    title=paper.title,
                    doi=paper.doi,
                    xml_stored=None  # Don't store XML in PostgreSQL
                )
            logger.info(f"   Papers inserted/updated: {len(papers)}")
            
            # Insert authorships
            total_authorships = sum(len(p.authors) for p in papers)
            logger.info(f"   Inserting {total_authorships} authorships...")
            for paper in papers:
                for author in paper.authors:
                    # Get geo data from primary (first) affiliation
                    geo = self._get_primary_geo(author.affiliations_raw, geo_map)
                    
                    # Determine confidence
                    has_aff = len(author.affiliations_raw) > 0
                    confidence = geo.confidence if has_aff else "none"
                    
                    # Join affiliations
                    aff_joined = " | ".join(author.affiliations_raw) if author.affiliations_raw else ""
                    
                    await auth_repo.insert_authorship(
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
            logger.info(f"   Authorships inserted: {total_authorships}")
            
            # Link run to papers
            logger.info(f"   Linking run {run_id} to {len(all_pmids)} papers...")
            await run_paper_repo.link_run_to_papers(run_id, all_pmids)
            logger.info(f"   Database write complete")
    
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
