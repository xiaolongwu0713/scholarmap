-- Query institutions updated by LLM
-- These records have source field starting with 'LLM_'
-- Examples: 'LLM_high', 'LLM_medium'

-- Basic query: Get all LLM-updated records
SELECT 
    institution_id,
    primary_name,
    normalized_name,
    country,
    city,
    qs_rank,
    source,
    created_at,
    updated_at
FROM institution_geo
WHERE source LIKE 'LLM_%'
ORDER BY updated_at DESC;

-- Query with confidence level breakdown
SELECT 
    source AS confidence_level,
    COUNT(*) AS count,
    COUNT(CASE WHEN country IS NULL THEN 1 END) AS missing_country,
    COUNT(CASE WHEN city IS NULL THEN 1 END) AS missing_city
FROM institution_geo
WHERE source LIKE 'LLM_%'
GROUP BY source
ORDER BY source;

-- Query LLM-updated records that still have missing data (shouldn't happen, but useful for verification)
SELECT 
    institution_id,
    primary_name,
    country,
    city,
    source,
    updated_at
FROM institution_geo
WHERE source LIKE 'LLM_%'
    AND (country IS NULL OR city IS NULL)
ORDER BY updated_at DESC;

-- Query LLM-updated records with complete data
SELECT 
    institution_id,
    primary_name,
    country,
    city,
    source,
    updated_at
FROM institution_geo
WHERE source LIKE 'LLM_%'
    AND country IS NOT NULL
    AND city IS NOT NULL
ORDER BY updated_at DESC;

-- Query summary: Total LLM-updated vs other sources
SELECT 
    CASE 
        WHEN source LIKE 'LLM_%' THEN 'LLM Updated'
        ELSE COALESCE(source, 'Unknown')
    END AS source_category,
    COUNT(*) AS total_count,
    COUNT(CASE WHEN country IS NOT NULL THEN 1 END) AS with_country,
    COUNT(CASE WHEN city IS NOT NULL THEN 1 END) AS with_city,
    COUNT(CASE WHEN country IS NOT NULL AND city IS NOT NULL THEN 1 END) AS complete
FROM institution_geo
GROUP BY source_category
ORDER BY total_count DESC;
