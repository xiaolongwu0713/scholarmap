#!/usr/bin/env python3
"""
Validation script for Phase 2 implementation.

This script validates:
1. All modules can be imported
2. Database schema is correct
3. Models are valid
4. Example data can be parsed
"""

from __future__ import annotations

import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

print("=" * 60)
print("Phase 2 Implementation Validation")
print("=" * 60)
print()

# Test 1: Import all modules
print("Test 1: Importing modules...")
try:
    from app.phase2 import models, schema, database, pubmed_fetcher, pubmed_parser, affiliation_extractor, ingest
    print("✓ All modules imported successfully")
except ImportError as e:
    print(f"✗ Import failed: {e}")
    sys.exit(1)

# Test 2: Validate models
print("\nTest 2: Validating Pydantic models...")
try:
    from app.phase2.models import AuthorName, ParsedAuthor, ParsedPaper, GeoData, IngestStats
    
    # Create test author
    author = AuthorName(
        last_name="Smith",
        fore_name="John",
        initials="J"
    )
    assert author.display_name == "Smith, John"
    assert not author.is_collective
    
    # Create test paper
    paper = ParsedPaper(
        pmid="12345678",
        title="Test Paper",
        year=2024,
        authors=[
            ParsedAuthor(
                name=author,
                affiliations_raw=["Harvard Medical School, Boston, MA, USA"],
                author_order=1
            )
        ]
    )
    assert len(paper.authors) == 1
    
    # Create test geo data
    geo = GeoData(
        country="United States",
        city="Boston",
        institution="Harvard Medical School",
        confidence="high"
    )
    
    # Create test stats
    stats = IngestStats(
        run_id="test",
        total_pmids=100,
        pmids_cached=50,
        pmids_fetched=50,
        papers_parsed=50,
        authorships_created=200,
        unique_affiliations=150,
        affiliations_with_country=140,
        llm_calls_made=8
    )
    
    print("✓ All models validated")
except Exception as e:
    print(f"✗ Model validation failed: {e}")
    sys.exit(1)

