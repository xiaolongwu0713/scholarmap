/**
 * SEO Field-Specific Content Generation
 * 
 * Template-based content generation for field-specific SEO pages
 */

import { FieldConfig } from './seoFieldConfig';

interface FieldStats {
  field: string;
  totalScholars: number;
  totalCountries: number;
  totalCities: number;
  totalInstitutions: number;
}

interface FieldCountryStats extends FieldStats {
  country: string;
  scholarCount: number;
  cityCount: number;
  institutionCount: number;
  topCities: Array<{ city: string; scholar_count: number; institution_count: number }>;
}

interface FieldCityStats extends FieldStats {
  country: string;
  city: string;
  scholarCount: number;
  institutionCount: number;
  institutions: Array<{ institution: string; scholar_count: number }>;
}

/**
 * Generate field overview content (800-1000 words)
 */
export function generateFieldOverviewContent(
  fieldConfig: FieldConfig,
  stats: {
    totalScholars: number;
    totalCountries: number;
    topCountries: Array<{ country: string; scholar_count: number; institution_count: number }>;
  }
) {
  const { name, description, keywords } = fieldConfig;
  const { totalScholars, totalCountries, topCountries } = stats;
  
  const topCountryNames = topCountries.slice(0, 5).map(c => c.country).join(', ');
  
  return {
    introduction: `
${name} represents one of the most dynamic and rapidly evolving areas in biomedical research today. With ${totalScholars.toLocaleString()} active researchers across ${totalCountries} countries publishing in this field, the global research community is making significant advances in ${description.toLowerCase()}.

This comprehensive analysis of ${name} research worldwide provides insights into where cutting-edge work is being conducted, which institutions are leading the field, and where emerging opportunities exist for researchers and collaborators. Whether you're seeking postdoctoral positions, research collaborations, or academic partnerships in ${keywords[0]}, understanding the global distribution of expertise in this field is essential for making informed career and collaboration decisions.
    `.trim(),
    
    whyThisFieldMatters: `
${name} has emerged as a critical area of biomedical research with profound implications for human health and scientific understanding. The field combines fundamental biological insights with innovative technological approaches, creating opportunities for breakthrough discoveries and clinical applications.

Researchers in ${name} are addressing some of the most pressing challenges in modern medicine and biology. The ${totalScholars.toLocaleString()} active scholars in this field represent a global network of expertise spanning ${keywords.slice(0, 3).join(', ')}, and related areas. This concentration of talent across ${totalCountries} countries demonstrates the field's importance and the international collaborative efforts driving progress.

The rapid growth of ${name} research has been fueled by advances in technology, increased funding opportunities, and growing recognition of the field's potential impact. Major research institutions worldwide have established dedicated programs, creating new positions for postdoctoral fellows, research scientists, and faculty members specializing in this area.
    `.trim(),
    
    currentTrends: `
The landscape of ${name} research is characterized by several key trends that are shaping the field's direction:

**Technological Innovation**: Recent advances in ${keywords[0]} are enabling researchers to ask questions and conduct experiments that were impossible just a few years ago. The integration of cutting-edge methodologies with traditional approaches is opening new avenues for discovery.

**Interdisciplinary Collaboration**: ${name} increasingly requires collaboration across multiple disciplines. Research teams often include experts in biology, medicine, engineering, computational sciences, and clinical practice, creating rich environments for innovation and knowledge exchange.

**Clinical Translation**: There is growing emphasis on translating basic research findings into clinical applications. Many institutions are establishing translational research programs specifically focused on ${keywords[1]}, creating opportunities for researchers interested in bridging laboratory discoveries and clinical practice.

**Global Research Networks**: The field has seen the emergence of international consortia and collaborative networks. Researchers in ${topCountryNames} are leading many of these initiatives, fostering knowledge sharing and collaborative research across borders.

**Funding Growth**: Research in ${name} has attracted significant funding from government agencies, private foundations, and industry partners. This increased investment is creating new positions and research opportunities at institutions worldwide.
    `.trim(),
    
    globalDistribution: `
Research activity in ${name} is globally distributed but shows concentration in certain regions with strong biomedical research infrastructure. The ${totalScholars.toLocaleString()} researchers in this field are spread across ${totalCountries} countries, with leading nations establishing themselves as key hubs for ${keywords[0]} research.

${topCountries.slice(0, 5).map((country, index) => `
**${index + 1}. ${country.country}** - ${country.scholar_count.toLocaleString()} researchers across ${country.institution_count} institutions`).join('\n')}

These countries provide robust ecosystems for ${name} research, offering:
- World-class research facilities and infrastructure
- Strong funding support for ${keywords[0]} research
- Active research communities and collaborative networks
- Diverse career opportunities from postdocs to faculty positions
- Established training programs in ${keywords[1]} and related areas

Beyond these leading nations, ${name} research is also growing in emerging research hubs, where institutions are building new programs and recruiting talent to establish expertise in this field.
    `.trim(),
    
    opportunities: `
For researchers interested in ${name}, the global landscape offers diverse opportunities:

**Postdoctoral Positions**: Many institutions worldwide are recruiting postdoctoral fellows in ${keywords[0]} research. These positions typically offer 2-4 years of focused research time, mentorship from established researchers, and opportunities to develop independent research programs. Leading research groups often have multiple postdoc positions, creating vibrant communities of early-career researchers.

**Research Scientist Positions**: Beyond postdocs, many institutions offer research scientist positions for those with expertise in ${keywords[1]} and ${keywords[2]}. These roles often provide longer-term stability and the opportunity to lead specific research projects or technical cores.

**Faculty Positions**: As ${name} programs expand globally, tenure-track and research faculty positions are increasingly available. Many institutions are making strategic hires in this field, particularly seeking researchers who can bridge multiple disciplines or bring novel technical expertise.

**Collaborative Opportunities**: The international nature of ${name} research creates numerous opportunities for collaborative projects, visiting scholar positions, and research exchanges. Many leading groups actively seek collaborators with complementary expertise.

**Industry Positions**: Growing interest from biotechnology and pharmaceutical companies has created additional career paths for researchers with ${keywords[0]} expertise, particularly those interested in translational research and clinical applications.

Explore our interactive map below to discover institutions and researchers in ${name} worldwide, and identify opportunities that align with your research interests and career goals.
    `.trim(),
  };
}

