import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchCityMap, fetchCountryMap, fetchWorldMap, getDemoRunUrl } from '@/lib/seoApi';
import { countryToSlug, cityToSlug, slugToCityName, slugToCountryName } from '@/lib/geoSlugs';
import {
  generateCityContent,
  generateCityFAQs,
  generateCityMetaDescription,
  generateCityKeywords,
  CityStats,
} from '@/lib/seoCityContent';
import { UnifiedNavbar } from '@/components/UnifiedNavbar';
import { Footer } from '@/components/landing/Footer';
import { StructuredData } from '@/components/StructuredData';
import { CityInstitutionsGrid } from '@/components/CityInstitutionsGrid';
import { SEOPageTracker } from '@/components/SEOPageTracker';
import { TrackedLink } from '@/components/TrackedLink';

// Enable ISR with 24 hour revalidation
export const revalidate = 86400;

// Generate static params for top 200 cities
export async function generateStaticParams() {
  try {
    const countries = await fetchWorldMap();
    const topCountries = countries
      .sort((a, b) => b.scholar_count - a.scholar_count)
      .slice(0, 30); // Get cities from top 30 countries

    const allCities: Array<{
      citySlug: string;
      city: string;
      country: string;
      scholar_count: number;
    }> = [];
    
    for (const country of topCountries) {
      try {
        const cities = await fetchCountryMap(country.country);
        cities.forEach(city => {
          allCities.push({
            citySlug: cityToSlug(city.city),
            city: city.city,
            country: country.country,
            scholar_count: city.scholar_count,
          });
        });
      } catch (error) {
        console.error(`Error fetching cities for ${country.country}:`, error);
      }
    }

    // Sort by scholar count and take top 200
    const topCities = allCities
      .sort((a, b) => b.scholar_count - a.scholar_count)
      .slice(0, 200);

    return topCities.map(city => ({
      citySlug: city.citySlug,
    }));
  } catch (error) {
    console.error('Error generating static params for city pages:', error);
    return [];
  }
}

interface PageProps {
  params: Promise<{
    citySlug: string;
  }>;
}

// Generate metadata
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { citySlug } = await params;
  
  // Try to get city and country from slug
  // For now, we need to fetch from API to match city name
  // This is simplified - in production you'd have a more robust mapping
  try {
    const countries = await fetchWorldMap();
    
    for (const country of countries) {
      const cities = await fetchCountryMap(country.country);
      const matchingCity = cities.find(c => cityToSlug(c.city) === citySlug);
      
      if (matchingCity) {
        const institutions = await fetchCityMap(country.country, matchingCity.city);
        
        const stats: CityStats = {
          city: matchingCity.city,
          country: country.country,
          scholar_count: matchingCity.scholar_count,
          institution_count: matchingCity.institution_count,
          institutions: institutions,
          latitude: matchingCity.latitude,
          longitude: matchingCity.longitude,
        };

        const description = generateCityMetaDescription(matchingCity.city, country.country, stats);
        const keywords = generateCityKeywords(matchingCity.city, country.country);

        return {
          title: `${matchingCity.city} Biomedical Research - ${stats.scholar_count.toLocaleString()} Researchers | ScholarMap`,
          description,
          keywords,
          openGraph: {
            title: `Biomedical Research in ${matchingCity.city}, ${country.country}`,
            description: `${stats.scholar_count.toLocaleString()} life sciences researchers across ${stats.institution_count} institutions`,
            images: ['/landing_page_figures_optimized/0.webp'],
            type: 'article',
          },
          twitter: {
            card: 'summary_large_image',
            title: `Research Hub: ${matchingCity.city}`,
            description: `${stats.scholar_count.toLocaleString()} PubMed researchers | ${stats.institution_count} institutions`,
          },
        };
      }
    }
  } catch (error) {
    console.error('Error generating metadata for city page:', error);
  }

  return {
    title: 'City Not Found | ScholarMap',
  };
}

