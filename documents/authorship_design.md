authorship table specification.

============================================================
1. WHAT IS THE `authorship` TABLE
============================================================

The `authorship` table is NOT:
- an author table
- a paper table

It is a FACT TABLE representing the many-to-many relationship between
AUTHORS and PAPERS.

Each row represents:
    "One author’s authorship on one specific paper"

In bibliometrics, affiliation, institution, location, and time are
PROPERTIES OF AUTHORSHIP, not permanent properties of the author.

============================================================
2. WHY THE `authorship` TABLE IS REQUIRED
============================================================

Real-world relationships:
- One paper has multiple authors
- One author publishes multiple papers
- The same author can change institutions over time

Affiliation is paper-specific:
- An author may be at Institution A in 2018
- The same author may be at Institution B in 2023

Therefore:
- Affiliation MUST be stored at the authorship level
- Storing affiliation in the author table is WRONG

Without an authorship table, the system CANNOT:
- Build correct country / city / institution maps
- Count scholars per institution
- Track author career spans
- Handle cross-institution mobility
- Support drill-down visualization

============================================================
3. POSITION IN THE DATA MODEL
============================================================

Logical model:

    papers ──< authorship >── authors
                  |
                  v
            institutions → cities → countries

`authorship` is the central fact table from which ALL aggregations
and maps are derived.

============================================================
4. HOW THE `authorship` TABLE IS CREATED
============================================================

Source:
- PubMed EFetch XML (retmode=xml)

For each PubmedArticle:
- For each Author in AuthorList:
    - Create ONE authorship row

Affiliation extraction rules:
- Use Author/AffiliationInfo/Affiliation
- A single author may have MULTIPLE affiliations
- Preserve ALL raw affiliation strings
- If no author-level affiliation exists, mark it as missing
  (do NOT invent or overwrite data)

============================================================
5. REQUIRED FIELDS (MINIMUM SCHEMA)
============================================================

authorship
----------
- authorship_id (PK)
- pmid (FK → papers)
- author_id (FK → authors, nullable initially)
- author_order (integer, 1 = first author)
- author_name_raw (string, original display name)
- last_name
- fore_name
- initials
- suffix
- is_collective (boolean)

- year (publication year)

- affiliations_raw (array of strings)
- affiliation_raw_joined (string)
- has_author_affiliation (boolean)

OPTIONAL (recommended for later stages):
- institution_id
- city
- country
- affiliation_confidence (high / medium / low)

============================================================
6. AUTHOR DISAMBIGUATION (IMPORTANT)
============================================================

Author disambiguation MUST NOT be done during XML parsing.

Correct process:
1. Create authorship records first
2. Run author disambiguation separately
3. Assign a stable author_id to each authorship
4. Update authorship.author_id

This allows disambiguation logic to evolve WITHOUT re-parsing XML.

============================================================
7. HOW THE `authorship` TABLE IS USED
============================================================

ALL analytics and maps must be derived FROM authorship.

Examples:

A) World-level scholar map (by country)
- Group by country
- Count DISTINCT author_id

B) Country → city map
- Filter by country
- Group by city
- Count DISTINCT author_id

C) City → institution map
- Filter by city
- Group by institution
- Count DISTINCT author_id

D) Institution → scholar list
- Filter by institution
- Group by author_id
- paper_count = COUNT(authorship rows)
- career_span = MIN(year) – MAX(year)

IMPORTANT:
- Scholar counts = DISTINCT author_id
- Paper counts = number of authorship rows

============================================================
8. KEY DESIGN PRINCIPLES (DO NOT VIOLATE)
============================================================

- Affiliation belongs to authorship, NOT to author
- One authorship = one author on one paper
- Do not collapse authorship rows prematurely
- Preserve raw affiliation text permanently
- Aggregations must be reproducible via GROUP BY

============================================================
END OF SPECIFICATION
============================================================
