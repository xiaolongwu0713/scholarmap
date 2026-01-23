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
# Author name initials in parentheses (e.g., "(R.Z., C.C., M.K.)")
# Pattern: (A.B., C.D., E.F.) - 1-3 uppercase letters followed by period, comma-separated
_author_initials_re = re.compile(r"\([A-Z]\.(?:[A-Z]\.)?(?:[A-Z]\.)?(?:,\s*[A-Z]\.(?:[A-Z]\.)?(?:[A-Z]\.)?)*\)", re.U)
# Postal code patterns:
# - US: 5 digits or 5-4 format (e.g., "10001", "10001-1234")
# - Canada: A1A 1A1 format
# - China and others: 6 digits (e.g., "200023", "100000")
# - UK: Various formats (e.g., "SW1A 1AA", "EC1A 1BB")
# - Japan: 3-4 digits (e.g., "100-0001")
_postal_re = re.compile(
    r"\b[0-9]{5}(-[0-9]{4})?\b|"  # US format (5 digits, optional -4)
    r"\b[0-9]{6}\b|"  # China and other 6-digit formats
    r"\b[0-9]{3}-[0-9]{4}\b|"  # Japan format (3-4 digits)
    r"\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b",  # Canada format
    re.I
)
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
    # Remove author name initials in parentheses (e.g., "(R.Z., C.C., M.K.)")
    s = _author_initials_re.sub("", s)
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
    """Choose institution from tokens, recognizing both academic and company names."""
    best = None
    
    # First pass: look for academic institutions (university, college, etc.)
    for t in tokens:
        tl = _norm_token(t).lower()
        if any(k in tl for k in [
            "university", "université", "universite", "universität", "college", "institute",
            "hospital", "centre", "center", "academy", "foundation"
        ]):
            best = _norm_token(t)
            break
    
    # Second pass: look for "school of" pattern
    if not best:
        for t in tokens:
            tl = _norm_token(t).lower()
            if "school of" in tl:
                best = _norm_token(t)
                break
    
    # Third pass: look for research groups, departments, and organizational units
    if not best:
        for t in tokens:
            tl = _norm_token(t).lower()
            # Check for research groups, departments, and organizational units
            if any(k in tl for k in [
                "group", "department", "departments", "division", "faculty", 
                "laboratory", "lab", "program", "programme", "unit", "team",
                "focus", "center", "centre", "research", "project", "initiative"
            ]):
                best = _norm_token(t)
                break
    
    # Fourth pass: look for company name patterns (Co. Ltd, Inc., Corp., etc.)
    # This pass needs to reconstruct the full company name, not just the suffix
    if not best:
        # Improved company suffix patterns to handle commas and various formats
        company_suffix_patterns = [
            r"co[.,]?\s*ltd[.,]?",  # Co., Ltd. / Co. Ltd / Co Ltd / Co, Ltd
            r"co[.,]?\s*limited",   # Co., Limited / Co Limited
            r"ltd[.,]?",            # Ltd. / Ltd
            r"inc[.,]?",            # Inc. / Inc
            r"corp[.,]?",           # Corp. / Corp
            r"corporation",         # Corporation
            r"llc",                 # LLC
            r"gmbh",                # GmbH
            r"ag",                  # AG
            r"s[.,]a[.,]",          # S.A. / SA
            r"s[.,]p[.,]a[.,]",     # S.P.A. / SPA
            r"plc",                 # PLC
            r"bv",                  # BV
            r"nv",                  # NV
            r"limited",             # Limited
            r"incorporated",        # Incorporated
        ]
        
        # Try to find company name by looking for suffix patterns
        for idx, t in enumerate(tokens):
            tl = _norm_token(t).lower()
            
            # Check if this token contains a company suffix
            has_company_suffix = False
            for pattern in company_suffix_patterns:
                if re.search(r"\b" + pattern + r"\b", tl, re.IGNORECASE):
                    has_company_suffix = True
                    break
            
            if has_company_suffix:
                # Found a company suffix, try to reconstruct full company name
                # Look backwards for company name tokens
                company_parts = []
                
                # Add tokens before the suffix (up to 2 tokens back, or until we hit a location)
                for i in range(max(0, idx - 2), idx):
                    prev_token = _norm_token(tokens[i]).lower()
                    # Stop if we hit a location keyword
                    if any(loc in prev_token for loc in ["city", "district", "province", "state"]):
                        break
                    # Stop if we hit a country name
                    if _find_country_substring(prev_token):
                        break
                    company_parts.append(_norm_token(tokens[i]))
                
                # Add the current token with the suffix
                company_parts.append(_norm_token(t))
                
                if company_parts:
                    best = " ".join(company_parts)
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
def _is_valid_city_name(city: str) -> bool:
    """
    Check if a city name is valid (not a state abbreviation, institution, or department).
    
    Returns False for:
    - US state abbreviations (MD, OH, WV, etc.)
    - Institution names (containing keywords like "University", "Department", etc.)
    - Department names
    - Format errors (containing "USA" or multiple state abbreviations)
    - Too short names (likely abbreviations or errors)
    """
    if not city or len(city.strip()) == 0:
        return False
    
    city_upper = city.upper()
    city_lower = city.lower()
    
    # Check if it's just a state abbreviation
    if city_upper.strip() in US_STATES:
        return False
    
    # Check if it contains "USA" (format error like "New York NY USA")
    if " USA" in city_upper or city_upper.endswith(" USA") or city_upper == "USA":
        return False
    
    # Check if it's an institution name (contains institution keywords)
    institution_keywords = [
        "university", "college", "institute", "hospital", "centre", "center", "school",
        "department", "departments", "division", "faculty", "laboratory", "lab",
        "state department", "health", "medical center", "medical centre",
        "uc ", "uc-", "berkeley", "science and", "disorders", "neurosurgery", "physiology",
        "communication", "program", "programme", "unit",
        # Research groups and organizational units
        "group", "team", "focus", "research", "project", "initiative",
        # Academic/research terms that shouldn't be cities
        "neuroscience", "neurotechnology", "neurocognitive", "neurophysics", "psychology"
    ]
    if any(keyword in city_lower for keyword in institution_keywords):
        return False
    
    # Check if it's a company name (contains company patterns)
    # Improved patterns to handle commas and various formats
    company_patterns = [
        r"\bco[.,]?\s*ltd[.,]?\b",      # Co., Ltd. / Co. Ltd / Co Ltd / Co, Ltd
        r"\bco[.,]?\s*limited\b",       # Co., Limited / Co Limited
        r"\bltd[.,]?\b",                # Ltd. / Ltd
        r"\binc[.,]?\b",                # Inc. / Inc
        r"\bcorp[.,]?\b",               # Corp. / Corp
        r"\bcorporation\b",             # Corporation
        r"\bllc\b",                     # LLC
        r"\bgmbh\b",                    # GmbH
        r"\bag\b",                      # AG
        r"\bs[.,]a[.,]\b",              # S.A. / SA
        r"\bs[.,]p[.,]a[.,]\b",         # S.P.A. / SPA
        r"\bplc\b",                     # PLC
        r"\bbv\b",                      # BV
        r"\bnv\b",                      # NV
        r"\blimited\b",                 # Limited
        r"\bincorporated\b",            # Incorporated
        r"\bcompany\b",                 # Company
        r"\bcompanies\b",               # Companies
    ]
    for pattern in company_patterns:
        if re.search(pattern, city_lower, re.IGNORECASE):
            return False
    
    # Check if it starts with common department/institution prefixes
    if city_lower.startswith(("department", "departments", "division", "faculty", "school of", "program", "programme")):
        return False
    
    # Check if it's too short (likely an abbreviation or error)
    if len(city.strip()) <= 2:
        return False
    
    # Check if it contains multiple state abbreviations (format error)
    state_abbr_count = sum(1 for abbr in US_STATES if f" {abbr} " in f" {city_upper} " or city_upper.endswith(f" {abbr}"))
    if state_abbr_count > 1:
        return False
    
    # Check if it's a single state abbreviation followed by "USA" (e.g., "MD USA")
    if city_upper.strip() in US_STATES and "USA" in city_upper:
        return False
    
    return True


