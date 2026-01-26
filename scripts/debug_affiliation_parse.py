#!/usr/bin/env python3
"""Debug the affiliation parsing step by step."""

import sys
from pathlib import Path
import re

repo_root = Path(__file__).parent.parent
sys.path.insert(0, str(repo_root))
sys.path.insert(0, str(repo_root / "backend"))

# Import the internal parsing function
from app.phase2.rule_based_extractor import _parse_affiliation

# The problematic affiliation
affiliation = "Department of Neurosurgery, Union Hospital, Tongji Medical College, Huazhong University of Science and Technology, Wuhan, Hubei, China."

print(f"\n{'='*80}")
print(f"Debug Affiliation Parsing - Step by Step")
print(f"{'='*80}\n")
print(f"Input affiliation:")
print(f"  {affiliation}")
print(f"\n{'='*80}\n")

# Call the internal _parse_affiliation function
result = _parse_affiliation(affiliation)

print(f"Parsing Result:")
print(f"  Country: {result['country']}")
print(f"  Country code: {result['country_code']}")
print(f"  Region (raw): {result['region_raw']}")
print(f"  Region (norm): {result['region_norm']}")
print(f"  City: {result['city']}")
print(f"  Institution: {result['institution']}")
print(f"  Department: {result['department']}")
print(f"  Parse source: {result['parse_source']}")
print(f"  Tokens: {result['tokens']}")

print(f"\n{'='*80}")
print(f"Analysis:")
print(f"{'='*80}\n")

tokens = result['tokens'].split("|")
print(f"Tokenized affiliation:")
for i, tok in enumerate(tokens):
    print(f"  [{i}] '{tok}'")

print(f"\nRegion detection:")
print(f"  Region raw: '{result['region_raw']}'")
print(f"  Region norm: '{result['region_norm']}'")
print(f"  → This is correct, 'Hubei' is a province")

print(f"\nCity detection:")
print(f"  Detected city: '{result['city']}'")
if result['city'] == "Hubei":
    print(f"  ❌ ERROR: 'Hubei' is a province, not a city!")
    print(f"  → Should have detected 'Wuhan' (the token before 'Hubei')")
elif result['city'] == "Wuhan":
    print(f"  ✅ CORRECT")
else:
    print(f"  ⚠️  Got '{result['city']}', expected 'Wuhan'")

print(f"\nCountry detection:")
print(f"  Detected country: '{result['country']}'")
if result['country'] == "China":
    print(f"  ✅ CORRECT")
else:
    print(f"  ❌ ERROR: Expected 'China', got '{result['country']}'")

print()

