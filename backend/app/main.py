from __future__ import annotations

import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path

# Add repo root to path to import config (must be before other imports that use config)
# From backend/app/main.py: parent.parent.parent = repo root
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
import config
settings = config.settings

# Initialize logging configuration (must be early)
from app.core.logging_config import setup_logging
setup_logging(level=logging.INFO)

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import httpx
from app.core.paths import get_data_dir
from app.db.connection import db_manager
from app.db.repository import AuthorshipRepository, RunPaperRepository, ProjectRepository, RunRepository
from app.db.resource_monitor_repository import ResourceMonitorRepository, UserActivityRepository
from app.core.storage import FileStore
from app.db.service import DatabaseStore
from app.auth.middleware import AuthMiddleware
from app.auth.auth import (
    get_password_hash,
    verify_password,
    validate_password_strength,
    create_access_token,
    generate_verification_code,
    send_verification_email,
)
from app.auth.repository import UserRepository, EmailVerificationCodeRepository
from app.db.connection import db_manager
from app.frontend_only_middleware import FrontendOnlyMiddleware
from app.input_text_validate import analyze_english_text, input_text_validate
from app.guardrail_config import (
    API_RATE_LIMIT_MAX_REQUESTS,
    API_RATE_LIMIT_WINDOW_SECONDS,
    BACKEND_STAGE2_MAX_TOTAL_ATTEMPTS,
    PASSWORD_MIN_LENGTH,
    PASSWORD_MAX_LENGTH,
    PASSWORD_REQUIRE_CAPITAL,
    PASSWORD_REQUIRE_DIGIT,
    PASSWORD_REQUIRE_LETTER,
    PASSWORD_REQUIRE_SPECIAL,
    PASSWORD_SPECIAL_CHARS,
)
from app.parse_protection import (
    ParseAttemptTracker,
    _global_rate_limiter,
    _global_concurrency_controller,
)
from app.phase1.models import Slots
from app.phase1.parse import parse_stage1, parse_stage2
from app.phase1.steps import step_parse, step_query_build, step_retrieve, step_synonyms, adjust_retrieval_framework
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

# Add CORS middleware first
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:8000",
        "https://scholarmap-frontend.onrender.com",
    ],
    allow_origin_regex=r"https://.*\.onrender\.com",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Add authentication middleware (after CORS)
# Auth middleware will check for valid JWT tokens on protected routes
app.add_middleware(AuthMiddleware)

# Add frontend-only middleware (after auth)
app.add_middleware(FrontendOnlyMiddleware)

# Use database store instead of file store
store = DatabaseStore()
# Also initialize file store for deleting local files if they exist
file_store = FileStore(get_data_dir())


class CreateProjectRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)


class CreateRunRequest(BaseModel):
    research_description: str = Field(min_length=0, max_length=10_000)

class UpdateResearchDescriptionRequest(BaseModel):
    research_description: str = Field(min_length=1, max_length=10_000)
    skip_validation: bool = Field(default=False)  # Allow skipping validation for normalized_understanding


class UpdateSlotsRequest(BaseModel):
    slots_normalized: Slots


class QC1AnalyzeRequest(BaseModel):
    text: str = Field(min_length=1, max_length=50_000)


class QC1ValidateRequest(BaseModel):
    text: str = Field(min_length=1, max_length=50_000)


class ParseStage1Request(BaseModel):
    candidate_description: str = Field(min_length=1, max_length=50_000)


class ParseStage2Request(BaseModel):
    current_description: str = Field(min_length=1, max_length=200_000)
    user_additional_info: str = Field(default="", max_length=200_000)


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


class AdjustRetrievalFrameworkRequest(BaseModel):
    user_additional_info: str = Field(min_length=1, max_length=10_000)


# Authentication request models
class SendVerificationCodeRequest(BaseModel):
    email: str = Field(min_length=1, max_length=255)


class RegisterRequest(BaseModel):
    email: str = Field(min_length=1, max_length=255)
    verification_code: str = Field(min_length=6, max_length=6)
    password: str = Field(min_length=PASSWORD_MIN_LENGTH, max_length=PASSWORD_MAX_LENGTH)
    password_retype: str | None = None  # Optional, validated on frontend


class LoginRequest(BaseModel):
    email: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=1, max_length=255)


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/config")
def get_frontend_config() -> dict:
    """
    Get frontend configuration constants from backend.
    This ensures frontend and backend always use the same limits.
    Public endpoint - no authentication required.
    """
    from app.guardrail_config import (
        TEXT_VALIDATION_MAX_ATTEMPTS,
        PARSE_STAGE1_MAX_ATTEMPTS,
        PARSE_STAGE2_MAX_TOTAL_ATTEMPTS,
        PARSE_STAGE2_MAX_CONSECUTIVE_UNHELPFUL,
        RETRIEVAL_FRAMEWORK_ADJUST_MAX_ATTEMPTS,
    )
    from config import settings
    
    return {
        "text_validation_max_attempts": TEXT_VALIDATION_MAX_ATTEMPTS,
        "parse_stage1_max_attempts": PARSE_STAGE1_MAX_ATTEMPTS,
        "parse_stage2_max_total_attempts": PARSE_STAGE2_MAX_TOTAL_ATTEMPTS,
        "parse_stage2_max_consecutive_unhelpful": PARSE_STAGE2_MAX_CONSECUTIVE_UNHELPFUL,
        "retrieval_framework_adjust_max_attempts": RETRIEVAL_FRAMEWORK_ADJUST_MAX_ATTEMPTS,
        "share_run_auth_check_enabled": settings.share_run_auth_check_enabled,
    }


