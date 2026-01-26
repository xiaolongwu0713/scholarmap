#!/usr/bin/env python3
"""Test the rule-based extractor on the problematic affiliation."""

import asyncio
import sys
from pathlib import Path

repo_root = Path(__file__).parent.parent
sys.path.insert(0, str(repo_root))  # For config.py
sys.path.insert(0, str(repo_root / "backend"))  # For app modules

from app.phase2.rule_based_extractor import RuleBasedExtractor
from app.db.connection import db_manager

# The problematic affiliation
affiliation = "Department of Neurosurgery, Union Hospital, Tongji Medical College, Huazhong University of Science and Technology, Wuhan, Hubei, China."


async def test_parse():
    """Test parsing."""
    print(f"\n{'='*80}")
    print(f"Testing Affiliation Parsing")
    print(f"{'='*80}\n")
    print(f"Input affiliation:")
    print(f"  {affiliation}")
    print()

    db_manager.initialize()
    
    try:
        extractor = RuleBasedExtractor()
        results = await extractor.extract_batch([affiliation])
        result = results[0]

        print(f"Extracted result:")
        print(f"  Country: {result.country}")
        print(f"  City: {result.city}")
        print(f"  Institution: {result.institution}")
        print(f"  Confidence: {result.confidence}")
        print()

        # Check if the result is correct
        if result.country == "China":
            if result.city == "Wuhan":
                print(f"✅ CORRECT!")
            else:
                print(f"⚠️  PARTIALLY CORRECT!")
                print(f"   Country is correct: China ✅")
                print(f"   But city is wrong: got '{result.city}', expected 'Wuhan'")
                print(f"   Note: 'Hubei' is a province, not a city")
        else:
            print(f"❌ INCORRECT!")
            print(f"   Expected: China / Wuhan")
            print(f"   Got: {result.country} / {result.city}")

        print()
    finally:
        await db_manager.close()


if __name__ == "__main__":
    asyncio.run(test_parse())

