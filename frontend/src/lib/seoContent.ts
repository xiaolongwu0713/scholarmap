/**
 * SEO content generation utilities
 * Template-based content generation for SEO pages
 */

import { CountryStats } from './seoApi';

/**
 * Generate comprehensive SEO content for a country page
 * Target: 800-1500 words
 */
export function generateCountryContent(stats: CountryStats): {
  introduction: string;
  researchLandscape: string;
  topCities: string;
  opportunities: string;
  howToConnect: string;
} {
  const { country, scholar_count, city_count, institution_count, top_cities } = stats;
  
  // Top cities list for text
  const topCityNames = top_cities.slice(0, 5).map(c => c.city).join(', ');
  const topCityDetails = top_cities.slice(0, 3).map(c => 
    `${c.city} (${c.scholar_count} scholars, ${c.institution_count} institutions)`
  ).join(', ');
  
  return {
    introduction: `
${country} is a significant contributor to global biomedical and life sciences research, with ${scholar_count.toLocaleString()} active researchers 
in our PubMed database spanning ${city_count} major cities and ${institution_count.toLocaleString()} research institutions. 
From world-renowned medical schools and research hospitals to specialized institutes in neuroscience, pharmacology, and public health, 
${country} offers diverse opportunities for biomedical researchers at all career stages.

This data covers medical research, biological sciences, neuroscience, pharmacology, public health, and related health sciences fields 
indexed in PubMed. Whether you're a PhD student exploring postdoctoral positions in life sciences, a medical researcher seeking 
international collaborations, or a biomedical professional planning your next career move, understanding the geographic distribution 
of biomedical research activity can help you identify the right opportunities. This page provides insights into the biomedical research 
landscape of ${country}, illustrating how ScholarMap can help you discover and connect with institutions in medicine, biology, and health sciences.
    `.trim(),
    
    researchLandscape: `
The biomedical research ecosystem in ${country} is characterized by its breadth and depth across life sciences and health sciences. 
With ${scholar_count.toLocaleString()} active researchers publishing in PubMed-indexed journals, ${country} contributes significantly 
to global biomedical knowledge in fields such as medicine, biology, neuroscience, pharmacology, and public health. The 
${institution_count.toLocaleString()} research institutions in ${country} range from large medical schools with comprehensive programs 
to specialized research institutes focusing on specific biomedical areas.

Biomedical research activity in ${country} is distributed across ${city_count} cities, each offering unique strengths in different 
areas of life sciences and medical research. Major biomedical research centers include ${topCityNames}, which collectively host the 
majority of the country's health sciences research output. These cities provide access to state-of-the-art medical facilities, 
research hospitals, collaborative networks, and funding opportunities that support cutting-edge biomedical research.

The academic job market in ${country} for biomedical researchers encompasses various positions including postdoctoral fellowships 
in life sciences, research scientist positions in medical centers, faculty appointments in health sciences departments, and visiting 
scholar programs. Many institutions actively recruit international talent in medicine, biology, and related fields, making ${country} 
an attractive destination for biomedical researchers from around the world.
    `.trim(),
    
    topCities: `
Research activity in ${country} is concentrated in several key metropolitan areas, each with its own 
distinctive academic culture and institutional strengths. The top research cities include ${topCityDetails}.

${top_cities.slice(0, 5).map((city, index) => `
**${index + 1}. ${city.city}**  
With ${city.scholar_count} active researchers across ${city.institution_count} institutions, ${city.city} 
represents ${((city.scholar_count / scholar_count) * 100).toFixed(1)}% of ${country}'s research activity.
`).join('\n')}

Each of these cities provides unique advantages for researchers. Beyond the major centers, ${country} also 
hosts active research communities in smaller cities, offering opportunities in specialized fields and 
emerging research areas.
    `.trim(),
    
    opportunities: `
Biomedical researchers interested in ${country} can explore various types of opportunities in life sciences and medical research:

**Postdoctoral Positions in Life Sciences**: Many medical schools, research hospitals, and biomedical institutes in ${country} 
offer postdoctoral fellowships in areas such as neuroscience, molecular biology, pharmacology, and clinical research. These positions 
typically provide 2-3 years of research time with competitive funding, allowing early-career biomedical researchers to establish 
their independent research programs while benefiting from mentorship and access to state-of-the-art medical facilities.

**Biomedical Research Collaborations**: The ${scholar_count.toLocaleString()} biomedical researchers in ${country} are actively 
engaged in international collaborations across medicine, biology, and health sciences. Connecting with researchers in your specific 
biomedical field can lead to joint publications, collaborative grant applications, clinical trials, and research exchange programs.

**Faculty Positions in Health Sciences**: Medical schools, universities, and research institutes regularly hire tenure-track faculty 
in biomedical departments including medicine, biology, neuroscience, pharmacology, and public health. Academic positions in ${country} 
often come with research startup packages, access to graduate students and postdocs, and collaborative funding opportunities for 
biomedical research.

**Visiting Scholar Programs**: Many biomedical institutions offer visiting scholar positions for life sciences researchers, ranging 
from short-term research visits (1-3 months) to year-long appointments in medical centers and research hospitals. These programs 
facilitate knowledge exchange in specialized biomedical areas and can lead to longer-term collaborations.

The biomedical research environment in ${country} supports interdisciplinary work across life sciences, with many institutions 
encouraging collaboration between basic biology, clinical medicine, and translational research. This creates opportunities for 
researchers working at the intersection of multiple biomedical fields.
    `.trim(),
    
    howToConnect: `
To explore biomedical research opportunities in ${country}, start by understanding the geographic distribution of life sciences 
research activity. Our interactive research map provides a powerful way to visualize biomedical scholars, medical institutions, 
and their research output across ${city_count} cities in ${country}.

Using ScholarMap for biomedical research, you can:
- Browse life sciences researchers by city and institution in your specific biomedical field
- Explore PubMed publication patterns and collaboration networks in medicine and biology
- Identify potential mentors or collaborators in neuroscience, pharmacology, or other health sciences
- Discover institutional strengths in specific biomedical areas and emerging research fields

The example map shows ${scholar_count.toLocaleString()} biomedical scholars across ${institution_count.toLocaleString()} 
institutions in ${country} based on PubMed data. When you create your free account, you can generate a similar map for your 
specific biomedical research interest, allowing you to discover exactly which medical schools, research hospitals, and 
biomedical institutes are most active in your field.

The geographic visualization helps you make informed decisions about where to apply for postdoc positions in life sciences, 
which medical institutions to contact for collaborations, and how biomedical research activity in your field is distributed 
globally. Whether you're planning a postdoc application in neuroscience, seeking clinical research partners, or exploring 
faculty positions in health sciences, understanding this geographic landscape is invaluable for your biomedical career planning.
    `.trim(),
  };
}

