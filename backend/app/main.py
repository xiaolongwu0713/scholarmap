from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import httpx

from app.core.config import settings
from app.core.paths import get_data_dir
from app.db.connection import db_manager
from app.db.repository import AuthorshipRepository, RunPaperRepository
from app.db.service import DatabaseStore
from app.phase1.models import Slots
from app.phase1.steps import step_parse, step_query_build, step_retrieve, step_synonyms
from app.phase2.pg_aggregations import PostgresMapAggregator
from app.phase2.pg_ingest import PostgresIngestionPipeline


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown."""
    # Startup: initialize database
    if settings.database_url:
        db_manager.initialize(settings.database_url)
        print("✅ Database connection initialized")
    else:
        print("⚠️  DATABASE_URL not configured, some features may not work")
    
    yield
    
    # Shutdown: close database connection
    await db_manager.close()
    print("✅ Database connection closed")


app = FastAPI(title="ScholarMap API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:8000",
        "https://scholarmap-frontend.onrender.com",
    ],
    allow_origin_regex=r"https://.*\.onrender\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Use database store instead of file store
store = DatabaseStore()


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
async def list_projects() -> dict:
    projects = await store.list_projects()
    return {"projects": [p.__dict__ for p in projects]}


@app.post("/api/projects")
async def create_project(req: CreateProjectRequest) -> dict:
    project = await store.create_project(req.name)
    return {"project": project.__dict__}


@app.get("/api/projects/{project_id}")
async def get_project(project_id: str) -> dict:
    project = await store.get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    runs = await store.list_runs(project_id)
    return {"project": project.__dict__, "runs": [r.__dict__ for r in runs]}


@app.post("/api/projects/{project_id}/runs")
async def create_run(project_id: str, req: CreateRunRequest) -> dict:
    project = await store.get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    run = await store.create_run(project_id, req.research_description)
    return {"run": run.__dict__}


@app.get("/api/projects/{project_id}/runs")
async def list_runs(project_id: str) -> dict:
    project = await store.get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    runs = await store.list_runs(project_id)
    return {"runs": [r.__dict__ for r in runs]}


@app.get("/api/projects/{project_id}/runs/{run_id}/files/{filename}")
async def get_run_file(project_id: str, run_id: str, filename: str) -> dict:
    try:
        data = await store.read_run_file(project_id, run_id, filename)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"data": data}


@app.get("/api/projects/{project_id}/runs/{run_id}/files")
async def list_run_files(project_id: str, run_id: str) -> dict:
    try:
        files = await store.list_run_files(project_id, run_id)
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
async def update_research_description(project_id: str, run_id: str, req: UpdateResearchDescriptionRequest) -> dict:
    project = await store.get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        understanding = await store.read_run_file(project_id, run_id, "understanding.json")
        understanding["research_description"] = req.research_description
        await store.write_run_file(project_id, run_id, "understanding.json", understanding)
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
async def phase1_update_slots(project_id: str, run_id: str, req: UpdateSlotsRequest) -> dict:
    project = await store.get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        understanding = await store.read_run_file(project_id, run_id, "understanding.json")
        understanding["slots_normalized"] = req.slots_normalized.model_dump()
        await store.write_run_file(project_id, run_id, "understanding.json", understanding)
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
async def phase1_update_keywords(project_id: str, run_id: str, req: UpdateKeywordsRequest) -> dict:
    project = await store.get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        keywords = await store.read_run_file(project_id, run_id, "keywords.json")
        keywords["canonical_terms"] = req.canonical_terms
        keywords["synonyms"] = req.synonyms
        await store.write_run_file(project_id, run_id, "keywords.json", keywords)
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
async def phase1_update_queries(project_id: str, run_id: str, req: UpdateQueriesRequest) -> dict:
    project = await store.get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        await store.write_run_file(project_id, run_id, "queries.json", req.model_dump())
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Run not found")
    return {"ok": True}


@app.put("/api/projects/{project_id}/runs/{run_id}/retrieval-framework")
async def phase1_update_retrieval_framework(project_id: str, run_id: str, req: UpdateRetrievalFrameworkRequest) -> dict:
    project = await store.get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        understanding = await store.read_run_file(project_id, run_id, "understanding.json")
        understanding["retrieval_framework"] = req.retrieval_framework
        await store.write_run_file(project_id, run_id, "understanding.json", understanding)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Run not found")
    return {"ok": True}


# ============================================================
# Phase 2: Authorship & Geographic Mapping
# ============================================================

class IngestRequest(BaseModel):
    force_refresh: bool = False


@app.get("/api/projects/{project_id}/runs/{run_id}/authorship/stats")
async def phase2_authorship_stats(project_id: str, run_id: str) -> dict:
    """
    Get authorship statistics for a run (check if data exists).
    
    Returns summary stats from existing authorship data in database,
    or null if no data exists yet.
    """
    project = await store.get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    try:
        async with db_manager.session() as session:
            run_paper_repo = RunPaperRepository(session)
            auth_repo = AuthorshipRepository(session)
            
            # Get PMIDs for this run
            pmids = await run_paper_repo.get_run_pmids(run_id)
            
            if not pmids:
                return {"stats": None}
            
            # Get stats from database
            from sqlalchemy import case, func, select
            from app.db.models import Authorship
            
            query = select(
                func.count(func.distinct(Authorship.pmid)).label('papers_parsed'),
                func.count().label('authorships_created'),
                func.count(func.distinct(Authorship.affiliation_raw_joined)).label('unique_affiliations'),
                func.sum(case((Authorship.country.isnot(None), 1), else_=0)).label('affiliations_with_country')
            ).where(
                Authorship.pmid.in_(pmids)
            )
            
            result = await session.execute(query)
            stats = result.one()
            
            if not stats or stats.papers_parsed == 0:
                return {"stats": None}
            
            # Build response matching IngestStats format
            return {
                "stats": {
                    "run_id": run_id,
                    "total_pmids": len(pmids),
                    "pmids_cached": len(pmids),
                    "pmids_fetched": 0,
                    "papers_parsed": stats.papers_parsed,
                    "authorships_created": stats.authorships_created,
                    "unique_affiliations": stats.unique_affiliations,
                    "affiliations_with_country": stats.affiliations_with_country or 0,
                    "llm_calls_made": 0,
                    "errors": []
                }
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")


@app.post("/api/projects/{project_id}/runs/{run_id}/ingest")
async def phase2_ingest(project_id: str, run_id: str, req: IngestRequest = IngestRequest()) -> dict:
    """
    Ingest papers from Phase 1 into authorship database.
    
    This endpoint:
    1. Loads PMIDs from Phase 1 results
    2. Fetches PubMed XML (with caching)
    3. Parses authors and affiliations
    4. Extracts geographic data via LLM
    5. Stores in PostgreSQL database
    """
    project = await store.get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"Starting ingestion for project {project_id}, run {run_id}")
        pipeline = PostgresIngestionPipeline(
            project_id=project_id,
            api_key=settings.pubmed_api_key or None
        )
        
        stats = await pipeline.ingest_run(
            run_id=run_id,
            store=store,
            force_refresh=req.force_refresh
        )
        
        logger.info(f"Ingestion completed: {stats.model_dump()}")
        return {"stats": stats.model_dump()}
        
    except FileNotFoundError as e:
        logger.error(f"File not found: {e}")
        raise HTTPException(status_code=404, detail="Run not found")
    except Exception as e:
        logger.error(f"Ingestion failed: {e}", exc_info=True)
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
        "institution_count": 40,
        "latitude": 37.0,
        "longitude": -95.7
      },
      ...
    ]
    """
    project = await store.get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    try:
        aggregator = PostgresMapAggregator()
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
        "city": "Boston",
        "scholar_count": 30,
        "institution_count": 12,
        "latitude": 42.3,
        "longitude": -71.0
      },
      ...
    ]
    """
    project = await store.get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    try:
        aggregator = PostgresMapAggregator()
        data = await aggregator.get_country_map(run_id, country, min_confidence)
        return {"data": data}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Aggregation failed: {str(e)}")


@app.get("/api/projects/{project_id}/runs/{run_id}/map/city/{country}/{city}")
async def phase2_map_city(
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
        "institution": "Harvard Medical School",
        "scholar_count": 12
      },
      ...
    ]
    """
    project = await store.get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    try:
        aggregator = PostgresMapAggregator()
        data = await aggregator.get_city_map(run_id, country, city, min_confidence)
        return {"data": data}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Aggregation failed: {str(e)}")


@app.get("/api/projects/{project_id}/runs/{run_id}/map/institution")
async def phase2_map_institution(
    project_id: str,
    run_id: str,
    institution: str,
    country: str | None = None,
    city: str | None = None,
    min_confidence: str = "low"
) -> dict:
    """
    Get scholar list for an institution.
    
    Query params:
    - institution: Institution name (required)
    - country: Country filter (required)
    - city: City filter (required)
    - min_confidence: Minimum confidence level (high/medium/low/none), default "low"
    
    Returns:
    {
      "scholars": [
        {
          "scholar_name": "Smith, John",
          "paper_count": 5
        },
        ...
      ]
    }
    """
    project = await store.get_project(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not country or not city:
        raise HTTPException(status_code=400, detail="country and city are required")
    
    try:
        aggregator = PostgresMapAggregator()
        data = await aggregator.get_institution_scholars(
            run_id=run_id,
            country=country,
            city=city,
            institution=institution,
            min_confidence=min_confidence
        )
        return {"scholars": data}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Aggregation failed: {str(e)}")
