-- ========================================
-- FIX SQL for: country='Morocco', city='U.S.A'
-- ========================================

-- Step 1: Delete incorrect authorship records
-- CAUTION: This will delete the records. Review carefully!
-- Recommended: Re-run ingestion instead to regenerate correct data

DELETE FROM authorship
WHERE country = 'Morocco'
  AND city = 'U.S.A';
-- Affected PMIDs: 38306217
-- Total records: 1

-- Step 2: Delete incorrect affiliation_cache entries
DELETE FROM affiliation_cache
WHERE country = 'Morocco'
  AND city = 'U.S.A';
-- Total entries: 1

-- Step 4: Delete incorrect geocoding_cache entry
DELETE FROM geocoding_cache
WHERE location_key = 'city:U.S.A,Morocco';

-- ========================================
-- RECOMMENDED NEXT STEPS
-- ========================================
-- 1. Review and execute the above SQL statements
-- 2. Re-run ingestion to regenerate correct data:
--    python scripts/trigger_ingestion.py <project_id> <run_id> --email <email> --password <password>
-- 3. The new delayed-add mechanism will prevent adding incorrect data to institution_geo