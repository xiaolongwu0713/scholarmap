"""Post-ingestion validation and LLM fallback for affiliation extraction errors."""
from __future__ import annotations

import json
import logging
from collections import defaultdict
from typing import Any

from app.db.connection import db_manager
from app.db.models import Authorship
from app.db.repository import (
    AffiliationCacheRepository,
    AuthorshipRepository,
    GeocodingCacheRepository,
    RunPaperRepository,
)
from app.phase2.affiliation_extractor import AffiliationExtractor
from app.phase2.models import GeoData
from app.phase2.pg_geocoding import PostgresGeocoder

logger = logging.getLogger(__name__)


class AffiliationValidator:
    """Validates affiliation extractions and provides LLM fallback for errors."""
    
    def __init__(self) -> None:
        self.geocoder = PostgresGeocoder()
        self.llm_extractor = AffiliationExtractor(batch_size=20)
    
    async def validate_and_fix_run(
        self,
        run_id: str,
        project_id: str
    ) -> dict[str, Any]:
        """
        Validate affiliations for a run and fix errors using LLM fallback.
        
        Steps:
        1. Get all authorships for the run
        2. Check geocoding cache for each (country, city) pair
        3. If cache miss or null coordinates, try Nominatim
        4. If Nominatim fails, collect affiliation and PMID
        5. Batch fix errors using LLM
        6. Update affiliation_cache and re-geocode
        7. Update authorship records in database
        
        Returns:
            Dict with statistics about validation and fixes
        """
        stats = {
            "total_authorships": 0,
            "geocoding_cache_hits": 0,
            "geocoding_cache_misses": 0,
            "nominatim_successes": 0,
            "nominatim_failures": 0,
            "llm_fixes": 0,
            "error_affiliations": 0,
            "error_pmids": set(),
        }
        
        # Step 1: Get all authorships for the run
        async with db_manager.session() as session:
            auth_repo = AuthorshipRepository(session)
            run_paper_repo = RunPaperRepository(session)
            
            # Get PMIDs for this run
            pmids = await run_paper_repo.get_run_pmids(run_id)
            if not pmids:
                logger.warning(f"No PMIDs found for run {run_id}")
                return stats
            
            # Get all authorships for these PMIDs
            authorships = await auth_repo.get_authorships_by_pmids(pmids)
            stats["total_authorships"] = len(authorships)
            
            logger.info(
                f"Validating {len(authorships)} authorships from {len(pmids)} papers"
            )
        
        # Note: authorships are detached from session, but we only read their attributes
        
        # Step 2-4: Check geocoding and identify errors
        # Map: affiliation_raw -> (set of PMIDs, set of authorship IDs)
        error_affiliations: dict[str, tuple[set[str], set[int]]] = defaultdict(
            lambda: (set(), set())
        )
        
        cache_repo_instance = None
        async with db_manager.session() as session:
            cache_repo = GeocodingCacheRepository(session)
            cache_repo_instance = cache_repo
            
            for auth in authorships:
                if not auth.country:
                    continue  # Skip if no country
                
                # Build location key
                location_key = PostgresGeocoder.make_location_key(
                    auth.country,
                    auth.city
                )
                
                # Check geocoding cache
                cached = await cache_repo.get_cached(location_key)
                
                if cached:
                    # Cache hit - check if coordinates are valid
                    if cached.latitude is not None and cached.longitude is not None:
                        stats["geocoding_cache_hits"] += 1
                        continue  # Success - has valid coordinates
                    else:
                        # Cache hit but coordinates are null - previously failed geocoding
                        # Don't call Nominatim again, just log it
                        stats["geocoding_cache_hits"] += 1
                        
                        # Get primary affiliation for logging
                        try:
                            aff_list = json.loads(auth.affiliations_raw) if auth.affiliations_raw else []
                            primary_aff = aff_list[0] if aff_list else (auth.affiliation_raw_joined or "")
                        except (json.JSONDecodeError, IndexError, AttributeError):
                            primary_aff = auth.affiliation_raw_joined or ""
                        
                        logger.info(
                            f"Geocoding cache hit with null coordinates - "
                            f"affiliation: '{primary_aff}', "
                            f"country: '{auth.country}', city: '{auth.city}', "
                            f"PMID: {auth.pmid}"
                        )
                        continue  # Skip Nominatim call
                
                # Cache miss - try Nominatim
                stats["geocoding_cache_misses"] += 1
                
                coords = await self.geocoder.get_coordinates(
                    auth.country,
                    auth.city
                )
                
                if coords:
                    stats["nominatim_successes"] += 1
                    continue  # Success - Nominatim found it
                
                # Failed - Nominatim returned null
                stats["nominatim_failures"] += 1
                
                # Collect affiliation and PMID for LLM fix
                # Get primary affiliation from affiliations_raw (JSON array)
                try:
                    aff_list = json.loads(auth.affiliations_raw) if auth.affiliations_raw else []
                    primary_aff = aff_list[0] if aff_list else (auth.affiliation_raw_joined or "")
                except (json.JSONDecodeError, IndexError, AttributeError):
                    primary_aff = auth.affiliation_raw_joined or ""
                
                if primary_aff:
                    pmid_set, auth_id_set = error_affiliations[primary_aff]
                    pmid_set.add(auth.pmid)
                    auth_id_set.add(auth.id)
                    stats["error_pmids"].add(auth.pmid)
        
        stats["error_affiliations"] = len(error_affiliations)
        stats["error_pmids"] = len(stats["error_pmids"])
        
        logger.info(
            f"Validation complete: {stats['nominatim_failures']} geocoding failures, "
            f"{stats['error_affiliations']} unique error affiliations"
        )
        
        # Step 5-7: Fix errors using LLM
        if error_affiliations:
            fix_stats = await self._fix_errors_with_llm(
                error_affiliations,
                project_id,
                run_id
            )
            stats["llm_fixes"] = fix_stats["fixed"]
            stats.update(fix_stats)
        
        return stats
    
    async def _fix_errors_with_llm(
        self,
        error_affiliations: dict[str, tuple[set[str], set[int]]],
        project_id: str,
        run_id: str
    ) -> dict[str, Any]:
        """
        Fix affiliation extraction errors using LLM.
        
        Args:
            error_affiliations: Dict mapping affiliation_raw -> (pmids_set, authorship_ids_set)
            project_id: Project ID for logging
            run_id: Run ID for logging
        
        Returns:
            Dict with fix statistics
        """
        fix_stats = {
            "fixed": 0,
            "llm_batches": 0,
            "cache_updates": 0,
            "authorship_updates": 0,
            "geocoding_updates": 0,
        }
        
        # Collect unique affiliations to fix
        affiliations_to_fix = list(error_affiliations.keys())
        logger.info(f"Fixing {len(affiliations_to_fix)} error affiliations with LLM")
        
        # Extract using LLM
        llm_results = await self.llm_extractor.extract_affiliations(
            affiliations_to_fix,
            cache_lookup=None  # Don't use cache, we're fixing cache errors
        )
        
        fix_stats["llm_batches"] = (len(affiliations_to_fix) + 19) // 20
        
        if not llm_results:
            logger.warning("LLM extraction returned no results")
            return fix_stats
        
        # Update affiliation_cache with LLM results
        async with db_manager.session() as session:
            aff_cache_repo = AffiliationCacheRepository(session)
            
            geo_map_for_cache = {
                aff: {
                    "country": geo.country,
                    "city": geo.city,
                    "institution": geo.institution,
                    "confidence": geo.confidence
                }
                for aff, geo in llm_results.items()
            }
            await aff_cache_repo.cache_affiliations(geo_map_for_cache)
            await session.commit()
            fix_stats["cache_updates"] = len(llm_results)
            logger.info(f"Updated affiliation_cache with {len(llm_results)} LLM results")
        
        # Update authorships and re-geocode
        async with db_manager.session() as session:
            auth_repo = AuthorshipRepository(session)
            geo_cache_repo = GeocodingCacheRepository(session)
            
            updated_authorships = 0
            updated_geocodings = 0
            
            for affiliation_raw, (pmid_set, auth_id_set) in error_affiliations.items():
                if affiliation_raw not in llm_results:
                    continue  # LLM didn't return result for this affiliation
                
                geo = llm_results[affiliation_raw]
                
                # Re-geocode with new country/city
                if geo.country:
                    coords = await self.geocoder.get_coordinates(
                        geo.country,
                        geo.city
                    )
                    
                    if coords:
                        updated_geocodings += 1
                    
                    # Update all authorships that used this affiliation
                    for auth_id in auth_id_set:
                        # Get authorship
                        auth = await session.get(Authorship, auth_id)
                        if not auth:
                            continue
                        
                        # Update authorship fields
                        auth.country = geo.country
                        auth.city = geo.city
                        auth.institution = geo.institution
                        auth.affiliation_confidence = geo.confidence
                        
                        updated_authorships += 1
            
            await session.commit()
            fix_stats["authorship_updates"] = updated_authorships
            fix_stats["geocoding_updates"] = updated_geocodings
            fix_stats["fixed"] = len([a for a in error_affiliations.keys() if a in llm_results])
            
            logger.info(
                f"Fixed {fix_stats['fixed']} affiliations: "
                f"{updated_authorships} authorships updated, "
                f"{updated_geocodings} locations re-geocoded"
            )
        
        return fix_stats

