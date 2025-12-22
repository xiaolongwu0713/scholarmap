"""PubMed XML parser for extracting paper and authorship data."""

from __future__ import annotations

import logging
import re
from typing import Any
from xml.etree import ElementTree as ET

from app.phase2.models import AuthorName, ParsedAuthor, ParsedPaper

logger = logging.getLogger(__name__)


class PubMedXMLParser:
    """Parser for PubMed EFetch XML (retmode=xml)."""
    
    def parse_xml_batch(self, xml_text: str) -> list[ParsedPaper]:
        """
        Parse a batch of PubMed XML into ParsedPaper objects.
        
        Args:
            xml_text: Raw XML string from EFetch
        
        Returns:
            List of ParsedPaper objects
        """
        try:
            root = ET.fromstring(xml_text)
        except ET.ParseError as e:
            logger.error(f"Failed to parse XML: {e}")
            return []
        
        papers = []
        
        # Each article is under PubmedArticle
        for article_elem in root.findall(".//PubmedArticle"):
            try:
                paper = self._parse_article(article_elem)
                if paper:
                    papers.append(paper)
            except Exception as e:
                # Log and continue with other articles
                pmid = self._extract_pmid(article_elem)
                logger.error(f"Failed to parse article {pmid}: {e}")
                continue
        
        logger.info(f"Parsed {len(papers)} papers from XML batch")
        return papers
    
    def parse_articles(self, xml_text: str) -> list[ParsedPaper]:
        """
        Parse XML (can be a single article or a batch).
        
        This is an alias for parse_xml_batch for compatibility.
        
        Args:
            xml_text: XML string (single article or batch)
        
        Returns:
            List of ParsedPaper objects
        """
        return self.parse_xml_batch(xml_text)
    
    def _parse_article(self, article_elem: ET.Element) -> ParsedPaper | None:
        """Parse a single PubmedArticle element."""
        citation = article_elem.find(".//MedlineCitation")
        if citation is None:
            return None
        
        pmid = self._extract_pmid(article_elem)
        if not pmid:
            logger.warning("Article without PMID, skipping")
            return None
        
        title = self._extract_title(citation)
        year = self._extract_year(citation)
        doi = self._extract_doi(article_elem)
        authors = self._extract_authors(citation, year)
        
        return ParsedPaper(
            pmid=pmid,
            title=title,
            year=year,
            doi=doi,
            authors=authors
        )
    
    def _extract_pmid(self, article_elem: ET.Element) -> str:
        """Extract PMID from article."""
        pmid_elem = article_elem.find(".//MedlineCitation/PMID")
        if pmid_elem is not None and pmid_elem.text:
            return pmid_elem.text.strip()
        return ""
    
    def _extract_title(self, citation: ET.Element) -> str:
        """Extract article title."""
        title_elem = citation.find(".//Article/ArticleTitle")
        if title_elem is not None and title_elem.text:
            return title_elem.text.strip()
        return ""
    
    def _extract_year(self, citation: ET.Element) -> int | None:
        """
        Extract publication year with fallback logic.
        
        Try in order:
        1. ./MedlineCitation/Article/Journal/JournalIssue/PubDate/Year
        2. ./MedlineCitation/Article/ArticleDate/Year
        3. ./MedlineCitation/Article/Journal/JournalIssue/PubDate/MedlineDate (regex)
        """
        # Try PubDate/Year
        year_elem = citation.find(".//Article/Journal/JournalIssue/PubDate/Year")
        if year_elem is not None and year_elem.text:
            try:
                return int(year_elem.text.strip())
            except ValueError:
                pass
        
        # Try ArticleDate/Year
        year_elem = citation.find(".//Article/ArticleDate/Year")
        if year_elem is not None and year_elem.text:
            try:
                return int(year_elem.text.strip())
            except ValueError:
                pass
        
        # Try MedlineDate with regex
        medline_date_elem = citation.find(".//Article/Journal/JournalIssue/PubDate/MedlineDate")
        if medline_date_elem is not None and medline_date_elem.text:
            match = re.search(r"\b(19|20)\d{2}\b", medline_date_elem.text)
            if match:
                try:
                    return int(match.group(0))
                except ValueError:
                    pass
        
        return None
    
    def _extract_doi(self, article_elem: ET.Element) -> str | None:
        """
        Extract DOI with fallback.
        
        Try:
        1. ./PubmedData/ArticleIdList/ArticleId[@IdType="doi"]
        2. ./MedlineCitation/Article/ELocationID[@EIdType="doi"]
        """
        # Try ArticleIdList
        doi_elem = article_elem.find('.//PubmedData/ArticleIdList/ArticleId[@IdType="doi"]')
        if doi_elem is not None and doi_elem.text:
            return doi_elem.text.strip()
        
        # Try ELocationID
        doi_elem = article_elem.find('.//MedlineCitation/Article/ELocationID[@EIdType="doi"]')
        if doi_elem is not None and doi_elem.text:
            return doi_elem.text.strip()
        
        return None
    
    def _extract_authors(self, citation: ET.Element, year: int | None) -> list[ParsedAuthor]:
        """
        Extract all authors from AuthorList.
        
        Returns one ParsedAuthor per author with their affiliations.
        """
        author_list = citation.find(".//Article/AuthorList")
        if author_list is None:
            return []
        
        authors = []
        
        for order, author_elem in enumerate(author_list.findall("Author"), start=1):
            try:
                name = self._extract_author_name(author_elem)
                affiliations = self._extract_author_affiliations(author_elem)
                
                authors.append(ParsedAuthor(
                    name=name,
                    affiliations_raw=affiliations,
                    author_order=order
                ))
            except Exception as e:
                logger.warning(f"Failed to parse author #{order}: {e}")
                continue
        
        return authors
    
    def _extract_author_name(self, author_elem: ET.Element) -> AuthorName:
        """Extract author name components."""
        # Check for collective name first
        collective_elem = author_elem.find("CollectiveName")
        if collective_elem is not None and collective_elem.text:
            return AuthorName(collective_name=collective_elem.text.strip())
        
        # Extract individual name components
        last_name = ""
        fore_name = ""
        initials = ""
        suffix = ""
        
        last_name_elem = author_elem.find("LastName")
        if last_name_elem is not None and last_name_elem.text:
            last_name = last_name_elem.text.strip()
        
        fore_name_elem = author_elem.find("ForeName")
        if fore_name_elem is not None and fore_name_elem.text:
            fore_name = fore_name_elem.text.strip()
        
        initials_elem = author_elem.find("Initials")
        if initials_elem is not None and initials_elem.text:
            initials = initials_elem.text.strip()
        
        suffix_elem = author_elem.find("Suffix")
        if suffix_elem is not None and suffix_elem.text:
            suffix = suffix_elem.text.strip()
        
        return AuthorName(
            last_name=last_name,
            fore_name=fore_name,
            initials=initials,
            suffix=suffix
        )
    
    def _extract_author_affiliations(self, author_elem: ET.Element) -> list[str]:
        """
        Extract author-level affiliations.
        
        Returns list of affiliation strings from ./AffiliationInfo/Affiliation
        """
        affiliations = []
        
        for aff_info in author_elem.findall("AffiliationInfo"):
            aff_elem = aff_info.find("Affiliation")
            if aff_elem is not None and aff_elem.text:
                affiliation_text = aff_elem.text.strip()
                if affiliation_text:
                    affiliations.append(affiliation_text)
        
        return affiliations

