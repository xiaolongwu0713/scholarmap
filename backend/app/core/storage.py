from __future__ import annotations

import json
import os
import re
import shutil
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


_SAFE_PROJECT_ID = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$")
_SAFE_FILENAME = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$")


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _atomic_write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = path.with_suffix(path.suffix + ".tmp")
    with tmp_path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    os.replace(tmp_path, path)


@dataclass(frozen=True)
class Project:
    project_id: str
    name: str
    created_at: str


@dataclass(frozen=True)
class Run:
    run_id: str
    created_at: str
    description: str


class FileStore:
    def __init__(self, root_dir: str) -> None:
        self.root = Path(root_dir).resolve()

    def _project_dir(self, project_id: str) -> Path:
        if not _SAFE_PROJECT_ID.match(project_id):
            raise ValueError("Invalid project_id")
        return self.root / "projects" / project_id

    def _runs_dir(self, project_id: str) -> Path:
        return self._project_dir(project_id) / "runs"

    def _run_dir(self, project_id: str, run_id: str) -> Path:
        if not _SAFE_PROJECT_ID.match(run_id):
            raise ValueError("Invalid run_id")
        return self._runs_dir(project_id) / f"run_{run_id}"

    def list_projects(self) -> list[Project]:
        base = self.root / "projects"
        if not base.exists():
            return []
        projects: list[Project] = []
        for child in base.iterdir():
            if not child.is_dir():
                continue
            meta_path = child / "project.json"
            if not meta_path.exists():
                continue
            with meta_path.open("r", encoding="utf-8") as f:
                meta = json.load(f)
            projects.append(
                Project(
                    project_id=meta["project_id"],
                    name=meta.get("name", meta["project_id"]),
                    created_at=meta.get("created_at", ""),
                )
            )
        projects.sort(key=lambda p: p.created_at, reverse=True)
        return projects

    def create_project(self, name: str) -> Project:
        project_id = uuid.uuid4().hex[:12]
        created_at = _utc_now_iso()
        project_dir = self._project_dir(project_id)
        project_dir.mkdir(parents=True, exist_ok=False)
        meta = {"project_id": project_id, "name": name, "created_at": created_at}
        _atomic_write_json(project_dir / "project.json", meta)
        return Project(project_id=project_id, name=name, created_at=created_at)

    def get_project(self, project_id: str) -> Project | None:
        meta_path = self._project_dir(project_id) / "project.json"
        if not meta_path.exists():
            return None
        with meta_path.open("r", encoding="utf-8") as f:
            meta = json.load(f)
        return Project(
            project_id=meta["project_id"],
            name=meta.get("name", meta["project_id"]),
            created_at=meta.get("created_at", ""),
        )

    def list_runs(self, project_id: str) -> list[Run]:
        runs_dir = self._runs_dir(project_id)
        if not runs_dir.exists():
            return []
        runs: list[Run] = []
        for child in runs_dir.iterdir():
            if not child.is_dir():
                continue
            understanding_path = child / "understanding.json"
            if not understanding_path.exists():
                continue
            with understanding_path.open("r", encoding="utf-8") as f:
                u = json.load(f)
            run_id = child.name.replace("run_", "", 1)
            runs.append(
                Run(
                    run_id=run_id,
                    created_at=u.get("created_at", ""),
                    description=u.get("research_description", ""),
                )
            )
        runs.sort(key=lambda r: r.created_at, reverse=True)
        return runs

    def create_run(self, project_id: str, research_description: str) -> Run:
        run_id = uuid.uuid4().hex[:12]
        created_at = _utc_now_iso()
        run_dir = self._run_dir(project_id, run_id)
        run_dir.mkdir(parents=True, exist_ok=False)

        understanding = {
            "created_at": created_at,
            "research_description": research_description,
            "initial_research_description": research_description,
            "clarification_rounds": [],
            "final_interpretation": "",
            "slots_raw": {
                "research_goal": "",
                "task": [],
                "method_measurement": [],
                "method_algorithm": [],
                "subject_population": [],
                "signal_feature": [],
                "output_target": [],
                "context": [],
            },
            "slots_normalized": {
                "research_goal": "",
                "task": [],
                "method_measurement": [],
                "method_algorithm": [],
                "subject_population": [],
                "signal_feature": [],
                "output_target": [],
                "context": [],
            },
        }
        keywords = {"canonical_terms": [], "synonyms": {}, "updated_at": created_at}
        queries = {"pubmed": "", "semantic_scholar": "", "openalex": "", "updated_at": created_at}
        _atomic_write_json(run_dir / "understanding.json", understanding)
        _atomic_write_json(run_dir / "keywords.json", keywords)
        _atomic_write_json(run_dir / "queries.json", queries)

        return Run(run_id=run_id, created_at=created_at, description=research_description)

    def read_run_file(self, project_id: str, run_id: str, filename: str) -> dict[str, Any]:
        if not _SAFE_FILENAME.match(filename):
            raise ValueError("Invalid filename")
        path = self._run_dir(project_id, run_id) / filename
        if not path.exists():
            raise FileNotFoundError(filename)
        with path.open("r", encoding="utf-8") as f:
            return json.load(f)

    def write_run_file(self, project_id: str, run_id: str, filename: str, data: dict[str, Any]) -> None:
        if not _SAFE_FILENAME.match(filename):
            raise ValueError("Invalid filename")
        path = self._run_dir(project_id, run_id) / filename
        _atomic_write_json(path, data)

    def list_run_files(self, project_id: str, run_id: str) -> list[str]:
        run_dir = self._run_dir(project_id, run_id)
        if not run_dir.exists():
            raise FileNotFoundError("run")
        return sorted([p.name for p in run_dir.iterdir() if p.is_file() and p.suffix == ".json"])

    def delete_run(self, project_id: str, run_id: str) -> None:
        """Delete a run and all its files."""
        run_dir = self._run_dir(project_id, run_id)
        if run_dir.exists():
            shutil.rmtree(run_dir)
