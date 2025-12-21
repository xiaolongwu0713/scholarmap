# Phase 2: Authorship & Geographic Mapping

This module implements the ingestion pipeline for Phase 2, which converts Phase 1 paper results into a structured authorship database with geographic mapping.

## Overview

**Input**: PMIDs from Phase 1 `results_aggregated.json`  
**Output**: SQLite database with `papers`, `authorship`, and `affiliation_cache` tables

### Pipeline Steps

1. **Load PMIDs** from Phase 1 results
2. **Check cache** (SQLite) to avoid re-fetching
3. **Fetch XML** from PubMed EFetch API (batch + rate limiting)
4. **Parse XML** → extract papers, authors, affiliations
5. **Extract geo data** from affiliations using LLM (batched for efficiency)
6. **Write to database** with full authorship records

## Architecture

```
┌─────────────────┐
│  Phase 1        │
│  results_       │
│  aggregated.json│
└────────┬────────┘
         │ PMIDs
         ▼
┌─────────────────┐
│  PubMed EFetch  │  Rate: 3 rps (no key) / 10 rps (with key)
│  XML API        │  Batch: 150 PMIDs per request
└────────┬────────┘
         │ XML
         ▼
┌─────────────────┐
│  XML Parser     │  Extract: title, authors, affiliations
└────────┬────────┘
         │ Parsed objects
         ▼
┌─────────────────┐
│  Affiliation    │  Deduplicate → batch to LLM (20/batch)
│  Extractor      │  Extract: country, city, institution
└────────┬────────┘
         │ Geo data
         ▼
┌─────────────────┐
│  SQLite DB      │  Tables: papers, authorship, run_papers
│  (per-project)  │  Location: data/projects/{project_id}/scholarnet.db
└─────────────────┘
```

## Database Schema

### `papers`
- **pmid** (PK): PubMed ID
- year, title, doi
- fetched_at: Timestamp for cache staleness
- xml_stored: Optional XML backup

### `authorship` (Fact Table)
**One row per author per paper**

Author identity:
- author_order (1 = first author)
- author_name_raw (display name)
- last_name, fore_name, initials, suffix
- is_collective, collective_name

Geographic data:
- affiliations_raw (JSON array of strings)
- country, city, institution (extracted)
- affiliation_confidence (high/medium/low/none)

Denormalized for fast queries:
- pmid (FK)
- year

### `run_papers` (Junction)
Links runs to papers:
- run_id, pmid (composite PK)

### `affiliation_cache`
LLM extraction cache:
- affiliation_raw (PK)
- country, city, institution, confidence

## Key Design Decisions

### 1. Affiliation Deduplication Strategy

**Problem**: 300 papers × 5 authors = 1500 affiliations → expensive LLM calls

**Solution**: 
- Extract unique affiliation strings first
- Typically ~150-300 unique affiliations (10x reduction)
- Batch to LLM: 20 per call = ~8-15 LLM calls per run
- Cache results for reuse across runs

**Cost**: ~$0.50 per run instead of ~$50 🎉

### 2. Primary Affiliation Policy

**Problem**: Some authors have multiple affiliations → risk of double-counting

**Solution** (MVP):
- Use only **first affiliation** for geographic mapping
- Store ALL affiliations in `affiliations_raw` for later analysis
- Future: Support fractional counting or multi-affiliation expansion

### 3. Per-Project Database

**Why not global?**
- Simpler isolation
- Easier backup/export
- Clear data ownership

**Location**: `data/projects/{project_id}/scholarnet.db`

### 4. Rate Limiting

PubMed limits:
- **Without API key**: 3 requests/second
- **With API key**: 10 requests/second

Implementation:
- Batch size: 150 PMIDs per request
- Enforced min interval between requests
- Exponential backoff on errors (3 retries)

### 5. Caching

Two-level cache:
1. **Paper cache**: Check `papers` table before fetching XML
2. **Affiliation cache**: Check `affiliation_cache` before LLM call

Benefits:
- Skip re-fetching papers across runs
- Skip re-extracting affiliations across runs
- Respect PubMed rate limits
- Reduce LLM costs

## Usage

### Via API

