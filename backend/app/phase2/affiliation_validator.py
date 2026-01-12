"""Post-ingestion validation and LLM fallback for affiliation extraction errors."""
from __future__ import annotations

import json
import logging
from collections import defaultdict
from typing import Any

from app.db.connection import db_manager
from app.db.models import Authorship, GeocodingCache
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
        project_id: str,
        pending_institutions: list[dict] = None
    ) -> dict[str, Any]:
        """
        Validate affiliations for a run and fix errors using LLM fallback.
        
        Steps:
        1. Get all authorships for the run
        2. Check geocoding cache for each (country, city) pair
        3. If cache miss or null coordinates, try Nominatim
        4. If Nominatim succeeds, add pending institutions to institution_geo (NEW)
        5. If Nominatim fails, collect affiliation and PMID
        6. Batch fix errors using LLM
        7. Update affiliation_cache and re-geocode
        8. Update authorship records in database
        
        Args:
            run_id: Run ID
            project_id: Project ID
            pending_institutions: List of institutions pending validation
                Format: [{"affiliation_raw": ..., "institution": ..., "country": ..., "city": ...}]
        
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
            "institutions_validated": 0,
            "institutions_added_to_geo_table": 0,
        }
        
        # Initialize pending_institutions if not provided
        if pending_institutions is None:
            pending_institutions = []
        
        logger.info(f"   Pending institutions to validate: {len(pending_institutions)}")
        
        # Step 1: Get all authorships for the run
        logger.info("─" * 80)
        logger.info(f"🔍 VALIDATION STEP 1: Getting authorships for run {run_id}...")
        async with db_manager.session() as session:
            auth_repo = AuthorshipRepository(session)
            run_paper_repo = RunPaperRepository(session)
            
            # Get PMIDs for this run
            pmids = await run_paper_repo.get_run_pmids(run_id)
            if not pmids:
                logger.warning(f"⚠️  No PMIDs found for run {run_id}")
                return stats
            
            # Get all authorships for these PMIDs
            authorships = await auth_repo.get_authorships_by_pmids(pmids)
            stats["total_authorships"] = len(authorships)
            
            logger.info(f"✅ VALIDATION STEP 1 COMPLETE: Found {len(authorships)} authorships from {len(pmids)} papers")
        
        # Note: authorships are detached from session, but we only read their attributes
        
        # Step 2-4: Check geocoding and identify errors (OPTIMIZED: batch processing)
        # Map: affiliation_raw -> (set of PMIDs, set of authorship IDs)
        error_affiliations: dict[str, tuple[set[str], set[int]]] = defaultdict(
            lambda: (set(), set())
        )
        
        # Optimization 1 & 2: Extract unique location_keys and batch query cache
        logger.info("─" * 80)
        logger.info(f"🔍 VALIDATION STEP 2: Extracting unique location keys and batch querying geocoding_cache...")
        
        # Build location keys for all authorships
        location_key_to_authorships: dict[str, list[Authorship]] = defaultdict(list)
        for auth in authorships:
            if not auth.country:
                continue  # Skip if no country
            location_key = PostgresGeocoder.make_location_key(auth.country, auth.city)
            location_key_to_authorships[location_key].append(auth)
        
        unique_location_keys = list(location_key_to_authorships.keys())
        logger.info(f"   Found {len(unique_location_keys)} unique location keys from {stats['total_authorships']} authorships")
        
        # Optimization 1: Batch query geocoding cache
        async with db_manager.session() as session:
            cache_repo = GeocodingCacheRepository(session)
            cached_locations = await cache_repo.get_batch_cached(unique_location_keys)
            logger.info(f"   Batch query complete: {len(cached_locations)}/{len(unique_location_keys)} found in cache")
        
        # Optimization 5 & 6: Preload all cache (optional, if cache is small enough)
        # For now, we skip preloading and use batch queries (strategy 1)
        # If needed, can add preloading later if cache table is small
        
        # Process each location_key (already deduplicated)
        location_keys_to_geocode: dict[str, tuple[str, str | None]] = {}  # location_key -> (country, city)
        location_keys_to_update_affiliations: dict[str, list[tuple[str, str]]] = defaultdict(list)  # location_key -> [(aff_with_pmid, primary_aff)]
        
        for location_key, auth_list in location_key_to_authorships.items():
            cached = cached_locations.get(location_key)
            
            if cached:
                # Cache hit - check if coordinates are valid
                if cached.latitude is not None and cached.longitude is not None:
                    stats["geocoding_cache_hits"] += len(auth_list)
                    
                    # Collect affiliations to update (batch update later)
                    for auth in auth_list:
                        try:
                            aff_list = json.loads(auth.affiliations_raw) if auth.affiliations_raw else []
                            primary_aff = aff_list[0] if aff_list else (auth.affiliation_raw_joined or "")
                        except (json.JSONDecodeError, IndexError, AttributeError):
                            primary_aff = auth.affiliation_raw_joined or ""
                        
                        if primary_aff:
                            aff_with_pmid = f"{primary_aff} (PMID: {auth.pmid})"
                            location_keys_to_update_affiliations[location_key].append((aff_with_pmid, primary_aff))
                else:
                    # Optimization 5: Cache hit but coordinates are null - skip Nominatim
                    stats["geocoding_cache_hits"] += len(auth_list)
                    # Skip Nominatim call - these will be handled by LLM if needed
                    # Collect affiliations for LLM fix
                    for auth in auth_list:
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
            else:
                # Cache miss - collect for Nominatim geocoding (deduplicated)
                stats["geocoding_cache_misses"] += len(auth_list)
                # Store one example (country, city) for geocoding
                first_auth = auth_list[0]
                location_keys_to_geocode[location_key] = (first_auth.country, first_auth.city)
        
        # Optimization 2: Process unique location_keys with Nominatim (deduplicated)
        logger.info(f"   Processing {len(location_keys_to_geocode)} unique location keys via Nominatim...")
        geocoding_results: dict[str, tuple[float, float] | None] = {}
        
        # NEW: Build mapping of location_key to pending_institutions for validation
        location_to_pending_institutions: dict[str, list[dict]] = defaultdict(list)
        for inst in pending_institutions:
            if inst.get("country"):
                location_key = PostgresGeocoder.make_location_key(
                    inst["country"], 
                    inst.get("city")
                )
                location_to_pending_institutions[location_key].append(inst)
        
        for location_key, (country, city) in location_keys_to_geocode.items():
            # Use first affiliation from first authorship for cache
            first_auth = location_key_to_authorships[location_key][0]
            try:
                aff_list = json.loads(first_auth.affiliations_raw) if first_auth.affiliations_raw else []
                primary_aff = aff_list[0] if aff_list else (first_auth.affiliation_raw_joined or "")
            except (json.JSONDecodeError, IndexError, AttributeError):
                primary_aff = first_auth.affiliation_raw_joined or ""
            
            aff_for_cache = f"{primary_aff} (PMID: {first_auth.pmid})" if primary_aff else None
            coords = await self.geocoder.get_coordinates(country, city, affiliation=aff_for_cache)
            geocoding_results[location_key] = coords
            
            if coords:
                stats["nominatim_successes"] += len(location_key_to_authorships[location_key])
            else:
                stats["nominatim_failures"] += len(location_key_to_authorships[location_key])
                # Collect affiliations for LLM fix
                for auth in location_key_to_authorships[location_key]:
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
        
        # Optimization 4: Batch update affiliations in cache (for cache hits with valid coordinates)
        # Optimized: Update each location_key once with all its affiliations (instead of one call per affiliation)
        if location_keys_to_update_affiliations:
            total_affiliations = sum(len(aff_list) for aff_list in location_keys_to_update_affiliations.values())
            logger.info(f"   Batch updating {total_affiliations} affiliations for {len(location_keys_to_update_affiliations)} cached locations...")
            from config import settings
            from sqlalchemy import select
            
            async with db_manager.session() as session:
                # Batch update: process each location_key once with all its affiliations
                for location_key, aff_list in location_keys_to_update_affiliations.items():
                    cached = cached_locations[location_key]
                    try:
                        # Use SELECT FOR UPDATE to handle concurrent updates
                        result = await session.execute(
                            select(GeocodingCache)
                            .where(GeocodingCache.location_key == location_key)
                            .with_for_update()
                        )
                        existing = result.scalar_one_or_none()
                        
                        if existing:
                            # Update existing record - merge all affiliations at once
                            current_affiliations = existing.affiliations or []
                            affiliations_to_add = [aff_with_pmid for aff_with_pmid, _ in aff_list]
                            
                            # Add all new affiliations (deduplicate case-insensitively)
                            affiliation_lower_set = {aff.lower() for aff in current_affiliations}
                            for aff_with_pmid in affiliations_to_add:
                                if aff_with_pmid.lower() not in affiliation_lower_set:
                                    current_affiliations.append(aff_with_pmid)
                                    affiliation_lower_set.add(aff_with_pmid.lower())
                            
                            # Limit to max_affiliations (keep most recent)
                            if len(current_affiliations) > settings.geocoding_cache_max_affiliations:
                                current_affiliations = current_affiliations[-settings.geocoding_cache_max_affiliations:]
                            
                            existing.affiliations = current_affiliations
                        else:
                            # Should not happen (we already checked cache), but handle it anyway
                            logger.warning(f"Location key {location_key} not found in cache during update")
                    except Exception as e:
                        logger.debug(f"Failed to update affiliations for {location_key}: {e}")
                
                await session.commit()
                logger.info(f"   ✅ Batch updated affiliations for {len(location_keys_to_update_affiliations)} locations ({total_affiliations} total affiliations)")
        
        # NEW: Add validated institutions to institution_geo table
        # Only add institutions whose location was successfully geocoded
        if pending_institutions:
            logger.info("─" * 80)
            logger.info(f"🔧 VALIDATION STEP 4.5: Adding {len(pending_institutions)} pending institutions to institution_geo...")
            institutions_to_add = []
            for location_key, coords in geocoding_results.items():
                if coords:  # Geocoding succeeded - data is validated
                    # Find pending institutions for this location
                    pending_insts = location_to_pending_institutions.get(location_key, [])
                    for inst in pending_insts:
                        institutions_to_add.append({
                            "primary_name": inst["institution"],
                            "country": inst["country"],
                            "city": inst.get("city"),
                            "source": "auto_added",
                        })
                        stats["institutions_validated"] += 1
            
            # Batch add to institution_geo (with deduplication)
            if institutions_to_add:
                added_count = await self._batch_add_to_institution_geo(institutions_to_add)
                stats["institutions_added_to_geo_table"] = added_count
                logger.info(f"   ✅ Added {added_count} validated institutions to institution_geo table")
            else:
                logger.info(f"   ⚠️  No institutions passed geocoding validation")
        
        stats["error_affiliations"] = len(error_affiliations)
        stats["error_pmids"] = len(stats["error_pmids"])
        
        logger.info("─" * 80)
        logger.info(f"✅ VALIDATION STEP 2-4 COMPLETE: Geocoding validation finished")
        logger.info(f"   Total authorships checked: {stats['total_authorships']}")
        logger.info(f"   Cache hits (valid): {stats['geocoding_cache_hits']}")
        logger.info(f"   Cache misses: {stats['geocoding_cache_misses']}")
        logger.info(f"   Nominatim successes: {stats['nominatim_successes']}")
        logger.info(f"   Nominatim failures: {stats['nominatim_failures']}")
        logger.info(f"   Unique error affiliations: {stats['error_affiliations']}")
        logger.info(f"   Error PMIDs: {stats['error_pmids']}")
        if pending_institutions:
            logger.info(f"   Institutions validated and added: {stats['institutions_added_to_geo_table']}/{len(pending_institutions)}")
        
        # Step 5-7: Fix errors using LLM
        if error_affiliations:
            logger.info("─" * 80)
            logger.info(f"🔧 VALIDATION STEP 5: Fixing {len(error_affiliations)} error affiliations with LLM...")
            fix_stats = await self._fix_errors_with_llm(
                error_affiliations,
                project_id,
                run_id
            )
            stats["llm_fixes"] = fix_stats["fixed"]
            stats.update(fix_stats)
            logger.info("─" * 80)
            logger.info(f"✅ VALIDATION COMPLETE - Run: {run_id}")
            logger.info(f"   LLM fallback extractions: {stats['llm_fixes']}")
            logger.info(f"   affiliation_cache table updated by LLM: {fix_stats.get('affiliation_cache_updated', 0)}")
            logger.info(f"   Authorship records updated: {fix_stats.get('authorship_updates', 0)}")
            logger.info(f"   geocoding_cache table updated: {fix_stats.get('geocoding_updates', 0)}")
            logger.info("─" * 80)
        else:
            logger.info("─" * 80)
            logger.info(f"✅ VALIDATION COMPLETE - Run: {run_id}")
            logger.info(f"   No errors found - all geocoding successful")
            logger.info("─" * 80)
        
        return stats
    
    async def _batch_add_to_institution_geo(
        self, 
        institutions: list[dict]
    ) -> int:
        """
        Batch add institutions to institution_geo, with automatic deduplication.
        
        Args:
            institutions: List of institution dicts with keys: primary_name, country, city, source
        
        Returns:
            Number of institutions actually added (after deduplication)
        """
        from app.db.repository import InstitutionGeoRepository
        from app.phase2.text_utils import normalize_text
        
        added_count = 0
        async with db_manager.session() as session:
            repo = InstitutionGeoRepository(session)
            
            for inst in institutions:
                if not inst["primary_name"]:
                    continue
                
                # Check if it already exists (get_by_name will normalize internally)
                existing = await repo.get_by_name(inst["primary_name"])
                if not existing:
                    try:
                        normalized_name = normalize_text(inst["primary_name"])
                        if not normalized_name:
                            continue
                        
                        await repo.insert_institution(
                            primary_name=inst["primary_name"],
                            normalized_name=normalized_name,
                            country=inst["country"],
                            city=inst.get("city"),
                            source=inst.get("source", "auto_added"),
                        )
                        added_count += 1
                    except Exception as e:
                        logger.warning(f"Failed to add institution {inst['primary_name']}: {e}")
            
            await session.commit()
        
        return added_count
    
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
            "cache_updates": 0,  # Legacy name, kept for compatibility
            "affiliation_cache_updated": 0,  # New name, consistent with ingestion stats
            "authorship_updates": 0,
            "geocoding_updates": 0,
        }
        
        # Collect unique affiliations to fix
        affiliations_to_fix = list(error_affiliations.keys())
        logger.info(f"   Collecting {len(affiliations_to_fix)} unique error affiliations for LLM fix")
        
        # Extract using LLM
        logger.info(f"   Calling LLM extractor (batch size: 20)...")
        llm_results, llm_stats = await self.llm_extractor.extract_affiliations(
            affiliations_to_fix,
            cache_lookup=None  # Don't use cache, we're fixing cache errors
        )
        
        fix_stats["llm_batches"] = llm_stats.get("llm_calls", 0)
        logger.info(f"   LLM extraction complete: {len(llm_results)} results from {fix_stats['llm_batches']} LLM calls")
        
        if not llm_results:
            logger.warning("⚠️  LLM extraction returned no results")
            return fix_stats
        
        # Debug: Log sample LLM results for problematic affiliations
        problematic_keywords = ["Cambridge", "Morocco"]
        for aff_raw, geo in llm_results.items():
            if any(keyword.lower() in aff_raw.lower() for keyword in problematic_keywords):
                logger.debug(f"   LLM result for '{aff_raw[:100]}...': country={geo.country}, city={geo.city}, institution={geo.institution}")
        
        # Update affiliation_cache with LLM results
        logger.info(f"   Updating affiliation_cache with {len(llm_results)} LLM results...")
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
            fix_stats["cache_updates"] = len(llm_results)  # Legacy name
            fix_stats["affiliation_cache_updated"] = len(llm_results)  # New name
            logger.info(f"   ✅ Updated affiliation_cache table with {len(llm_results)} LLM results")
        
        # Update authorships and re-geocode
        logger.info(f"   Re-geocoding and updating authorships...")
        async with db_manager.session() as session:
            auth_repo = AuthorshipRepository(session)
            geo_cache_repo = GeocodingCacheRepository(session)
            
            updated_authorships = 0
            updated_geocodings = 0
            
            # Optimization: Group by location_key to avoid duplicate geocoding calls
            location_key_to_affiliations: dict[str, list[tuple[str, GeoData, set[str], set[int]]]] = defaultdict(list)
            # location_key -> [(affiliation_raw, geo, pmid_set, auth_id_set), ...]
            
            for affiliation_raw, (pmid_set, auth_id_set) in error_affiliations.items():
                if affiliation_raw not in llm_results:
                    continue  # LLM didn't return result for this affiliation
                
                geo = llm_results[affiliation_raw]
                
                if geo.country:
                    location_key = PostgresGeocoder.make_location_key(geo.country, geo.city)
                    location_key_to_affiliations[location_key].append((affiliation_raw, geo, pmid_set, auth_id_set))
            
            # Process each unique location_key once
            logger.info(f"   Processing {len(location_key_to_affiliations)} unique location keys for re-geocoding...")
            for location_key, aff_list in location_key_to_affiliations.items():
                # Get first affiliation for representative affiliation text (for cache update)
                first_aff_raw, first_geo, first_pmid_set, _ = aff_list[0]
                pmid_list = sorted(first_pmid_set) if first_pmid_set else []
                if pmid_list:
                    pmid_str = ", ".join(pmid_list)
                    aff_for_cache = f"{first_aff_raw} (PMIDs: {pmid_str})"
                else:
                    aff_for_cache = first_aff_raw
                
                # Geocode once per location_key (deduplicated)
                coords = await self.geocoder.get_coordinates(
                    first_geo.country,
                    first_geo.city,
                    affiliation=aff_for_cache
                )
                
                if coords:
                    updated_geocodings += 1
                
                # Update all authorships for all affiliations with this location_key
                for affiliation_raw, geo, pmid_set, auth_id_set in aff_list:
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
            
            logger.info(f"   ✅ Fixed {fix_stats['fixed']} affiliations")
            logger.info(f"   ✅ Updated {updated_authorships} authorships")
            logger.info(f"   ✅ Re-geocoded {updated_geocodings} locations")
        
        return fix_stats