/**
 * Generate FAQ content for country page
 */
export function generateCountryFAQs(country: string, stats: CountryStats): Array<{
  question: string;
  answer: string;
}> {
  return [
    {
      question: `What biomedical research data is shown for ${country}?`,
      answer: `The data shown represents biomedical and life sciences research from PubMed, with ${stats.scholar_count.toLocaleString()} researchers across ${stats.institution_count.toLocaleString()} institutions in ${country}. This covers medicine, biology, neuroscience, pharmacology, public health, and related health sciences. When you create a free ScholarMap account, you can generate a similar map for your specific biomedical research field.`,
    },
    {
      question: `What research fields does ScholarMap cover?`,
      answer: `ScholarMap uses PubMed data, covering biomedical and life sciences research including medicine, biology, neuroscience, pharmacology, public health, genetics, immunology, and related health sciences. It does not include social sciences, economics, engineering (except biomedical), or humanities.`,
    },
    {
      question: `What are the major biomedical research cities in ${country}?`,
      answer: `In our PubMed dataset, the top biomedical research cities in ${country} include ${stats.top_cities.slice(0, 5).map(c => c.city).join(', ')}. These cities host major medical schools, research hospitals, and biomedical institutes. Use ScholarMap to discover the geographic distribution of researchers in your specific life sciences area.`,
    },
    {
      question: `How can ScholarMap help me find biomedical opportunities in ${country}?`,
      answer: `ScholarMap creates an interactive geographic visualization of biomedical researchers in your field using PubMed data. You can discover which cities and medical institutions in ${country} are most active in your area of life sciences, helping you identify postdoc opportunities, clinical research collaborations, and faculty positions in health sciences.`,
    },
    {
      question: `Is ScholarMap free to use?`,
      answer: `Yes! You can create a free account to generate biomedical research maps for your specific field of interest in medicine, biology, or health sciences. Simply describe your research area, and ScholarMap will analyze PubMed publication data to show you the geographic distribution of active biomedical scholars and institutions worldwide, including in ${country}.`,
    },
  ];
}

/**
 * Generate meta description for country page
 */
export function generateCountryMetaDescription(country: string, stats: CountryStats): string {
  return `Explore biomedical research opportunities in ${country}. ${stats.scholar_count.toLocaleString()} PubMed researchers across ${stats.city_count} cities in medicine, biology, neuroscience, and health sciences. Find postdoc positions and collaborations.`;
}

/**
 * Generate keywords for country page
 */
export function generateCountryKeywords(country: string): string[] {
  return [
    `biomedical research opportunities ${country}`,
    `life sciences postdoc ${country}`,
    `medical research ${country}`,
    `PubMed researchers ${country}`,
    `neuroscience research ${country}`,
    `clinical research opportunities ${country}`,
    `pharmacology postdoc ${country}`,
    `biology research institutions ${country}`,
    `health sciences ${country}`,
    `biomedical collaboration ${country}`,
  ];
}
