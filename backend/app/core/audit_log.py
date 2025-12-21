from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.core.paths import log_file_path


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def append_log(event: str, payload: dict[str, Any]) -> None:
    path: Path = log_file_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    entry = {"ts": _utc_now_iso(), "event": event, **payload}
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")

