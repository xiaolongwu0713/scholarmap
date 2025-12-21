from __future__ import annotations

from app.phase1.models import QueryOutputs, Slots


def _or_block(items: list[str]) -> str:
    cleaned = [i.strip() for i in items if i and i.strip()]
    if not cleaned:
        return ""
    if len(cleaned) == 1:
        return cleaned[0]
    return "(" + " OR ".join(cleaned) + ")"


def build_pubmed_query(terms_by_slot: dict[str, list[str]]) -> str:
    blocks: list[str] = []
    for slot, terms in terms_by_slot.items():
        slot_terms = []
        for t in terms:
            if " " in t or "-" in t:
                slot_terms.append(f"\"{t}\"[tiab]")
            else:
                slot_terms.append(f"{t}[tiab]")
        b = _or_block(slot_terms)
        if b:
            blocks.append(b)
    return " AND ".join(blocks)


def build_s2_query(terms_by_slot: dict[str, list[str]]) -> str:
    items: list[str] = []
    for terms in terms_by_slot.values():
        items.extend([t for t in terms if t and t.strip()])
    if not items:
        return ""
    if len(items) == 1:
        return items[0]
    return " ".join(items)


def build_openalex_query(terms_by_slot: dict[str, list[str]]) -> str:
    items: list[str] = []
    for terms in terms_by_slot.values():
        items.extend([t for t in terms if t and t.strip()])
    if not items:
        return ""
    return " OR ".join([f"\"{t}\"" if (" " in t or "-" in t) else t for t in items])


def build_queries(slots: Slots, synonyms: dict[str, list[str]]) -> QueryOutputs:
    canonical_terms = []
    for field in [
        "task",
        "method_measurement",
        "method_algorithm",
        "subject_population",
        "signal_feature",
        "output_target",
        "context",
    ]:
        canonical_terms.extend(getattr(slots, field))

    terms_by_slot: dict[str, list[str]] = {}
    for field in [
        "task",
        "method_measurement",
        "method_algorithm",
        "subject_population",
        "signal_feature",
        "output_target",
        "context",
    ]:
        expanded: list[str] = []
        for t in getattr(slots, field):
            expanded.append(t)
            expanded.extend(synonyms.get(t, []))
        terms_by_slot[field] = expanded

    return QueryOutputs(
        pubmed=build_pubmed_query(terms_by_slot),
        semantic_scholar=build_s2_query(terms_by_slot),
        openalex=build_openalex_query(terms_by_slot),
    )

