-- ========================================
-- SIMPLE VERSION: Update China (Mainland) to China
-- ========================================
-- This is a simplified version that assumes you want to:
-- 1. Keep existing 'China' records as-is
-- 2. Delete 'China (Mainland)' records that would conflict
-- 3. Update remaining 'China (Mainland)' to 'China'
--
-- WARNING: This will DELETE conflicting 'China (Mainland)' records!
-- Use fix_china_mainland_country.sql for a merge strategy instead.
-- ========================================

BEGIN;

-- Delete 'China (Mainland)' records that would conflict with existing 'China' records
-- (same normalized_name + city combination)
DELETE FROM institution_geo
WHERE country = 'China (Mainland)'
AND EXISTS (
    SELECT 1 
    FROM institution_geo c
    WHERE c.country = 'China'
    AND c.normalized_name = institution_geo.normalized_name
    AND (c.city = institution_geo.city OR (c.city IS NULL AND institution_geo.city IS NULL))
);

-- Update remaining 'China (Mainland)' records to 'China'
UPDATE institution_geo
SET country = 'China'
WHERE country = 'China (Mainland)';

-- Verify the results
SELECT 
    'AFTER UPDATE - Total China records' as status,
    COUNT(*) as count
FROM institution_geo
WHERE country = 'China';

SELECT 
    'REMAINING - Should be 0' as status,
    COUNT(*) as count
FROM institution_geo
WHERE country = 'China (Mainland)';

COMMIT;