/**
 * Generate field × country content (600-800 words)
 */
export function generateFieldCountryContent(
  fieldConfig: FieldConfig,
  stats: FieldCountryStats
) {
  const { name, keywords } = fieldConfig;
  const { country, scholarCount, cityCount, institutionCount, topCities } = stats;
  
  const topCityNames = topCities.slice(0, 3).map(c => c.city).join(', ');
  
  return {
    overview: `
${country} is a major contributor to global ${name} research, with ${scholarCount.toLocaleString()} active researchers publishing in this field across ${institutionCount} institutions in ${cityCount} cities. The country's research ecosystem in ${keywords[0]} combines strong institutional support, robust funding mechanisms, and collaborative research networks.

Research activity in ${name} across ${country} spans fundamental investigations into ${keywords[1]} to translational studies aimed at clinical applications. The distributed research community across ${topCityNames} and other cities creates diverse opportunities for researchers at all career stages.
    `.trim(),
    
    leadingInstitutions: `
${country}'s research institutions have established strong programs in ${name}, with many achieving international recognition for their contributions to ${keywords[0]} research. These institutions offer:

**Research Infrastructure**: State-of-the-art facilities for ${keywords[1]} research, including specialized equipment, core facilities, and technical expertise. Many institutions have made significant investments in infrastructure specifically for ${name} research.

**Collaborative Environment**: Strong institutional support for interdisciplinary collaboration brings together experts in ${keywords.slice(0, 3).join(', ')}, creating rich research environments where innovation thrives.

**Training Programs**: Comprehensive training opportunities for early-career researchers, including structured postdoctoral programs, workshops, and mentorship initiatives focused on ${keywords[0]} research.

**Funding Opportunities**: Access to national and international funding sources, with many institutions providing bridge funding, startup packages, and internal grants to support ${name} research.

The ${institutionCount} institutions conducting ${name} research in ${country} range from large comprehensive universities with broad biomedical programs to specialized research institutes focused on specific aspects of ${keywords[0]}.
    `.trim(),
    
    researchCities: `
Research in ${name} across ${country} is concentrated in several key metropolitan areas, each offering unique advantages:

${topCities.slice(0, 5).map((city, index) => `
**${city.city}** - ${city.scholar_count} researchers across ${city.institution_count} institutions
The ${keywords[0]} research community in ${city.city} benefits from concentrated expertise and collaborative opportunities.`).join('\n\n')}

${cityCount > 5 ? `\nBeyond these major centers, ${name} research in ${country} is also active in additional cities, each with institutions developing expertise in specialized areas of ${keywords[1]} research.` : ''}
    `.trim(),
    
    fundingAndOpportunities: `
Researchers interested in ${name} positions in ${country} will find a range of opportunities and funding mechanisms:

**Postdoctoral Fellowships**: Many institutions offer postdoctoral positions in ${keywords[0]} research, often with competitive salaries and benefits. National fellowship programs may also provide funding for international researchers to conduct ${name} research in ${country}.

**Research Grants**: Funding agencies in ${country} support ${keywords[1]} research through various grant mechanisms, from early-career awards to large collaborative grants. International researchers often have access to these funding opportunities.

**Industry Partnerships**: Growing interest from biotechnology and pharmaceutical companies has created partnerships with academic institutions, providing additional research funding and career opportunities in ${keywords[2]}.

**Career Development**: Many institutions in ${country} provide structured career development support for researchers, including grant writing assistance, mentorship programs, and professional development workshops.

Explore the cities and institutions below to discover specific opportunities in ${name} research across ${country}.
    `.trim(),
  };
}

