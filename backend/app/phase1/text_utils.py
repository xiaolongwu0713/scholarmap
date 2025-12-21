from __future__ import annotations

import re


def normalize_doi(doi: str | None) -> str | None:
    if not doi:
        return None
    d = doi.strip()
    d = re.sub(r"^https?://(dx\.)?doi\.org/", "", d, flags=re.IGNORECASE)
    d = d.replace("DOI:", "").strip()
    d = d.lower()
    return d or None


def tokenize_term(term: str) -> list[str]:
    cleaned = re.sub(r"[^A-Za-z0-9]+", " ", term).strip()
    if not cleaned:
        return []
    return [t for t in cleaned.split(" ") if t]


def acronym(term: str) -> str | None:
    parts = tokenize_term(term)
    if len(parts) < 2:
        return None
    letters = "".join(p[0].upper() for p in parts if p and p[0].isalpha())
    if len(letters) < 2:
        return None
    return letters


def morphological_variants(term: str) -> list[str]:
    t = term.strip()
    if not t:
        return []
    variants = {t}
    variants.add(t.replace("-", " "))
    variants.add(t.replace(" ", "-"))

    if t.endswith("s"):
        variants.add(t[:-1])
    else:
        variants.add(t + "s")
    return sorted(v for v in variants if v)

