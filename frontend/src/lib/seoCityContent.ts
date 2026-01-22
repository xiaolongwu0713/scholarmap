/**
 * SEO content generation for city pages
 * Focus: Biomedical, Life Sciences, and Neural Engineering
 */

import { CountryMapCity, CityMapInstitution } from './seoApi';

export interface CityStats {
  city: string;
  country: string;
  scholar_count: number;
  institution_count: number;
  institutions: CityMapInstitution[];
  latitude: number | null;
  longitude: number | null;
}

export interface CityContent {
  introduction: string;
  researchHub: string;
  institutions: string;
  opportunities: string;
  howToConnect: string;
}

/**
 * Generate comprehensive content for city page
 */
export function generateCityContent(stats: CityStats): CityContent {
  const { city, country, scholar_count, institution_count, institutions } = stats;
  
  // Get top 5 institutions
  const topInstitutions = institutions.slice(0, 5);
  const institutionNames = topInstitutions.map(i => i.institution).join(', ');
  
  return {
    introduction: `
${city}, ${country} is an active hub for biomedical and life sciences research, with ${scholar_count.toLocaleString()} researchers contributing to advances in medicine, biology, neuroscience, and health sciences. The city's research ecosystem spans ${institution_count} institutions, creating a vibrant community for scientific collaboration and discovery in the biomedical field.

As a center for life sciences innovation, ${city} offers extensive opportunities for researchers, clinicians, and scientists working across diverse areas including molecular biology, clinical research, neuroscience, pharmacology, and medical device development. The concentration of biomedical expertise makes ${city} an attractive destination for postdoctoral positions, research collaborations, and academic career advancement in health sciences.

The city's research infrastructure supports cutting-edge investigations in translational medicine, bridging laboratory discoveries with clinical applications. From basic biological research to applied medical technologies, ${city}'s research community actively contributes to PubMed-indexed publications that advance our understanding of human health and disease.
    `.trim(),

    researchHub: `
${city} has established itself as a significant research hub within ${country}'s biomedical research landscape. The city's ${institution_count} research institutions collectively employ ${scholar_count.toLocaleString()} active researchers who are pushing the boundaries of life sciences and medical knowledge.

The research environment in ${city} is characterized by strong interdisciplinary collaboration between medical schools, university biology departments, research hospitals, and specialized biomedical research institutes. This collaborative ecosystem facilitates innovation across traditional boundaries, enabling researchers to tackle complex questions in systems biology, neuroscience, immunology, and other critical areas of health research.

Key research strengths in ${city} include contributions to understanding disease mechanisms, developing novel therapeutic approaches, advancing diagnostic technologies, and exploring fundamental biological processes. The city's researchers regularly publish in high-impact journals and contribute significantly to the PubMed database, reflecting ${city}'s role in global biomedical research advancement.

Major institutions driving biomedical research in ${city} include ${institutionNames}. These institutions provide state-of-the-art facilities, collaborative research networks, and opportunities for early-career scientists seeking to make their mark in life sciences research.
    `.trim(),

    institutions: `
The ${institution_count} research institutions in ${city} represent a diverse ecosystem of biomedical research excellence. From major research universities with comprehensive medical centers to specialized institutes focused on specific diseases or biological systems, ${city} offers varied environments for scientific investigation.

${topInstitutions.length > 0 ? `Leading research institutions in ${city} include:\n\n${topInstitutions.map((inst, idx) => 
  `${idx + 1}. **${inst.institution}** - Home to ${inst.scholar_count} active researchers contributing to biomedical and life sciences literature. This institution plays a key role in ${city}'s research ecosystem, supporting investigations across multiple domains of health research.`
).join('\n\n')}` : ''}

These institutions provide comprehensive research infrastructure including advanced imaging facilities, molecular biology laboratories, clinical research centers, and computational biology resources. Many offer postdoctoral fellowships, research scientist positions, and collaborative opportunities for visiting scholars in life sciences and biomedical engineering.

The concentration of biomedical expertise in ${city} creates natural opportunities for cross-institutional collaboration, joint research projects, and shared resources that accelerate scientific discovery. Researchers in ${city} benefit from proximity to colleagues working on complementary questions in biology, medicine, and health sciences.
    `.trim(),

    opportunities: `
For researchers seeking opportunities in biomedical sciences, ${city} offers diverse pathways for career development and scientific contribution. The city's research ecosystem supports various career stages from postdoctoral training through senior research positions in life sciences and medical research.

**Postdoctoral Opportunities**: ${city}'s institutions regularly recruit postdoctoral researchers in neuroscience, molecular biology, immunology, pharmacology, and other biomedical disciplines. These positions provide training in cutting-edge techniques, access to world-class facilities, and mentorship from established researchers publishing in high-impact journals.

**Research Scientist Positions**: Established researchers will find opportunities in both academic and clinical research settings. Many institutions in ${city} seek scientists with expertise in specific techniques (e.g., genomics, imaging, electrophysiology) or disease areas (e.g., cancer, neurodegeneration, cardiovascular disease).

**Collaborative Research**: ${city}'s research community actively seeks collaborators with complementary expertise. International collaboration is common, with researchers in ${city} frequently partnering with scientists worldwide to address complex biomedical questions requiring diverse skill sets and perspectives.

**Clinical-Translational Research**: For physician-scientists and clinician researchers, ${city} offers opportunities to bridge laboratory science with patient care. The city's research hospitals and medical centers provide environments where basic discoveries can be translated into clinical applications.

The life sciences job market in ${city} benefits from the city's position within ${country}'s broader biomedical research ecosystem, with connections to funding agencies, pharmaceutical companies, and global research networks.
    `.trim(),

    howToConnect: `
ScholarMap provides tools to explore and connect with biomedical researchers in ${city}:

**Interactive Research Map**: Our platform visualizes the distribution of ${scholar_count.toLocaleString()} researchers across ${city}'s ${institution_count} institutions. Filter by institution to see research concentrations and identify potential collaborators or host laboratories for postdoctoral positions.

**Institution Discovery**: Browse specific institutions to understand their research strengths, active researcher counts, and publication patterns. This helps you identify which institutions align best with your research interests in life sciences and biomedical research.

**Researcher Networks**: See the network of scientists contributing to PubMed from ${city}. While ScholarMap doesn't provide direct contact information, knowing who is actively publishing in your area of biomedical interest helps you identify potential mentors, collaborators, or positions to pursue.

**Publication Analysis**: Explore the research output from ${city} to understand trending topics, active research areas, and publication patterns in life sciences. This intelligence helps you assess the city's fit for your specific biomedical research interests.

For those considering postdoctoral positions or research careers in ${city}, use ScholarMap to:

- Identify institutions with strong research activity in your specific field (neuroscience, molecular biology, pharmacology, etc.)
- Discover which laboratories are most actively publishing in areas related to your expertise
- Understand the scale and scope of biomedical research in ${city}
- Compare ${city} with other potential research destinations in ${country} or globally

While ScholarMap provides data based on PubMed publications (covering biomedical and life sciences), it's important to complement this information with direct outreach to institutions, review of specific laboratory websites, and exploration of job postings in your field.
    `.trim(),
  };
}

