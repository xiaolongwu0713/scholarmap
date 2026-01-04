#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Offline affiliation parser (English-centric) with:
  1) De-duplication + cache via in-memory dict (unique parsing)
  2) Pre-cleaning: remove emails / "Electronic address:" tail
  3) Country detection via pycountry lookup + substring match
  4) Region normalization (US states / Canada provinces)
  5) City extraction improvements (handles "Washington DC" etc)
  6) Optional post-fill: infer country from city/institution majority mapping within the dataset
"""

import re, json
from typing import Optional, Dict
import pandas as pd
import pycountry

# --------------------
# Regexes
# --------------------
email_re = re.compile(r"[\w\.-]+@[\w\.-]+\.\w+", re.I)
electronic_re = re.compile(r"\b(Electronic address|E-mail|Email)\s*:\s*.*$", re.I)
postal_re = re.compile(r"\b[0-9]{5}(-[0-9]{4})?\b|\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b", re.I)
tail_abbr_re = re.compile(r"^(?P<prefix>.*?)(?:\s+|,)(?P<abbr>[A-Z]{2})$", re.U)

# --------------------
# Region vocabularies
# --------------------
US_STATES = {
'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'
}
US_STATE_NAMES = {
"Alabama":"AL","Alaska":"AK","Arizona":"AZ","Arkansas":"AR","California":"CA","Colorado":"CO","Connecticut":"CT",
"Delaware":"DE","Florida":"FL","Georgia":"GA","Hawaii":"HI","Idaho":"ID","Illinois":"IL","Indiana":"IN","Iowa":"IA",
"Kansas":"KS","Kentucky":"KY","Louisiana":"LA","Maine":"ME","Maryland":"MD","Massachusetts":"MA","Michigan":"MI","Minnesota":"MN",
"Mississippi":"MS","Missouri":"MO","Montana":"MT","Nebraska":"NE","Nevada":"NV","New Hampshire":"NH","New Jersey":"NJ","New Mexico":"NM",
"New York":"NY","North Carolina":"NC","North Dakota":"ND","Ohio":"OH","Oklahoma":"OK","Oregon":"OR","Pennsylvania":"PA","Rhode Island":"RI",
"South Carolina":"SC","South Dakota":"SD","Tennessee":"TN","Texas":"TX","Utah":"UT","Vermont":"VT","Virginia":"VA","Washington":"WA",
"West Virginia":"WV","Wisconsin":"WI","Wyoming":"WY","District of Columbia":"DC"
}
CAN_PROV_ABBR = {'AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT'}
CAN_PROV_NAME_TO_ABBR = {
"Alberta":"AB","British Columbia":"BC","Manitoba":"MB","New Brunswick":"NB","Newfoundland and Labrador":"NL",
"Nova Scotia":"NS","Northwest Territories":"NT","Nunavut":"NU","Ontario":"ON","Prince Edward Island":"PE",
"Quebec":"QC","Saskatchewan":"SK","Yukon":"YT"
}
CAN_PROV_NAMES = set(CAN_PROV_NAME_TO_ABBR.keys())

DEPT_PREFIXES = ["department", "division", "faculty", "school", "centre", "center", "laboratory", "lab", "unit", "program", "programme", "institute"]

COUNTRY_SYNONYMS = {
    "usa":"United States",
    "u.s.a.":"United States",
    "u.s.":"United States",
    "united states of america":"United States",
    "uk":"United Kingdom",
    "u.k.":"United Kingdom",
    "england":"United Kingdom",
    "scotland":"United Kingdom",
    "wales":"United Kingdom",
    "peoples republic of china":"China",
    "p.r. china":"China",
    "pr china":"China",
    "republic of korea":"Korea, Republic of",
    "south korea":"Korea, Republic of",
    "north korea":"Korea, Democratic People's Republic of",
    "russia":"Russian Federation",
    "iran":"Iran, Islamic Republic of",
    "viet nam":"Vietnam",
    "czech republic":"Czechia",
    "the netherlands":"Netherlands",
    "uae":"United Arab Emirates",
    "u.a.e.":"United Arab Emirates",
    "brasil":"Brazil",
    "deutschland":"Germany",
    "españa":"Spain",
    "italia":"Italy",
    "suisse":"Switzerland",
    "schweiz":"Switzerland",
    "österreich":"Austria",
    "belgië":"Belgium",
    "belgie":"Belgium",
    "türkiye":"Turkey",
}

# Build country vocabulary for substring matching
country_names = set()
for c in pycountry.countries:
    for attr in ["name","official_name","common_name"]:
        if hasattr(c, attr):
            country_names.add(getattr(c, attr).lower())
for v in COUNTRY_SYNONYMS.values():
    country_names.add(v.lower())

AMBIGUOUS_COUNTRY = {"georgia"}  # minimal guard; expand if needed

# --------------------
# Normalization helpers
# --------------------
def is_nan_cell(x) -> bool:
    try:
        return pd.isna(x)
    except Exception:
        return False

def parse_jsonish(cell: str) -> str:
    """Input cells may look like JSON arrays: ["..."]. Return first element when possible."""
    if is_nan_cell(cell):
        return ""
    s = str(cell).strip()
    if s.lower() == "nan":
        return ""
    if s.startswith('['):
        try:
            obj = json.loads(s)
            if isinstance(obj, list) and obj:
                return str(obj[0]) if obj[0] is not None else ""
        except Exception:
            pass
    # fallback: strip wrapper
    s = re.sub(r'^\s*\[\s*"?', '', s)
    s = re.sub(r'"?\s*\]\s*$', '', s)
    return s

def norm_text(s: str) -> str:
    s = str(s).replace("\u00a0"," ").strip()
    s = re.sub(r"\s+", " ", s).strip()
    return s.strip(" .;")

def norm_token(t: str) -> str:
    t = norm_text(t)
    t = t.strip("()[]")
    t = re.sub(r"\s+", " ", t).strip()
    return t.strip(" .;")

def norm_key_for_dedupe(s: str) -> str:
    s = norm_text(s).lower()
    s = re.sub(r"\s+", " ", s).strip()
    return s

def preclean_affil(s: str) -> str:
    s = norm_text(s)
    if not s:
        return ""
    s = electronic_re.sub("", s)
    s = email_re.sub("", s)
    s = s.replace(";", ",")
    s = re.sub(r",\s*,+", ", ", s)
    s = re.sub(r"\s+", " ", s).strip(" ,;.")
    return s

def strip_postal(t: str) -> str:
    return postal_re.sub("", norm_text(t)).strip(" .")

# --------------------
# Country / region detection
# --------------------
def find_country_substring(token: str) -> Optional[str]:
    tl = " " + norm_token(token).lower() + " "
    matches = []
    for name in country_names:
        if len(name) < 4:
            continue
        if f" {name} " in tl:
            matches.append(name)
    if not matches:
        return None
    best = max(matches, key=len)
    if best in AMBIGUOUS_COUNTRY and norm_token(token).lower() != best:
        return None
    return best

def detect_country(tokens):
    for t in reversed(tokens):
        t_norm = norm_token(t)
        t0 = t_norm.lower().strip(".")
        t0 = COUNTRY_SYNONYMS.get(t0, t0)
        try:
            c = pycountry.countries.lookup(t0)
            return c.name, getattr(c, "alpha_2", None), t_norm
        except Exception:
            sub = find_country_substring(t_norm)
            if sub:
                try:
                    c = pycountry.countries.lookup(sub)
                    return c.name, getattr(c, "alpha_2", None), sub
                except Exception:
                    return sub.title(), None, sub
            continue
    return None, None, None

def is_region_token(tok: str) -> bool:
    t = norm_token(tok)
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

def normalize_region(tok: str) -> str:
    t = norm_token(tok)
    if t in US_STATE_NAMES:
        return US_STATE_NAMES[t]
    if t.upper() in US_STATES:
        return t.upper()
    if t.upper() in CAN_PROV_ABBR:
        return t.upper()
    if t in CAN_PROV_NAME_TO_ABBR:
        return CAN_PROV_NAME_TO_ABBR[t]
    return t

def detect_region_with_token(tokens):
    for t in reversed(tokens):
        tn = norm_token(t)
        if is_region_token(tn):
            return normalize_region(tn), tn
        m = tail_abbr_re.match(tn)
        if m:
            abbr = m.group("abbr").upper()
            if abbr in US_STATES or abbr in CAN_PROV_ABBR:
                return abbr, abbr
    return None, None

def infer_country(country, region_norm, region_raw, tokens):
    if country:
        return country, None
    if region_norm and region_norm.upper() in US_STATES:
        return "United States", "US"
    if region_norm and region_norm.upper() in CAN_PROV_ABBR:
        return "Canada", "CA"
    if region_raw and norm_token(region_raw) in CAN_PROV_NAMES:
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
def choose_institution(tokens):
    best = None
    for t in tokens:
        tl = norm_token(t).lower()
        if any(k in tl for k in ["university","université","universite","universität","college","institute","hospital","centre","center","academy","foundation"]):
            best = norm_token(t)
    if not best:
        for t in tokens:
            tl = norm_token(t).lower()
            if "school of" in tl:
                best = norm_token(t)
                break
    return best

def choose_department(tokens):
    for t in tokens:
        tl = norm_token(t).lower()
        if tl.startswith("department") or "department of" in tl:
            return norm_token(t)
        if any(tl.startswith(p) for p in DEPT_PREFIXES) and not any(k in tl for k in ["university","college","institute","hospital"]):
            return norm_token(t)
    return None

# --------------------
# City detection
# --------------------
def detect_city(tokens, country_token=None, region_norm=None, region_raw=None):
    toks = [norm_text(t) for t in tokens if norm_text(t)]
    if country_token:
        ct = norm_text(country_token)
        toks = [t for t in toks if t != ct]

    # Expand tokens like "Washington DC" into ["Washington","DC"]
    expanded = []
    for t in toks:
        t2 = postal_re.sub("", t).strip(" .")
        t2 = t2.strip()
        if not t2:
            continue
        m = tail_abbr_re.match(t2)
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
        for i in range(len(toks)-1, -1, -1):
            if toks[i].upper() == str(target).upper():
                if i-1 >= 0:
                    cand = toks[i-1]
                    if not any(k in cand.lower() for k in ["university","college","institute","hospital","centre","center","school"]):
                        return cand

    for t in reversed(toks):
        if any(k in t.lower() for k in ["university","college","institute","hospital","centre","center","school","department","division","faculty","laboratory","lab"]):
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
def parse_affiliation(cell: str) -> Dict:
    raw0 = parse_jsonish(cell)
    raw = norm_text(raw0)
    if not raw:
        return {
            "affiliation_raw": raw0 if raw0 else "",
            "affiliation_clean": "",
            "country": None,
            "country_code": None,
            "region_raw": None,
            "region_norm": None,
            "city": None,
            "institution": None,
            "department": None,
            "parse_source": "empty",
            "tokens": ""
        }

    cleaned = preclean_affil(raw)
    tokens = [norm_token(t) for t in re.split(r"\s*,\s*", cleaned) if norm_token(t)]
    loc_tokens = [strip_postal(t) for t in tokens]
    loc_tokens = [norm_token(t) for t in loc_tokens if norm_token(t)]

    country, country_code, country_token = detect_country(loc_tokens)
    region_norm, region_raw = detect_region_with_token(loc_tokens)

    country2, code2 = infer_country(country, region_norm, region_raw, loc_tokens)
    if country is None:
        country, country_code = country2, code2
        country_token = None

    institution = choose_institution(tokens)
    department = choose_department(tokens)
    city = detect_city(loc_tokens, country_token=country_token, region_norm=region_norm, region_raw=region_raw)

    source = "rules+pycountry" if country else "rules"
    return {
        "affiliation_raw": raw0,
        "affiliation_clean": cleaned,
        "country": country,
        "country_code": country_code,
        "region_raw": region_raw,
        "region_norm": region_norm,
        "city": city,
        "institution": institution,
        "department": department,
        "parse_source": source,
        "tokens": "|".join(tokens)
    }

def to_country_code(name: str) -> Optional[str]:
    if not isinstance(name, str) or not name:
        return None
    try:
        c = pycountry.countries.lookup(name)
        return getattr(c, "alpha_2", None)
    except Exception:
        return None

def main(in_csv: str, out_csv: str):
    df = pd.read_csv(in_csv, header=None)
    cells = df.iloc[:, 0].tolist()

    # De-dupe by normalized cleaned string
    keys = []
    for cell in cells:
        raw0 = parse_jsonish(cell)
        cleaned = preclean_affil(norm_text(raw0))
        keys.append(norm_key_for_dedupe(cleaned))

    uniq_map = {}
    uniq_cells = []
    for k, cell in zip(keys, cells):
        if k not in uniq_map:
            uniq_map[k] = len(uniq_cells)
            uniq_cells.append(cell)

    uniq_results = [parse_affiliation(c) for c in uniq_cells]
    uniq_df = pd.DataFrame(uniq_results)

    idxs = [uniq_map[k] for k in keys]
    out_df = uniq_df.iloc[idxs].reset_index(drop=True)
    out_df.insert(0, "row_index", range(1, len(out_df) + 1))

    # ---- Optional post-fill (dataset-driven) ----
    # If a city/institution overwhelmingly maps to a country in THIS dataset, fill missing.
    known_city = out_df[(out_df["country"].notna()) & (out_df["city"].notna())]
    cc = known_city.groupby(["city", "country"]).size().reset_index(name="n")
    city_tot = cc.groupby("city")["n"].sum().reset_index(name="total")
    cc2 = cc.merge(city_tot, on="city")
    cc2["share"] = cc2["n"] / cc2["total"]
    top_city = cc2.sort_values(["city", "n"], ascending=[True, False]).groupby("city").head(1)
    city_map = top_city[(top_city["total"] >= 5) & (top_city["share"] >= 0.9)].set_index("city")["country"].to_dict()

    known_inst = out_df[(out_df["country"].notna()) & (out_df["institution"].notna())]
    ic = known_inst.groupby(["institution", "country"]).size().reset_index(name="n")
    inst_tot = ic.groupby("institution")["n"].sum().reset_index(name="total")
    ic2 = ic.merge(inst_tot, on="institution")
    ic2["share"] = ic2["n"] / ic2["total"]
    top_inst = ic2.sort_values(["institution", "n"], ascending=[True, False]).groupby("institution").head(1)
    inst_map = top_inst[(top_inst["total"] >= 5) & (top_inst["share"] >= 0.9)].set_index("institution")["country"].to_dict()

    out_df["country_filled_by"] = None
    out_df.loc[out_df["country"].notna(), "country_filled_by"] = "direct"

    mask = out_df["country"].isna() & out_df["city"].notna()
    out_df.loc[mask, "country"] = out_df.loc[mask, "city"].map(city_map)
    out_df.loc[mask & out_df["country"].notna(), "country_filled_by"] = "city_map"

    mask2 = out_df["country"].isna() & out_df["institution"].notna()
    out_df.loc[mask2, "country"] = out_df.loc[mask2, "institution"].map(inst_map)
    out_df.loc[mask2 & out_df["country"].notna(), "country_filled_by"] = "institution_map"

    mask_code = out_df["country_code"].isna() & out_df["country"].notna()
    out_df.loc[mask_code, "country_code"] = out_df.loc[mask_code, "country"].apply(to_country_code)

    out_df.to_csv(out_csv, index=False)

if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--in_csv", required=True)
    ap.add_argument("--out_csv", required=True)
    args = ap.parse_args()
    main(args.in_csv, args.out_csv)
