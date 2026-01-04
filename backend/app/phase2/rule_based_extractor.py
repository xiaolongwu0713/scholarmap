"""Rule-based affiliation extraction (adapted from parse_affiliations_v6.py)."""

from __future__ import annotations

import re
from typing import Any, Callable, Optional

import pycountry

from app.phase2.models import GeoData

# --------------------
# Regexes
# --------------------
_email_re = re.compile(r"[\w\.-]+@[\w\.-]+\.\w+", re.I)
_electronic_re = re.compile(r"\b(Electronic address|E-mail|Email)\s*:\s*.*$", re.I)
_postal_re = re.compile(r"\b[0-9]{5}(-[0-9]{4})?\b|\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b", re.I)
_tail_abbr_re = re.compile(r"^(?P<prefix>.*?)(?:\s+|,)(?P<abbr>[A-Z]{2})$", re.U)

# --------------------
# Region vocabularies
# --------------------
US_STATES = {
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA",
    "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT",
    "VA", "WA", "WV", "WI", "WY", "DC"
}

US_STATE_NAMES = {
    "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR", "California": "CA",
    "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE", "Florida": "FL", "Georgia": "GA",
    "Hawaii": "HI", "Idaho": "ID", "Illinois": "IL", "Indiana": "IN", "Iowa": "IA",
    "Kansas": "KS", "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
    "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS",
    "Missouri": "MO", "Montana": "MT", "Nebraska": "NE", "Nevada": "NV", "New Hampshire": "NH",
    "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY", "North Carolina": "NC",
    "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK", "Oregon": "OR", "Pennsylvania": "PA",
    "Rhode Island": "RI", "South Carolina": "SC", "South Dakota": "SD", "Tennessee": "TN",
    "Texas": "TX", "Utah": "UT", "Vermont": "VT", "Virginia": "VA", "Washington": "WA",
    "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY", "District of Columbia": "DC"
}

CAN_PROV_ABBR = {"AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"}

CAN_PROV_NAME_TO_ABBR = {
    "Alberta": "AB", "British Columbia": "BC", "Manitoba": "MB", "New Brunswick": "NB",
    "Newfoundland and Labrador": "NL", "Nova Scotia": "NS", "Northwest Territories": "NT",
    "Nunavut": "NU", "Ontario": "ON", "Prince Edward Island": "PE", "Quebec": "QC",
    "Saskatchewan": "SK", "Yukon": "YT"
}

CAN_PROV_NAMES = set(CAN_PROV_NAME_TO_ABBR.keys())

DEPT_PREFIXES = [
    "department", "division", "faculty", "school", "centre", "center", "laboratory", "lab",
    "unit", "program", "programme", "institute"
]

COUNTRY_SYNONYMS = {
    "usa": "United States",
    "u.s.a.": "United States",
    "u.s.": "United States",
    "united states of america": "United States",
    "uk": "United Kingdom",
    "u.k.": "United Kingdom",
    "england": "United Kingdom",
    "scotland": "United Kingdom",
    "wales": "United Kingdom",
    "peoples republic of china": "China",
    "p.r. china": "China",
    "pr china": "China",
    "republic of korea": "Korea, Republic of",
    "south korea": "Korea, Republic of",
    "north korea": "Korea, Democratic People's Republic of",
    "russia": "Russian Federation",
    "iran": "Iran, Islamic Republic of",
    "viet nam": "Vietnam",
    "czech republic": "Czechia",
    "the netherlands": "Netherlands",
    "uae": "United Arab Emirates",
    "u.a.e.": "United Arab Emirates",
    "brasil": "Brazil",
    "deutschland": "Germany",
    "españa": "Spain",
    "italia": "Italy",
    "suisse": "Switzerland",
    "schweiz": "Switzerland",
    "österreich": "Austria",
    "belgië": "Belgium",
    "belgie": "Belgium",
    "türkiye": "Turkey",
}

# Build country vocabulary for substring matching
_country_names = set()
for c in pycountry.countries:
    for attr in ["name", "official_name", "common_name"]:
        if hasattr(c, attr):
            _country_names.add(getattr(c, attr).lower())
for v in COUNTRY_SYNONYMS.values():
    _country_names.add(v.lower())

AMBIGUOUS_COUNTRY = {"georgia"}  # minimal guard; expand if needed


# --------------------
# Normalization helpers
# --------------------
def _norm_text(s: str) -> str:
    s = str(s).replace("\u00a0", " ").strip()
    s = re.sub(r"\s+", " ", s).strip()
    return s.strip(" .;")


def _norm_token(t: str) -> str:
    t = _norm_text(t)
    t = t.strip("()[]")
    t = re.sub(r"\s+", " ", t).strip()
    return t.strip(" .;")


