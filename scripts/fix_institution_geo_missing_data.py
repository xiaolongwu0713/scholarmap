#!/usr/bin/env python3
"""Fix missing city or country data in institution_geo table using LLM.

This script:
1. Finds records in institution_geo where city or country is null
2. Calls LLM in batches of 10 to complete missing geographic data
3. Updates records only if LLM is confident (confidence: high or medium)
4. Updates source field to "LLM+confidence_level"

Usage:
    实际运行（默认 batch size = 10）
    python scripts/fix_institution_geo_missing_data.py
    python scripts/fix_institution_geo_missing_data.py --dry-run
    python scripts/fix_institution_geo_missing_data.py --batch-size 5
    限制处理数量（用于测试，例如只处理前 20 条）
    python scripts/fix_institution_geo_missing_data.py --limit 20
"""

import argparse
import asyncio
import json
import logging
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(backend_dir.parent))

import config
from app.db.connection import db_manager
from app.db.models import InstitutionGeo
from app.db.repository import InstitutionGeoRepository
from app.phase1.llm import OpenAIClient
from sqlalchemy import select, or_


# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def read_prompt_template() -> str:
    """Read the prompt template from file."""
    prompt_path = Path(__file__).parent.parent / "prompts" / "institution_geo_completion.md"
    if not prompt_path.exists():
        logger.error(f"Prompt file not found: {prompt_path}")
        sys.exit(1)
    return prompt_path.read_text(encoding='utf-8')


async def get_incomplete_records(session) -> list[InstitutionGeo]:
    """Get all records where city or country is null."""
    result = await session.execute(
        select(InstitutionGeo).where(
            or_(
                InstitutionGeo.city.is_(None),
                InstitutionGeo.country.is_(None)
            )
        ).order_by(InstitutionGeo.institution_id)
    )
    return list(result.scalars().all())


async def call_llm_for_completion(
    llm_client: OpenAIClient,
    institutions: list[InstitutionGeo],
    prompt_template: str
) -> list[dict]:
    """Call LLM to complete missing geographic data for a batch of institutions.
    
    Args:
        llm_client: OpenAI client
        institutions: List of InstitutionGeo records with missing data
        prompt_template: Prompt template string
    
    Returns:
        List of dicts with keys: country, city, confidence
    """
    # Prepare input data for LLM
    input_data = []
    for inst in institutions:
        input_data.append({
            "primary_name": inst.primary_name,
            "country": inst.country if inst.country else None,
            "city": inst.city if inst.city else None
        })
    
    # Format prompt with input data
    user_text = f"""Please complete the missing geographic data for the following institutions:

{json.dumps(input_data, indent=2, ensure_ascii=False)}

Return a JSON array with the same length, where each element contains the completed geographic data and confidence level."""

    full_prompt = f"""{prompt_template}

{user_text}"""
    
    try:
        # Use _chat_json for structured JSON output
        response = await llm_client._chat_json(
            system_prompt=prompt_template,
            user_text=user_text,
            temperature=0.0,
            log_context={
                "script": "fix_institution_geo_missing_data",
                "batch_size": len(institutions),
                "institution_ids": [inst.institution_id for inst in institutions]
            }
        )
        
        # Validate response format
        if not isinstance(response, list):
            logger.error(f"LLM returned non-list response: {type(response)}")
            return []
        
        if len(response) != len(institutions):
            logger.warning(
                f"LLM returned {len(response)} results for {len(institutions)} institutions. "
                "Padding or truncating to match."
            )
            # Pad or truncate
            while len(response) < len(institutions):
                response.append({"country": None, "city": None, "confidence": "low"})
            response = response[:len(institutions)]
        
        # Validate each result
        validated_response = []
        for i, item in enumerate(response):
            if not isinstance(item, dict):
                logger.warning(f"Invalid response item {i}: {type(item)}, skipping")
                validated_response.append({"country": None, "city": None, "confidence": "low"})
                continue
            
            validated_item = {
                "country": item.get("country") if item.get("country") else None,
                "city": item.get("city") if item.get("city") else None,
                "confidence": item.get("confidence", "low")
            }
            
            # Validate confidence value
            if validated_item["confidence"] not in ["high", "medium", "low"]:
                logger.warning(f"Invalid confidence value: {validated_item['confidence']}, defaulting to 'low'")
                validated_item["confidence"] = "low"
            
            validated_response.append(validated_item)
        
        return validated_response
        
    except Exception as e:
        logger.error(f"LLM call failed: {e}", exc_info=True)
        # Return low-confidence results to skip updates
        return [
            {"country": None, "city": None, "confidence": "low"}
            for _ in institutions
        ]


