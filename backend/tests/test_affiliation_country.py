"""Rule-based affiliation parsing must not read US state codes as countries."""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from app.phase2.rule_based_extractor import _parse_affiliation


@pytest.mark.parametrize("affiliation, country, city", [
    # State codes that collide with ISO country codes
    ("Department of Psychiatry, Harvard Medical School, Boston, MA 02115", "United States", "Boston"),
    ("Department of Neurology, University of Pennsylvania, Philadelphia, PA 19104", "United States", "Philadelphia"),
    ("Northwestern University, Chicago, IL 60611", "United States", "Chicago"),
    ("Indiana University School of Medicine, Indianapolis, IN", "United States", "Indianapolis"),
    ("Stanford University, Stanford, CA 94305", "United States", "Stanford"),
    # State names that are (or contain) country names
    ("Emory University School of Medicine, Atlanta, Georgia.", "United States", "Atlanta"),
    ("Rutgers University, Newark, New Jersey.", "United States", "Newark"),
    ("McGill University, Montreal, Quebec.", "Canada", "Montreal"),
    # Explicit country still wins
    ("Harvard Medical School, Boston, MA 02115, USA", "United States", "Boston"),
    ("University of Toronto, Toronto, ON, Canada", "Canada", "Toronto"),
    # Genuine non-US affiliations unaffected
    ("Faculty of Sciences, Hassan II University, Mohammedia, Morocco", "Morocco", "Mohammedia"),
    ("Technion, Haifa, Israel", "Israel", "Haifa"),
    ("Tbilisi State University, Tbilisi, Georgia.", "Georgia", "Tbilisi"),
    ("St Helier General Hospital, St Helier, Jersey", "Jersey", "St Helier"),
    ("Hospital Infantil de Mexico, Mexico City, Mexico", "Mexico", "Mexico City"),
    ("University College London, London, UK", "United Kingdom", "London"),
    # 4-digit postcodes, bare "Korea", city-states
    ("Liggins Institute, University of Auckland, Auckland 1023, New Zealand.", "New Zealand", "Auckland"),
    ("University Hospital Zurich, 8091 Zurich, Switzerland.", "Switzerland", "Zurich"),
    ("Department of Biomedical Sciences, Korea University, Seoul 02841, Korea.", "South Korea", "Seoul"),
    ("Pyongyang University, Pyongyang, Democratic People's Republic of Korea.", "North Korea", "Pyongyang"),
    ("Department of Medicine, National University of Singapore, Singapore.", "Singapore", "Singapore"),
    ("Genome Institute of Singapore, A*STAR, Singapore 138672, Singapore.", "Singapore", "Singapore"),
    ("The University of Hong Kong, Pokfulam, Hong Kong SAR, China.", "Hong Kong", "Hong Kong"),
])
def test_country_and_city(affiliation, country, city):
    result = _parse_affiliation(affiliation)
    assert result["country"] == country
    assert result["city"] == city


def test_state_name_inside_institution_is_not_a_country():
    assert _parse_affiliation("University of New Mexico, Albuquerque")["country"] != "Mexico"


from app.phase2.models import GeoData
from app.phase2.rule_based_extractor import _fill_from_institution


def fill(parsed, match):
    results = {"aff": parsed}
    changed = _fill_from_institution(results, "aff", match)
    return changed, results["aff"]


def test_institution_fills_a_missing_city_in_the_same_country():
    changed, geo = fill(GeoData(country="United States", confidence="medium"),
                        GeoData(country="United States", city="Boston", institution="Harvard", confidence="high"))
    assert changed and (geo.country, geo.city) == ("United States", "Boston")
    assert geo.confidence == "medium"  # the text's confidence is kept


def test_institution_never_overrides_the_country_in_the_text():
    parsed = GeoData(country="United States", confidence="medium")
    changed, geo = fill(parsed, GeoData(country="Jersey", city="Newark", confidence="high"))
    assert not changed and geo == parsed


def test_institution_fills_everything_when_the_text_has_no_location():
    changed, geo = fill(GeoData(), GeoData(country="Germany", city="Heidelberg", confidence="high"))
    assert changed and (geo.country, geo.city, geo.confidence) == ("Germany", "Heidelberg", "high")


def test_complete_parse_is_left_alone():
    parsed = GeoData(country="Germany", city="Berlin", institution="Charite", confidence="high")
    changed, geo = fill(parsed, GeoData(country="Germany", city="Heidelberg", institution="EMBL", confidence="high"))
    assert not changed and geo == parsed
