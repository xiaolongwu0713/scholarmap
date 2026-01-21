from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.core.audit_log import append_log
from app.core.paths import prompts_dir
from app.core.storage import FileStore
from app.parse_protection import sanitize_user_input, check_prompt_length
from app.phase1.llm import OpenAIClient


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _read_prompt(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _extract_json_object(text: str) -> dict[str, Any]:
    s = (text or "").strip()
    if not s:
        raise RuntimeError("LLM returned empty response")

    # Fast path: direct JSON object.
    if s.startswith("{") and s.endswith("}"):
        return json.loads(s)

    # Remove common code fences.
    s2 = re.sub(r"^```(?:json)?\s*|\s*```$", "", s, flags=re.IGNORECASE).strip()
    if s2.startswith("{") and s2.endswith("}"):
        return json.loads(s2)

    # Best-effort: find first '{' and last '}'.
    start = s2.find("{")
    end = s2.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise RuntimeError("LLM returned non-JSON content")
    return json.loads(s2[start : end + 1])


def _require_fields(obj: dict[str, Any], required: list[str]) -> None:
    missing = [k for k in required if k not in obj]
    if missing:
        raise RuntimeError(f"LLM JSON missing fields: {', '.join(missing)}")


async def parse_stage1(store: FileStore, project_id: str, run_id: str, candidate_description: str) -> dict[str, Any]:
    # Sanitize user input to prevent prompt injection
    sanitized_description = sanitize_user_input(candidate_description)
    
    prompt_path = prompts_dir() / "parse_stage1_understanding.md"
    template = _read_prompt(prompt_path)
    prompt = template.replace("<<<CANDIDATE_DESCRIPTION>>>", sanitized_description)
    
    # Check prompt length before calling LLM
    is_valid, current_length, max_length = check_prompt_length(prompt)
    if not is_valid:
        raise RuntimeError(
            f"Prompt length ({current_length} chars) exceeds maximum ({max_length} chars). "
            "Please reduce the input text length."
        )

    llm = OpenAIClient()
    append_log(
        "parse.stage1.prompt",
        {
            "project_id": project_id,
            "run_id": run_id,
            "model": llm.model,
            "reasoning_effort": getattr(llm, "reasoning_effort", ""),
            "prompt_file": str(prompt_path),
            "prompt": prompt,
        },
    )
    raw = await llm.complete_text(
        prompt, 
        temperature=0.0,
        log_context={"project_id": project_id, "run_id": run_id, "stage": "stage1"}
    )
    append_log(
        "parse.stage1.response",
        {"project_id": project_id, "run_id": run_id, "model": llm.model, "response": raw},
    )

    data = _extract_json_object(raw)
    _require_fields(
        data,
        [
            "plausibility_level",
            "is_research_description",
            "is_clear_for_search",
            "normalized_understanding",
            "structured_summary",
            "uncertainties",
            "missing_fields",
            "suggested_questions",
        ],
    )

    understanding = await store.read_run_file(project_id, run_id, "understanding.json")
    if not understanding.get("initial_research_description"):
        understanding["initial_research_description"] = candidate_description
    parse_stage1_payload = {
        "updated_at": _utc_now_iso(),
        "prompt_file": str(prompt_path),
        "result": data,
    }
    understanding["parse_stage1"] = parse_stage1_payload
    understanding["parse"] = {
        "stage": "stage1",
        "current_description": candidate_description,
        "result": data,
        "updated_at": _utc_now_iso(),
    }
    await store.write_run_file(project_id, run_id, "understanding.json", understanding)
    await store.write_run_file(
        project_id,
        run_id,
        "parse_stage1.json",
        parse_stage1_payload,
    )

    return data


async def parse_stage2(
    store: FileStore,
    project_id: str,
    run_id: str,
    current_description: str,
    user_additional_info: str,
) -> dict[str, Any]:
    prompt_path = prompts_dir() / "parse_stage2_converge.md"
    template = _read_prompt(prompt_path)
    
    # Get the last question from history if available
    understanding = await store.read_run_file(project_id, run_id, "understanding.json")
    prev = (understanding.get("parse") or {}) if isinstance(understanding, dict) else {}
    question_for_user = ""
    if isinstance(prev, dict) and isinstance(prev.get("result"), dict):
        last_result = prev.get("result", {})
        suggested_questions = last_result.get("suggested_questions", [])
        if suggested_questions and len(suggested_questions) > 0:
            # Combine all questions into one string
            question_for_user = "\n".join([q.get("question", "") for q in suggested_questions if q.get("question")])
    
    # Sanitize user inputs to prevent prompt injection
    sanitized_current = sanitize_user_input(current_description)
    sanitized_additional = sanitize_user_input(user_additional_info or "")
    
    prompt = (
        template.replace("<<<CURRENT_DESCRIPTION>>>", sanitized_current)
        .replace("<<<QUESTION_FOR_USER>>>", question_for_user.strip())
        .replace("<<<USER_ADDITIONAL_INFO>>>", sanitized_additional)
    )
    
    # Check prompt length before calling LLM
    is_valid, current_length, max_length = check_prompt_length(prompt)
    if not is_valid:
        raise RuntimeError(
            f"Prompt length ({current_length} chars) exceeds maximum ({max_length} chars). "
            "Please reduce the input text length."
        )

    llm = OpenAIClient()
    append_log(
        "parse.stage2.prompt",
        {
            "project_id": project_id,
            "run_id": run_id,
            "model": llm.model,
            "reasoning_effort": getattr(llm, "reasoning_effort", ""),
            "prompt_file": str(prompt_path),
            "prompt": prompt,
        },
    )
    raw = await llm.complete_text(
        prompt, 
        temperature=0.0,
        log_context={"project_id": project_id, "run_id": run_id, "stage": "stage2"}
    )
    append_log(
        "parse.stage2.response",
        {"project_id": project_id, "run_id": run_id, "model": llm.model, "response": raw},
    )

    data = _extract_json_object(raw)
    _require_fields(
        data,
        [
            "plausibility_level",
            "is_research_description",
            "is_clear_for_search",
            "normalized_understanding",
            "structured_summary",
            "uncertainties",
            "missing_fields",
            "suggested_questions",
        ],
    )

    understanding = await store.read_run_file(project_id, run_id, "understanding.json")
    prev = (understanding.get("parse") or {}) if isinstance(understanding, dict) else {}
    history = []
    if isinstance(prev, dict) and isinstance(prev.get("history"), list):
        history = prev["history"]
    history = history + [
        {
            "current_description": current_description,
            "user_additional_info": user_additional_info,
            "result": data,
            "updated_at": _utc_now_iso(),
        }
    ]
    understanding["parse"] = {
        "stage": "stage2",
        "current_description": current_description,
        "last_user_additional_info": user_additional_info,
        "result": data,
        "history": history[-10:],
        "updated_at": _utc_now_iso(),
    }
    await store.write_run_file(project_id, run_id, "understanding.json", understanding)
    await store.write_run_file(
        project_id,
        run_id,
        "parse_stage2.json",
        {"updated_at": _utc_now_iso(), "prompt_file": str(prompt_path), "result": data},
    )

    return data
