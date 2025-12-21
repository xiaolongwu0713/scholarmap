from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import httpx

from app.core.config import settings
from app.core.paths import get_data_dir
from app.core.storage import FileStore
from app.phase1.models import Slots
from app.phase1.steps import step_parse, step_query_build, step_retrieve, step_synonyms
from app.phase2.aggregations import MapAggregator
from app.phase2.database import Database
from app.phase2.ingest import IngestionPipeline


app = FastAPI(title="ScholarNet API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

store = FileStore(settings.scholarnet_data_dir)


class CreateProjectRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)


class CreateRunRequest(BaseModel):
    research_description: str = Field(min_length=1, max_length=10_000)

class UpdateResearchDescriptionRequest(BaseModel):
    research_description: str = Field(min_length=1, max_length=10_000)


class UpdateSlotsRequest(BaseModel):
    slots_normalized: Slots


class UpdateKeywordsRequest(BaseModel):
    canonical_terms: list[str] = Field(default_factory=list)
    synonyms: dict[str, list[str]] = Field(default_factory=dict)


class UpdateQueriesRequest(BaseModel):
    pubmed: str = ""
    pubmed_full: str = ""
    semantic_scholar: str = ""
    openalex: str = ""

class UpdateRetrievalFrameworkRequest(BaseModel):
    retrieval_framework: str = Field(min_length=1, max_length=200_000)


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/projects")
def list_projects() -> dict:
    projects = store.list_projects()
    return {"projects": [p.__dict__ for p in projects]}


@app.post("/api/projects")
def create_project(req: CreateProjectRequest) -> dict:
    project = store.create_project(req.name)
    return {"project": project.__dict__}


@app.get("/api/projects/{project_id}")
def get_project(project_id: str) -> dict:
    project = store.get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    runs = store.list_runs(project_id)
    return {"project": project.__dict__, "runs": [r.__dict__ for r in runs]}


@app.post("/api/projects/{project_id}/runs")
def create_run(project_id: str, req: CreateRunRequest) -> dict:
    project = store.get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    run = store.create_run(project_id, req.research_description)
    return {"run": run.__dict__}


@app.get("/api/projects/{project_id}/runs")
def list_runs(project_id: str) -> dict:
    project = store.get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    runs = store.list_runs(project_id)
    return {"runs": [r.__dict__ for r in runs]}


@app.get("/api/projects/{project_id}/runs/{run_id}/files/{filename}")
def get_run_file(project_id: str, run_id: str, filename: str) -> dict:
    try:
        data = store.read_run_file(project_id, run_id, filename)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"data": data}


@app.get("/api/projects/{project_id}/runs/{run_id}/files")
def list_run_files(project_id: str, run_id: str) -> dict:
    try:
        files = store.list_run_files(project_id, run_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Run not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"files": files}


@app.post("/api/projects/{project_id}/runs/{run_id}/query")
async def phase1_query(project_id: str, run_id: str) -> dict:
    project = store.get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        result = await step_retrieve(store, project_id, run_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Run not found")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"Upstream HTTP error: {e.response.status_code}") from e
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"result": result}


@app.put("/api/projects/{project_id}/runs/{run_id}/research-description")
def update_research_description(project_id: str, run_id: str, req: UpdateResearchDescriptionRequest) -> dict:
    project = store.get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        understanding = store.read_run_file(project_id, run_id, "understanding.json")
        understanding["research_description"] = req.research_description
        store.write_run_file(project_id, run_id, "understanding.json", understanding)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Run not found")
    return {"ok": True}


@app.post("/api/projects/{project_id}/runs/{run_id}/parse")
async def phase1_parse(project_id: str, run_id: str, req: UpdateResearchDescriptionRequest) -> dict:
    project = store.get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        data = await step_parse(store, project_id, run_id, req.research_description)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Run not found")
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"data": data}


@app.put("/api/projects/{project_id}/runs/{run_id}/slots")
def phase1_update_slots(project_id: str, run_id: str, req: UpdateSlotsRequest) -> dict:
    project = store.get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        understanding = store.read_run_file(project_id, run_id, "understanding.json")
        understanding["slots_normalized"] = req.slots_normalized.model_dump()
        store.write_run_file(project_id, run_id, "understanding.json", understanding)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Run not found")
    return {"ok": True}


