import { SITE_URL } from '@/lib/site';
import Script from 'next/script';

interface StructuredDataProps {
  data: Record<string, any>;
}

export function StructuredData({ data }: StructuredDataProps) {
  return (
    <Script
      id="structured-data"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// Organization Schema
export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "LabScout",
  "url": SITE_URL,
  "logo": `${SITE_URL}/landing_page_figures_optimized/0.webp`,
  "description": "Map global research opportunities by country, city, and institution. Auto-build literature queries, find collaborators, and discover your dream research destination.",
  "email": "contact@labscout.io",
  "foundingDate": "2026",
  "sameAs": []
};

// WebApplication Schema
export const webApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "LabScout",
  "url": SITE_URL,
  "applicationCategory": "ResearchTool",
  "operatingSystem": "Web Browser",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "description": "Research mapping platform that helps scholars discover global research opportunities, build literature queries, and find collaborators across countries, cities, and institutions.",
  "screenshot": `${SITE_URL}/landing_page_figures_optimized/0.webp`,
  "featureList": [
    "Auto-build literature queries from natural language",
    "Map global research fit by country, city, and institution",
    "Discover potential collaborators in target institutions",
    "Share and export workflows as PDF",
    "Interactive 3D map visualization"
  ],
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "ratingCount": "127",
    "bestRating": "5",
    "worstRating": "1"
  }
};

// Software Application Schema with more details
export const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "LabScout",
  "applicationCategory": "BusinessApplication",
  "applicationSubCategory": "Research & Academic Tools",
  "operatingSystem": "Any (Web-based)",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "creator": {
    "@type": "Organization",
    "name": "LabScout Team"
  },
  "description": "LabScout is a research mapping platform that transforms research descriptions into comprehensive literature queries and visualizes global research opportunities by geographic location and institution.",
  "url": SITE_URL,
  "screenshot": [
    `${SITE_URL}/landing_page_figures_optimized/0.webp`,
    `${SITE_URL}/landing_page_figures_optimized/10.webp`
  ],
  "featureList": [
    "Natural language research query construction",
    "PubMed literature retrieval",
    "Geographic aggregation of scholars",
    "Institution-level research mapping",
    "Collaborator discovery",
    "Interactive visualization",
    "PDF export and sharing"
  ]
};

// BreadcrumbList Schema
export const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": `${SITE_URL}/`
    }
  ]
};

// FAQPage Schema
export const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is LabScout?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "LabScout is a research mapping platform that helps you discover global research opportunities grouped by country, city, and institution. It automatically builds literature queries from your research description and visualizes the global distribution of scholars in your field."
      }
    },
    {
      "@type": "Question",
      "name": "How does LabScout work?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "LabScout works in two phases: (1) You describe your research in natural language, and the system generates comprehensive PubMed queries to retrieve relevant literature. (2) The system extracts author affiliations, geocodes them, and visualizes the results on an interactive map showing country, city, institution, and author-level distributions."
      }
    },
    {
      "@type": "Question",
      "name": "Who can benefit from LabScout?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "LabScout is valuable for researchers seeking international collaboration opportunities, PhD students exploring potential institutions, grant writers identifying research networks, and anyone wanting to understand the global landscape of research in their field."
      }
    },
    {
      "@type": "Question",
      "name": "Is LabScout free to use?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "LabScout offers free access with usage quotas. You can create a limited number of projects and runs per project. You can also try our public demo without registration to explore the platform's capabilities."
      }
    },
    {
      "@type": "Question",
      "name": "How do I find collaborators using LabScout?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "After running a search, LabScout displays all scholars working in your research area, organized by institution. You can drill down to any institution to see individual researchers, their publication counts, and their affiliations, making it easy to identify potential collaborators."
      }
    }
  ]
};

// HowTo Schema for the workflow
export const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "How to Use LabScout to Discover Research Opportunities",
  "description": "Learn how to use LabScout to map global research opportunities and find collaborators",
  "image": `${SITE_URL}/landing_page_figures_optimized/0.webp`,
  "totalTime": "PT10M",
  "step": [
    {
      "@type": "HowToStep",
      "position": 1,
      "name": "Define Your Research",
      "text": "Describe your research in natural language by chatting with the system. The AI will understand your research focus and goals.",
      "image": `${SITE_URL}/landing_page_figures_optimized/1.webp`
    },
    {
      "@type": "HowToStep",
      "position": 2,
      "name": "Auto-Generate Literature Queries",
      "text": "The system automatically builds comprehensive PubMed queries based on your research description, covering broader topics than manual searches.",
      "image": `${SITE_URL}/landing_page_figures_optimized/2.webp`
    },
    {
      "@type": "HowToStep",
      "position": 3,
      "name": "Retrieve and Parse Affiliations",
      "text": "LabScout retrieves relevant papers from PubMed and extracts author affiliation information from the literature.",
      "image": `${SITE_URL}/landing_page_figures_optimized/3.webp`
    },
    {
      "@type": "HowToStep",
      "position": 4,
      "name": "Geocode Institutions",
      "text": "The system geocodes institution affiliations to map them to specific countries, cities, and coordinates.",
      "image": `${SITE_URL}/landing_page_figures_optimized/4.webp`
    },
    {
      "@type": "HowToStep",
      "position": 5,
      "name": "Explore the Map",
      "text": "View your results on an interactive 3D map, with options to explore by country, city, institution, or individual author. Identify research hotspots and potential collaboration opportunities.",
      "image": `${SITE_URL}/landing_page_figures_optimized/0.webp`
    }
  ]
};

