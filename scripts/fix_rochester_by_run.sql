-- Fix Rochester department-only records for specific run
-- Run ID: 1893fb47f453

-- Step 1: Check which PMIDs belong to this run and have department-only in Rochester
SELECT 
    a.pmid,
    a.author_name_raw,
    a.institution,
    a.affiliation_confidence,
    LEFT(a.affiliation_raw_joined, 80) as affiliation_short
FROM authorship a
INNER JOIN run_papers rp ON a.pmid = rp.pmid
WHERE rp.run_id = '1893fb47f453'
  AND a.country = 'United States'
  AND a.city = 'Rochester'
  AND a.institution ~ '^Department of'
  AND a.institution NOT LIKE '%University%'
  AND a.institution NOT LIKE '%Hospital%'
  AND a.institution NOT LIKE '%Mayo%'
  AND a.institution NOT LIKE '%Institute%'
  AND a.institution NOT LIKE '%College%'
ORDER BY a.institution, a.pmid
LIMIT 20;

-- Step 2: Get unique affiliations to check
SELECT DISTINCT 
    a.affiliation_raw_joined,
    a.institution,
    COUNT(*) as author_count
FROM authorship a
INNER JOIN run_papers rp ON a.pmid = rp.pmid
WHERE rp.run_id = '1893fb47f453'
  AND a.country = 'United States'
  AND a.city = 'Rochester'
  AND a.institution ~ '^Department of'
  AND a.institution NOT LIKE '%University%'
  AND a.institution NOT LIKE '%Hospital%'
  AND a.institution NOT LIKE '%Mayo%'
  AND a.institution NOT LIKE '%Institute%'
  AND a.institution NOT LIKE '%College%'
GROUP BY a.affiliation_raw_joined, a.institution
ORDER BY author_count DESC;

-- Step 3: Force re-validation for these records
BEGIN;

-- Delete their cache entries
DELETE FROM affiliation_cache
WHERE affiliation_raw IN (
    SELECT DISTINCT a.affiliation_raw_joined
    FROM authorship a
    INNER JOIN run_papers rp ON a.pmid = rp.pmid
    WHERE rp.run_id = '1893fb47f453'
      AND a.country = 'United States'
      AND a.city = 'Rochester'
      AND a.institution ~ '^Department of'
      AND a.institution NOT LIKE '%University%'
      AND a.institution NOT LIKE '%Hospital%'
      AND a.institution NOT LIKE '%Mayo%'
      AND a.institution NOT LIKE '%Institute%'
      AND a.institution NOT LIKE '%College%'
);

-- Mark for re-validation
UPDATE authorship a
SET affiliation_confidence = 'none'
FROM run_papers rp
WHERE a.pmid = rp.pmid
  AND rp.run_id = '1893fb47f453'
  AND a.country = 'United States'
  AND a.city = 'Rochester'
  AND a.institution ~ '^Department of'
  AND a.institution NOT LIKE '%University%'
  AND a.institution NOT LIKE '%Hospital%'
  AND a.institution NOT LIKE '%Mayo%'
  AND a.institution NOT LIKE '%Institute%'
  AND a.institution NOT LIKE '%College%';

COMMIT;

-- Verify
SELECT COUNT(*) as marked_for_revalidation
FROM authorship a
INNER JOIN run_papers rp ON a.pmid = rp.pmid
WHERE rp.run_id = '1893fb47f453'
  AND a.affiliation_confidence = 'none';