@app.post("/api/projects/{project_id}/runs/{run_id}/synonyms")
async def phase1_synonyms(project_id: str, run_id: str) -> dict:
    project = store.get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        data = await step_synonyms(store, project_id, run_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Run not found")
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"data": data}


@app.put("/api/projects/{project_id}/runs/{run_id}/keywords")
def phase1_update_keywords(project_id: str, run_id: str, req: UpdateKeywordsRequest) -> dict:
    project = store.get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        keywords = store.read_run_file(project_id, run_id, "keywords.json")
        keywords["canonical_terms"] = req.canonical_terms
        keywords["synonyms"] = req.synonyms
        store.write_run_file(project_id, run_id, "keywords.json", keywords)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Run not found")
    return {"ok": True}


@app.post("/api/projects/{project_id}/runs/{run_id}/query-build")
async def phase1_query_build(project_id: str, run_id: str) -> dict:
    project = store.get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        q = await step_query_build(store, project_id, run_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Run not found")
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"data": q.model_dump()}


@app.put("/api/projects/{project_id}/runs/{run_id}/queries")
def phase1_update_queries(project_id: str, run_id: str, req: UpdateQueriesRequest) -> dict:
    project = store.get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        store.write_run_file(project_id, run_id, "queries.json", req.model_dump())
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Run not found")
    return {"ok": True}


@app.put("/api/projects/{project_id}/runs/{run_id}/retrieval-framework")
def phase1_update_retrieval_framework(project_id: str, run_id: str, req: UpdateRetrievalFrameworkRequest) -> dict:
    project = store.get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        understanding = store.read_run_file(project_id, run_id, "understanding.json")
        understanding["retrieval_framework"] = req.retrieval_framework
        store.write_run_file(project_id, run_id, "understanding.json", understanding)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Run not found")
    return {"ok": True}


# ============================================================
# Phase 2: Authorship & Geographic Mapping
# ============================================================

class IngestRequest(BaseModel):
    force_refresh: bool = False


@app.get("/api/projects/{project_id}/runs/{run_id}/authorship/stats")
def phase2_authorship_stats(project_id: str, run_id: str) -> dict:
    """
    Get authorship statistics for a run (check if data exists).
    
    Returns summary stats from existing authorship data in database,
    or null if no data exists yet.
    """
    project = store.get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    try:
        data_dir = get_data_dir()
        db = Database(project_id, data_dir)
        conn = db.get_conn()
        
        try:
            # Get PMIDs for this run
            pmids = db.get_run_pmids(run_id)
            
            if not pmids:
                # No data for this run yet
                return {"stats": None}
            
            pmid_filter = ",".join(f"'{p}'" for p in pmids)
            
            # Get stats from database
            stats = conn.execute(f"""
                SELECT 
                    COUNT(DISTINCT pmid) as papers_parsed,
                    COUNT(*) as authorships_created,
                    COUNT(DISTINCT affiliation_raw_joined) as unique_affiliations,
                    SUM(CASE WHEN country IS NOT NULL THEN 1 ELSE 0 END) as affiliations_with_country
                FROM authorship
                WHERE pmid IN ({pmid_filter})
            """).fetchone()
            
            if not stats or stats["papers_parsed"] == 0:
                return {"stats": None}
            
            # Build response matching IngestStats format
            return {
                "stats": {
                    "run_id": run_id,
                    "total_pmids": len(pmids),
                    "pmids_cached": len(pmids),
                    "pmids_fetched": 0,
                    "papers_parsed": stats["papers_parsed"],
                    "authorships_created": stats["authorships_created"],
                    "unique_affiliations": stats["unique_affiliations"],
                    "affiliations_with_country": stats["affiliations_with_country"],
                    "llm_calls_made": 0,
                    "errors": []
                }
            }
            
        finally:
            conn.close()
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")


@app.post("/api/projects/{project_id}/runs/{run_id}/ingest")
async def phase2_ingest(project_id: str, run_id: str, req: IngestRequest = IngestRequest()) -> dict:
    """
    Ingest papers from Phase 1 into authorship database.
    
    This endpoint:
    1. Loads PMIDs from results_aggregated.json
    2. Fetches PubMed XML (with caching)
    3. Parses authors and affiliations
    4. Extracts geographic data via LLM
    5. Stores in SQLite database
    """
    project = store.get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    try:
        data_dir = get_data_dir()
        pipeline = IngestionPipeline(
            project_id=project_id,
            data_dir=data_dir,
            api_key=settings.pubmed_api_key or None
        )
        
        stats = await pipeline.ingest_run(
            run_id=run_id,
            store=store,
            force_refresh=req.force_refresh
        )
        
        return {"stats": stats.model_dump()}
        
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Run not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")