def _preclean_affil(s: str) -> str:
    s = _norm_text(s)
    if not s:
        return ""
    s = _electronic_re.sub("", s)
    s = _email_re.sub("", s)
    s = s.replace(";", ",")
    s = re.sub(r",\s*,+", ", ", s)
    s = re.sub(r"\s+", " ", s).strip(" ,;.")
    return s


def _strip_postal(t: str) -> str:
    return _postal_re.sub("", _norm_text(t)).strip(" .")


# --------------------
# Country / region detection
# --------------------
def _find_country_substring(token: str) -> Optional[str]:
    tl = " " + _norm_token(token).lower() + " "
    matches = []
    for name in _country_names:
        if len(name) < 4:
            continue
        if f" {name} " in tl:
            matches.append(name)
    if not matches:
        return None
    best = max(matches, key=len)
    if best in AMBIGUOUS_COUNTRY and _norm_token(token).lower() != best:
        return None
    return best


def _detect_country(tokens):
    for t in reversed(tokens):
        t_norm = _norm_token(t)
        t0 = t_norm.lower().strip(".")
        t0 = COUNTRY_SYNONYMS.get(t0, t0)
        try:
            c = pycountry.countries.lookup(t0)
            return c.name, getattr(c, "alpha_2", None), t_norm
        except Exception:
            sub = _find_country_substring(t_norm)
            if sub:
                try:
                    c = pycountry.countries.lookup(sub)
                    return c.name, getattr(c, "alpha_2", None), sub
                except Exception:
                    return sub.title(), None, sub
            continue
    return None, None, None


def _is_region_token(tok: str) -> bool:
    t = _norm_token(tok)
    tu = t.upper()
    if tu in US_STATES:
        return True
    if t in US_STATE_NAMES:
        return True
    if tu in CAN_PROV_ABBR:
        return True
    if t in CAN_PROV_NAMES:
        return True
    if re.search(r"\b(state|province|prefecture|county|region)\b", t, re.I):
        return True
    return False


def _normalize_region(tok: str) -> str:
    t = _norm_token(tok)
    if t in US_STATE_NAMES:
        return US_STATE_NAMES[t]
    if t.upper() in US_STATES:
        return t.upper()
    if t.upper() in CAN_PROV_ABBR:
        return t.upper()
    if t in CAN_PROV_NAME_TO_ABBR:
        return CAN_PROV_NAME_TO_ABBR[t]
    return t


def _detect_region_with_token(tokens):
    for t in reversed(tokens):
        tn = _norm_token(t)
        if _is_region_token(tn):
            return _normalize_region(tn), tn
        m = _tail_abbr_re.match(tn)
        if m:
            abbr = m.group("abbr").upper()
            if abbr in US_STATES or abbr in CAN_PROV_ABBR:
                return abbr, abbr
    return None, None


def _infer_country(country, region_norm, region_raw, tokens):
    if country:
        return country, None
    if region_norm and region_norm.upper() in US_STATES:
        return "United States", "US"
    if region_norm and region_norm.upper() in CAN_PROV_ABBR:
        return "Canada", "CA"
    if region_raw and _norm_token(region_raw) in CAN_PROV_NAMES:
        return "Canada", "CA"
    joined = " ".join(tokens).lower()
    for key, val in COUNTRY_SYNONYMS.items():
        if key in joined:
            try:
                c = pycountry.countries.lookup(val)
                return c.name, getattr(c, "alpha_2", None)
            except Exception:
                return val, None
    return None, None


# --------------------
# Department / institution
# --------------------
def _choose_institution(tokens):
    best = None
    for t in tokens:
        tl = _norm_token(t).lower()
        if any(k in tl for k in [
            "university", "université", "universite", "universität", "college", "institute",
            "hospital", "centre", "center", "academy", "foundation"
        ]):
            best = _norm_token(t)
    if not best:
        for t in tokens:
            tl = _norm_token(t).lower()
            if "school of" in tl:
                best = _norm_token(t)
                break
    return best


def _choose_department(tokens):
    for t in tokens:
        tl = _norm_token(t).lower()
        if tl.startswith("department") or "department of" in tl:
            return _norm_token(t)
        if any(tl.startswith(p) for p in DEPT_PREFIXES) and not any(
            k in tl for k in ["university", "college", "institute", "hospital"]
        ):
            return _norm_token(t)
    return None


