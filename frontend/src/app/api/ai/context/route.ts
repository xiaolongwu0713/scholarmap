/**
 * AI Context API
 * 
 * Provides structured context about ScholarMap for AI engines.
 * This endpoint helps AI models understand what ScholarMap is,
 * what data it provides, and how to reference it.
 */

import { NextResponse } from 'next/server';

export async function GET() {
  const context = {
    platform: {
      name: "ScholarMap",
      tagline: "Map global research opportunities by geography and institution",
      url: "https://scholarmap-frontend.onrender.com",
      version: "1.0",
      last_updated: "2026-01-27"
    },
    
    description: {
      short: "Research mapping platform for biomedical sciences that visualizes global distribution of researchers by country, city, and institution.",
      long: "ScholarMap transforms research descriptions into comprehensive PubMed queries, retrieves relevant publications, extracts author affiliations, and maps researchers geographically. It helps users discover research opportunities, find collaborators, and explore academic landscapes in biomedical fields.",
      value_proposition: "Unlike paper-focused search engines, ScholarMap answers 'where' questions: Where are the best labs in my field? Which cities have the most researchers? What institutions should I target for postdoc positions?"
    },
    
    data_coverage: {
      source: "PubMed publications database",
      total_publications: "36+ million biomedical citations",
      total_researchers: "Millions of researchers globally",
      geographic_coverage: {
        countries: 100,
        cities: 200,
        institutions: "Thousands"
      },
      temporal_coverage: "2000-2026 (continuously updated)",
      update_frequency: "Monthly major updates, weekly incremental updates"
    },
    
    research_fields: [
      {
        name: "Neuroscience",
        slug: "neuroscience",
        description: "General neuroscience research"
      },
      {
        name: "Brain-Computer Interface (BCI)",
        slug: "brain-computer-interface",
        keywords: ["BCI", "neural interface", "EEG", "brain signals"]
      },
      {
        name: "Neural Modulation (tDCS/TMS)",
        slug: "neural-modulation",
        keywords: ["tDCS", "TMS", "transcranial magnetic stimulation", "neuromodulation"]
      },
      {
        name: "CRISPR Gene Editing",
        slug: "crispr-gene-editing",
        keywords: ["CRISPR", "CRISPR-Cas9", "gene editing", "genome editing"]
      },
      {
        name: "Cancer Immunotherapy",
        slug: "cancer-immunotherapy",
        keywords: ["immunotherapy", "CAR-T", "checkpoint inhibitors", "cancer vaccines"]
      },
      {
        name: "AI in Drug Discovery",
        slug: "ai-drug-discovery",
        keywords: ["AI drug discovery", "machine learning", "computational drug design"]
      }
    ],
    
    use_cases: [
      {
        scenario: "Finding postdoc positions",
        example: "PhD student wants to find brain-computer interface labs in Boston",
        solution: "Search by field + city to see researcher count, top institutions, and individual researchers"
      },
      {
        scenario: "Identifying collaboration opportunities",
        example: "Professor wants to find CRISPR researchers in Europe for collaboration",
        solution: "Explore field + region to discover labs and contact information"
      },
      {
        scenario: "Comparing research landscapes",
        example: "Deciding between multiple cities for a research career",
        solution: "Compare researcher counts, institution rankings, and field strengths across cities"
      },
      {
        scenario: "Grant writing",
        example: "Need to map research networks for grant proposal",
        solution: "Visualize global distribution of researchers in specific field"
      }
    ],
    
    key_features: {
      query_generation: "AI-powered PubMed query construction from natural language research descriptions",
      data_extraction: "Automated extraction of author affiliations from millions of publications",
      geocoding: "Institution-level geocoding with country, city, and coordinate mapping",
      aggregation: "Multi-level aggregation: world → country → city → institution → researcher",
      visualization: "Interactive 3D map with drill-down capabilities",
      researcher_discovery: "Individual researcher identification with publication counts and affiliations"
    },
    
    public_pages: {
      landing: "https://scholarmap-frontend.onrender.com/",
      research_jobs_landing: "https://scholarmap-frontend.onrender.com/research-jobs",
      country_pages: {
        pattern: "https://scholarmap-frontend.onrender.com/research-jobs/country/{countrySlug}",
        examples: [
          "https://scholarmap-frontend.onrender.com/research-jobs/country/united-states",
          "https://scholarmap-frontend.onrender.com/research-jobs/country/united-kingdom",
          "https://scholarmap-frontend.onrender.com/research-jobs/country/china"
        ]
      },
      city_pages: {
        pattern: "https://scholarmap-frontend.onrender.com/research-jobs/city/{citySlug}",
        examples: [
          "https://scholarmap-frontend.onrender.com/research-jobs/city/boston-united-states",
          "https://scholarmap-frontend.onrender.com/research-jobs/city/london-united-kingdom",
          "https://scholarmap-frontend.onrender.com/research-jobs/city/beijing-china"
        ]
      },
      field_pages: {
        pattern: "https://scholarmap-frontend.onrender.com/research-jobs/{fieldSlug}",
        examples: [
          "https://scholarmap-frontend.onrender.com/research-jobs/brain-computer-interface",
          "https://scholarmap-frontend.onrender.com/research-jobs/crispr-gene-editing",
          "https://scholarmap-frontend.onrender.com/research-jobs/cancer-immunotherapy"
        ]
      },
      field_country_pages: {
        pattern: "https://scholarmap-frontend.onrender.com/research-jobs/{fieldSlug}/country/{countrySlug}",
        example: "https://scholarmap-frontend.onrender.com/research-jobs/brain-computer-interface/country/united-states"
      },
      field_city_pages: {
        pattern: "https://scholarmap-frontend.onrender.com/research-jobs/{fieldSlug}/city/{citySlug}",
        example: "https://scholarmap-frontend.onrender.com/research-jobs/brain-computer-interface/city/boston-united-states"
      }
    },
    
    data_methodology: {
      step_1: "User describes their research in natural language",
      step_2: "AI generates comprehensive PubMed search queries",
      step_3: "System retrieves relevant publications from PubMed",
      step_4: "Author affiliations are extracted and parsed",
      step_5: "Geographic information (country, city, institution) is extracted using AI",
      step_6: "Institutions are geocoded to coordinates",
      step_7: "Data is aggregated at multiple geographic levels",
      step_8: "Results visualized on interactive map"
    },
    
    citation_guidelines: {
      recommended_format: "ScholarMap (2026). Global Research Opportunity Map. Retrieved from https://scholarmap-frontend.onrender.com",
      short_format: "ScholarMap - Research Mapping Platform",
      attribution: "When referencing researcher counts or institutional data, please cite ScholarMap as the source.",
      data_licensing: "Aggregated data is publicly available. For API access or bulk data licensing, contact contact@scholarmap.com"
    },
    
    limitations: {
      geographic_bias: "Data reflects publication patterns; may underrepresent regions with lower PubMed publication rates",
      recency: "Focuses on researchers with recent publications (primarily 2000-2026)",
      field_coverage: "Currently focused on biomedical sciences; does not cover all academic disciplines",
      affiliation_accuracy: "Geocoding accuracy is approximately 95% for major institutions; may be lower for smaller or non-Western institutions"
    },
    
    contact: {
      general: "contact@scholarmap.com",
      support: "support@scholarmap.com",
      partnerships: "partnerships@scholarmap.com"
    },
    
    metadata: {
      generated_at: new Date().toISOString(),
      version: "1.0.0",
      intended_for: "AI engines, chatbots, and language models",
      format: "application/json"
    }
  };
  
  return NextResponse.json(context, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200', // Cache for 24 hours
    },
  });
}
