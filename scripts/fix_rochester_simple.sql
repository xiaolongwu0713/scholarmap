-- Fix Rochester department-only records
BEGIN;

-- Delete cache for Rochester department-only
DELETE FROM affiliation_cache
WHERE city = 'Rochester'
  AND country = 'United States'
  AND institution ~ '^Department of'
  AND institution NOT LIKE '%University%'
  AND institution NOT LIKE '%Hospital%'
  AND institution NOT LIKE '%Mayo%'
  AND institution NOT LIKE '%Institute%'
  AND institution NOT LIKE '%College%';

-- Mark authorship records for re-validation
UPDATE authorship
SET affiliation_confidence = 'none'
WHERE city = 'Rochester'
  AND country = 'United States'
  AND institution ~ '^Department of'
  AND institution NOT LIKE '%University%'
  AND institution NOT LIKE '%Hospital%'
  AND institution NOT LIKE '%Mayo%'
  AND institution NOT LIKE '%Institute%'
  AND institution NOT LIKE '%College%';

COMMIT;

-- Show what needs re-validation
SELECT institution, COUNT(*) as count
FROM authorship
WHERE city = 'Rochester'
  AND country = 'United States'
  AND affiliation_confidence = 'none'
GROUP BY institution;

