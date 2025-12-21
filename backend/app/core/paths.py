from __future__ import annotations

from pathlib import Path


def find_repo_root(start: Path | None = None) -> Path:
    p = (start or Path(__file__)).resolve()
    for candidate in [p, *p.parents]:
        if (candidate / "prompts").is_dir():
            return candidate
    return p.parent


def prompts_dir() -> Path:
    return find_repo_root() / "prompts"


def log_file_path() -> Path:
    return find_repo_root() / "log.txt"


def get_data_dir() -> Path:
    """Get data directory from config."""
    from app.core.config import settings
    return Path(settings.scholarmap_data_dir).resolve()