async def update_records(
    session,
    institutions: list[InstitutionGeo],
    completions: list[dict],
    dry_run: bool = False
) -> tuple[int, int, int]:
    """Update institution records with LLM-completed data.
    
    Args:
        session: Database session
        institutions: List of InstitutionGeo records
        completions: List of completion results from LLM
        dry_run: If True, don't actually update
    
    Returns:
        Tuple of (updated_count, skipped_count, error_count)
    """
    updated_count = 0
    skipped_count = 0
    error_count = 0
    
    for inst, completion in zip(institutions, completions):
        try:
            # Only update if confidence is high or medium
            if completion["confidence"] not in ["high", "medium"]:
                logger.debug(
                    f"Skipping {inst.primary_name} (institution_id={inst.institution_id}): "
                    f"confidence too low ({completion['confidence']})"
                )
                skipped_count += 1
                continue
            
            # Determine what to update
            updates = {}
            needs_update = False
            
            # Update country if missing and LLM provided it
            if inst.country is None and completion["country"]:
                updates["country"] = completion["country"]
                needs_update = True
            
            # Update city if missing and LLM provided it
            if inst.city is None and completion["city"]:
                updates["city"] = completion["city"]
                needs_update = True
            
            if not needs_update:
                logger.debug(f"No update needed for {inst.primary_name} (institution_id={inst.institution_id})")
                skipped_count += 1
                continue
            
            # Update source field: set to "LLM_{confidence_level}" as requested
            # This replaces the existing source to track that this record was updated by LLM
            new_source = f"LLM_{completion['confidence']}"
            updates["source"] = new_source
            
            if dry_run:
                logger.info(
                    f"DRY RUN: Would update institution_id={inst.institution_id} ({inst.primary_name}): "
                    f"{updates}"
                )
            else:
                # Update the record
                for key, value in updates.items():
                    setattr(inst, key, value)
                
                logger.info(
                    f"Updated institution_id={inst.institution_id} ({inst.primary_name}): "
                    f"country={updates.get('country', 'unchanged')}, "
                    f"city={updates.get('city', 'unchanged')}, "
                    f"source={updates['source']}"
                )
            
            updated_count += 1
            
        except Exception as e:
            logger.error(
                f"Error updating institution_id={inst.institution_id} ({inst.primary_name}): {e}",
                exc_info=True
            )
            error_count += 1
    
    if not dry_run and updated_count > 0:
        await session.commit()
    
    return updated_count, skipped_count, error_count


async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Fix missing city or country data in institution_geo table using LLM"
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be updated without actually updating'
    )
    parser.add_argument(
        '--batch-size',
        type=int,
        default=10,
        help='Number of records to process per LLM batch (default: 10)'
    )
    parser.add_argument(
        '--limit',
        type=int,
        default=None,
        help='Maximum number of records to process (for testing)'
    )
    
    args = parser.parse_args()
    
    # Initialize database manager
    db_manager.initialize(config.settings.database_url)
    
    try:
        async with db_manager.session() as session:
            # Get incomplete records
            logger.info("Finding records with missing city or country...")
            incomplete_records = await get_incomplete_records(session)
            
            if not incomplete_records:
                logger.info("✅ No records with missing city or country found!")
                return
            
            logger.info(f"Found {len(incomplete_records)} records with missing data")
            
            # Apply limit if specified
            if args.limit:
                incomplete_records = incomplete_records[:args.limit]
                logger.info(f"Processing limited to {len(incomplete_records)} records")
            
            # Read prompt template
            prompt_template = read_prompt_template()
            
            # Initialize LLM client
            llm_client = OpenAIClient()
            logger.info(f"Using LLM model: {llm_client.model}")
            
            # Process in batches
            batch_size = args.batch_size
            total_batches = (len(incomplete_records) + batch_size - 1) // batch_size
            
            total_updated = 0
            total_skipped = 0
            total_errors = 0
            
            for batch_idx in range(0, len(incomplete_records), batch_size):
                batch = incomplete_records[batch_idx:batch_idx + batch_size]
                batch_num = batch_idx // batch_size + 1
                
                logger.info(f"\n{'='*60}")
                logger.info(f"Processing batch {batch_num}/{total_batches} ({len(batch)} records)")
                logger.info(f"{'='*60}")
                
                # Call LLM for completion
                logger.info("Calling LLM to complete missing data...")
                completions = await call_llm_for_completion(llm_client, batch, prompt_template)
                
                # Log LLM results
                for inst, completion in zip(batch, completions):
                    logger.debug(
                        f"  {inst.primary_name} (id={inst.institution_id}): "
                        f"country={completion['country']}, "
                        f"city={completion['city']}, "
                        f"confidence={completion['confidence']}"
                    )
                
                # Update records
                logger.info("Updating records...")
                updated, skipped, errors = await update_records(
                    session, batch, completions, dry_run=args.dry_run
                )
                
                total_updated += updated
                total_skipped += skipped
                total_errors += errors
                
                logger.info(
                    f"Batch {batch_num} complete: {updated} updated, {skipped} skipped, {errors} errors"
                )
                
                # Small delay between batches to avoid rate limiting
                if batch_idx + batch_size < len(incomplete_records):
                    await asyncio.sleep(1)
            
            # Summary
            logger.info(f"\n{'='*60}")
            logger.info("SUMMARY")
            logger.info(f"{'='*60}")
            logger.info(f"Total records processed: {len(incomplete_records)}")
            logger.info(f"Records updated: {total_updated}")
            logger.info(f"Records skipped (low confidence or no change): {total_skipped}")
            logger.info(f"Records with errors: {total_errors}")
            
            if args.dry_run:
                logger.info("\n⚠️  DRY RUN MODE - No actual updates were made")
            else:
                logger.info("\n✅ All updates completed successfully!")
    
    finally:
        if db_manager._session_factory:
            await db_manager.close()


if __name__ == '__main__':
    asyncio.run(main())