export default async function CityPage({ params }: PageProps) {
  const { citySlug } = await params;
  
  // Fetch city data
  let cityData: CityStats | null = null;
  let countrySlug = '';
  
  try {
    const countries = await fetchWorldMap();
    
    for (const country of countries) {
      const cities = await fetchCountryMap(country.country);
      const matchingCity = cities.find(c => cityToSlug(c.city) === citySlug);
      
      if (matchingCity) {
        const institutions = await fetchCityMap(country.country, matchingCity.city);
        
        cityData = {
          city: matchingCity.city,
          country: country.country,
          scholar_count: matchingCity.scholar_count,
          institution_count: matchingCity.institution_count,
          institutions: institutions,
          latitude: matchingCity.latitude,
          longitude: matchingCity.longitude,
        };
        countrySlug = countryToSlug(country.country);
        break;
      }
    }
  } catch (error) {
    console.error('Error fetching city data:', error);
  }

  if (!cityData) {
    notFound();
  }

  const content = generateCityContent(cityData);
  const faqs = generateCityFAQs(cityData.city, cityData.country, cityData);
  const demoRunUrl = getDemoRunUrl({ country: cityData.country, city: cityData.city });

  // Parse content into paragraphs
  const introductionParagraphs = content.introduction
    .split(/\n\s*\n/)
    .map(p => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean);
  
  const researchHubParagraphs = content.researchHub
    .split(/\n\s*\n/)
    .map(p => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean);
  
  const institutionsParagraphs = content.institutions
    .split(/\n\s*\n/)
    .map(p => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean);
  
  const opportunitiesParagraphs = content.opportunities
    .split(/\n\s*\n/)
    .map(p => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean);
  
  // Parse howToConnect with special handling for lists
  const howToConnectBlocks = content.howToConnect
    .split(/\n\s*\n/)
    .map(block => block.trim())
    .filter(Boolean)
    .map(block => {
      const lines = block.split('\n').map(line => line.trim()).filter(Boolean);
      const listItems = lines.filter(line => line.startsWith('- ')).map(line => line.slice(2).trim());
      
      if (listItems.length > 0) {
        // This block contains list items
        const introLines = lines.filter(line => !line.startsWith('- '));
        return {
          type: 'list' as const,
          intro: introLines.join(' '),
          items: listItems,
        };
      }
      // This is a regular paragraph
      return {
        type: 'paragraph' as const,
        text: lines.join(' '),
      };
    });

  // Structured data
  const placeSchema = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: `${cityData.city}, ${cityData.country}`,
    description: `Biomedical research hub with ${cityData.scholar_count} researchers`,
    geo: cityData.latitude && cityData.longitude ? {
      '@type': 'GeoCoordinates',
      latitude: cityData.latitude,
      longitude: cityData.longitude,
    } : undefined,
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://scholarmap-frontend.onrender.com',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Research Jobs',
        item: 'https://scholarmap-frontend.onrender.com/research-jobs',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: cityData.country,
        item: `https://scholarmap-frontend.onrender.com/research-jobs/country/${countrySlug}`,
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: cityData.city,
        item: `https://scholarmap-frontend.onrender.com/research-jobs/city/${citySlug}`,
      },
    ],
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <>
      <StructuredData data={placeSchema} />
      <StructuredData data={breadcrumbSchema} />
      <StructuredData data={faqSchema} />
      <SEOPageTracker pageName="city_page" location={`${cityData.city}, ${cityData.country}`} />

      <UnifiedNavbar variant="landing" />

      <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 pt-20">
        <div className="container mx-auto px-4 py-12 max-w-6xl">
          {/* Breadcrumb Navigation */}
          <nav className="text-sm text-gray-600 mb-8" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-blue-600">
              Home
            </Link>
            <span className="mx-2">→</span>
            <Link href="/research-jobs" className="hover:text-blue-600">
              Research Jobs
            </Link>
            <span className="mx-2">→</span>
            <Link href={`/research-jobs/country/${countrySlug}`} className="hover:text-blue-600">
              {cityData.country}
            </Link>
            <span className="mx-2">→</span>
            <span className="text-gray-900 font-medium">{cityData.city}</span>
          </nav>

          {/* Field Scope Banner */}
          <div className="mb-8">
            <div className="bg-gradient-to-r from-green-50 to-teal-50 border-l-4 border-green-600 rounded-r-lg p-4 shadow-sm">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm text-green-900">
                    <strong className="font-semibold">Biomedical Research Data:</strong>{' '}
                    Showing life sciences and medical research in {cityData.city} from PubMed database (medicine, biology, neuroscience, health sciences, biomedical engineering, neuroengineering).
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Page Header */}
          <header className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Biomedical Research in {cityData.city}, {cityData.country}
            </h1>

            {/* Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 border border-blue-200">
                <div className="text-3xl font-bold text-blue-700 mb-2">
                  {cityData.scholar_count.toLocaleString()}
                </div>
                <div className="text-sm font-medium text-gray-700">Active Researchers</div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 border border-purple-200">
                <div className="text-3xl font-bold text-purple-700 mb-2">
                  {cityData.institution_count}
                </div>
                <div className="text-sm font-medium text-gray-700">Institutions</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 border border-green-200 col-span-2 md:col-span-1">
                <div className="text-2xl font-bold text-green-700 mb-2">
                  Life Sciences
                </div>
                <div className="text-sm font-medium text-gray-700">Research Focus</div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <div className="bg-white rounded-xl shadow-lg p-8 md:p-12 mb-12">
            {/* Introduction */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                About Biomedical Research in {cityData.city}
              </h2>
              <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed space-y-6">
                {introductionParagraphs.map((paragraph, index) => (
                  <p key={`intro-${index}`}>{paragraph}</p>
                ))}
              </div>
            </section>

            {/* Research Hub */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                {cityData.city} as a Research Hub
              </h2>
              <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed space-y-6">
                {researchHubParagraphs.map((paragraph, index) => (
                  <p key={`hub-${index}`}>{paragraph}</p>
                ))}
              </div>
            </section>

            {/* Research Institutions */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Research Institutions in {cityData.city}
              </h2>
              <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed space-y-6 mb-8">
                {institutionsParagraphs.map((paragraph, index) => {
                  // Check if paragraph contains numbered list items
                  if (paragraph.includes('**') && /\d+\.\s\*\*/.test(paragraph)) {
                    // This is a list item, render it specially
                    const parts = paragraph.split(/(\d+\.\s\*\*[^*]+\*\*)/).filter(Boolean);
                    return (
                      <div key={`inst-${index}`}>
                        {parts.map((part, i) => {
                          if (/^\d+\.\s\*\*/.test(part)) {
                            // Extract institution name
                            const match = part.match(/\d+\.\s\*\*([^*]+)\*\*/);
                            if (match) {
                              return <p key={i} className="font-semibold text-gray-900">{part.replace(/\*\*/g, '')}</p>;
                            }
                          }
                          return <p key={i}>{part}</p>;
                        })}
                      </div>
                    );
                  }
                  return <p key={`inst-${index}`}>{paragraph}</p>;
                })}
              </div>

              <CityInstitutionsGrid 
                institutions={cityData.institutions} 
                city={cityData.city}
                country={cityData.country}
              />
            </section>

            {/* Opportunities */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Research Opportunities
              </h2>
              <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed space-y-6">
                {opportunitiesParagraphs.map((paragraph, index) => {
                  // Handle bold headings
                  if (paragraph.startsWith('**') && paragraph.includes('**:')) {
                    const parts = paragraph.split(/(\*\*[^*]+\*\*:)/);
                    return (
                      <p key={`opp-${index}`}>
                        {parts.map((part, i) => {
                          if (part.startsWith('**') && part.endsWith('**:')) {
                            return <strong key={i}>{part.replace(/\*\*/g, '')}</strong>;
                          }
                          return part;
                        })}
                      </p>
                    );
                  }
                  return <p key={`opp-${index}`}>{paragraph}</p>;
                })}
              </div>
            </section>

            {/* How to Connect */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                How to Connect with Researchers
              </h2>
              <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed space-y-6">
                {howToConnectBlocks.map((block, index) => {
                  if (block.type === 'list') {
                    return (
                      <div key={`connect-${index}`}>
                        {block.intro && <p className="mb-3">{block.intro}</p>}
                        <ul className="list-disc list-outside ml-6 space-y-2">
                          {block.items.map((item, itemIndex) => (
                            <li key={`connect-item-${index}-${itemIndex}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    );
                  }
                  
                  // Handle bold headings in paragraphs
                  const paragraph = block.text;
                  if (paragraph.startsWith('**') && paragraph.includes('**:')) {
                    const parts = paragraph.split(/(\*\*[^*]+\*\*:)/);
                    return (
                      <p key={`connect-${index}`}>
                        {parts.map((part, i) => {
                          if (part.startsWith('**') && part.endsWith('**:')) {
                            return <strong key={i}>{part.replace(/\*\*/g, '')}</strong>;
                          }
                          return part;
                        })}
                      </p>
                    );
                  }
                  return <p key={`connect-${index}`}>{paragraph}</p>;
                })}
              </div>
            </section>

            {/* CTA to Interactive Map */}
            <section className="mb-12">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-8 border-2 border-blue-200 shadow-lg">
                <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">
                  Explore {cityData.city} on the Interactive Map
                </h3>
                <p className="text-gray-700 mb-6 leading-relaxed text-center">
                  View the distribution of {cityData.scholar_count.toLocaleString()} biomedical researchers 
                  across {cityData.city}'s {cityData.institution_count} institutions. Filter by institution, 
                  explore publication patterns, and discover potential collaborators.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <TrackedLink
                    href={demoRunUrl}
                    trackingType="demo"
                    trackingSource="city_page"
                    country={cityData.country}
                    city={cityData.city}
                    className="inline-flex items-center justify-center bg-white hover:bg-gray-50 text-blue-700 font-semibold px-8 py-4 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg border-2 border-blue-300"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    View {cityData.city} Map
                  </TrackedLink>
                  <TrackedLink
                    href="/auth/register"
                    trackingType="signup"
                    trackingSource="city_page"
                    country={cityData.country}
                    city={cityData.city}
                    className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-lg transition-colors duration-300 shadow-md hover:shadow-lg"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Your Own Map (Free)
                  </TrackedLink>
                </div>
              </div>
            </section>

            {/* FAQs */}
            <section>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Frequently Asked Questions
              </h2>
              <div className="space-y-6">
                {faqs.map((faq, index) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-6 py-2">
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">
                      {faq.question}
                    </h3>
                    <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Related Links */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Resources</h2>
            <div className="space-y-3">
              <Link
                href={`/research-jobs/country/${countrySlug}`}
                className="block text-blue-600 hover:text-blue-700 font-medium"
              >
                ← View all cities in {cityData.country}
              </Link>
              <Link
                href="/research-jobs"
                className="block text-blue-600 hover:text-blue-700 font-medium"
              >
                ← Browse all countries
              </Link>
              <TrackedLink
                href={demoRunUrl}
                trackingType="demo"
                trackingSource="city_page_footer"
                country={cityData.country}
                city={cityData.city}
                className="block text-blue-600 hover:text-blue-700 font-medium"
              >
                View {cityData.city} on Interactive Map →
              </TrackedLink>
              <TrackedLink
                href="/auth/register"
                trackingType="signup"
                trackingSource="city_page_footer"
                country={cityData.country}
                city={cityData.city}
                className="block text-blue-600 hover:text-blue-700 font-medium"
              >
                Create Your Research Map →
              </TrackedLink>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
