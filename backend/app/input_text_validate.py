from __future__ import annotations

import re
from collections import Counter
from typing import Any

from spellchecker import SpellChecker
from wordfreq import zipf_frequency

VOWELS = set("aeiou")

# Base QC1 constraints (non-LLM)
_MD_LINK_RE = re.compile(r"\[[^\]]+\]\([^)]+\)")
_URL_RE = re.compile(r"(https?://|www\.)\S+", re.IGNORECASE)
_EMAIL_RE = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE)
_PHONE_RE = re.compile(r"\b(?:\+?\d[\d\s().-]{7,}\d)\b")
_WECHAT_RE = re.compile(r"\b(wechat|weixin|wxid|vx)\b", re.IGNORECASE)

# Only process English-ish tokens: letters + hyphen/apostrophe (phase-locked, don't)
WORD_RE = re.compile(r"[A-Za-z]+(?:[-'][A-Za-z]+)*")

# Technical-shape exemptions to avoid false positives (acronyms, digits, compounds, CamelCase)
TECH_OK_RE = re.compile(
    r"""
^(
  [A-Z]{2,10} |                         # EEG, BCI, LLM
  [A-Za-z]+[-_][A-Za-z0-9]+ |            # phase-locked, tms_eeg
  [A-Za-z]*\d+[A-Za-z0-9-]* |            # GPT4, 3D, BERT-base
  [A-Za-z]+[A-Z][A-Za-z0-9]*             # CamelCase: OpenAI, ChatGPT
)$
""",
    re.VERBOSE,
)

_spell = SpellChecker(language="en")


def is_gibberish_shape(tok: str) -> bool:
    """
    Morphological gibberish detector (dictionary-free).
    Only used as a risk signal.
    """
    t = tok.lower()

    # Very long alpha-only token is suspicious (conservative)
    if len(t) >= 25:
        return True

    # 4+ repeated chars: aaaa
    if re.search(r"(.)\1{3,}", t):
        return True

    # long consonant runs
    if re.search(r"[bcdfghjklmnpqrstvwxyz]{6,}", t):
        return True

    # vowel ratio too low (len>=7)
    if len(t) >= 7:
        vr = sum(c in VOWELS for c in t) / len(t)
        if vr < 0.20:
            return True

    # low character diversity (len>=7)
    if len(t) >= 7 and (len(set(t)) / len(t) < 0.35):
        return True

    return False


def classify_word_en(tok: str) -> str:
    """
    Returns: correct / misspelled / unknown
    """
    w = tok.strip()
    if not WORD_RE.fullmatch(w):
        return "unknown"

    # 1) Technical-shape exemption
    if TECH_OK_RE.match(w):
        return "correct"

    wl = w.lower()

    # 2) High-frequency words => correct
    if zipf_frequency(wl, "en") >= 3.0:
        return "correct"

    # 3) Dictionary hit
    if wl in _spell:
        return "correct"

    # 4) Correction candidate: only accept if candidate is high-frequency
    cand = _spell.correction(wl)
    if cand and cand != wl:
        if zipf_frequency(cand, "en") >= 3.0:
            return "misspelled"

    return "unknown"


def repeated_word_trigrams(tokens_lower: list[str]) -> int:
    """Number of repeated word trigrams (trigram count >=2)."""
    if len(tokens_lower) < 3:
        return 0
    trigrams = [tuple(tokens_lower[i : i + 3]) for i in range(len(tokens_lower) - 2)]
    c = Counter(trigrams)
    return sum(1 for _, v in c.items() if v >= 2)


