-- ========================================
-- FIX SQL for: country='China (Mainland)' -> 'China'
-- ========================================
-- This script handles potential duplicates when updating country name
-- from 'China (Mainland)' to 'China' in institution_geo table

BEGIN;

-- Step 1: Identify potential conflicts
-- These are records where changing 'China (Mainland)' to 'China' would create
-- a duplicate (same normalized_name + country + city combination)
CREATE TEMP TABLE china_mainland_conflicts AS
SELECT 
    cm.institution_id as mainland_id,
    cm.primary_name as mainland_primary_name,
    cm.normalized_name as mainland_normalized_name,
    cm.city as mainland_city,
    cm.aliases as mainland_aliases,
    cm.qs_rank as mainland_qs_rank,
    cm.ror_id as mainland_ror_id,
    cm.source as mainland_source,
    c.institution_id as china_id,
    c.primary_name as china_primary_name,
    c.normalized_name as china_normalized_name,
    c.city as china_city,
    c.aliases as china_aliases,
    c.qs_rank as china_qs_rank,
    c.ror_id as china_ror_id,
    c.source as china_source
FROM institution_geo cm
INNER JOIN institution_geo c 
    ON cm.normalized_name = c.normalized_name
    AND (cm.city = c.city OR (cm.city IS NULL AND c.city IS NULL))
    AND c.country = 'China'
WHERE cm.country = 'China (Mainland)';

-- Step 2: Display conflicts for review
SELECT 
    'CONFLICT FOUND' as status,
    mainland_id,
    mainland_primary_name,
    mainland_city,
    mainland_qs_rank,
    mainland_source,
    china_id,
    china_primary_name,
    china_city,
    china_qs_rank,
    china_source
FROM china_mainland_conflicts;

-- Step 3: Handle conflicts by merging records
-- Strategy: Keep the 'China' record, merge aliases from 'China (Mainland)' record, then delete 'China (Mainland)' record

UPDATE institution_geo
SET aliases = COALESCE(aliases, '[]'::jsonb) || COALESCE(
    (SELECT mainland_aliases FROM china_mainland_conflicts WHERE china_id = institution_geo.institution_id),
    '[]'::jsonb
),
    -- Update QS rank if the mainland record has a better (lower) rank
    qs_rank = CASE 
        WHEN (SELECT mainland_qs_rank FROM china_mainland_conflicts WHERE china_id = institution_geo.institution_id) IS NOT NULL
             AND (qs_rank IS NULL OR (SELECT mainland_qs_rank FROM china_mainland_conflicts WHERE china_id = institution_geo.institution_id) < qs_rank)
        THEN (SELECT mainland_qs_rank FROM china_mainland_conflicts WHERE china_id = institution_geo.institution_id)
        ELSE qs_rank
    END,
    -- Update ROR ID if missing
    ror_id = CASE 
        WHEN ror_id IS NULL
        THEN (SELECT mainland_ror_id FROM china_mainland_conflicts WHERE china_id = institution_geo.institution_id)
        ELSE ror_id
    END
WHERE institution_id IN (SELECT china_id FROM china_mainland_conflicts);

-- Step 4: Delete the conflicting 'China (Mainland)' records
DELETE FROM institution_geo
WHERE institution_id IN (SELECT mainland_id FROM china_mainland_conflicts);

-- Step 5: Update remaining 'China (Mainland)' records to 'China' (no conflicts)
UPDATE institution_geo
SET country = 'China'
WHERE country = 'China (Mainland)';

-- Step 6: Verify the update
SELECT 
    'AFTER UPDATE' as status,
    COUNT(*) as total_china_records
FROM institution_geo
WHERE country = 'China';

SELECT 
    'REMAINING MAINLAND' as status,
    COUNT(*) as remaining_mainland_records
FROM institution_geo
WHERE country = 'China (Mainland)';

-- Clean up temp table
DROP TABLE china_mainland_conflicts;

COMMIT;

-- ========================================
-- VERIFICATION QUERIES (run separately after commit)
-- ========================================
-- Check for any remaining 'China (Mainland)' records
-- SELECT * FROM institution_geo WHERE country = 'China (Mainland)';

-- Check all China records
-- SELECT institution_id, primary_name, normalized_name, country, city, qs_rank, source 
-- FROM institution_geo 
-- WHERE country = 'China' 
-- ORDER BY qs_rank NULLS LAST, primary_name;
