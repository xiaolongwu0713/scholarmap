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
${country} hosts a vibrant research community with ${scholar_count.toLocaleString()} scholars in our example 
dataset, spanning ${city_count} major cities and ${institution_count.toLocaleString()} research institutions. 
From world-renowned universities to specialized research centers, ${country} offers diverse opportunities 
for academic collaboration and career development.

Whether you're a PhD student exploring postdoctoral positions, an established researcher seeking international 
collaborations, or an academic professional planning your next career move, understanding the geographic 
distribution of research activity can help you identify the right opportunities. This page provides insights 
into the research landscape of ${country} based on sample data, illustrating how ScholarMap can help you 
discover and connect with institutions in your field.
    `.trim(),
    
    researchLandscape: `
The research ecosystem in ${country} is characterized by its breadth and depth across multiple disciplines. 
With ${scholar_count.toLocaleString()} active researchers publishing in peer-reviewed journals, ${country} 
contributes significantly to global scientific knowledge. The ${institution_count.toLocaleString()} research 
institutions in ${country} range from large research universities with comprehensive programs to specialized 
institutes focusing on specific fields.

Research activity in ${country} is distributed across ${city_count} cities, each offering unique strengths 
and opportunities. Major research centers include ${topCityNames}, which collectively host the majority of 
the country's research output. These cities provide access to state-of-the-art facilities, collaborative 
networks, and funding opportunities that support cutting-edge research.

The academic job market in ${country} encompasses various positions including postdoctoral fellowships, 
research scientist positions, faculty appointments, and visiting scholar programs. Many institutions actively 
recruit international talent, making ${country} an attractive destination for researchers from around the world.
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
Researchers interested in ${country} can explore various types of opportunities:

**Postdoctoral Positions**: Many institutions in ${country} offer postdoctoral fellowships with competitive 
funding. These positions typically provide 2-3 years of research time, allowing early-career researchers to 
establish their independent research programs while benefiting from mentorship and institutional resources.

**Research Collaborations**: The ${scholar_count.toLocaleString()} researchers in ${country} are actively 
engaged in international collaborations. Connecting with researchers in your field can lead to joint 
publications, grant applications, and exchange programs.

**Faculty Positions**: Universities and research institutes regularly hire tenure-track faculty and research 
scientists. Academic positions in ${country} often come with research startup packages, access to graduate 
students, and collaborative funding opportunities.

**Visiting Scholar Programs**: Many institutions offer visiting scholar positions, ranging from short-term 
visits (1-3 months) to year-long appointments. These programs facilitate knowledge exchange and can lead to 
longer-term collaborations.

The research environment in ${country} supports interdisciplinary work, with many institutions encouraging 
collaboration across traditional departmental boundaries. This creates opportunities for researchers working 
at the intersection of multiple fields.
    `.trim(),
    
    howToConnect: `
To explore research opportunities in ${country}, start by understanding the geographic distribution of research 
activity. Our interactive research map provides a powerful way to visualize scholars, institutions, and their 
research output across ${city_count} cities in ${country}.

Using ScholarMap, you can:
- Browse researchers by city and institution in your specific field
- Explore publication patterns and collaboration networks  
- Identify potential mentors or collaborators
- Discover institutional strengths and emerging research areas

The example map shows ${scholar_count.toLocaleString()} scholars across ${institution_count.toLocaleString()} 
institutions in ${country}. When you create your free account, you can generate a similar map for your specific 
research interest, allowing you to discover exactly which institutions and cities are most active in your field.

The geographic visualization helps you make informed decisions about where to apply for positions, which 
institutions to contact for collaborations, and how research activity in your field is distributed globally. 
Whether you're planning a postdoc application, seeking research partners, or exploring faculty positions, 
understanding this geographic landscape is invaluable for your academic career planning.
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
      question: `What data is shown for ${country}?`,
      answer: `The data shown represents an example research area with ${stats.scholar_count.toLocaleString()} scholars across ${stats.institution_count.toLocaleString()} institutions in ${country}. When you create a free ScholarMap account, you can generate a similar map for your specific research field.`,
    },
    {
      question: `What are the major research cities in ${country}?`,
      answer: `In our example dataset, the top research cities in ${country} include ${stats.top_cities.slice(0, 5).map(c => c.city).join(', ')}. The actual distribution in your field may differ. Use ScholarMap to discover the geographic distribution of scholars in your specific research area.`,
    },
    {
      question: `How can ScholarMap help me find opportunities in ${country}?`,
      answer: `ScholarMap creates an interactive geographic visualization of scholars in your research field. By mapping publication data, you can discover which cities and institutions in ${country} are most active in your area, helping you identify postdoc opportunities, collaboration partners, and faculty positions.`,
    },
    {
      question: `Is ScholarMap free to use?`,
      answer: `Yes! You can create a free account to generate research maps for your specific field of interest. Simply describe your research area, and ScholarMap will analyze publication data to show you the geographic distribution of active scholars and institutions worldwide, including in ${country}.`,
    },
  ];
}

/**
 * Generate meta description for country page
 */
export function generateCountryMetaDescription(country: string, stats: CountryStats): string {
  return `Discover research opportunities in ${country} with our interactive map tool. See example data showing ${stats.scholar_count.toLocaleString()} scholars across ${stats.city_count} cities. Create your free map for your research field.`;
}

/**
 * Generate keywords for country page
 */
export function generateCountryKeywords(country: string): string[] {
  return [
    `research opportunities ${country}`,
    `postdoc positions ${country}`,
    `academic jobs ${country}`,
    `PhD positions ${country}`,
    `research collaborations ${country}`,
    `universities ${country}`,
    `research institutions ${country}`,
    `scholars ${country}`,
    `academic careers ${country}`,
    `postdoctoral fellowships ${country}`,
  ];
}
