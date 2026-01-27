-- Clean invalid geocoding cache entries
-- Run this SQL script to delete cached entries with incorrect city-country combinations

-- Known invalid combinations from the logs
DELETE FROM geocoding_cache WHERE location_key IN (
    'city:Boston,Germany',
    'city:Boston,Israel',
    'city:Boston,Italy',
    'city:Baltimore,Japan',
    'city:San Francisco,Andorra',
    'city:San Francisco,South Korea',
    'city:Stanford,Canada',
    'city:Stanford,Australia',
    'city:New York,Singapore',
    'city:Seattle,Taiwan',
    'city:Italy,Andorra',
    'city:Australia,Singapore',
    'city:Geosciences,China',  -- Invalid city name
    'city:and Diabetes,United States',  -- Invalid city name
    'city:Fuxing Road No. 28,China',  -- Street address, not city
    'city:415 Fengyang Road,China',  -- Street address, not city
    'city:You An Men,China'  -- District/area, not city
);

-- Show deleted count
SELECT COUNT(*) as deleted_count FROM geocoding_cache WHERE 1=0;

-- Show remaining suspicious entries (US cities in non-US countries)
SELECT 
    location_key,
    latitude,
    longitude,
    affiliations,
    created_at
FROM geocoding_cache 
WHERE location_key LIKE 'city:%'
AND (
    (location_key ILIKE '%boston,%' AND location_key NOT ILIKE '%united states%')
    OR (location_key ILIKE '%new york,%' AND location_key NOT ILIKE '%united states%')
    OR (location_key ILIKE '%san francisco,%' AND location_key NOT ILIKE '%united states%')
    OR (location_key ILIKE '%baltimore,%' AND location_key NOT ILIKE '%united states%')
    OR (location_key ILIKE '%stanford,%' AND location_key NOT ILIKE '%united states%')
    OR (location_key ILIKE '%seattle,%' AND location_key NOT ILIKE '%united states%')
)
ORDER BY location_key;