def analyze_english_text(text: str) -> dict[str, Any]:
    """
    Output:
    - correct/misspelled/unknown ratios
    - gibberish token ratio
    - repetition metrics
    - recommended_illegal + reason
    """
    tokens = WORD_RE.findall(text or "")
    tokens_lower = [t.lower() for t in tokens]

    total = len(tokens)
    if total == 0:
        return {
            "total_words": 0,
            "correct_ratio": 1.0,
            "misspelled_ratio": 0.0,
            "unknown_ratio": 0.0,
            "gibberish_token_ratio": 0.0,
            "unique_token_ratio": 1.0,
            "repeated_token_ratio": 0.0,
            "repeated_word_trigrams": 0,
            "recommended_illegal": True,
            "reason": "no_english_tokens",
            "counts": {"correct": 0, "misspelled": 0, "unknown": 0},
            "spellchecker_available": True,
            "wordfreq_available": True,
        }

    counts = {"correct": 0, "misspelled": 0, "unknown": 0}
    gib = 0

    for t in tokens:
        cls = classify_word_en(t)
        counts[cls] += 1
        if is_gibberish_shape(t):
            gib += 1

    correct_ratio = counts["correct"] / total
    misspelled_ratio = counts["misspelled"] / total
    unknown_ratio = counts["unknown"] / total
    gib_ratio = gib / total

    tok_counts = Counter(tokens_lower)
    unique = len(tok_counts)
    unique_token_ratio = unique / total
    repeated_token_ratio = sum(1 for _, v in tok_counts.items() if v >= 2) / unique
    trigram_repeats = repeated_word_trigrams(tokens_lower)

    # Recommended illegal heuristic (as provided; tunable)
    recommended_illegal = False
    reason = "ok"
    if total >= 10:
        if (gib_ratio >= 0.60 or misspelled_ratio >= 0.40) and (
            unique_token_ratio <= 0.65 or repeated_token_ratio >= 0.25 or trigram_repeats >= 1
        ):
            recommended_illegal = True
            reason = "gibberish_or_misspelled_with_repetition"

    return {
        "total_words": total,
        "correct_ratio": round(correct_ratio, 3),
        "misspelled_ratio": round(misspelled_ratio, 3),
        "unknown_ratio": round(unknown_ratio, 3),
        "gibberish_token_ratio": round(gib_ratio, 3),
        "unique_token_ratio": round(unique_token_ratio, 3),
        "repeated_token_ratio": round(repeated_token_ratio, 3),
        "repeated_word_trigrams": trigram_repeats,
        "recommended_illegal": recommended_illegal,
        "reason": reason,
        "counts": counts,
        "spellchecker_available": True,
        "wordfreq_available": True,
    }


def input_text_validate(text: str) -> dict[str, Any]:
    """
    Unified input text validator (base checks + English word quality).
    Returns: { ok: bool, reason: str | null, stats?: dict }
    """
    s = (text or "").strip()
    if not s:
        return {"ok": False, "reason": "Input is empty."}

    if len(s) < 50 or len(s) > 300:
        return {"ok": False, "reason": "Length must be 50–300 characters."}

    if s.count("\n") > 5:
        return {"ok": False, "reason": "Too many line breaks (max 5)."}

    if re.search(r"[^\x00-\x7F]", s):
        return {"ok": False, "reason": "Must be English only (ASCII characters)."}

    if re.search(r"<[^>]+>", s):
        return {"ok": False, "reason": "HTML / rich-text tags are not allowed."}

    if _MD_LINK_RE.search(s):
        return {"ok": False, "reason": "Markdown links are not allowed."}

    if _URL_RE.search(s):
        return {"ok": False, "reason": "URLs are not allowed."}

    if _EMAIL_RE.search(s):
        return {"ok": False, "reason": "Email addresses are not allowed."}

    if _PHONE_RE.search(s):
        return {"ok": False, "reason": "Phone numbers are not allowed."}

    if _WECHAT_RE.search(s):
        return {"ok": False, "reason": "WeChat IDs are not allowed."}

    if not re.search(r"[A-Za-z]", s):
        return {"ok": False, "reason": "Must contain English words (letters A–Z)."}

    if re.search(r"\d{6,}", s):
        return {"ok": False, "reason": "Long consecutive numbers are not allowed."}

    if re.search(r"(.)\1{5,}", s, flags=re.IGNORECASE):
        return {"ok": False, "reason": "Repeated characters are not allowed."}

    if re.search(r"[A-Za-z]{25,}", s):
        return {"ok": False, "reason": "Long consecutive letters are not allowed."}

    stats = analyze_english_text(s)
    illegal = (
        bool(stats.get("recommended_illegal"))
        or float(stats.get("gibberish_token_ratio") or 0.0) >= 0.60
        or float(stats.get("misspelled_ratio") or 0.0) >= 0.40
        or float(stats.get("unique_token_ratio") or 1.0) <= 0.65
        or float(stats.get("repeated_token_ratio") or 0.0) >= 0.25
        or int(stats.get("repeated_word_trigrams") or 0) >= 1
    )
    if illegal:
        return {
            "ok": False,
            "reason": (
                "English word quality check failed: "
                f"gibberish={stats.get('gibberish_token_ratio')}, "
                f"misspelled={stats.get('misspelled_ratio')}, "
                f"unique={stats.get('unique_token_ratio')}, "
                f"repeated={stats.get('repeated_token_ratio')}, "
                f"trigram={stats.get('repeated_word_trigrams')}."
            ),
            "stats": stats,
        }

    return {"ok": True, "reason": None, "stats": stats}
