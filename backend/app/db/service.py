"""Database service layer - provides FileStore-like interface."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.db.connection import db_manager
from app.db.repository import ProjectRepository, RunRepository


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


class DatabaseStore:
    """Database-backed storage service with FileStore-compatible interface."""
    
    async def list_projects(self) -> list[ProjectDTO]:
        """List all projects."""
        async with db_manager.session() as session:
            repo = ProjectRepository(session)
            projects = await repo.list_projects()
            return [
                ProjectDTO(
                    project_id=p.project_id,
                    name=p.name,
                    created_at=p.created_at.isoformat()
                )
                for p in projects
            ]
    
    async def get_project(self, project_id: str) -> ProjectDTO | None:
        """Get project by ID."""
        async with db_manager.session() as session:
            repo = ProjectRepository(session)
            project = await repo.get_project(project_id)
            if not project:
                return None
            return ProjectDTO(
                project_id=project.project_id,
                name=project.name,
                created_at=project.created_at.isoformat()
            )
    
    async def create_project(self, name: str) -> ProjectDTO:
        """Create a new project."""
        async with db_manager.session() as session:
            repo = ProjectRepository(session)
            project = await repo.create_project(name)
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
    
    async def read_run_file(
        self,
        project_id: str,
        run_id: str,
        filename: str
    ) -> dict[str, Any]:
        """Read run data file (emulates file-based storage)."""
        async with db_manager.session() as session:
            repo = RunRepository(session)
            run = await repo.get_run(run_id)
            if not run:
                raise FileNotFoundError(f"Run {run_id} not found")
            
            # Map filenames to run attributes
            if filename == "understanding.json":
                return run.understanding or {}
            elif filename == "keywords.json":
                return run.keywords or {}
            elif filename == "queries.json":
                return run.queries or {}
            elif filename == "results.json":
                return run.results or {}
            elif filename == "retrieval_framework.json":
                return {"retrieval_framework": run.retrieval_framework or ""}
            # Support result files stored in results JSON
            elif filename == "results_pubmed.json":
                results = run.results or {}
                return results.get("pubmed", {"items": [], "count": 0})
            elif filename == "results_semantic_scholar.json":
                results = run.results or {}
                return results.get("semantic_scholar", {"items": [], "count": 0})
            elif filename == "results_openalex.json":
                results = run.results or {}
                return results.get("openalex", {"items": [], "count": 0})
            elif filename == "results_aggregated.json":
                results = run.results or {}
                return results.get("aggregated", {"items": [], "count": 0})
            else:
                raise FileNotFoundError(f"File {filename} not found")
    
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
                run = await repo.get_run(run_id)
                if not run:
                    raise FileNotFoundError(f"Run {run_id} not found")
                results = run.results or {}
                results["aggregated"] = data
                await repo.update_results(run_id, results)
            else:
                raise ValueError(f"Invalid filename: {filename}")
    
    async def list_run_files(self, project_id: str, run_id: str) -> list[str]:
        """List all data files for a run."""
        async with db_manager.session() as session:
            repo = RunRepository(session)
            run = await repo.get_run(run_id)
            if not run:
                raise FileNotFoundError(f"Run {run_id} not found")
            
            # Return available file names
            files = []
            if run.understanding:
                files.append("understanding.json")
            if run.keywords:
                files.append("keywords.json")
            if run.queries:
                files.append("queries.json")
            if run.results:
                files.append("results.json")
                # Add individual result files if they exist
                results = run.results or {}
                if "pubmed" in results:
                    files.append("results_pubmed.json")
                if "semantic_scholar" in results:
                    files.append("results_semantic_scholar.json")
                if "openalex" in results:
                    files.append("results_openalex.json")
                if "aggregated" in results:
                    files.append("results_aggregated.json")
            if run.retrieval_framework:
                files.append("retrieval_framework.json")
            
            return sorted(files)

