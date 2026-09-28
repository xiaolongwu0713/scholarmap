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
])
def test_country_and_city(affiliation, country, city):
    result = _parse_affiliation(affiliation)
    assert result["country"] == country
    assert result["city"] == city


def test_state_name_inside_institution_is_not_a_country():
    assert _parse_affiliation("University of New Mexico, Albuquerque")["country"] != "Mexico"