# ============================================================================
# Authentication Endpoints
# ============================================================================

@app.get("/api/auth/password-requirements")
async def get_password_requirements() -> dict:
    """Get password requirements configuration for frontend validation."""
    return {
        "min_length": PASSWORD_MIN_LENGTH,
        "max_length": PASSWORD_MAX_LENGTH,
        "require_capital": PASSWORD_REQUIRE_CAPITAL,
        "require_digit": PASSWORD_REQUIRE_DIGIT,
        "require_letter": PASSWORD_REQUIRE_LETTER,
        "require_special": PASSWORD_REQUIRE_SPECIAL,
        "special_chars": PASSWORD_SPECIAL_CHARS,
    }

@app.post("/api/auth/send-verification-code")
async def send_verification_code(req: SendVerificationCodeRequest) -> dict:
    """Send email verification code."""
    from email_validator import validate_email, EmailNotValidError
    
    # Validate email format
    try:
        validation = validate_email(req.email, check_deliverability=False)
        email = validation.email.lower().strip()
    except EmailNotValidError:
        raise HTTPException(status_code=400, detail="Invalid email format")
    
    # Generate verification code
    code = generate_verification_code()
    
    # Store code in database
    async with db_manager.session() as session:
        code_repo = EmailVerificationCodeRepository(session)
        await code_repo.create_code(email, code, expire_minutes=10)
        await session.commit()
    
    # Send email (or print to console if SENDGRID_API_KEY not set)
    # If SENDGRID_API_KEY is set, send_verification_email will raise exception on failure
    try:
        await send_verification_email(email, code)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send verification code: {str(e)}")
    
    return {"ok": True, "message": "Verification code sent"}


@app.post("/api/auth/register")
async def register_user(req: RegisterRequest) -> dict:
    """Register a new user."""
    from email_validator import validate_email, EmailNotValidError
    import uuid
    
    # Validate email format
    try:
        validation = validate_email(req.email, check_deliverability=False)
        email = validation.email.lower().strip()
    except EmailNotValidError:
        raise HTTPException(status_code=400, detail="Invalid email format")
    
    # Password validation is done on the frontend
    # Backend only hashes the password (SHA-256 + bcrypt)
    
    # Verify code
    async with db_manager.session() as session:
        code_repo = EmailVerificationCodeRepository(session)
        user_repo = UserRepository(session)
        
        # Check if user already exists
        existing_user = await user_repo.get_user_by_email(email)
        if existing_user:
            raise HTTPException(status_code=400, detail="User with this email already exists")
        
        # Verify code
        code_valid = await code_repo.verify_code(email, req.verification_code)
        if not code_valid:
            raise HTTPException(status_code=400, detail="Invalid or expired verification code")
        
        # Create user
        user_id = uuid.uuid4().hex[:16]
        password_hash = get_password_hash(req.password)
        user = await user_repo.create_user(user_id, email, password_hash)
        
        await session.commit()
        
        # Generate JWT token
        token = create_access_token(data={"sub": user_id})
        
        return {
            "ok": True,
            "access_token": token,
            "token_type": "bearer",
            "user_id": user.user_id,
            "email": user.email,
        }


