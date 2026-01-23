-- Normalize country names in database
-- This script updates all tables to use standardized country names
-- Run this after updating the COUNTRY_NORMALIZATIONS mapping in rule_based_extractor.py

BEGIN;

-- Update authorship table
UPDATE authorship 
SET country = 'Iran'
WHERE country = 'Iran, Islamic Republic of';

UPDATE authorship 
SET country = 'South Korea'
WHERE country = 'Korea, Republic of';

UPDATE authorship 
SET country = 'North Korea'
WHERE country = 'Korea, Democratic People''s Republic of';

UPDATE authorship 
SET country = 'Venezuela'
WHERE country = 'Venezuela, Bolivarian Republic of';

UPDATE authorship 
SET country = 'Tanzania'
WHERE country = 'Tanzania, United Republic of';

UPDATE authorship 
SET country = 'Bolivia'
WHERE country = 'Bolivia, Plurinational State of';

UPDATE authorship 
SET country = 'Moldova'
WHERE country = 'Moldova, Republic of';

UPDATE authorship 
SET country = 'North Macedonia'
WHERE country = 'Macedonia, the former Yugoslav Republic of';

UPDATE authorship 
SET country = 'Democratic Republic of the Congo'
WHERE country = 'Congo, the Democratic Republic of the';

UPDATE authorship 
SET country = 'Laos'
WHERE country = 'Lao People''s Democratic Republic';

UPDATE authorship 
SET country = 'Syria'
WHERE country = 'Syrian Arab Republic';

UPDATE authorship 
SET country = 'Vietnam'
WHERE country = 'Viet Nam';

-- Update affiliation_cache table
UPDATE affiliation_cache 
SET country = 'Iran'
WHERE country = 'Iran, Islamic Republic of';

UPDATE affiliation_cache 
SET country = 'South Korea'
WHERE country = 'Korea, Republic of';

UPDATE affiliation_cache 
SET country = 'North Korea'
WHERE country = 'Korea, Democratic People''s Republic of';

UPDATE affiliation_cache 
SET country = 'Venezuela'
WHERE country = 'Venezuela, Bolivarian Republic of';

UPDATE affiliation_cache 
SET country = 'Tanzania'
WHERE country = 'Tanzania, United Republic of';

UPDATE affiliation_cache 
SET country = 'Bolivia'
WHERE country = 'Bolivia, Plurinational State of';

UPDATE affiliation_cache 
SET country = 'Moldova'
WHERE country = 'Moldova, Republic of';

UPDATE affiliation_cache 
SET country = 'North Macedonia'
WHERE country = 'Macedonia, the former Yugoslav Republic of';

UPDATE affiliation_cache 
SET country = 'Democratic Republic of the Congo'
WHERE country = 'Congo, the Democratic Republic of the';

UPDATE affiliation_cache 
SET country = 'Laos'
WHERE country = 'Lao People''s Democratic Republic';

UPDATE affiliation_cache 
SET country = 'Syria'
WHERE country = 'Syrian Arab Republic';

UPDATE affiliation_cache 
SET country = 'Vietnam'
WHERE country = 'Viet Nam';

-- Update institution_geo table
UPDATE institution_geo 
SET country = 'Iran'
WHERE country = 'Iran, Islamic Republic of';

UPDATE institution_geo 
SET country = 'South Korea'
WHERE country = 'Korea, Republic of';

UPDATE institution_geo 
SET country = 'North Korea'
WHERE country = 'Korea, Democratic People''s Republic of';

UPDATE institution_geo 
SET country = 'Venezuela'
WHERE country = 'Venezuela, Bolivarian Republic of';

UPDATE institution_geo 
SET country = 'Tanzania'
WHERE country = 'Tanzania, United Republic of';

UPDATE institution_geo 
SET country = 'Bolivia'
WHERE country = 'Bolivia, Plurinational State of';

UPDATE institution_geo 
SET country = 'Moldova'
WHERE country = 'Moldova, Republic of';

UPDATE institution_geo 
SET country = 'North Macedonia'
WHERE country = 'Macedonia, the former Yugoslav Republic of';

UPDATE institution_geo 
SET country = 'Democratic Republic of the Congo'
WHERE country = 'Congo, the Democratic Republic of the';

UPDATE institution_geo 
SET country = 'Laos'
WHERE country = 'Lao People''s Democratic Republic';

UPDATE institution_geo 
SET country = 'Syria'
WHERE country = 'Syrian Arab Republic';

UPDATE institution_geo 
SET country = 'Vietnam'
WHERE country = 'Viet Nam';

-- Show summary of changes
SELECT 'authorship' as table_name, country, COUNT(*) as count
FROM authorship
WHERE country IN ('Iran', 'South Korea', 'North Korea', 'Venezuela', 'Tanzania', 
                  'Bolivia', 'Moldova', 'North Macedonia', 'Democratic Republic of the Congo',
                  'Laos', 'Syria', 'Vietnam')
GROUP BY country
ORDER BY count DESC;

SELECT 'affiliation_cache' as table_name, country, COUNT(*) as count
FROM affiliation_cache
WHERE country IN ('Iran', 'South Korea', 'North Korea', 'Venezuela', 'Tanzania',
                  'Bolivia', 'Moldova', 'North Macedonia', 'Democratic Republic of the Congo',
                  'Laos', 'Syria', 'Vietnam')
GROUP BY country
ORDER BY count DESC;

SELECT 'institution_geo' as table_name, country, COUNT(*) as count
FROM institution_geo
WHERE country IN ('Iran', 'South Korea', 'North Korea', 'Venezuela', 'Tanzania',
                  'Bolivia', 'Moldova', 'North Macedonia', 'Democratic Republic of the Congo',
                  'Laos', 'Syria', 'Vietnam')
GROUP BY country
ORDER BY count DESC;

COMMIT;

