This is a PubMed ingestion pipeline that converts PubMed EFetch XML into relational tables.
Implement robust parsing to create an `authorship` fact table (author–paper relationship), plus minimal support tables.

============================================================
A. INPUTS
============================================================

Input 1: A list of PubMed PMIDs (typically ~300 per query).
Input 2: PubMed EFetch XML responses (retmode=xml) retrieved in batches.

You MUST use batch EFetch (not 1-request-per-paper). Use chunk size 100–200 PMIDs per request.

You MUST implement:
- rate limiting (3 rps without API key; 10 rps with API key)
- retry with exponential backoff for transient errors
- local caching: skip EFetch for PMIDs already stored unless forced refresh

============================================================
B. OUTPUT TABLES (MINIMUM)
============================================================

1) papers
- pmid (PK)
- year (int, nullable)
- title (text, nullable)
- doi (text, nullable)

2) authorship (FACT TABLE)
- authorship_id (PK)
- pmid (FK -> papers.pmid)
- author_id (FK -> authors.author_id, nullable initially)
- author_order (int, 1-based)
- author_name_raw (text)
- last_name (text, nullable)
- fore_name (text, nullable)
- initials (text, nullable)
- suffix (text, nullable)
- is_collective (bool)
- year (int, nullable)
- affiliations_raw (JSON array of strings; may be empty)
- affiliation_raw_joined (text, nullable)
- has_author_affiliation (bool)
- affiliation_confidence (enum: high/medium/low/none)

Optional (if you implement institution normalization later):
- institution_id (nullable)
- city (nullable)
- country (nullable)

============================================================
C. XML PARSING REQUIREMENTS (EFetch retmode=xml)
============================================================

Parse each PubmedArticle under PubmedArticleSet.

1) PMID
Path: ./MedlineCitation/PMID

2) YEAR (must implement fallback)
Try in order:
- ./MedlineCitation/Article/Journal/JournalIssue/PubDate/Year
- ./MedlineCitation/Article/ArticleDate/Year
- ./MedlineCitation/Article/Journal/JournalIssue/PubDate/MedlineDate  (extract first 4-digit year via regex)

3) TITLE
- ./MedlineCitation/Article/ArticleTitle

4) DOI (if present)
Try:
- ./PubmedData/ArticleIdList/ArticleId[@IdType="doi"]
Fallback:
- ./MedlineCitation/Article/ELocationID[@EIdType="doi"]

5) AUTHORS
Path: ./MedlineCitation/Article/AuthorList/Author

For each Author element:
- Determine if collective author:
    if ./CollectiveName exists and non-empty => is_collective = true
- Otherwise parse:
    ./LastName, ./ForeName, ./Initials, ./Suffix
- author_name_raw:
    if collective => CollectiveName
    else => "LastName, ForeName" (or best-effort if partial)

6) AUTHOR-LEVEL AFFILIATIONS
For each Author:
- affiliations_raw = all texts at ./AffiliationInfo/Affiliation (0..k)
- has_author_affiliation = (len(affiliations_raw) > 0)
- affiliation_raw_joined = " | ".join(affiliations_raw) if any
- affiliation_confidence:
    - "high" if author-level affiliation exists
    - else "none" at this stage (do NOT invent affiliations here)

============================================================
D. REQUIRED DOWNGRADE / BACKFILL STRATEGY (SEPARATE STEP)
============================================================

Do NOT assign article-level affiliation during initial authorship parsing.
Instead store a paper-level field for potential fallback, OR implement a separate enrichment step.

Enrichment step rules:
1) If author has author-level affiliation => keep it (confidence=high)
2) Else if paper-level affiliation exists (e.g., MedlineCitation/Article/Affiliation or GrantList patterns depending on record):
   - assign it to all authors ONLY as a fallback
   - mark confidence=low
3) Else leave missing (confidence=none)

IMPORTANT:
- Keep raw provenance. Never overwrite "high" with fallback.
- Never fabricate institution/city/country during parsing; only store raw strings.

============================================================
E. IMPLEMENTATION NOTES (MUST DO)
============================================================

- Create ONE authorship row per author per paper.
- Preserve author order.
- Preserve ALL raw affiliation strings exactly.
- Store enough raw name parts for later author disambiguation.
- Handle missing / partial fields gracefully.
- Handle cases with no AuthorList (rare): still store paper record, authorship rows = 0.

Deliverables:
- A function/module that:
  1) takes PMID list
  2) batch downloads EFetch XML with caching + rate limits
  3) parses XML into `papers` rows and `authorship` rows
  4) writes them into a DB (Postgres preferred; SQLite acceptable for MVP)

Return code in Python.
Use requests/httpx plus xml parsing (ElementTree or lxml).
Include clear logging + basic metrics:
- #papers fetched
- #authorship rows created
- % authorship with author-level affiliation
- error counts / retry counts