```bash
# Ingest a run (with caching)
curl -X POST http://localhost:8000/api/projects/{project_id}/runs/{run_id}/ingest

# Force refresh (ignore cache)
curl -X POST http://localhost:8000/api/projects/{project_id}/runs/{run_id}/ingest \
  -H "Content-Type: application/json" \
  -d '{"force_refresh": true}'
```

### Via Test Script

```bash
cd backend
python test_phase2_ingestion.py <project_id> <run_id>

# Force refresh
python test_phase2_ingestion.py <project_id> <run_id> --force
```

Example:
```bash
python test_phase2_ingestion.py ad280effc0b8 run_7b1d4766fd27
```

### Programmatically

```python
from pathlib import Path
from app.core.storage import FileStore
from app.phase2.ingest import IngestionPipeline

# Initialize
pipeline = IngestionPipeline(
    project_id="ad280effc0b8",
    data_dir=Path("./data"),
    api_key=None  # Optional PubMed API key
)

# Run ingestion
stats = await pipeline.ingest_run(
    run_id="run_7b1d4766fd27",
    store=FileStore("./data"),
    force_refresh=False
)

print(f"Created {stats.authorships_created} authorships")
```

## Configuration

Add to `.env`:

```bash
# Optional: PubMed API key (10 rps instead of 3 rps)
PUBMED_API_KEY=your_key_here

# Required: OpenAI API key for affiliation extraction
OPENAI_API_KEY=sk-...
```

## Performance

Typical run (300 papers):
- **Fetch time**: 2-3 minutes (3 rps) or 30-45 seconds (10 rps)
- **Parse time**: ~5 seconds
- **LLM extraction**: ~10-20 seconds (8-15 calls)
- **Total**: ~3-4 minutes (first run), ~10 seconds (cached)

## Monitoring

Stats returned by ingestion:
```json
{
  "run_id": "run_xxx",
  "total_pmids": 300,
  "pmids_cached": 250,
  "pmids_fetched": 50,
  "papers_parsed": 50,
  "authorships_created": 240,
  "unique_affiliations": 180,
  "affiliations_with_country": 165,
  "llm_calls_made": 9,
  "errors": []
}
```

## Error Handling

- **PubMed fetch fails**: Retries 3 times with exponential backoff, then skips batch
- **XML parse fails**: Logs error and continues with other papers
- **LLM fails**: Returns confidence="none" for that batch, continues
- **Database write fails**: Rolls back transaction, raises error

## Next Steps (Phase 2B)

After ingestion completes, implement:

1. **Aggregation queries** (`aggregations.py`)
   - World level: country → scholar count
   - Country level: city → scholar count
   - City level: institution → scholar count
   - Institution level: scholar list

2. **REST API endpoints**
   - `GET /api/projects/{pid}/runs/{rid}/map/world`
   - `GET /api/projects/{pid}/runs/{rid}/map/country/{country}`
   - `GET /api/projects/{pid}/runs/{rid}/map/city/{country}/{city}`
   - `GET /api/projects/{pid}/runs/{rid}/map/institution/{institution_id}`

3. **Frontend map visualization**
   - Leaflet or D3.js map
   - Drill-down interaction
   - Scholar detail modal

## Troubleshooting

### "No PMIDs found for run"
- Run Phase 1 first to generate `results_aggregated.json`
- Check that papers have `identifiers.pmid` field

### "OPENAI_API_KEY not set"
- Add to `.env` file in backend/ or repo root
- Required for affiliation extraction

### "Rate limited by PubMed"
- Add PUBMED_API_KEY to increase limit to 10 rps
- Reduce batch size in `PubMedFetcher.__init__`

### "Database locked"
- SQLite doesn't support high concurrency
- Don't run multiple ingestions on same project simultaneously
- Consider PostgreSQL for production

## Files

- `schema.py`: SQLite schema and initialization
- `database.py`: Database utilities and queries
- `models.py`: Pydantic data models
- `pubmed_fetcher.py`: PubMed EFetch API client
- `pubmed_parser.py`: XML parser
- `affiliation_extractor.py`: LLM-based geo extraction
- `ingest.py`: Main orchestration pipeline

## Testing

```bash
# Lint
cd backend
python -m pylint app/phase2

# Type check
python -m mypy app/phase2

# Integration test
python test_phase2_ingestion.py ad280effc0b8 run_7b1d4766fd27
```