/**
 * Generate field × city content (500-700 words)
 */
export function generateFieldCityContent(
  fieldConfig: FieldConfig,
  stats: FieldCityStats
) {
  const { name, keywords } = fieldConfig;
  const { country, city, scholarCount, institutionCount, institutions } = stats;
  
  const topInstitutions = institutions.slice(0, 5);
  
  return {
    overview: `
${city}, ${country} is home to ${scholarCount} active researchers in ${name} across ${institutionCount} institutions, making it a significant hub for ${keywords[0]} research. The concentration of expertise in this city creates a vibrant research community with strong collaborative networks and diverse research approaches.

The ${name} research ecosystem in ${city} benefits from the city's broader biomedical research infrastructure, including access to specialized facilities, clinical research sites, and interdisciplinary collaboration opportunities. Researchers in ${city} are contributing to advances in ${keywords[1]} with work spanning fundamental investigations to translational applications.
    `.trim(),
    
    majorInstitutions: `
Research in ${name} in ${city} is conducted across multiple institutions, each with distinctive strengths and research programs:

${topInstitutions.map((inst, index) => `
**${inst.institution}** - ${inst.scholar_count} active researchers
A key contributor to ${keywords[0]} research in ${city}, this institution offers robust research programs and collaborative opportunities in ${keywords[1]}.`).join('\n\n')}

${institutionCount > topInstitutions.length ? `\nAdditional institutions in ${city} also contribute to ${name} research, creating a diverse and collaborative research environment.` : ''}

These institutions typically offer:
- Advanced research facilities for ${keywords[0]} studies
- Active research groups with ongoing projects in ${keywords[2]}
- Collaborative networks within and across institutions
- Postdoctoral positions and research scientist opportunities
- Access to clinical research sites and patient populations (where applicable)
    `.trim(),
    
    researchCommunity: `
The ${name} research community in ${city} is characterized by active collaboration and knowledge sharing. With ${scholarCount} researchers in this field, ${city} offers:

**Research Seminars and Workshops**: Regular seminars, journal clubs, and workshops focused on ${keywords[0]} research bring together researchers from different institutions, fostering collaboration and knowledge exchange.

**Collaborative Projects**: Many research projects in ${city} involve multiple institutions, creating opportunities for researchers to engage in collaborative work and access complementary expertise and resources.

**Career Development**: The concentration of ${name} researchers in ${city} provides excellent networking opportunities for early-career researchers, with access to mentorship, career advice, and professional connections.

**Interdisciplinary Connections**: ${city}'s biomedical research community extends beyond ${keywords[0]} to related fields, enabling interdisciplinary collaborations that often lead to innovative approaches and breakthrough discoveries.
    `.trim(),
    
    opportunities: `
For researchers interested in ${name} positions in ${city}, opportunities include:

**Postdoctoral Research**: Multiple research groups in ${city} regularly recruit postdoctoral fellows in ${keywords[0]} research. These positions often provide excellent training environments with strong mentorship and collaborative opportunities.

**Research Scientist Roles**: Beyond postdoctoral positions, institutions in ${city} often have research scientist positions for those with specialized expertise in ${keywords[1]} or ${keywords[2]}.

**Academic Positions**: As ${name} programs in ${city} expand, faculty recruitment in this field is ongoing, with institutions seeking researchers who can strengthen existing programs or establish new research directions.

**Industry Connections**: Many institutions in ${city} have partnerships with biotechnology and pharmaceutical companies, creating additional opportunities for researchers interested in translational ${keywords[0]} research.

Use our interactive map below to explore the ${institutionCount} institutions conducting ${name} research in ${city}, discover research groups, and identify potential opportunities that align with your expertise and interests.
    `.trim(),
  };
}

