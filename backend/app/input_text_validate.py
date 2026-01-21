from __future__ import annotations

import re
from collections import Counter
from typing import Any

from spellchecker import SpellChecker
from wordfreq import zipf_frequency

from app.guardrail_config import (
    TEXT_MIN_WORDS,
    TEXT_MAX_WORDS,
    TEXT_MAX_LINE_BREAKS,
    QUALITY_CHECK_WORD_COUNT_THRESHOLD,
    QUALITY_UNKNOWN_RATIO_THRESHOLD_10PLUS,
    QUALITY_INVALID_RATIO_THRESHOLD_10PLUS,
    QUALITY_GIBBERISH_RATIO_THRESHOLD_10PLUS,
    QUALITY_GIBBERISH_RATIO_SECONDARY_10PLUS,
    QUALITY_UNIQUE_TOKEN_RATIO_THRESHOLD,
    QUALITY_REPEATED_TOKEN_RATIO_THRESHOLD,
    QUALITY_REPEATED_TRIGRAM_THRESHOLD,
    QUALITY_CHECK_WORD_COUNT_MIN,
    QUALITY_UNKNOWN_RATIO_THRESHOLD_5_9,
    QUALITY_INVALID_RATIO_THRESHOLD_5_9,
    QUALITY_MISSPELLED_RATIO_THRESHOLD_SHORT,
    QUALITY_GIBBERISH_RATIO_THRESHOLD_SHORT,
    RECOMMENDED_ILLEGAL_UNKNOWN_RATIO_10PLUS,
    RECOMMENDED_ILLEGAL_GIBBERISH_RATIO_10PLUS,
    RECOMMENDED_ILLEGAL_MISSPELLED_RATIO_10PLUS,
    RECOMMENDED_ILLEGAL_UNIQUE_TOKEN_RATIO_10PLUS,
    RECOMMENDED_ILLEGAL_REPEATED_TOKEN_RATIO_10PLUS,
    RECOMMENDED_ILLEGAL_TRIGRAM_THRESHOLD_10PLUS,
    RECOMMENDED_ILLEGAL_UNKNOWN_RATIO_5_9,
    ADJUST_UNKNOWN_RATIO_THRESHOLD_10PLUS,
    ADJUST_INVALID_RATIO_THRESHOLD_10PLUS,
    ADJUST_GIBBERISH_RATIO_THRESHOLD_10PLUS,
    ADJUST_UNKNOWN_RATIO_THRESHOLD_5_9,
    ADJUST_INVALID_RATIO_THRESHOLD_5_9,
)

VOWELS = set("aeiou")

