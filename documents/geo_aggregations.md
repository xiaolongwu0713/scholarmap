This document contains implementation of the aggregation layer and APIs for an academic map with drill-down levels:

1) World level: country -> scholar count
2) Country level: city -> scholar count + institution count
3) City level: institution -> scholar count
4) Institution level: scholar list (name, paper_count, career_start_year, career_end_year)

All aggregations MUST derive from the `authorship` fact table.

============================================================
A. ASSUMED TABLES
============================================================

authorship (fact)
- authorship_id
- pmid
- author_id (must be populated by disambiguation; until then use author_name_raw+affiliation as fallback key)
- author_name_raw
- year
- institution_id (nullable)
- country (nullable)
- city (nullable)
- affiliation_confidence (high/medium/low/none)

authors (dimension)
- author_id (PK)
- author_name_display (text)

institutions (dimension)
- institution_id (PK)
- institution_name (text)
- ror_id (nullable)
- lat (nullable)
- lon (nullable)
- city (nullable)
- country (nullable)

NOTE:
For MVP, country/city may be stored on authorship rows directly.
For production, country/city should come from institutions table (ROR-backed).

============================================================
B. DATA QUALITY RULES (MUST IMPLEMENT)
============================================================

Scholar counting must use:
- COUNT(DISTINCT author_id) when author_id exists
- If author_id is null (early MVP), use a deterministic fallback scholar_key:
    scholar_key = normalize(author_name_raw) + '|' + normalize(institution_id or affiliation_raw_joined) + '|' + normalize(country)
  and count distinct scholar_key.

Avoid double counting due to multi-affiliation:
- If a single authorship row has multiple affiliations and you split them into multiple institution links,
  you MUST define a consistent assignment policy:
  Policy options:
    1) primary affiliation only (recommended MVP)
    2) fractional counting across affiliations
Choose one and document it; default to primary affiliation only.

Filtering by confidence:
- Default analytics should include high + low, but allow excluding low/none via parameter.
- Provide metrics endpoints to report % missing affiliation and % low confidence.

============================================================
C. REQUIRED PRECOMPUTED AGGREGATION VIEWS/TABLES
============================================================

To make drill-down fast, implement materialized views or cached tables:

1) agg_world_country
- country
- scholar_count
- paper_count (distinct pmid)
- institution_count (distinct institution_id)

2) agg_country_city
- country
- city
- scholar_count
- institution_count
- lat/lon (city center or computed from institutions if available)

3) agg_city_institution
- country
- city
- institution_id
- institution_name
- scholar_count
- lat/lon

4) agg_institution_scholars
- institution_id
- author_id / scholar_key
- author_name_display
- paper_count
- career_start_year
- career_end_year

Update strategy:
- rebuild aggregates incrementally after ingestion OR nightly refresh.

============================================================
D. SQL LOGIC (POSTGRES PREFERRED)
============================================================

Provide SQL for each aggregation using authorship as the source of truth.

World (by country):
- scholar_count = distinct authors
- paper_count = distinct pmid

Country -> city:
- scholar_count distinct authors within country grouped by city
- institution_count distinct institution_id within that city

City -> institution:
- scholar_count distinct authors grouped by institution_id

Institution -> scholar list:
- paper_count = count of authorship rows for that scholar in that institution
- career_start_year = MIN(year)
- career_end_year = MAX(year)

If year is null, ignore it in min/max.

============================================================
E. REQUIRED API ENDPOINTS
============================================================

Implement REST endpoints returning JSON.

1) GET /map/world
Response:
[
  { "country": "United States", "scholar_count": 123, "paper_count": 88, "institution_count": 40 }
]

2) GET /map/country?country=US
Response:
[
  { "country": "US", "city": "Boston", "scholar_count": 30, "institution_count": 12, "lat": ..., "lon": ... }
]

3) GET /map/city?country=US&city=Boston
Response:
[
  { "institution_id": "...", "institution_name": "...", "scholar_count": 12, "lat": ..., "lon": ... }
]

4) GET /map/institution?institution_id=...
Response:
[
  { "author_id": "...", "name": "...", "paper_count": 5, "career_start_year": 2018, "career_end_year": 2024 }
]

Support optional query params:
- min_confidence=high|low|none (default include high+low)
- year_from / year_to for time slicing (optional but recommended)
- limit/offset for institution scholar list pagination

============================================================
F. DELIVERABLES
============================================================

Return:
1) Postgres schema migrations for required tables (authorship, institutions, authors)
2) SQL for aggregates (views/materialized views)
3) Python (FastAPI preferred) implementation of the 4 endpoints
4) A brief note on how the system updates aggregates after new ingestion