# ============================================================
# Phase 2B: Map Visualization APIs
# ============================================================

@app.get("/api/projects/{project_id}/runs/{run_id}/map/world")
async def phase2_map_world(
    project_id: str,
    run_id: str,
    min_confidence: str = "low"
) -> dict:
    """
    Get world-level map data: countries with scholar/paper/institution counts.
    
    Query params:
    - min_confidence: Minimum confidence level (high/medium/low/none), default "low"
    
    Returns:
    [
      {
        "country": "United States",
        "scholar_count": 123,
        "paper_count": 88,
        "institution_count": 40
      },
      ...
    ]
    """
    project = store.get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    try:
        data_dir = get_data_dir()
        db = Database(project_id, data_dir)
        aggregator = MapAggregator(db)
        
        data = await aggregator.get_world_map(run_id, min_confidence)
        return {"data": data}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Aggregation failed: {str(e)}")


@app.get("/api/projects/{project_id}/runs/{run_id}/map/country/{country}")
async def phase2_map_country(
    project_id: str,
    run_id: str,
    country: str,
    min_confidence: str = "low"
) -> dict:
    """
    Get country-level map data: cities with scholar/institution counts.
    
    Path params:
    - country: Country name (e.g., "United States", "China")
    
    Query params:
    - min_confidence: Minimum confidence level (high/medium/low/none), default "low"
    
    Returns:
    [
      {
        "country": "United States",
        "city": "Boston",
        "scholar_count": 30,
        "institution_count": 12
      },
      ...
    ]
    """
    project = store.get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    try:
        data_dir = get_data_dir()
        db = Database(project_id, data_dir)
        aggregator = MapAggregator(db)
        
        data = await aggregator.get_country_map(run_id, country, min_confidence)
        return {"data": data}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Aggregation failed: {str(e)}")


@app.get("/api/projects/{project_id}/runs/{run_id}/map/city/{country}/{city}")
def phase2_map_city(
    project_id: str,
    run_id: str,
    country: str,
    city: str,
    min_confidence: str = "low"
) -> dict:
    """
    Get city-level map data: institutions with scholar counts.
    
    Path params:
    - country: Country name
    - city: City name (e.g., "Boston", "Beijing")
    
    Query params:
    - min_confidence: Minimum confidence level (high/medium/low/none), default "low"
    
    Returns:
    [
      {
        "country": "United States",
        "city": "Boston",
        "institution": "Harvard Medical School",
        "scholar_count": 12
      },
      ...
    ]
    """
    project = store.get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    try:
        data_dir = get_data_dir()
        db = Database(project_id, data_dir)
        aggregator = MapAggregator(db)
        
        data = aggregator.get_city_map(run_id, country, city, min_confidence)
        return {"data": data}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Aggregation failed: {str(e)}")


@app.get("/api/projects/{project_id}/runs/{run_id}/map/institution")
def phase2_map_institution(
    project_id: str,
    run_id: str,
    institution: str,
    country: str | None = None,
    city: str | None = None,
    min_confidence: str = "low",
    limit: int = 100,
    offset: int = 0
) -> dict:
    """
    Get scholar list for an institution with career metrics.
    
    Query params:
    - institution: Institution name (required)
    - country: Country filter (optional)
    - city: City filter (optional)
    - min_confidence: Minimum confidence level (high/medium/low/none), default "low"
    - limit: Max results per page, default 100
    - offset: Pagination offset, default 0
    
    Returns:
    {
      "scholars": [
        {
          "name": "Smith, John",
          "paper_count": 5,
          "career_start_year": 2018,
          "career_end_year": 2024,
          "is_likely_pi": true
        },
        ...
      ],
      "total_count": 45,
      "limit": 100,
      "offset": 0
    }
    """
    project = store.get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    try:
        data_dir = get_data_dir()
        db = Database(project_id, data_dir)
        aggregator = MapAggregator(db)
        
        data = aggregator.get_institution_scholars(
            run_id=run_id,
            institution=institution,
            country=country,
            city=city,
            min_confidence=min_confidence,
            limit=limit,
            offset=offset
        )
        return data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Aggregation failed: {str(e)}")