/**
 * Generate meta description for city page
 */
export function generateCityMetaDescription(
  city: string,
  country: string,
  stats: CityStats
): string {
  return `Explore biomedical and life sciences research in ${city}, ${country}. ${stats.scholar_count.toLocaleString()} PubMed researchers across ${stats.institution_count} institutions in medicine, biology, neuroscience, and health sciences. Find postdoc positions and research collaborations.`;
}

/**
 * Generate keywords for city page
 */
export function generateCityKeywords(city: string, country: string): string[] {
  return [
    `biomedical research ${city}`,
    `life sciences ${city} ${country}`,
    `postdoc ${city}`,
    `neuroscience research ${city}`,
    `medical research ${city}`,
    `biology postdoc ${city}`,
    `PubMed researchers ${city}`,
    `clinical research ${city}`,
    `pharmacology ${city}`,
    `health sciences ${city}`,
    `research institutions ${city}`,
    `biomedical jobs ${city}`,
  ];
}

/**
 * Generate FAQs for city page
 */
export function generateCityFAQs(city: string, country: string, stats: CityStats): Array<{
  question: string;
  answer: string;
}> {
  return [
    {
      question: `How many biomedical researchers are in ${city}?`,
      answer: `Based on PubMed data, ${city} has ${stats.scholar_count.toLocaleString()} active researchers contributing to biomedical and life sciences literature. These researchers are distributed across ${stats.institution_count} institutions in the city.`,
    },
    {
      question: `What are the major research institutions in ${city}?`,
      answer: `${city} hosts ${stats.institution_count} research institutions conducting biomedical research. ${stats.institutions.length > 0 ? `Top institutions include ${stats.institutions.slice(0, 3).map(i => i.institution).join(', ')}, among others.` : 'These institutions span universities, medical centers, and specialized research institutes.'}`,
    },
    {
      question: `What types of biomedical research are conducted in ${city}?`,
      answer: `Researchers in ${city} contribute to diverse areas of biomedical and life sciences including molecular biology, neuroscience, clinical medicine, pharmacology, immunology, and health sciences. The city's PubMed publications cover both basic biological research and clinical translational studies.`,
    },
    {
      question: `How can I find postdoc positions in ${city}?`,
      answer: `Use ScholarMap to identify active research groups in ${city} within your field of interest. Browse institutions with high publication activity in your area (e.g., neuroscience, molecular biology), then visit their websites for postdoctoral opportunities. Many institutions in ${city} regularly recruit postdocs in life sciences and biomedical research.`,
    },
    {
      question: `Is ${city} good for biomedical research careers?`,
      answer: `${city} offers a strong biomedical research environment with ${stats.scholar_count.toLocaleString()} active researchers and ${stats.institution_count} institutions. The concentration of life sciences expertise, research infrastructure, and collaborative opportunities makes ${city} an attractive option for researchers in medicine, biology, and health sciences.`,
    },
  ];
}