/**
 * Generate meta description for field overview page
 */
export function generateFieldOverviewMetaDescription(
  fieldName: string,
  scholarCount: number,
  countryCount: number
): string {
  return `Discover ${scholarCount.toLocaleString()} researchers in ${fieldName} across ${countryCount} countries. Explore global research distribution, top institutions, and opportunities in this biomedical field.`;
}

/**
 * Generate meta description for field × country page
 */
export function generateFieldCountryMetaDescription(
  fieldName: string,
  country: string,
  scholarCount: number,
  institutionCount: number
): string {
  return `Explore ${fieldName} research in ${country}: ${scholarCount.toLocaleString()} researchers across ${institutionCount} institutions. Find postdoc positions, collaborations, and leading labs.`;
}

/**
 * Generate meta description for field × city page
 */
export function generateFieldCityMetaDescription(
  fieldName: string,
  city: string,
  country: string,
  scholarCount: number,
  institutionCount: number
): string {
  return `${fieldName} research in ${city}, ${country}: ${scholarCount} researchers at ${institutionCount} institutions. Discover labs, postdoc opportunities, and key researchers.`;
}

/**
 * Generate keywords for field overview page
 */
export function generateFieldOverviewKeywords(fieldConfig: FieldConfig): string[] {
  const { name, keywords } = fieldConfig;
  return [
    `${name} research opportunities`,
    `${keywords[0]} researchers worldwide`,
    `${keywords[0]} postdoc positions`,
    `${keywords[1]} research labs`,
    `global ${keywords[0]} research`,
    `${keywords[2]} institutions`,
    `${name} collaborations`,
    ...keywords.map(k => `${k} research`),
  ];
}

/**
 * Generate keywords for field × country page
 */
export function generateFieldCountryKeywords(
  fieldConfig: FieldConfig,
  country: string
): string[] {
  const { keywords } = fieldConfig;
  return [
    `${keywords[0]} research ${country}`,
    `${keywords[1]} postdoc ${country}`,
    `${keywords[0]} institutions ${country}`,
    `${keywords[2]} opportunities ${country}`,
    `${keywords[0]} labs ${country}`,
    ...keywords.map(k => `${k} ${country}`),
  ];
}

/**
 * Generate keywords for field × city page
 */
export function generateFieldCityKeywords(
  fieldConfig: FieldConfig,
  city: string,
  country: string
): string[] {
  const { keywords } = fieldConfig;
  return [
    `${keywords[0]} research ${city}`,
    `${keywords[1]} ${city}`,
    `${keywords[0]} labs ${city}`,
    `${keywords[2]} postdoc ${city}`,
    `${keywords[0]} ${city} ${country}`,
    ...keywords.map(k => `${k} ${city}`),
  ];
}

