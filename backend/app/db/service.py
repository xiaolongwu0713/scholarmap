"""Database service layer - provides FileStore-like interface."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.db.connection import db_manager
from sqlalchemy import select

from app.db.models import Run
from app.db.repository import ProjectRepository, RunRepository
from app.auth.repository import UserRepository

# Import config for super user check
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
import config
settings = config.settings


# Per-source result "files" stored as keys of Run.results
_RESULT_FILES = {
    "results_pubmed.json": "pubmed",
    "results_semantic_scholar.json": "semantic_scholar",
    "results_openalex.json": "openalex",
    "results_aggregated.json": "aggregated",
}


@dataclass(frozen=True)
class ProjectDTO:
    """Project data transfer object (compatible with FileStore)."""
    project_id: str
    name: str
    created_at: str


@dataclass(frozen=True)
class RunDTO:
    """Run data transfer object (compatible with FileStore)."""
    run_id: str
    created_at: str
    description: str


async def is_super_user(user_id: str) -> bool:
    """Check if a user is a super user."""
    async with db_manager.session() as session:
        user_repo = UserRepository(session)
        user = await user_repo.get_user_by_id(user_id)
        if not user:
            return False
        # Check if user's email matches super user email
        return user.email.lower().strip() == settings.super_user_email.lower().strip()


class DatabaseStore:
    """Database-backed storage service with FileStore-compatible interface."""
    
    async def list_projects(self, user_id: str) -> list[ProjectDTO]:
        """List all projects for a user."""
        async with db_manager.session() as session:
            repo = ProjectRepository(session)
            projects = await repo.list_projects(user_id)
            return [
                ProjectDTO(
                    project_id=p.project_id,
                    name=p.name,
                    created_at=p.created_at.isoformat()
                )
                for p in projects
            ]
    
    async def get_project(self, project_id: str, user_id: str) -> ProjectDTO | None:
        """Get project by ID for a user. Super users, demo users, and public share users can access any project."""
        # Check if user is super user or demo user accessing demo project
        is_demo_access = (user_id == "demo_user" and project_id == settings.demo_project_id)
        is_public_share_access = (
            user_id == "public_share_user"
            and not settings.share_run_auth_check_enabled
        )
        
        if await is_super_user(user_id) or is_demo_access or is_public_share_access:
            # Super user or demo user: don't filter by user_id
            async with db_manager.session() as session:
                repo = ProjectRepository(session)
                project = await repo.get_project(project_id, None)
                if not project:
                    return None
                return ProjectDTO(
                    project_id=project.project_id,
                    name=project.name,
                    created_at=project.created_at.isoformat()
                )
        else:
            # Regular user: filter by user_id
            async with db_manager.session() as session:
                repo = ProjectRepository(session)
                project = await repo.get_project(project_id, user_id)
                if not project:
                    return None
                return ProjectDTO(
                    project_id=project.project_id,
                    name=project.name,
                    created_at=project.created_at.isoformat()
                )
    
    async def create_project(self, user_id: str, name: str) -> ProjectDTO:
        """Create a new project for a user."""
        async with db_manager.session() as session:
            repo = ProjectRepository(session)
            project = await repo.create_project(user_id, name)
            return ProjectDTO(
                project_id=project.project_id,
                name=project.name,
                created_at=project.created_at.isoformat()
            )
    
    async def list_runs(self, project_id: str) -> list[RunDTO]:
        """List all runs for a project."""
        async with db_manager.session() as session:
            repo = RunRepository(session)
            runs = await repo.list_runs(project_id)
            return [
                RunDTO(
                    run_id=r.run_id,
                    created_at=r.created_at.isoformat(),
                    description=r.description
                )
                for r in runs
            ]
    
    async def create_run(self, project_id: str, description: str) -> RunDTO:
        """Create a new run."""
        async with db_manager.session() as session:
            repo = RunRepository(session)
            run = await repo.create_run(project_id, description)
            return RunDTO(
                run_id=run.run_id,
                created_at=run.created_at.isoformat(),
                description=run.description
            )
    
    async def run_belongs_to_project(self, project_id: str, run_id: str) -> bool:
        """Check that a run exists and belongs to the given project."""
        async with db_manager.session() as session:
            repo = RunRepository(session)
            run = await repo.get_run(run_id)
            return run is not None and run.project_id == project_id

    async def read_run_file(
        self,
        project_id: str,
        run_id: str,
        filename: str
    ) -> dict[str, Any]:
        """Read run data file (emulates file-based storage).

        Selects only the column (or results key) the file maps to: results holds
        every paper and is MBs, so loading the whole run made small files slow.
        """
        if filename == "understanding.json":
            expr, wrap = Run.understanding, None
        elif filename == "keywords.json":
            expr, wrap = Run.keywords, None
        elif filename == "queries.json":
            expr, wrap = Run.queries, None
        elif filename == "results.json":
            expr, wrap = Run.results, None
        elif filename == "retrieval_framework.json":
            expr, wrap = Run.retrieval_framework, "retrieval_framework"
        elif filename in ("parse_stage1.json", "parse_stage2.json"):
            expr, wrap = Run.understanding[filename.removesuffix(".json")], None
        elif filename in _RESULT_FILES:
            expr, wrap = Run.results[_RESULT_FILES[filename]], None
        else:
            raise FileNotFoundError(f"File {filename} not found")

        async with db_manager.session() as session:
            row = (await session.execute(
                select(expr).where(Run.run_id == run_id)
            )).first()
        if row is None:
            raise FileNotFoundError(f"Run {run_id} not found")
        value = row[0]
        if wrap:
            return {wrap: value or ""}
        if filename in _RESULT_FILES:
            return value or {"items": [], "count": 0}
        return value or {}
    
    async def write_run_file(
        self,
        project_id: str,
        run_id: str,
        filename: str,
        data: dict[str, Any]
    ) -> None:
        """Write run data file (emulates file-based storage)."""
        async with db_manager.session() as session:
            repo = RunRepository(session)
            
            # Map filenames to repository methods
            if filename == "understanding.json":
                await repo.update_understanding(run_id, data)
            elif filename == "keywords.json":
                await repo.update_keywords(run_id, data)
            elif filename == "queries.json":
                await repo.update_queries(run_id, data)
            elif filename == "results.json":
                await repo.update_results(run_id, data)
            elif filename == "retrieval_framework.json":
                await repo.update_retrieval_framework(
                    run_id,
                    data.get("retrieval_framework", "")
                )
            elif filename == "parse_stage1.json":
                run = await repo.get_run(run_id)
                if not run:
                    raise FileNotFoundError(f"Run {run_id} not found")
                current = run.understanding or {}
                current["parse_stage1"] = data
                await repo.update_understanding(run_id, current)
            elif filename == "parse_stage2.json":
                run = await repo.get_run(run_id)
                if not run:
                    raise FileNotFoundError(f"Run {run_id} not found")
                current = run.understanding or {}
                current["parse_stage2"] = data
                await repo.update_understanding(run_id, current)
            # Support result files - merge into results JSON
            elif filename == "results_pubmed.json":
                run = await repo.get_run(run_id)
                if not run:
                    raise FileNotFoundError(f"Run {run_id} not found")
                results = run.results or {}
                results["pubmed"] = data
                await repo.update_results(run_id, results)
            elif filename == "results_semantic_scholar.json":
                run = await repo.get_run(run_id)
                if not run:
                    raise FileNotFoundError(f"Run {run_id} not found")
                results = run.results or {}
                results["semantic_scholar"] = data
                await repo.update_results(run_id, results)
            elif filename == "results_openalex.json":
                run = await repo.get_run(run_id)
                if not run:
                    raise FileNotFoundError(f"Run {run_id} not found")
                results = run.results or {}
                results["openalex"] = data
                await repo.update_results(run_id, results)
            elif filename == "results_aggregated.json":
                # CRITICAL: Re-read the run to get the latest results data
                # This ensures we have the most up-to-date data including pubmed, etc.
                # that may have been written in previous write_run_file calls
                run = await repo.get_run(run_id)
                if not run:
                    raise FileNotFoundError(f"Run {run_id} not found")
                # Refresh the object from database to ensure we have latest data
                await session.refresh(run)
                # Get existing results and merge aggregated data
                # IMPORTANT: Create a new dict to avoid mutating the original
                # This ensures we preserve all existing result sources (pubmed, semantic_scholar, openalex)
                results = dict(run.results) if run.results else {}
                results["aggregated"] = data
                # Update results - this will merge with existing data
                await repo.update_results(run_id, results)
            else:
                raise ValueError(f"Invalid filename: {filename}")
    
    async def list_run_files(self, project_id: str, run_id: str) -> list[str]:
        """List all data files for a run (without loading the large results column)."""
        def present(expr):
            return expr.isnot(None)

        checks = {
            "understanding.json": present(Run.understanding),
            "parse_stage1.json": present(Run.understanding["parse_stage1"]),
            "parse_stage2.json": present(Run.understanding["parse_stage2"]),
            "keywords.json": present(Run.keywords),
            "queries.json": present(Run.queries),
            "results.json": present(Run.results),
            "retrieval_framework.json": present(Run.retrieval_framework),
            **{name: present(Run.results[key]) for name, key in _RESULT_FILES.items()},
        }
        async with db_manager.session() as session:
            row = (await session.execute(
                select(*checks.values()).where(Run.run_id == run_id)
            )).first()
        if row is None:
            raise FileNotFoundError(f"Run {run_id} not found")
        return sorted(name for name, exists in zip(checks, row) if exists)
    
    async def delete_run(self, project_id: str, run_id: str) -> None:
        """Delete a run and all its data."""
        async with db_manager.session() as session:
            repo = RunRepository(session)
            await repo.delete_run(run_id)
            await session.commit()