def _detect_city(tokens, country_token=None, region_norm=None, region_raw=None, institution=None):
    """
    Detect city name from tokens.
    
    Args:
        tokens: List of location tokens
        country_token: Country token to exclude
        region_norm: Normalized region (state/province)
        region_raw: Raw region name
        institution: Detected institution name (to avoid using it as city)
    """
    toks = [_norm_text(t) for t in tokens if _norm_text(t)]
    if country_token:
        ct = _norm_text(country_token)
        toks = [t for t in toks if t != ct]
    
    # Exclude institution name from city candidates
    if institution:
        inst_norm = _norm_text(institution)
        toks = [t for t in toks if _norm_text(t) != inst_norm]

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

    # Try to find city near region (state/province)
    for target in [region_raw, region_norm]:
        if not target:
            continue
        for i in range(len(toks) - 1, -1, -1):
            if toks[i].upper() == str(target).upper():
                if i - 1 >= 0:
                    cand = toks[i - 1]
                    # Validate candidate before returning
                    if _is_valid_city_name(cand):
                        return cand

    # Fallback: look for any valid city name in tokens (reverse order)
    for t in reversed(toks):
        # Skip "USA" explicitly
        if t.upper() == "USA":
            continue
        # Skip institution name if provided
        if institution and _norm_text(t) == _norm_text(institution):
            continue
        # Skip invalid city names
        if not _is_valid_city_name(t):
            continue
        # Skip tokens with digits
        if re.search(r"\d", t):
            continue
        # Skip very short uppercase tokens (likely abbreviations)
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
    # Pass institution to _detect_city to avoid using institution name as city
    city = _detect_city(
        loc_tokens, country_token=country_token, region_norm=region_norm, region_raw=region_raw, institution=institution
    )

    source = "rules+pycountry" if country else "rules"
    result = {
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
    
    # Normalize country and city names (convert abbreviations to full names)
    result = _normalize_country_city_names(result)
    
    return result


def _normalize_country_city_names(geo_data: dict) -> dict:
    """
    Normalize country and city names from abbreviations to full names.
    
    This helps prevent incorrect geocoding results when abbreviated names
    are misinterpreted (e.g., "U.S.A" as a city name, or "MA" → Morocco).
    
    Strategy:
    - Convert common country abbreviations to full names
    - If a city name is actually a country abbreviation, set it to None
      (indicates extraction error, will trigger LLM fallback)
    
    Args:
        geo_data: Dict with keys: country, city, institution, etc.
    
    Returns:
        Dict with normalized country and city names
    
    Examples:
        Input:  country="Morocco", city="U.S.A"
        Output: country="Morocco", city=None  (city cleared)
        
        Input:  country="United States", city="Boston"
        Output: country="United States", city="Boston"  (unchanged)
    """
    # Country name standardization mapping
    # Key: abbreviation/variant, Value: standardized full name
    COUNTRY_NORMALIZATIONS = {
        # United States variations
        "U.S.A": "United States",
        "U.S.A.": "United States",
        "USA": "United States",
        "U.S": "United States",
        "U.S.": "United States",
        # "US": "United States",  # Risky: too short, might be real place name
        
        # United Kingdom variations
        "U.K": "United Kingdom",
        "U.K.": "United Kingdom",
        "UK": "United Kingdom",
        
        # United Arab Emirates
        "UAE": "United Arab Emirates",
        "U.A.E": "United Arab Emirates",
        "U.A.E.": "United Arab Emirates",
        
        # People's Republic of China
        "PRC": "China",
        "P.R.C": "China",
        "P.R.C.": "China",
        "PR China": "China",
        
        # Official long-form country names → Short form
        "Iran, Islamic Republic of": "Iran",
        "Korea, Republic of": "South Korea",
        "Korea, Democratic People's Republic of": "North Korea",
        "Venezuela, Bolivarian Republic of": "Venezuela",
        "Tanzania, United Republic of": "Tanzania",
        "Bolivia, Plurinational State of": "Bolivia",
        "Moldova, Republic of": "Moldova",
        "Macedonia, the former Yugoslav Republic of": "North Macedonia",
        "Congo, the Democratic Republic of the": "Democratic Republic of the Congo",
        "Lao People's Democratic Republic": "Laos",
        "Syrian Arab Republic": "Syria",
        "Viet Nam": "Vietnam",
        
        # Other standardizations
        "ROC": "Taiwan",
        "R.O.C": "Taiwan",
        "R.O.C.": "Taiwan",
    }
    
    country = geo_data.get("country")
    city = geo_data.get("city")
    
    # Normalize country field
    if country and country in COUNTRY_NORMALIZATIONS:
        geo_data["country"] = COUNTRY_NORMALIZATIONS[country]
    
    # Check if city name is actually a country abbreviation (indicates extraction error)
    if city and city in COUNTRY_NORMALIZATIONS:
        # City name should not be a country abbreviation
        # This indicates the extraction made an error
        # Set city to None to trigger geocoding failure → LLM fallback
        geo_data["city"] = None
    
    return geo_data


class RuleBasedExtractor:
    """Rule-based affiliation extractor (no LLM, deterministic)."""
    
    def __init__(self) -> None:
        """Initialize rule-based extractor."""
        from app.phase2.institution_matcher import InstitutionMatcher
        self.institution_matcher = InstitutionMatcher()
    
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
        result, stats = await self.extract_batch_with_stats(affiliations)
        return result
    
    async def extract_batch_with_stats(
        self,
        affiliations: list[str],
        skip_institution_auto_add: bool = False
    ) -> tuple[list[GeoData], dict[str, int]]:
        """
        Extract geographic data from a batch of affiliations using rules with statistics.
        
        Args:
            affiliations: List of raw affiliation strings
            skip_institution_auto_add: If True, don't auto-add to institution_geo, record as pending instead
        
        Returns:
            Tuple of (list of GeoData objects, statistics dict)
        """
        if not affiliations:
            return [], {"institution_geo_auto_added": 0, "pending_auto_add": []}
        
        import logging
        logger = logging.getLogger(__name__)
        
        total = len(affiliations)
        log_interval = max(1, total // 10)  # Log every 10% progress
        
        # Statistics
        stats = {
            "institution_geo_auto_added": 0,
            "pending_auto_add": []  # New: track institutions pending validation
        }
        
        results = []
        for idx, aff in enumerate(affiliations):
            # Fall back to rule-based extraction (institution matching already done in extract_affiliations)
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
            
            # Auto-add to institution_geo if extraction was successful
            # Only add if: institution matcher failed (already checked above),
            # and we successfully extracted country and institution
            if geo.country and geo.institution:
                if skip_institution_auto_add:
                    # Don't add immediately, record as pending for validation
                    stats["pending_auto_add"].append({
                        "affiliation_raw": aff,
                        "institution": geo.institution,
                        "country": geo.country,
                        "city": geo.city,
                    })
                else:
                    # Original behavior: add immediately (backward compatible)
                    try:
                        from app.db.connection import db_manager
                        async with db_manager.session() as session:
                            from app.db.repository import InstitutionGeoRepository
                            repo = InstitutionGeoRepository(session)
                            
                            # Check again if it exists (in case it was added between checks)
                            existing = await repo.get_by_name(geo.institution)
                            if not existing:
                                # Auto-add the institution
                                await repo.auto_add_institution(
                                    institution_name=geo.institution,
                                    country=geo.country,
                                    city=geo.city,
                                    affiliation_text=aff  # Pass original affiliation for alias extraction
                                )
                                await session.commit()
                                stats["institution_geo_auto_added"] += 1
                                logger.debug(f"Auto-added institution to institution_geo: {geo.institution} ({geo.country}, {geo.city})")
                    except Exception as e:
                        logger.warning(f"Failed to auto-add institution {geo.institution}: {e}")
                        # Don't fail the entire extraction if auto-add fails
            
            # Log progress periodically
            if (idx + 1) % log_interval == 0 or (idx + 1) == total:
                logger.info(f"   Parsing progress: {idx + 1}/{total} ({100*(idx+1)//total}%)")
        
        return results, stats
    
    async def extract_affiliations(
        self,
        affiliations: list[str],
        cache_lookup: Optional[Callable[[str], Optional[GeoData]]] = None,
        skip_institution_auto_add: bool = False
    ) -> tuple[dict[str, GeoData], dict[str, Any]]:
        """
        Extract geographic data from all unique affiliations.
        
        Args:
            affiliations: List of unique affiliation strings
            cache_lookup: Optional async function to check cache (for compatibility)
            skip_institution_auto_add: If True, don't auto-add to institution_geo, record as pending instead
        
        Returns:
            Tuple of (Dict mapping affiliation_raw -> GeoData, statistics dict)
        """
        import logging
        logger = logging.getLogger(__name__)
        
        total = len(affiliations)
        logger.info(f"   Processing {total} affiliations...")
        
        result_map: dict[str, GeoData] = {}
        to_extract: list[str] = []
        
        # Check cache first (if provided)
        import inspect
        is_async_cache = cache_lookup and inspect.iscoroutinefunction(cache_lookup)
        
        if cache_lookup:
            # Check if cache_lookup supports batch (takes list instead of single string)
            # Try to detect batch function signature
            is_batch_cache = False
            try:
                import inspect as inspect_module
                sig = inspect_module.signature(cache_lookup)
                params = list(sig.parameters.values())
                if len(params) > 0:
                    param_annotation = str(params[0].annotation)
                    # Check if it's a list type
                    is_batch_cache = (
                        'list' in param_annotation.lower() or
                        'List' in param_annotation or
                        params[0].annotation == list or
                        'typing.List' in param_annotation
                    )
            except Exception as e:
                # If signature inspection fails, try calling with a list to see if it works
                # This is a fallback detection method
                logger.debug(f"Could not inspect cache_lookup signature: {e}")
                is_batch_cache = False
            
            if is_batch_cache:
                # Batch cache lookup - much faster!
                logger.info(f"   Batch checking affiliation_cache table for {total} affiliations...")
                cached_map = await cache_lookup(affiliations)
                cache_hits = len(cached_map)
                
                for aff in affiliations:
                    if aff in cached_map:
                        result_map[aff] = cached_map[aff]
                    else:
                        to_extract.append(aff)
                
                logger.info(f"   ✅ affiliation_cache table: {cache_hits} hits, {len(to_extract)} need extraction")
            else:
                # Individual cache lookup (slower, but compatible)
                logger.info(f"   Checking affiliation_cache table for {total} affiliations (individual lookup)...")
                cache_hits = 0
                cache_check_interval = max(1, total // 20)  # Log every 5% progress
                
                for idx, aff in enumerate(affiliations):
                    if is_async_cache:
                        cached = await cache_lookup(aff)
                    else:
                        cached = cache_lookup(aff)
                    
                    if cached:
                        result_map[aff] = cached
                        cache_hits += 1
                        # Log progress periodically
                        if (idx + 1) % cache_check_interval == 0 or (idx + 1) == total:
                            logger.info(f"   affiliation_cache table check progress: {idx + 1}/{total} ({100*(idx+1)//total}%), cache hits: {cache_hits}")
                        continue
                    
                    to_extract.append(aff)
                
                if cache_hits > 0:
                    logger.info(f"   ✅ affiliation_cache table: {cache_hits} hits, {len(to_extract)} need extraction")
        else:
            # No cache lookup, extract all
            to_extract = list(affiliations)
        
        # Statistics tracking
        stats = {
            "affiliation_cache_hits": len(result_map),
            "institution_matcher_hits": 0,
            "rule_based_extractions": 0,
            "institution_geo_auto_added": 0,
            "affiliation_cache_updated": 0,
            "pending_auto_add": []  # New: track institutions pending validation
        }
        
        if not to_extract:
            logger.info(f"   ✅ All {total} affiliations found in affiliation_cache table")
            return result_map, stats
        
        # Track affiliations that were cached (from affiliation_cache table)
        cached_affiliations = set(result_map.keys())
        
        # Step 1: Try institution matcher for affiliations not in cache
        logger.info(f"   Trying institution_matcher (institution_geo table) for {len(to_extract)} affiliations...")
        institution_matches = await self.institution_matcher.match_batch(to_extract)
        institution_matched_count = len(institution_matches)
        stats["institution_matcher_hits"] = institution_matched_count
        
        if institution_matched_count > 0:
            logger.info(f"   ✅ institution_geo table: {institution_matched_count} matches found")
            # Add institution matches to result_map
            for aff, geo in institution_matches.items():
                result_map[aff] = geo
            # Remove matched affiliations from to_extract
            to_extract = [aff for aff in to_extract if aff not in institution_matches]
        
        # Step 2: Rule-based extraction for remaining affiliations
        if to_extract:
            logger.info(f"   Extracting {len(to_extract)} affiliations using rule-based parser...")
            batch_results, batch_stats = await self.extract_batch_with_stats(
                to_extract,
                skip_institution_auto_add=skip_institution_auto_add
            )
            stats["rule_based_extractions"] = len(to_extract)
            stats["institution_geo_auto_added"] = batch_stats.get("institution_geo_auto_added", 0)
            stats["pending_auto_add"] = batch_stats.get("pending_auto_add", [])
            
            logger.info(f"   ✅ Rule-based extraction complete: {len(batch_results)} results")
            if stats["institution_geo_auto_added"] > 0:
                logger.info(f"      Auto-added to institution_geo table: {stats['institution_geo_auto_added']} institutions")
            if skip_institution_auto_add and len(stats["pending_auto_add"]) > 0:
                logger.info(f"      Pending validation: {len(stats['pending_auto_add'])} institutions")
            
            # Map results back to affiliations
            for aff, geo in zip(to_extract, batch_results):
                result_map[aff] = geo
            
            # Count affiliations that will be cached (rule-based extractions that have valid data)
            stats["affiliation_cache_updated"] = sum(
                1 for aff, geo in zip(to_extract, batch_results) 
                if geo and (geo.country or geo.city or geo.institution)
            )
        else:
            logger.info(f"   ✅ All affiliations matched via institution_geo table")
        
        return result_map, stats