/**
 * Generate FAQ for field overview page
 */
export function generateFieldOverviewFAQs(
  fieldConfig: FieldConfig,
  scholarCount: number,
  countryCount: number
): Array<{ question: string; answer: string }> {
  const { name, keywords } = fieldConfig;
  
  return [
    {
      question: `How many researchers worldwide are working in ${name}?`,
      answer: `Our database includes ${scholarCount.toLocaleString()} active researchers in ${name} across ${countryCount} countries, representing institutions conducting cutting-edge research in ${keywords[0]}.`,
    },
    {
      question: `Which countries are leading in ${name} research?`,
      answer: `${name} research is globally distributed with major concentrations in countries with strong biomedical research infrastructure. The United States, United Kingdom, China, and several European countries host large numbers of researchers in ${keywords[0]}.`,
    },
    {
      question: `What types of positions are available in ${name}?`,
      answer: `Opportunities in ${name} include postdoctoral fellowships, research scientist positions, faculty appointments, and industry positions. Many institutions worldwide are actively recruiting talent in ${keywords[0]} research.`,
    },
    {
      question: `How can I find collaborators in ${name} research?`,
      answer: `ScholarMap's interactive map allows you to explore researchers by geographic location and institution. You can discover experts in ${keywords[1]} worldwide and identify potential collaborators based on their research profiles.`,
    },
  ];
}

/**
 * Generate FAQ for field × country page
 */
export function generateFieldCountryFAQs(
  fieldConfig: FieldConfig,
  country: string,
  scholarCount: number,
  institutionCount: number
): Array<{ question: string; answer: string }> {
  const { name, keywords } = fieldConfig;
  
  return [
    {
      question: `How many ${name} researchers are in ${country}?`,
      answer: `${country} has ${scholarCount.toLocaleString()} active researchers in ${name} across ${institutionCount} institutions, making it a significant contributor to global research in ${keywords[0]}.`,
    },
    {
      question: `What are the main research areas in ${name} in ${country}?`,
      answer: `Researchers in ${country} work across the spectrum of ${name}, including ${keywords.slice(0, 3).join(', ')}, and related areas, with both fundamental and translational research programs.`,
    },
    {
      question: `Are there postdoc positions in ${name} in ${country}?`,
      answer: `Yes, many institutions in ${country} offer postdoctoral fellowships in ${keywords[0]} research. Use our map to discover specific institutions and research groups that may have openings.`,
    },
    {
      question: `How can international researchers apply for positions in ${country}?`,
      answer: `Most institutions in ${country} welcome international applicants for ${keywords[0]} research positions. Check individual institution websites for specific application procedures and visa sponsorship information.`,
    },
  ];
}

/**
 * Generate FAQ for field × city page
 */
export function generateFieldCityFAQs(
  fieldConfig: FieldConfig,
  city: string,
  country: string,
  scholarCount: number,
  institutionCount: number
): Array<{ question: string; answer: string }> {
  const { name, keywords } = fieldConfig;
  
  return [
    {
      question: `How many institutions in ${city} conduct ${name} research?`,
      answer: `${city} has ${institutionCount} institutions with active ${name} research programs, collectively employing ${scholarCount} researchers in ${keywords[0]}.`,
    },
    {
      question: `What makes ${city} a good location for ${name} research?`,
      answer: `${city} offers a concentration of expertise in ${keywords[0]}, collaborative research networks, access to specialized facilities, and a vibrant research community in ${keywords[1]} and related fields.`,
    },
    {
      question: `Are there postdoc opportunities in ${name} in ${city}?`,
      answer: `Yes, research groups across ${institutionCount} institutions in ${city} regularly recruit postdoctoral fellows in ${keywords[0]} research. Explore our interactive map to discover specific opportunities.`,
    },
    {
      question: `How can I connect with ${name} researchers in ${city}?`,
      answer: `Use ScholarMap's interactive map to explore researchers and institutions in ${city}. You can view publication profiles and identify potential collaborators or mentors in ${keywords[0]} research.`,
    },
  ];
}