# --------------------
# City detection
# --------------------
def _detect_city(tokens, country_token=None, region_norm=None, region_raw=None):
    toks = [_norm_text(t) for t in tokens if _norm_text(t)]
    if country_token:
        ct = _norm_text(country_token)
        toks = [t for t in toks if t != ct]

    # Expand tokens like "Washington DC" into ["Washington","DC"]
    expanded = []
    for t in toks:
        t2 = _postal_re.sub("", t).strip(" .")
        t2 = t2.strip()
        if not t2:
            continue
        m = _tail_abbr_re.match(t2)
        if m:
            abbr = m.group("abbr").upper()
            pref = m.group("prefix").strip(" ,")
            if (abbr in US_STATES or abbr in CAN_PROV_ABBR) and pref:
                expanded.append(pref)
                expanded.append(abbr)
                continue
        expanded.append(t2)
    toks = expanded

    for target in [region_raw, region_norm]:
        if not target:
            continue
        for i in range(len(toks) - 1, -1, -1):
            if toks[i].upper() == str(target).upper():
                if i - 1 >= 0:
                    cand = toks[i - 1]
                    if not any(k in cand.lower() for k in [
                        "university", "college", "institute", "hospital", "centre", "center", "school"
                    ]):
                        return cand

    for t in reversed(toks):
        if any(k in t.lower() for k in [
            "university", "college", "institute", "hospital", "centre", "center", "school",
            "department", "division", "faculty", "laboratory", "lab"
        ]):
            continue
        if re.search(r"\d", t):
            continue
        if len(t) <= 2 and t.isupper():
            continue
        return t
    return None


# --------------------
# Main parse function
# --------------------
def _parse_affiliation(affiliation_raw: str) -> dict:
    """
    Parse a single affiliation string into structured data.
    
    Returns dict with keys: country, country_code, region_raw, region_norm,
    city, institution, department, parse_source, tokens
    """
    raw = _norm_text(affiliation_raw)
    if not raw:
        return {
            "country": None,
            "country_code": None,
            "region_raw": None,
            "region_norm": None,
            "city": None,
            "institution": None,
            "department": None,
            "parse_source": "empty",
            "tokens": "",
        }

    cleaned = _preclean_affil(raw)
    tokens = [_norm_token(t) for t in re.split(r"\s*,\s*", cleaned) if _norm_token(t)]
    loc_tokens = [_strip_postal(t) for t in tokens]
    loc_tokens = [_norm_token(t) for t in loc_tokens if _norm_token(t)]

    country, country_code, country_token = _detect_country(loc_tokens)
    region_norm, region_raw = _detect_region_with_token(loc_tokens)

    country2, code2 = _infer_country(country, region_norm, region_raw, loc_tokens)
    if country is None:
        country, country_code = country2, code2
        country_token = None

    institution = _choose_institution(tokens)
    department = _choose_department(tokens)
    city = _detect_city(
        loc_tokens, country_token=country_token, region_norm=region_norm, region_raw=region_raw
    )

    source = "rules+pycountry" if country else "rules"
    return {
        "country": country,
        "country_code": country_code,
        "region_raw": region_raw,
        "region_norm": region_norm,
        "city": city,
        "institution": institution,
        "department": department,
        "parse_source": source,
        "tokens": "|".join(tokens),
    }


class RuleBasedExtractor:
    """Rule-based affiliation extractor (no LLM, deterministic)."""
    
    def __init__(self) -> None:
        """Initialize rule-based extractor."""
        pass
    
    async def extract_batch(
        self,
        affiliations: list[str]
    ) -> list[GeoData]:
        """
        Extract geographic data from a batch of affiliations using rules.
        
        Args:
            affiliations: List of raw affiliation strings
        
        Returns:
            List of GeoData objects (same length and order as input)
        """
        if not affiliations:
            return []
        
        results = []
        for aff in affiliations:
            parsed = _parse_affiliation(aff)
            
            # Determine confidence based on what we found
            confidence = "none"
            if parsed["country"]:
                if parsed["city"] and parsed["institution"]:
                    confidence = "high"
                elif parsed["city"] or parsed["institution"]:
                    confidence = "medium"
                else:
                    confidence = "low"
            
            geo = GeoData(
                country=parsed["country"],
                city=parsed["city"],
                institution=parsed["institution"],
                confidence=confidence
            )
            results.append(geo)
        
        return results
    
    async def extract_affiliations(
        self,
        affiliations: list[str],
        cache_lookup: Optional[Callable[[str], Optional[GeoData]]] = None
    ) -> dict[str, GeoData]:
        """
        Extract geographic data from all unique affiliations.
        
        Args:
            affiliations: List of unique affiliation strings
            cache_lookup: Optional function to check cache (for compatibility)
        
        Returns:
            Dict mapping affiliation_raw -> GeoData
        """
        result_map: dict[str, GeoData] = {}
        to_extract: list[str] = []
        
        # Check cache first (if provided)
        for aff in affiliations:
            if cache_lookup:
                cached = cache_lookup(aff)
                if cached:
                    result_map[aff] = cached
                    continue
            
            to_extract.append(aff)
        
        if not to_extract:
            return result_map
        
        # Process all at once (rule-based is fast, no need for batching)
        batch_results = await self.extract_batch(to_extract)
        
        # Map results back to affiliations
        for aff, geo in zip(to_extract, batch_results):
            result_map[aff] = geo
        
        return result_map