# Base text validate constraints (non-LLM)
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

    # vowel ratio too low
    # For longer words (>=7), require at least 20% vowels
    # For shorter words (4-6), require at least 20% vowels (relaxed from 25% to avoid false positives like "study")
    if len(t) >= 4:
        vr = sum(c in VOWELS for c in t) / len(t)
        threshold = 0.20  # Use same threshold for all words >= 4 chars
        if vr < threshold:
            return True

    # low character diversity
    # For longer words (>=7), require at least 35% unique chars
    # For shorter words (4-6), require at least 40% unique chars
    if len(t) >= 4:
        diversity = len(set(t)) / len(t)
        threshold = 0.35 if len(t) >= 7 else 0.40
        if diversity < threshold:
            return True

    # Suspicious consonant clusters (3+ consonants in a row for short words)
    if len(t) >= 4 and len(t) <= 8:
        if re.search(r"[bcdfghjklmnpqrstvwxyz]{4,}", t):
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

    # 2) Single letters: only accept if very high frequency (common words like 'a', 'i')
    if len(wl) == 1:
        if zipf_frequency(wl, "en") >= 4.0:  # Very strict for single letters
            return "correct"
        else:
            return "unknown"  # Most single letters are not valid words

    # 3) Very short words (2 chars): be strict
    if len(wl) == 2:
        if zipf_frequency(wl, "en") >= 3.5:  # Stricter threshold
            return "correct"
        elif wl in _spell:
            return "correct"
        else:
            # For 2-char words, if not in dict and low frequency, likely gibberish
            return "unknown"

    # 4) High-frequency words => correct
    if zipf_frequency(wl, "en") >= 3.0:
        return "correct"

    # 5) Dictionary hit
    if wl in _spell:
        return "correct"

    # 6) Correction candidate: be more strict
    # Only accept if correction is high-frequency AND the original word looks plausible
    cand = _spell.correction(wl)
    if cand and cand != wl:
        # Check if correction is high-frequency
        if zipf_frequency(cand, "en") >= 3.0:
            # Additional check: if original word is very short or looks like gibberish,
            # don't trust the correction
            if len(wl) <= 4 or is_gibberish_shape(wl):
                return "unknown"  # Likely gibberish, not a real misspelling
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
    if total >= QUALITY_CHECK_WORD_COUNT_THRESHOLD:
        # High unknown ratio indicates gibberish/nonsense words
        if unknown_ratio >= RECOMMENDED_ILLEGAL_UNKNOWN_RATIO_10PLUS:
            recommended_illegal = True
            reason = "too_many_unknown_words"
        elif (gib_ratio >= RECOMMENDED_ILLEGAL_GIBBERISH_RATIO_10PLUS or 
              misspelled_ratio >= RECOMMENDED_ILLEGAL_MISSPELLED_RATIO_10PLUS) and (
            unique_token_ratio <= RECOMMENDED_ILLEGAL_UNIQUE_TOKEN_RATIO_10PLUS or 
            repeated_token_ratio >= RECOMMENDED_ILLEGAL_REPEATED_TOKEN_RATIO_10PLUS or 
            trigram_repeats >= RECOMMENDED_ILLEGAL_TRIGRAM_THRESHOLD_10PLUS
        ):
            recommended_illegal = True
            reason = "gibberish_or_misspelled_with_repetition"
    elif total >= QUALITY_CHECK_WORD_COUNT_MIN:
        # For shorter texts, be more strict with unknown words
        if unknown_ratio >= RECOMMENDED_ILLEGAL_UNKNOWN_RATIO_5_9:
            recommended_illegal = True
            reason = "too_many_unknown_words"

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
    Backend text validator: only performs complex quality checks that frontend cannot do.
    Frontend already performs basic format checks (length, HTML, URL, email, etc.).
    Returns: { ok: bool, reason: str | null, stats?: dict }
    """
    s = (text or "").strip()
    if not s:
        return {"ok": False, "reason": "Input is empty."}

    # Double-check critical format rules as defense in depth
    word_count = len(WORD_RE.findall(s))
    if word_count < TEXT_MIN_WORDS or word_count > TEXT_MAX_WORDS:
        return {"ok": False, "reason": f"Word count must be {TEXT_MIN_WORDS}–{TEXT_MAX_WORDS} words."}

    if s.count("\n") > TEXT_MAX_LINE_BREAKS:
        return {"ok": False, "reason": f"Too many line breaks (max {TEXT_MAX_LINE_BREAKS})."}

    # Complex quality checks that require dictionaries and advanced algorithms (backend only)
    stats = analyze_english_text(s)
    total_words = stats.get("total_words", 0)
    unknown_ratio = float(stats.get("unknown_ratio") or 0.0)
    misspelled_ratio = float(stats.get("misspelled_ratio") or 0.0)
    gibberish_ratio = float(stats.get("gibberish_token_ratio") or 0.0)
    
    # Primary check: high unknown + misspelled word ratio indicates gibberish
    # For texts with >= 10 words, reject if (unknown + misspelled) >= 60%
    # This catches cases where gibberish words are misclassified as "misspelled"
    invalid_ratio = unknown_ratio + misspelled_ratio
    
    # Track specific failure reasons for clearer error messages
    failure_reasons = []
    
    if total_words >= QUALITY_CHECK_WORD_COUNT_THRESHOLD:
        if unknown_ratio >= QUALITY_UNKNOWN_RATIO_THRESHOLD_10PLUS:
            failure_reasons.append(f"too_many_unknown_words (ratio: {unknown_ratio:.1%}, threshold: {QUALITY_UNKNOWN_RATIO_THRESHOLD_10PLUS:.1%})")
        elif invalid_ratio >= QUALITY_INVALID_RATIO_THRESHOLD_10PLUS:
            failure_reasons.append(f"too_many_invalid_words (unknown+misspelled ratio: {invalid_ratio:.1%}, threshold: {QUALITY_INVALID_RATIO_THRESHOLD_10PLUS:.1%})")
        elif gibberish_ratio >= QUALITY_GIBBERISH_RATIO_THRESHOLD_10PLUS:
            failure_reasons.append(f"too_many_gibberish_words (ratio: {gibberish_ratio:.1%}, threshold: {QUALITY_GIBBERISH_RATIO_THRESHOLD_10PLUS:.1%})")
        else:
            # Check secondary quality metrics
            if bool(stats.get("recommended_illegal")):
                failure_reasons.append(f"recommended_illegal (reason: {stats.get('reason', 'unknown')})")
            if float(stats.get("gibberish_token_ratio") or 0.0) >= QUALITY_GIBBERISH_RATIO_SECONDARY_10PLUS:
                failure_reasons.append(f"too_many_gibberish_words_secondary (ratio: {gibberish_ratio:.1%}, threshold: {QUALITY_GIBBERISH_RATIO_SECONDARY_10PLUS:.1%})")
            if float(stats.get("unique_token_ratio") or 1.0) <= QUALITY_UNIQUE_TOKEN_RATIO_THRESHOLD:
                unique_ratio = float(stats.get("unique_token_ratio") or 1.0)
                failure_reasons.append(f"too_low_unique_token_ratio (ratio: {unique_ratio:.1%}, threshold: {QUALITY_UNIQUE_TOKEN_RATIO_THRESHOLD:.1%})")
            if float(stats.get("repeated_token_ratio") or 0.0) >= QUALITY_REPEATED_TOKEN_RATIO_THRESHOLD:
                repeated_ratio = float(stats.get("repeated_token_ratio") or 0.0)
                failure_reasons.append(f"too_many_repeated_tokens (ratio: {repeated_ratio:.1%}, threshold: {QUALITY_REPEATED_TOKEN_RATIO_THRESHOLD:.1%})")
            if int(stats.get("repeated_word_trigrams") or 0) >= QUALITY_REPEATED_TRIGRAM_THRESHOLD:
                trigram_count = int(stats.get("repeated_word_trigrams") or 0)
                failure_reasons.append(f"too_many_repeated_trigrams (count: {trigram_count}, threshold: {QUALITY_REPEATED_TRIGRAM_THRESHOLD})")
    elif total_words >= QUALITY_CHECK_WORD_COUNT_MIN:
        if unknown_ratio >= QUALITY_UNKNOWN_RATIO_THRESHOLD_5_9:
            failure_reasons.append(f"too_many_unknown_words (ratio: {unknown_ratio:.1%}, threshold: {QUALITY_UNKNOWN_RATIO_THRESHOLD_5_9:.1%})")
        elif invalid_ratio >= QUALITY_INVALID_RATIO_THRESHOLD_5_9:
            failure_reasons.append(f"too_many_invalid_words (unknown+misspelled ratio: {invalid_ratio:.1%}, threshold: {QUALITY_INVALID_RATIO_THRESHOLD_5_9:.1%})")
        else:
            # Check secondary quality metrics
            if bool(stats.get("recommended_illegal")):
                failure_reasons.append(f"recommended_illegal (reason: {stats.get('reason', 'unknown')})")
            if float(stats.get("gibberish_token_ratio") or 0.0) >= QUALITY_GIBBERISH_RATIO_THRESHOLD_SHORT:
                failure_reasons.append(f"too_many_gibberish_words (ratio: {gibberish_ratio:.1%}, threshold: {QUALITY_GIBBERISH_RATIO_THRESHOLD_SHORT:.1%})")
            if float(stats.get("misspelled_ratio") or 0.0) >= QUALITY_MISSPELLED_RATIO_THRESHOLD_SHORT:
                failure_reasons.append(f"too_many_misspelled_words (ratio: {misspelled_ratio:.1%}, threshold: {QUALITY_MISSPELLED_RATIO_THRESHOLD_SHORT:.1%})")
            if float(stats.get("unique_token_ratio") or 1.0) <= QUALITY_UNIQUE_TOKEN_RATIO_THRESHOLD:
                unique_ratio = float(stats.get("unique_token_ratio") or 1.0)
                failure_reasons.append(f"too_low_unique_token_ratio (ratio: {unique_ratio:.1%}, threshold: {QUALITY_UNIQUE_TOKEN_RATIO_THRESHOLD:.1%})")
            if float(stats.get("repeated_token_ratio") or 0.0) >= QUALITY_REPEATED_TOKEN_RATIO_THRESHOLD:
                repeated_ratio = float(stats.get("repeated_token_ratio") or 0.0)
                failure_reasons.append(f"too_many_repeated_tokens (ratio: {repeated_ratio:.1%}, threshold: {QUALITY_REPEATED_TOKEN_RATIO_THRESHOLD:.1%})")
            if int(stats.get("repeated_word_trigrams") or 0) >= QUALITY_REPEATED_TRIGRAM_THRESHOLD:
                trigram_count = int(stats.get("repeated_word_trigrams") or 0)
                failure_reasons.append(f"too_many_repeated_trigrams (count: {trigram_count}, threshold: {QUALITY_REPEATED_TRIGRAM_THRESHOLD})")
    else:
        # For very short texts (< 5 words)
        if bool(stats.get("recommended_illegal")):
            failure_reasons.append(f"recommended_illegal (reason: {stats.get('reason', 'unknown')})")
        if float(stats.get("gibberish_token_ratio") or 0.0) >= QUALITY_GIBBERISH_RATIO_THRESHOLD_SHORT:
            failure_reasons.append(f"too_many_gibberish_words (ratio: {gibberish_ratio:.1%}, threshold: {QUALITY_GIBBERISH_RATIO_THRESHOLD_SHORT:.1%})")
        if float(stats.get("misspelled_ratio") or 0.0) >= QUALITY_MISSPELLED_RATIO_THRESHOLD_SHORT:
            failure_reasons.append(f"too_many_misspelled_words (ratio: {misspelled_ratio:.1%}, threshold: {QUALITY_MISSPELLED_RATIO_THRESHOLD_SHORT:.1%})")
        if float(stats.get("unique_token_ratio") or 1.0) <= QUALITY_UNIQUE_TOKEN_RATIO_THRESHOLD:
            unique_ratio = float(stats.get("unique_token_ratio") or 1.0)
            failure_reasons.append(f"too_low_unique_token_ratio (ratio: {unique_ratio:.1%}, threshold: {QUALITY_UNIQUE_TOKEN_RATIO_THRESHOLD:.1%})")
        if float(stats.get("repeated_token_ratio") or 0.0) >= QUALITY_REPEATED_TOKEN_RATIO_THRESHOLD:
            repeated_ratio = float(stats.get("repeated_token_ratio") or 0.0)
            failure_reasons.append(f"too_many_repeated_tokens (ratio: {repeated_ratio:.1%}, threshold: {QUALITY_REPEATED_TOKEN_RATIO_THRESHOLD:.1%})")
        if int(stats.get("repeated_word_trigrams") or 0) >= QUALITY_REPEATED_TRIGRAM_THRESHOLD:
            trigram_count = int(stats.get("repeated_word_trigrams") or 0)
            failure_reasons.append(f"too_many_repeated_trigrams (count: {trigram_count}, threshold: {QUALITY_REPEATED_TRIGRAM_THRESHOLD})")
    
    if failure_reasons:
        reason_text = "Text quality check failed. Issues found: " + "; ".join(failure_reasons) + "."
        return {
            "ok": False,
            "reason": reason_text,
            "stats": stats,
        }

    return {"ok": True, "reason": None, "stats": stats}


def input_text_validate_for_adjustment(text: str) -> dict[str, Any]:
    """
    Lighter validation for framework adjustment inputs.
    Only checks for unknown/misspelled/gibberish words, not repetition metrics.
    Returns: { ok: bool, reason: str | null, stats?: dict }
    """
    s = (text or "").strip()
    if not s:
        return {"ok": False, "reason": "Input is empty."}

    # Double-check critical format rules as defense in depth
    word_count = len(WORD_RE.findall(s))
    if word_count < TEXT_MIN_WORDS or word_count > TEXT_MAX_WORDS:
        return {"ok": False, "reason": f"Word count must be {TEXT_MIN_WORDS}–{TEXT_MAX_WORDS} words."}

    if s.count("\n") > TEXT_MAX_LINE_BREAKS:
        return {"ok": False, "reason": f"Too many line breaks (max {TEXT_MAX_LINE_BREAKS})."}

    # Only check for unknown/misspelled/gibberish words, not repetition
    stats = analyze_english_text(s)
    total_words = stats.get("total_words", 0)
    unknown_ratio = float(stats.get("unknown_ratio") or 0.0)
    misspelled_ratio = float(stats.get("misspelled_ratio") or 0.0)
    gibberish_ratio = float(stats.get("gibberish_token_ratio") or 0.0)
    
    invalid_ratio = unknown_ratio + misspelled_ratio
    
    # Track specific failure reasons for clearer error messages
    failure_reasons = []
    
    if total_words >= QUALITY_CHECK_WORD_COUNT_THRESHOLD:
        if unknown_ratio >= ADJUST_UNKNOWN_RATIO_THRESHOLD_10PLUS:
            failure_reasons.append(f"too_many_unknown_words (ratio: {unknown_ratio:.1%}, threshold: {ADJUST_UNKNOWN_RATIO_THRESHOLD_10PLUS:.1%})")
        elif invalid_ratio >= ADJUST_INVALID_RATIO_THRESHOLD_10PLUS:
            failure_reasons.append(f"too_many_invalid_words (unknown+misspelled ratio: {invalid_ratio:.1%}, threshold: {ADJUST_INVALID_RATIO_THRESHOLD_10PLUS:.1%})")
        elif gibberish_ratio >= ADJUST_GIBBERISH_RATIO_THRESHOLD_10PLUS:
            failure_reasons.append(f"too_many_gibberish_words (ratio: {gibberish_ratio:.1%}, threshold: {ADJUST_GIBBERISH_RATIO_THRESHOLD_10PLUS:.1%})")
    elif total_words >= QUALITY_CHECK_WORD_COUNT_MIN:
        if unknown_ratio >= ADJUST_UNKNOWN_RATIO_THRESHOLD_5_9:
            failure_reasons.append(f"too_many_unknown_words (ratio: {unknown_ratio:.1%}, threshold: {ADJUST_UNKNOWN_RATIO_THRESHOLD_5_9:.1%})")
        elif invalid_ratio >= ADJUST_INVALID_RATIO_THRESHOLD_5_9:
            failure_reasons.append(f"too_many_invalid_words (unknown+misspelled ratio: {invalid_ratio:.1%}, threshold: {ADJUST_INVALID_RATIO_THRESHOLD_5_9:.1%})")
    
    if failure_reasons:
        reason_text = "Text quality check failed. Issues found: " + "; ".join(failure_reasons) + "."
        return {
            "ok": False,
            "reason": reason_text,
            "stats": stats,
        }

    return {"ok": True, "reason": None, "stats": stats}
