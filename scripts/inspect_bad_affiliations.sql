-- Inspect the original affiliations that led to bad city-country combinations

-- Check "Geosciences, China"
SELECT 
    pmid,
    author_name_raw,
    affiliation_raw_joined,
    institution,
    city,
    country,
    affiliation_confidence
FROM authorship
WHERE city = 'Geosciences' AND country = 'China'
LIMIT 5;

-- Check "and Diabetes, United States"
SELECT 
    pmid,
    author_name_raw,
    affiliation_raw_joined,
    institution,
    city,
    country,
    affiliation_confidence
FROM authorship
WHERE city = 'and Diabetes' AND country = 'United States'
LIMIT 5;

-- Check "Fuxing Road No. 28, China" (street address as city)
SELECT 
    pmid,
    author_name_raw,
    affiliation_raw_joined,
    institution,
    city,
    country,
    affiliation_confidence
FROM authorship
WHERE city = 'Fuxing Road No. 28' AND country = 'China'
LIMIT 5;

-- Check "You An Men, China"
SELECT 
    pmid,
    author_name_raw,
    affiliation_raw_joined,
    institution,
    city,
    country,
    affiliation_confidence
FROM authorship
WHERE city = 'You An Men' AND country = 'China'
LIMIT 5;

-- Check "Boston, Germany"
SELECT 
    pmid,
    author_name_raw,
    affiliation_raw_joined,
    institution,
    city,
    country,
    affiliation_confidence
FROM authorship
WHERE city = 'Boston' AND country = 'Germany'
LIMIT 5;
