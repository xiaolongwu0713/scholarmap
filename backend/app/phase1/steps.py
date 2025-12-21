from __future__ import annotations

import asyncio
import re
from datetime import datetime, timezone
from pathlib import Path

from app.core.audit_log import append_log
from app.core.config import settings
from app.core.paths import prompts_dir
from app.core.storage import FileStore
from app.phase1.aggregate import aggregate_by_doi, serialize_papers
from app.phase1.llm import OpenAIClient
from app.phase1.models import QueryOutputs, Slots
from app.phase1.query_builder import build_queries
from app.phase1.sources.openalex import search_openalex
from app.phase1.sources.pubmed import search_pubmed
from app.phase1.sources.semantic_scholar import search_semantic_scholar
from app.phase1.text_utils import acronym, morphological_variants


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _enabled_sources() -> list[str]:
    raw = (settings.scholarnet_enabled_sources or "").strip()
    if not raw:
        return ["pubmed"]
    items = [p.strip().lower() for p in raw.split(",") if p.strip()]
    allowed = {"pubmed", "semantic_scholar", "openalex"}
    out = [s for s in items if s in allowed]
    return out or ["pubmed"]


def _read_prompt(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _inject_between(template: str, begin: str, end: str, content: str) -> str:
    if begin not in template or end not in template:
        # fallback to naive replacement
        return template.replace("xxxxxx", content)
    pre, rest = template.split(begin, 1)
    _, post = rest.split(end, 1)
    return pre + begin + "\n" + content.strip() + "\n" + end + post


def _extract_terms_from_framework(framework_markdown: str) -> list[str]:
    # best-effort: extract terms listed after "Normalized Search Terms:" lines
    terms: list[str] = []
    for line in framework_markdown.splitlines():
        if "Normalized Search Terms" not in line:
            continue
        # allow formats like "- Normalized Search Terms: a, b, c"
        _, _, tail = line.partition(":")
        tail = tail.strip()
        if not tail:
            continue
        for part in re.split(r"[;,]", tail):
            t = part.strip().strip('"').strip()
            if t:
                terms.append(t)
    # de-dup
    out: list[str] = []
    seen: set[str] = set()
    for t in terms:
        k = t.lower()
        if k in seen:
            continue
        seen.add(k)
        out.append(t)
    return out


def _extract_final_pubmed_query(text: str) -> str:
    """
    Extract the final PubMed query from the LLM output.
    Expected format includes a ```text fenced block under 'Final Combined PubMed Query'.
    """
    m = re.search(
        r"##\s*Final Combined PubMed Query[\s\S]*?```text\s*([\s\S]*?)\s*```",
        text,
        re.IGNORECASE,
    )
    if m:
        q = m.group(1).strip()
        return q
    m2 = re.search(r"```text\s*([\s\S]*?)\s*```", text, re.IGNORECASE)
    if m2:
        return m2.group(1).strip()
    return text.strip()


def _aggregate_single_source(papers: list[dict], source: str) -> list[dict]:
    aggregated: list[dict] = []
    for p in papers:
        doi = (p.get("doi") or "").strip().lower()
        pmid = (p.get("pmid") or "").strip()
        title = (p.get("title") or "").strip()
        stable_id = doi or pmid or f"title:{title.lower()}" if title else ""
        aggregated.append(
            {
                "id": stable_id,
                "doi": doi or None,
                "title": p.get("title") or "",
                "authors": p.get("authors") or [],
                "year": p.get("year"),
                "venue": p.get("venue"),
                "abstract": p.get("abstract"),
                "identifiers": {"doi": doi or None, "pmid": pmid or None},
                "sources": [source],
                "links": [{"source": source, "url": p.get("url")}],
            }
        )
    return aggregated

def _clarification_questions(slots: Slots) -> list[str]:
    missing: list[tuple[str, str]] = []
    if not slots.task:
        missing.append(("task", "你的核心研究任务/目标是什么？例如 speech decoding / literature review / classification"))
    if not slots.method_measurement:
        missing.append(("method_measurement", "是否涉及特定数据采集/测量方式？例如 fMRI / ECoG / EEG / survey"))
    if not slots.subject_population:
        missing.append(("subject_population", "研究对象/人群/材料是什么？例如 human / mice / patients / dataset name"))
    if not slots.context:
        missing.append(("context", "应用场景/背景是什么？例如 clinical / rehabilitation / drug discovery"))
    if not slots.output_target:
        missing.append(("output_target", "模型/方法的输出目标是什么？例如 phonemes / diagnosis / segmentation"))

    return [q for _, q in missing][:3]


def _canonical_terms_from_slots(slots: Slots) -> list[str]:
    terms: list[str] = []
    for field in [
        "task",
        "method_measurement",
        "method_algorithm",
        "subject_population",
        "signal_feature",
        "output_target",
        "context",
    ]:
        terms.extend(getattr(slots, field))
    if slots.research_goal.strip():
        terms.append(slots.research_goal.strip())

    out: list[str] = []
    seen: set[str] = set()
    for t in terms:
        tt = t.strip()
        if not tt:
            continue
        k = tt.lower()
        if k in seen:
            continue
        seen.add(k)
        out.append(tt)
    return out


async def step_parse(store: FileStore, project_id: str, run_id: str, research_description: str) -> dict:
    """
    Parse step now produces a Conceptual Retrieval Framework (prompt-driven),
    and persists it for query construction.
    """
    prompt_path = prompts_dir() / "retrival_framework.md"
    template = _read_prompt(prompt_path)
    final_prompt = _inject_between(
        template,
        "-- research summary begin --",
        "-- research summary end --",
        research_description,
    )

    llm = OpenAIClient()
    append_log(
        "phase1.parse.prompt",
        {
            "project_id": project_id,
            "run_id": run_id,
            "model": llm.model,
            "reasoning_effort": getattr(llm, "reasoning_effort", ""),
            "prompt": final_prompt,
        },
    )
    framework = await llm.complete_text(final_prompt, temperature=0.0)
    append_log(
        "phase1.parse.response",
        {"project_id": project_id, "run_id": run_id, "model": llm.model, "response": framework},
    )

    understanding = store.read_run_file(project_id, run_id, "understanding.json")
    understanding["research_description"] = research_description
    understanding["retrieval_framework"] = framework
    understanding["parse_updated_at"] = _utc_now_iso()
    understanding["clarification_questions"] = []
    store.write_run_file(project_id, run_id, "understanding.json", understanding)
    store.write_run_file(
        project_id,
        run_id,
        "retrieval_framework.json",
        {"updated_at": _utc_now_iso(), "prompt_file": str(prompt_path), "framework": framework},
    )

    return {"retrieval_framework": framework}


async def step_synonyms(store: FileStore, project_id: str, run_id: str, slots_normalized: Slots | None = None) -> dict:
    if slots_normalized is None:
        understanding = store.read_run_file(project_id, run_id, "understanding.json")
        slots_normalized = Slots.model_validate(understanding.get("slots_normalized") or {})

    canonical_terms = _canonical_terms_from_slots(slots_normalized)
    llm = OpenAIClient()

    synonyms: dict[str, list[str]] = {}
    for term in canonical_terms:
        variants = morphological_variants(term)
        ac = acronym(term)
        if ac:
            variants.append(ac)

        llm_syns = []
        try:
            llm_syns = await llm.generate_synonyms(term)
        except Exception:
            llm_syns = []

        merged: list[str] = []
        seen: set[str] = set()
        for s in [*variants, *llm_syns]:
            ss = s.strip()
            if not ss:
                continue
            if ss.lower() == term.lower():
                continue
            k = ss.lower()
            if k in seen:
                continue
            seen.add(k)
            merged.append(ss)
        synonyms[term] = merged[:20]

    keywords = store.read_run_file(project_id, run_id, "keywords.json")
    keywords["canonical_terms"] = canonical_terms
    keywords["synonyms"] = synonyms
    keywords["updated_at"] = _utc_now_iso()
    store.write_run_file(project_id, run_id, "keywords.json", keywords)
    return {"canonical_terms": canonical_terms, "synonyms": synonyms}


async def step_query_build(store: FileStore, project_id: str, run_id: str) -> QueryOutputs:
    understanding = store.read_run_file(project_id, run_id, "understanding.json")
    framework = (understanding.get("retrieval_framework") or "").strip()
    if not framework:
        raise RuntimeError("Retrieval framework is empty. Run 'Parse' first.")

    prompt_path = prompts_dir() / "PubMed_query_construction.md"
    template = _read_prompt(prompt_path)
    final_prompt = _inject_between(
        template,
        "-- Conceptual Retrieval Framework begin --",
        "-- Conceptual Retrieval Framework end --",
        framework,
    )

    llm = OpenAIClient()
    append_log(
        "phase1.query_build.prompt",
        {
            "project_id": project_id,
            "run_id": run_id,
            "model": llm.model,
            "reasoning_effort": getattr(llm, "reasoning_effort", ""),
            "prompt": final_prompt,
        },
    )
    pubmed_query_text = await llm.complete_text(final_prompt, temperature=0.0)
    append_log(
        "phase1.query_build.response",
        {"project_id": project_id, "run_id": run_id, "model": llm.model, "response": pubmed_query_text},
    )

    pubmed_query = _extract_final_pubmed_query(pubmed_query_text)

    # Best-effort non-PubMed queries from framework terms (keeps 3-source pipeline usable)
    terms = _extract_terms_from_framework(framework)
    semantic_scholar_query = " ".join(terms)[:2000]
    openalex_query = " OR ".join([f"\"{t}\"" if (" " in t or "-" in t) else t for t in terms])[:2000]

    queries = QueryOutputs(
        pubmed=pubmed_query,
        pubmed_full=pubmed_query_text,
        semantic_scholar=semantic_scholar_query,
        openalex=openalex_query,
    )

    store.write_run_file(project_id, run_id, "queries.json", {**queries.model_dump(), "updated_at": _utc_now_iso()})
    return queries


async def step_retrieve(store: FileStore, project_id: str, run_id: str) -> dict:
    max_results = settings.scholarnet_max_results_per_source
    queries_json = store.read_run_file(project_id, run_id, "queries.json")
    queries = QueryOutputs.model_validate(queries_json)

    if not (queries.pubmed or queries.semantic_scholar or queries.openalex):
        raise RuntimeError("Queries are empty. Run 'Query build' first.")

    enabled = _enabled_sources()

    pubmed = []
    s2 = []
    oa = []
    if "pubmed" in enabled:
        pubmed = await search_pubmed(queries.pubmed, max_results=max_results)
    if "semantic_scholar" in enabled:
        s2 = await search_semantic_scholar(queries.semantic_scholar, max_results=max_results)
    if "openalex" in enabled:
        oa = await search_openalex(queries.openalex, max_results=max_results)

    store.write_run_file(project_id, run_id, "results_pubmed.json", {"items": serialize_papers(pubmed), "count": len(pubmed)})
    store.write_run_file(project_id, run_id, "results_semantic_scholar.json", {"items": serialize_papers(s2), "count": len(s2)})
    store.write_run_file(project_id, run_id, "results_openalex.json", {"items": serialize_papers(oa), "count": len(oa)})

    papers_by_source = {"pubmed": pubmed, "semantic_scholar": s2, "openalex": oa}
    counts = {k: len(v) for k, v in papers_by_source.items()}

    if enabled == ["pubmed"]:
        pubmed_serialized = serialize_papers(pubmed)
        aggregated = _aggregate_single_source(pubmed_serialized, "pubmed")
        store.write_run_file(
            project_id,
            run_id,
            "results_aggregated.json",
            {"items": aggregated, "count": len(aggregated), "dedupe_key": "single_source_passthrough"},
        )
        return {"counts": counts, "aggregated_count": len(aggregated), "max_results_per_source": max_results, "enabled_sources": enabled}

    aggregated, _ = aggregate_by_doi(papers_by_source)
    store.write_run_file(project_id, run_id, "results_aggregated.json", {"items": aggregated, "count": len(aggregated), "dedupe_key": "doi"})

    return {"counts": counts, "aggregated_count": len(aggregated), "max_results_per_source": max_results, "enabled_sources": enabled}