# Test 3: Database schema
print("\nTest 3: Testing database schema...")
try:
    import tempfile
    import sqlite3
    from app.phase2.schema import init_database, get_connection
    
    # Create temp database
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        temp_db = Path(f.name)
    
    try:
        init_database(temp_db)
        
        # Verify tables exist
        conn = get_connection(temp_db)
        cursor = conn.cursor()
        
        tables = cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table'
            ORDER BY name
        """).fetchall()
        
        table_names = [row[0] for row in tables]
        
        required_tables = ["papers", "authorship", "run_papers", "affiliation_cache", "schema_version"]
        for table in required_tables:
            if table not in table_names:
                raise ValueError(f"Missing table: {table}")
        
        # Check authorship schema
        schema = cursor.execute("PRAGMA table_info(authorship)").fetchall()
        column_names = [row[1] for row in schema]
        
        required_columns = [
            "authorship_id", "pmid", "author_order", "author_name_raw",
            "last_name", "fore_name", "initials", "suffix",
            "is_collective", "collective_name", "year",
            "affiliations_raw", "affiliation_raw_joined", "has_author_affiliation",
            "country", "city", "institution", "affiliation_confidence"
        ]
        
        for col in required_columns:
            if col not in column_names:
                raise ValueError(f"Missing column in authorship: {col}")
        
        conn.close()
        print("✓ Database schema validated")
        
    finally:
        temp_db.unlink(missing_ok=True)
        
except Exception as e:
    print(f"✗ Database schema validation failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 4: XML Parser (with sample data)
print("\nTest 4: Testing XML parser...")
try:
    from app.phase2.pubmed_parser import PubMedXMLParser
    
    # Minimal valid PubMed XML
    sample_xml = """<?xml version="1.0" ?>
    <PubmedArticleSet>
        <PubmedArticle>
            <MedlineCitation>
                <PMID>12345678</PMID>
                <Article>
                    <ArticleTitle>Test Article Title</ArticleTitle>
                    <Journal>
                        <JournalIssue>
                            <PubDate>
                                <Year>2024</Year>
                            </PubDate>
                        </JournalIssue>
                    </Journal>
                    <AuthorList>
                        <Author>
                            <LastName>Smith</LastName>
                            <ForeName>John</ForeName>
                            <Initials>J</Initials>
                            <AffiliationInfo>
                                <Affiliation>Harvard Medical School, Boston, MA, USA</Affiliation>
                            </AffiliationInfo>
                        </Author>
                    </AuthorList>
                </Article>
            </MedlineCitation>
            <PubmedData>
                <ArticleIdList>
                    <ArticleId IdType="doi">10.1234/test.2024</ArticleId>
                </ArticleIdList>
            </PubmedData>
        </PubmedArticle>
    </PubmedArticleSet>
    """
    
    parser = PubMedXMLParser()
    papers = parser.parse_xml_batch(sample_xml)
    
    assert len(papers) == 1, f"Expected 1 paper, got {len(papers)}"
    
    paper = papers[0]
    assert paper.pmid == "12345678", f"Wrong PMID: {paper.pmid}"
    assert paper.title == "Test Article Title", f"Wrong title: {paper.title}"
    assert paper.year == 2024, f"Wrong year: {paper.year}"
    assert paper.doi == "10.1234/test.2024", f"Wrong DOI: {paper.doi}"
    assert len(paper.authors) == 1, f"Expected 1 author, got {len(paper.authors)}"
    
    author = paper.authors[0]
    assert author.name.last_name == "Smith", f"Wrong last name: {author.name.last_name}"
    assert author.name.fore_name == "John", f"Wrong fore name: {author.name.fore_name}"
    assert author.author_order == 1, f"Wrong author order: {author.author_order}"
    assert len(author.affiliations_raw) == 1, f"Expected 1 affiliation, got {len(author.affiliations_raw)}"
    assert "Harvard" in author.affiliations_raw[0], f"Wrong affiliation: {author.affiliations_raw[0]}"
    
    print("✓ XML parser validated")
    
except Exception as e:
    print(f"✗ XML parser validation failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 5: Check existing run data
print("\nTest 5: Checking existing run data...")
try:
    from app.core.storage import FileStore
    from app.core.config import settings
    
    store = FileStore(settings.scholarmap_data_dir)
    
    # Check example project
    project = store.get_project("ad280effc0b8")
    if project:
        print(f"  Found project: {project.name}")
        
        # Check example run
        try:
            results = store.read_run_file("ad280effc0b8", "run_7b1d4766fd27", "results_aggregated.json")
            num_papers = len(results.get("items", []))
            
            # Count PMIDs
            pmids = []
            for item in results.get("items", []):
                pmid = item.get("identifiers", {}).get("pmid")
                if pmid:
                    pmids.append(pmid)
            
            print(f"  Found {num_papers} papers in results_aggregated.json")
            print(f"  {len(pmids)} papers have PMIDs ({len(pmids)*100//num_papers}%)")
            
            if pmids:
                print(f"  Sample PMIDs: {', '.join(str(p) for p in pmids[:5])}")
            
            print("✓ Run data validated")
        except FileNotFoundError:
            print("  ⚠ Run not found, but that's OK for validation")
    else:
        print("  ⚠ Example project not found, but that's OK for validation")
        
except Exception as e:
    print(f"  ⚠ Could not check run data: {e}")
    print("  This is OK - run data is optional for validation")

print()
print("=" * 60)
print("✅ All validation tests passed!")
print("=" * 60)
print()
print("Next steps:")
print("1. Install lxml: pip install lxml")
print("2. Set OPENAI_API_KEY in .env")
print("3. Run test script: python test_phase2_ingestion.py ad280effc0b8 run_7b1d4766fd27")
print()