@app.post("/api/auth/login")
async def login_user(req: LoginRequest) -> dict:
    """Login and return JWT token."""
    from email_validator import validate_email, EmailNotValidError
    
    # Validate email format
    try:
        validation = validate_email(req.email, check_deliverability=False)
        email = validation.email.lower().strip()
    except EmailNotValidError:
        raise HTTPException(status_code=400, detail="Invalid email format")
    
    # Get user from database
    async with db_manager.session() as session:
        user_repo = UserRepository(session)
        user = await user_repo.get_user_by_email(email)
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Verify password
        if not verify_password(req.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Generate JWT token
        token = create_access_token(data={"sub": user.user_id})
        
        return {
            "ok": True,
            "access_token": token,
            "token_type": "bearer",
            "user_id": user.user_id,
            "email": user.email,
        }


@app.get("/api/user/quota")
async def get_user_quota(request: Request) -> dict:
    """Get current user's quota information."""
    user_id = request.state.user_id
    
    async with db_manager.session() as session:
        from app.auth.repository import UserRepository
        from app.quota import get_user_quota_summary
        
        user_repo = UserRepository(session)
        user = await user_repo.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get current usage
        project_repo = ProjectRepository(session)
        run_repo = RunRepository(session)
        
        projects = await project_repo.list_projects(user_id)
        
        # Get max runs from all projects
        max_runs_in_project = 0
        total_runs = 0
        for project in projects:
            runs_count = await run_repo.count_project_runs(project.project_id)
            total_runs += runs_count
            max_runs_in_project = max(max_runs_in_project, runs_count)
        
        current_counts = {
            "projects": len(projects),
            "runs": max_runs_in_project,  # Use max runs in any single project
            "papers": 0,  # Would need to count from results
            "ingestion_today": 0,  # Would need to track ingestion operations
        }
        
        # Get quota summary
        quota_info = get_user_quota_summary(user.email, current_counts)
        
        return quota_info


@app.get("/api/projects")
async def list_projects(request: Request) -> dict:
    user_id = request.state.user_id
    projects = await store.list_projects(user_id)
    return {"projects": [p.__dict__ for p in projects]}


@app.post("/api/projects")
async def create_project(request: Request, req: CreateProjectRequest) -> dict:
    user_id = request.state.user_id
    
    # Check user quota
    async with db_manager.session() as session:
        from app.auth.repository import UserRepository
        from app.quota import check_can_create_project
        
        user_repo = UserRepository(session)
        user = await user_repo.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Count current projects
        project_repo = ProjectRepository(session)
        current_project_count = await project_repo.count_user_projects(user_id)
        
        # Check quota
        can_create, error_msg = await check_can_create_project(user.email, current_project_count)
        if not can_create:
            raise HTTPException(status_code=403, detail=error_msg)
    
    # Create project
    project = await store.create_project(user_id, req.name)
    return {"project": project.__dict__}


@app.get("/api/projects/{project_id}")
async def get_project(request: Request, project_id: str) -> dict:
    user_id = request.state.user_id
    project = await store.get_project(project_id, user_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    runs = await store.list_runs(project_id)
    return {"project": project.__dict__, "runs": [r.__dict__ for r in runs]}


@app.post("/api/projects/{project_id}/runs")
async def create_run(request: Request, project_id: str, req: CreateRunRequest) -> dict:
    user_id = request.state.user_id
    project = await store.get_project(project_id, user_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check user quota
    async with db_manager.session() as session:
        from app.auth.repository import UserRepository
        from app.quota import check_can_create_run
        
        user_repo = UserRepository(session)
        user = await user_repo.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Count current runs in this project
        run_repo = RunRepository(session)
        current_run_count = await run_repo.count_project_runs(project_id)
        
        # Check quota
        can_create, error_msg = await check_can_create_run(user.email, project_id, current_run_count)
        if not can_create:
            raise HTTPException(status_code=403, detail=error_msg)
    
    # Allow empty description when creating - user will enter it in the Run page
    # Only validate if description is provided and not empty
    if req.research_description and req.research_description.strip():
        tv = input_text_validate(req.research_description)
        if not tv.get("ok"):
            raise HTTPException(status_code=400, detail=f"Text validate failed: {tv.get('reason') or 'Invalid input.'}")
    run = await store.create_run(project_id, req.research_description)
    return {"run": run.__dict__}


@app.delete("/api/projects/{project_id}/runs/{run_id}")
async def delete_run(request: Request, project_id: str, run_id: str) -> dict:
    """Delete a run and all its data (database records and local files)."""
    # Verify run exists and belongs to project
    user_id = request.state.user_id
    project = await store.get_project(project_id, user_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Delete from database
    await store.delete_run(project_id, run_id)
    
    # Also delete local files if they exist (for backwards compatibility)
    if file_store:
        try:
            file_store.delete_run(project_id, run_id)
        except (FileNotFoundError, ValueError):
            # Files don't exist, that's fine
            pass
    
    return {"message": "Run deleted successfully"}


@app.get("/api/projects/{project_id}/runs")
async def list_runs(request: Request, project_id: str) -> dict:
    user_id = request.state.user_id
    project = await store.get_project(project_id, user_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    runs = await store.list_runs(project_id)
    return {"runs": [r.__dict__ for r in runs]}


@app.get("/api/projects/{project_id}/runs/{run_id}/files/{filename}")
async def get_run_file(request: Request, project_id: str, run_id: str, filename: str) -> dict:
    user_id = request.state.user_id
    # Verify project belongs to user
    project = await store.get_project(project_id, user_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        data = await store.read_run_file(project_id, run_id, filename)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"data": data}


@app.get("/api/projects/{project_id}/runs/{run_id}/files")
async def list_run_files(request: Request, project_id: str, run_id: str) -> dict:
    user_id = request.state.user_id
    # Verify project belongs to user
    project = await store.get_project(project_id, user_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        files = await store.list_run_files(project_id, run_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Run not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"files": files}


@app.post("/api/projects/{project_id}/runs/{run_id}/query")
async def phase1_query(request: Request,project_id: str, run_id: str) -> dict:
    user_id = request.state.user_id
    project = await store.get_project(project_id, user_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Execute query
    try:
        result = await step_retrieve(store, project_id, run_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Run not found")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"Upstream HTTP error: {e.response.status_code}") from e
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Check paper count quota after retrieval
    async with db_manager.session() as session:
        from app.auth.repository import UserRepository
        from app.quota import check_quota
        
        user_repo = UserRepository(session)
        user = await user_repo.get_user_by_id(user_id)
        if user:
            # Count total papers from all sources
            total_papers = 0
            if "pubmed" in result and "pmids" in result["pubmed"]:
                total_papers += len(result["pubmed"]["pmids"])
            if "semantic_scholar" in result and "papers" in result["semantic_scholar"]:
                total_papers += len(result["semantic_scholar"]["papers"])
            if "openalex" in result and "papers" in result["openalex"]:
                total_papers += len(result["openalex"]["papers"])
            
            # Check quota
            can_proceed, error_msg = check_quota(user.email, "max_papers_per_run", total_papers)
            if not can_proceed:
                # Log warning but don't block (for backward compatibility)
                # In the future, you can raise HTTPException here
                logger = logging.getLogger(__name__)
                logger.warning(f"User {user.email} exceeded paper quota: {total_papers} papers retrieved")
                # Optionally add warning to result
                result["quota_warning"] = error_msg
    
    return {"result": result}


@app.put("/api/projects/{project_id}/runs/{run_id}/research-description")
async def update_research_description(request: Request, project_id: str, run_id: str, req: UpdateResearchDescriptionRequest) -> dict:
    user_id = request.state.user_id
    project = await store.get_project(project_id, user_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        understanding = await store.read_run_file(project_id, run_id, "understanding.json")
        understanding["research_description"] = req.research_description
        await store.write_run_file(project_id, run_id, "understanding.json", understanding)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Run not found")
    return {"ok": True}


@app.post("/api/qc1/analyze")
async def qc1_analyze(req: QC1AnalyzeRequest) -> dict:
    return {"data": analyze_english_text(req.text)}


@app.post("/api/qc1/validate")
async def qc1_validate_route(req: QC1ValidateRequest) -> dict:
    return {"data": input_text_validate(req.text)}


@app.post("/api/text-validate/validate")
async def text_validate_route(req: QC1ValidateRequest) -> dict:
    return {"data": input_text_validate(req.text)}


@app.post("/api/projects/{project_id}/runs/{run_id}/parse/stage1")
async def parse_stage1_route(request: Request, project_id: str, run_id: str, req: ParseStage1Request) -> dict:
    import uuid
    
    # 1. Rate limiting check
    identifier = f"{project_id}:{run_id}"
    is_allowed, remaining = _global_rate_limiter.check_rate_limit("parse_stage1", identifier)
    if not is_allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Maximum {API_RATE_LIMIT_MAX_REQUESTS} requests per {API_RATE_LIMIT_WINDOW_SECONDS} seconds. Please wait before trying again."
        )
    
    # 2. Concurrency control
    request_id = str(uuid.uuid4())
    acquired = await _global_concurrency_controller.acquire(run_id, request_id)
    if not acquired:
        raise HTTPException(
            status_code=429,
            detail=f"Another parse request is already in progress for this run. Please wait for it to complete."
        )
    
    try:
        # 3. Server-side attempt limit check
        tracker = ParseAttemptTracker(store)
        is_locked, current_count = await tracker.check_stage1_limit(project_id, run_id)
        if is_locked:
            raise HTTPException(
                status_code=403,
                detail=f"Parse stage1 limit reached ({current_count} attempts). Service refused."
            )
        
        user_id = request.state.user_id
        project = await store.get_project(project_id, user_id)
        if project is None:
            raise HTTPException(status_code=404, detail="Project not found")
        
        tv = input_text_validate(req.candidate_description)
        if not tv.get("ok"):
            raise HTTPException(status_code=400, detail=f"Text validate failed: {tv.get('reason') or 'Invalid input.'}")
        
        try:
            # Increment attempt count before calling LLM
            attempt_count = await tracker.increment_stage1_attempt(project_id, run_id)
            
            data = await parse_stage1(store, project_id, run_id, req.candidate_description)
            
            return {"data": data}
        except FileNotFoundError:
            raise HTTPException(status_code=404, detail="Run not found")
        except RuntimeError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=502, detail=f"Upstream HTTP error: {e.response.status_code}") from e
    finally:
        # Always release concurrency slot
        await _global_concurrency_controller.release(run_id, request_id)


@app.post("/api/projects/{project_id}/runs/{run_id}/parse/stage2")
async def parse_stage2_route(request: Request, project_id: str, run_id: str, req: ParseStage2Request) -> dict:
    import uuid
    
    # 1. Rate limiting check
    identifier = f"{project_id}:{run_id}"
    is_allowed, remaining = _global_rate_limiter.check_rate_limit("parse_stage2", identifier)
    if not is_allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Maximum {API_RATE_LIMIT_MAX_REQUESTS} requests per {API_RATE_LIMIT_WINDOW_SECONDS} seconds. Please wait before trying again."
        )
    
    # 2. Concurrency control
    request_id = str(uuid.uuid4())
    acquired = await _global_concurrency_controller.acquire(run_id, request_id)
    if not acquired:
        raise HTTPException(
            status_code=429,
            detail=f"Another parse request is already in progress for this run. Please wait for it to complete."
        )
    
    try:
        # 3. Server-side attempt limit check
        tracker = ParseAttemptTracker(store)
        is_locked, total_count, consecutive_unhelpful = await tracker.check_stage2_limit(project_id, run_id)
        if is_locked:
            reason = "maximum attempts reached" if total_count >= BACKEND_STAGE2_MAX_TOTAL_ATTEMPTS else "consecutive unhelpful responses"
            raise HTTPException(
                status_code=403,
                detail=f"Parse stage2 limit reached ({reason}). Service refused."
            )
        
        user_id = request.state.user_id
        project = await store.get_project(project_id, user_id)
        if project is None:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Use lighter validation for parse stage 2 (allows some repetition, focuses on word quality)
        from app.input_text_validate import input_text_validate_for_adjustment
        tv = input_text_validate_for_adjustment(req.user_additional_info)
        if not tv.get("ok"):
            raise HTTPException(status_code=400, detail=f"Text validate failed: {tv.get('reason') or 'Invalid input.'}")
        
        try:
            data = await parse_stage2(store, project_id, run_id, req.current_description, req.user_additional_info)
            
            # Increment attempt count after successful LLM call
            is_helpful = data.get("is_helpful", False)
            await tracker.increment_stage2_attempt(project_id, run_id, is_helpful)
            
            return {"data": data}
        except FileNotFoundError:
            raise HTTPException(status_code=404, detail="Run not found")
        except RuntimeError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=502, detail=f"Upstream HTTP error: {e.response.status_code}") from e
    finally:
        # Always release concurrency slot
        await _global_concurrency_controller.release(run_id, request_id)


@app.post("/api/projects/{project_id}/runs/{run_id}/parse")
async def phase1_parse(request: Request, project_id: str, run_id: str, req: UpdateResearchDescriptionRequest) -> dict:
    user_id = request.state.user_id
    project = await store.get_project(project_id, user_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    # Backend validation (quality checks - frontend already did format checks)
    # Skip validation if skip_validation flag is set (e.g., for normalized_understanding from LLM)
    if not req.skip_validation:
        tv = input_text_validate(req.research_description)
        if not tv.get("ok"):
            raise HTTPException(status_code=400, detail=f"Text validate failed: {tv.get('reason') or 'Invalid input.'}")
    try:
        data = await step_parse(store, project_id, run_id, req.research_description)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Run not found")
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"data": data}


@app.put("/api/projects/{project_id}/runs/{run_id}/slots")
async def phase1_update_slots(request: Request, project_id: str, run_id: str, req: UpdateSlotsRequest) -> dict:
    user_id = request.state.user_id
    project = await store.get_project(project_id, user_id)
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
async def phase1_synonyms(request: Request, project_id: str, run_id: str) -> dict:
    user_id = request.state.user_id
    project = await store.get_project(project_id, user_id)
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
async def phase1_update_keywords(request: Request, project_id: str, run_id: str, req: UpdateKeywordsRequest) -> dict:
    user_id = request.state.user_id
    project = await store.get_project(project_id, user_id)
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
async def phase1_query_build(request: Request, project_id: str, run_id: str) -> dict:
    user_id = request.state.user_id
    project = await store.get_project(project_id, user_id)
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
async def phase1_update_queries(request: Request, project_id: str, run_id: str, req: UpdateQueriesRequest) -> dict:
    user_id = request.state.user_id
    project = await store.get_project(project_id, user_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        await store.write_run_file(project_id, run_id, "queries.json", req.model_dump())
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Run not found")
    return {"ok": True}


@app.put("/api/projects/{project_id}/runs/{run_id}/retrieval-framework")
async def phase1_update_retrieval_framework(request: Request, project_id: str, run_id: str, req: UpdateRetrievalFrameworkRequest) -> dict:
    user_id = request.state.user_id
    project = await store.get_project(project_id, user_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        understanding = await store.read_run_file(project_id, run_id, "understanding.json")
        understanding["retrieval_framework"] = req.retrieval_framework
        await store.write_run_file(project_id, run_id, "understanding.json", understanding)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Run not found")
    return {"ok": True}


@app.post("/api/projects/{project_id}/runs/{run_id}/retrieval-framework/adjust")
async def adjust_retrieval_framework_route(request: Request, project_id: str, run_id: str, req: AdjustRetrievalFrameworkRequest) -> dict:
    """Adjust the Retrieval Framework based on user input."""
    from app.guardrail_config import RETRIEVAL_FRAMEWORK_ADJUST_MAX_ATTEMPTS
    from app.input_text_validate import input_text_validate
    
    user_id = request.state.user_id
    project = await store.get_project(project_id, user_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Backend validation (lighter validation for adjustment inputs - no repetition checks)
    from app.input_text_validate import input_text_validate_for_adjustment
    tv = input_text_validate_for_adjustment(req.user_additional_info)
    if not tv.get("ok"):
        raise HTTPException(status_code=400, detail=f"Text validate failed: {tv.get('reason') or 'Invalid input.'}")
    
    try:
        # Get current framework
        understanding = await store.read_run_file(project_id, run_id, "understanding.json")
        current_framework = understanding.get("retrieval_framework") or ""
        if not current_framework:
            raise HTTPException(status_code=400, detail="No current retrieval framework found. Please generate framework first.")
        
        # Check attempt limit (stored in understanding.json)
        adjust_history = understanding.get("retrieval_framework_adjust_history", [])
        if len(adjust_history) >= RETRIEVAL_FRAMEWORK_ADJUST_MAX_ATTEMPTS:
            raise HTTPException(
                status_code=403,
                detail=f"Retrieval framework adjustment limit reached ({RETRIEVAL_FRAMEWORK_ADJUST_MAX_ATTEMPTS} attempts). Service refused."
            )
        
        # Call adjustment function
        result = await adjust_retrieval_framework(store, project_id, run_id, current_framework, req.user_additional_info)
        new_framework = result["retrieval_framework"]
        
        # Update history
        from datetime import datetime, timezone
        adjust_history.append({
            "user_input": req.user_additional_info,
            "framework": new_framework,
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
        understanding["retrieval_framework_adjust_history"] = adjust_history
        await store.write_run_file(project_id, run_id, "understanding.json", understanding)
        
        return {"ok": True, "retrieval_framework": new_framework}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Run not found")
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================
# Phase 2: Authorship & Geographic Mapping
# ============================================================

class IngestRequest(BaseModel):
    force_refresh: bool = False


@app.get("/api/projects/{project_id}/runs/{run_id}/authorship/stats")
async def phase2_authorship_stats(request: Request, project_id: str, run_id: str) -> dict:
    user_id = request.state.user_id
    """
    Get authorship statistics for a run (check if data exists).
    
    Returns summary stats from existing authorship data in database,
    or null if no data exists yet.
    """
    project = await store.get_project(project_id, user_id)
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
                func.sum(case((Authorship.country.isnot(None), 1), else_=0)).label('affiliations_with_country'),
                func.count(func.distinct(Authorship.author_name_raw)).label('unique_authors'),
                func.count(func.distinct(Authorship.country)).label('unique_countries'),
                func.count(func.distinct(Authorship.institution)).label('unique_institutions')
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
                    "unique_authors": stats.unique_authors or 0,
                    "unique_countries": stats.unique_countries or 0,
                    "unique_institutions": stats.unique_institutions or 0,
                    "errors": []
                }
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")


@app.post("/api/projects/{project_id}/runs/{run_id}/ingest")
async def phase2_ingest(request: Request, project_id: str, run_id: str, req: IngestRequest = IngestRequest()) -> dict:
    user_id = request.state.user_id
    """
    Ingest papers from Phase 1 into authorship database.
    
    This endpoint:
    1. Loads PMIDs from Phase 1 results
    2. Fetches PubMed XML (with caching)
    3. Parses authors and affiliations
    4. Extracts geographic data via LLM
    5. Stores in PostgreSQL database
    """
    project = await store.get_project(project_id, user_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    logger = logging.getLogger(__name__)
    
    try:
        logger.info("=" * 80)
        logger.info(f"🚀 INGESTION STARTED - Project: {project_id}, Run: {run_id}")
        logger.info(f"   Force refresh: {req.force_refresh}")
        logger.info("=" * 80)
        
        pipeline = PostgresIngestionPipeline(
            project_id=project_id,
            api_key=settings.pubmed_api_key or None
        )
        
        stats = await pipeline.ingest_run(
            run_id=run_id,
            store=store,
            force_refresh=req.force_refresh
        )
        
        logger.info("=" * 80)
        logger.info(f"✅ INGESTION COMPLETED - Project: {project_id}, Run: {run_id}")
        logger.info(f"   Total PMIDs: {stats.total_pmids}")
        logger.info(f"   Papers parsed: {stats.papers_parsed}")
        logger.info(f"   Authorships created: {stats.authorships_created}")
        logger.info(f"   Unique affiliations: {stats.unique_affiliations}")
        logger.info(f"   Affiliations with country: {stats.affiliations_with_country}")
        logger.info(f"   LLM calls made: {stats.llm_calls_made}")
        logger.info("=" * 80)
        
        return {"stats": stats.model_dump()}
        
    except FileNotFoundError as e:
        logger.error(f"❌ INGESTION FAILED - File not found: {e}")
        raise HTTPException(status_code=404, detail="Run not found")
    except Exception as e:
        logger.error(f"❌ INGESTION FAILED - Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")


@app.post("/api/projects/{project_id}/runs/{run_id}/validate-affiliations")
async def phase2_validate_affiliations(request: Request, project_id: str, run_id: str) -> dict:
    """
    Validate and fix affiliation extraction errors for a run.
    
    This endpoint:
    1. Checks all authorships for geocoding failures
    2. Identifies affiliations with extraction errors
    3. Uses LLM to fix errors
    4. Updates affiliation_cache and geocoding_cache
    5. Updates authorship records in database
    
    Returns:
        Dict with validation and fix statistics
    """
    user_id = request.state.user_id
    project = await store.get_project(project_id, user_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    logger = logging.getLogger(__name__)
    
    try:
        logger.info("=" * 80)
        logger.info(f"🔍 VALIDATION STARTED - Project: {project_id}, Run: {run_id}")
        logger.info("=" * 80)
        
        from app.phase2.affiliation_validator import AffiliationValidator
        validator = AffiliationValidator()
        validation_stats = await validator.validate_and_fix_run(run_id, project_id)
        
        logger.info("=" * 80)
        logger.info(f"✅ VALIDATION COMPLETED - Project: {project_id}, Run: {run_id}")
        logger.info(f"   Total authorships: {validation_stats.get('total_authorships', 0)}")
        logger.info(f"   Geocoding failures: {validation_stats.get('nominatim_failures', 0)}")
        logger.info(f"   Affiliations fixed: {validation_stats.get('llm_fixes', 0)}")
        logger.info(f"   Authorships updated: {validation_stats.get('authorship_updates', 0)}")
        logger.info(f"   Geocoding updated: {validation_stats.get('geocoding_updates', 0)}")
        logger.info("=" * 80)
        
        return {"stats": validation_stats}
        
    except Exception as e:
        logger.error(f"❌ VALIDATION FAILED - Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")


# ============================================================
# Phase 2B: Map Visualization APIs
# ============================================================

@app.get("/api/projects/{project_id}/runs/{run_id}/map/world")
async def phase2_map_world(
    request: Request,
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
    user_id = request.state.user_id
    project = await store.get_project(project_id, user_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    logger = logging.getLogger(__name__)
    
    try:
        logger.info("=" * 80)
        logger.info(f"🗺️  MAP OPERATION - World Map - Project: {project_id}, Run: {run_id}")
        logger.info(f"   Min confidence: {min_confidence}")
        logger.info("=" * 80)
        
        aggregator = PostgresMapAggregator()
        data = await aggregator.get_world_map(run_id, min_confidence)
        
        logger.info(f"✅ MAP OPERATION COMPLETED - World Map")
        logger.info(f"   Countries returned: {len(data)}")
        logger.info("=" * 80)
        
        return {"data": data}
        
    except Exception as e:
        logger.error(f"❌ MAP OPERATION FAILED - World Map: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Aggregation failed: {str(e)}")


@app.get("/api/projects/{project_id}/runs/{run_id}/map/country/{country}")
async def phase2_map_country(request: Request, 
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
    user_id = request.state.user_id
    project = await store.get_project(project_id, user_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    logger = logging.getLogger(__name__)
    
    try:
        logger.info("=" * 80)
        logger.info(f"🗺️  MAP OPERATION - Country Map - Project: {project_id}, Run: {run_id}")
        logger.info(f"   Country: {country}, Min confidence: {min_confidence}")
        logger.info("=" * 80)
        
        aggregator = PostgresMapAggregator()
        data = await aggregator.get_country_map(run_id, country, min_confidence)
        
        logger.info(f"✅ MAP OPERATION COMPLETED - Country Map: {country}")
        logger.info(f"   Cities returned: {len(data)}")
        logger.info("=" * 80)
        
        return {"data": data}
        
    except Exception as e:
        logger.error(f"❌ MAP OPERATION FAILED - Country Map ({country}): {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Aggregation failed: {str(e)}")


@app.get("/api/projects/{project_id}/runs/{run_id}/map/city/{country}/{city}")
async def phase2_map_city(request: Request, 
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
    user_id = request.state.user_id
    project = await store.get_project(project_id, user_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    logger = logging.getLogger(__name__)
    
    try:
        logger.info("=" * 80)
        logger.info(f"🗺️  MAP OPERATION - City Map - Project: {project_id}, Run: {run_id}")
        logger.info(f"   Country: {country}, City: {city}, Min confidence: {min_confidence}")
        logger.info("=" * 80)
        
        aggregator = PostgresMapAggregator()
        data = await aggregator.get_city_map(run_id, country, city, min_confidence)
        
        logger.info(f"✅ MAP OPERATION COMPLETED - City Map: {city}, {country}")
        logger.info(f"   Institutions returned: {len(data)}")
        logger.info("=" * 80)
        
        return {"data": data}
        
    except Exception as e:
        logger.error(f"❌ MAP OPERATION FAILED - City Map ({city}, {country}): {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Aggregation failed: {str(e)}")


@app.get("/api/projects/{project_id}/runs/{run_id}/map/institution")
async def phase2_map_institution(request: Request, 
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
    user_id = request.state.user_id
    project = await store.get_project(project_id, user_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not country or not city:
        raise HTTPException(status_code=400, detail="country and city are required")
    
    logger = logging.getLogger(__name__)
    
    try:
        logger.info("=" * 80)
        logger.info(f"🗺️  MAP OPERATION - Institution Scholars - Project: {project_id}, Run: {run_id}")
        logger.info(f"   Institution: {institution}, Country: {country}, City: {city}")
        logger.info(f"   Min confidence: {min_confidence}")
        logger.info("=" * 80)
        
        aggregator = PostgresMapAggregator()
        data = await aggregator.get_institution_scholars(
            run_id=run_id,
            country=country,
            city=city,
            institution=institution,
            min_confidence=min_confidence
        )
        
        logger.info(f"✅ MAP OPERATION COMPLETED - Institution Scholars: {institution}")
        logger.info(f"   Scholars returned: {len(data)}")
        logger.info("=" * 80)
        
        return {"scholars": data}
        
    except Exception as e:
        logger.error(f"❌ MAP OPERATION FAILED - Institution Scholars ({institution}): {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Aggregation failed: {str(e)}")


# ============================================================
# Admin: Resource Monitoring APIs (Super User Only)
# ============================================================

async def verify_super_user(request: Request) -> None:
    """Verify that the current user is a super user."""
    user_id = request.state.user_id
    async with db_manager.session() as session:
        user_repo = UserRepository(session)
        user = await user_repo.get_user_by_id(user_id)
        if not user or user.email != settings.super_user_email:
            raise HTTPException(
                status_code=403,
                detail="Super user access required"
            )


@app.post("/api/admin/resource-monitor/snapshot")
async def admin_take_snapshot(request: Request) -> dict:
    """
    Manually trigger a resource snapshot (super user only).
    
    This endpoint:
    1. Collects table row counts (metric 1)
    2. Collects disk sizes (metric 2)
    3. Saves snapshot to database (UPSERT by date)
    
    Returns snapshot data including:
    - Table row counts (users, runs, papers, etc.)
    - Disk sizes (MB)
    - Timestamp
    """
    await verify_super_user(request)
    
    logger = logging.getLogger(__name__)
    
    try:
        logger.info("=" * 80)
        logger.info("📊 ADMIN: Manual resource snapshot triggered")
        logger.info("=" * 80)
        
        async with db_manager.session() as session:
            repo = ResourceMonitorRepository(session)
            snapshot = await repo.take_snapshot()
            
            logger.info("✅ ADMIN: Snapshot completed")
            logger.info(f"   Snapshot ID: {snapshot.id}")
            logger.info(f"   Users: {snapshot.users_count}")
            logger.info(f"   Runs: {snapshot.runs_count}")
            logger.info(f"   Total Disk: {snapshot.total_disk_size_mb:.2f} MB")
            logger.info("=" * 80)
            
            return {
                "snapshot": {
                    "id": snapshot.id,
                    "snapshot_date": snapshot.snapshot_date.isoformat(),
                    "snapshot_time": snapshot.snapshot_time.isoformat(),
                    # Metric 1: Row counts
                    "users_count": snapshot.users_count,
                    "projects_count": snapshot.projects_count,
                    "runs_count": snapshot.runs_count,
                    "papers_count": snapshot.papers_count,
                    "authorship_count": snapshot.authorship_count,
                    "run_papers_count": snapshot.run_papers_count,
                    "affiliation_cache_count": snapshot.affiliation_cache_count,
                    "geocoding_cache_count": snapshot.geocoding_cache_count,
                    "institution_geo_count": snapshot.institution_geo_count,
                    # Metric 2: Disk sizes
                    "total_disk_size_mb": snapshot.total_disk_size_mb,
                    "users_disk_mb": snapshot.users_disk_mb,
                    "projects_disk_mb": snapshot.projects_disk_mb,
                    "runs_disk_mb": snapshot.runs_disk_mb,
                    "papers_disk_mb": snapshot.papers_disk_mb,
                    "authorship_disk_mb": snapshot.authorship_disk_mb,
                    "run_papers_disk_mb": snapshot.run_papers_disk_mb,
                    "affiliation_cache_disk_mb": snapshot.affiliation_cache_disk_mb,
                    "geocoding_cache_disk_mb": snapshot.geocoding_cache_disk_mb,
                    "institution_geo_disk_mb": snapshot.institution_geo_disk_mb,
                }
            }
    except Exception as e:
        logger.error(f"❌ ADMIN: Snapshot failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Snapshot failed: {str(e)}")


@app.get("/api/admin/resource-monitor/stats")
async def admin_get_stats(request: Request, days: int = 30) -> dict:
    """
    Get resource monitoring statistics (super user only).
    
    Query params:
    - days: Number of days of history to return (default 30)
    
    Returns:
    - Historical snapshots for the last N days
    - Current day's snapshot (if exists)
    
    Frontend will use this data to display trend charts.
    """
    await verify_super_user(request)
    
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"📊 ADMIN: Fetching resource stats (last {days} days)")
        
        async with db_manager.session() as session:
            repo = ResourceMonitorRepository(session)
            snapshots = await repo.get_snapshots(days=days)
            
            logger.info(f"✅ ADMIN: Stats retrieved ({len(snapshots)} snapshots)")
            
            return {
                "snapshots": [
                    {
                        "id": s.id,
                        "snapshot_date": s.snapshot_date.isoformat(),
                        "snapshot_time": s.snapshot_time.isoformat(),
                        # Metric 1: Row counts
                        "users_count": s.users_count,
                        "projects_count": s.projects_count,
                        "runs_count": s.runs_count,
                        "papers_count": s.papers_count,
                        "authorship_count": s.authorship_count,
                        "run_papers_count": s.run_papers_count,
                        "affiliation_cache_count": s.affiliation_cache_count,
                        "geocoding_cache_count": s.geocoding_cache_count,
                        "institution_geo_count": s.institution_geo_count,
                        # Metric 2: Disk sizes
                        "total_disk_size_mb": s.total_disk_size_mb,
                        "users_disk_mb": s.users_disk_mb,
                        "projects_disk_mb": s.projects_disk_mb,
                        "runs_disk_mb": s.runs_disk_mb,
                        "papers_disk_mb": s.papers_disk_mb,
                        "authorship_disk_mb": s.authorship_disk_mb,
                        "run_papers_disk_mb": s.run_papers_disk_mb,
                        "affiliation_cache_disk_mb": s.affiliation_cache_disk_mb,
                        "geocoding_cache_disk_mb": s.geocoding_cache_disk_mb,
                        "institution_geo_disk_mb": s.institution_geo_disk_mb,
                    }
                    for s in snapshots
                ]
            }
    except Exception as e:
        logger.error(f"❌ ADMIN: Failed to fetch stats: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {str(e)}")


@app.get("/api/admin/resource-monitor/online-users")
async def admin_get_online_users(request: Request) -> dict:
    """
    Get current online user count (super user only).
    
    Returns:
    - online_count: Number of users active in the last 5 minutes (metric 5)
    - last_updated: Timestamp of query
    """
    await verify_super_user(request)
    
    logger = logging.getLogger(__name__)
    
    try:
        logger.info("👥 ADMIN: Fetching online user count")
        
        async with db_manager.session() as session:
            repo = UserActivityRepository(session)
            online_count = await repo.get_online_user_count(minutes=5)
            
            logger.info(f"✅ ADMIN: Online users: {online_count}")
            
            from datetime import datetime, timezone
            return {
                "online_count": online_count,
                "last_updated": datetime.now(timezone.utc).isoformat(),
            }
    except Exception as e:
        logger.error(f"❌ ADMIN: Failed to fetch online users: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch online users: {str(e)}")
