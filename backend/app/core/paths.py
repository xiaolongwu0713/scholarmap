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
    """Get data directory from config.
    
    If the path is relative, it's resolved relative to the repository root.
    If absolute, it's used as-is.
    """
    import sys
    from pathlib import Path
    
    # Add repo root to path to import config
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
    import config
    settings = config.settings
    data_dir = Path(settings.scholarmap_data_dir)
    if data_dir.is_absolute():
        return data_dir
    # Resolve relative paths from repo root
    return (find_repo_root() / data_dir).resolve()
