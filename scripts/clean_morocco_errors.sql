-- Clean up erroneous Morocco entries in institution_geo table
-- These were caused by the bug where "MA" (Massachusetts) was interpreted as Morocco

-- Step 1: Identify suspicious entries
-- These are US institutions that were incorrectly marked as Morocco
SELECT 
    institution_id,
    primary_name,
    normalized_name,
    country,
    city,
    source,
    created_at
FROM institution_geo
WHERE country = 'Morocco'
  AND source = 'auto_added'
  AND (
    primary_name ILIKE '%MIT%'
    OR primary_name ILIKE '%Massachusetts%'
    OR primary_name ILIKE '%Harvard%'
    OR primary_name ILIKE '%Cambridge%'
    OR primary_name ILIKE '%Boston%'
    OR city ILIKE '%Cambridge%'
    OR city ILIKE '%Boston%'
  )
ORDER BY created_at DESC;

-- Step 2: Delete these erroneous entries
-- CAUTION: Review the above SELECT results before running this DELETE!
DELETE FROM institution_geo
WHERE country = 'Morocco'
  AND source = 'auto_added'
  AND (
    primary_name ILIKE '%MIT%'
    OR primary_name ILIKE '%Massachusetts%'
    OR primary_name ILIKE '%Harvard%'
    OR primary_name ILIKE '%Cambridge%'
    OR primary_name ILIKE '%Boston%'
    OR city ILIKE '%Cambridge%'
    OR city ILIKE '%Boston%'
  );

-- Step 3: Clean up affiliation_cache (already truncated by user, but for reference)
-- DELETE FROM affiliation_cache
-- WHERE country = 'Morocco'
--   AND affiliation_raw ILIKE '%MA%02139%';

-- Step 4: Verify cleanup
SELECT 
    COUNT(*) as remaining_morocco_entries
FROM institution_geo
WHERE country = 'Morocco'
  AND source = 'auto_added';
