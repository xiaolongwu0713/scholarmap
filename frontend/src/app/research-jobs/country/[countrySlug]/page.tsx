import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchCountryStats, getDemoRunUrl } from '@/lib/seoApi';
import { countryToSlug, slugToCountryName, cityToSlug } from '@/lib/geoSlugs';
import {
  generateCountryContent,
  generateCountryFAQs,
  generateCountryMetaDescription,
  generateCountryKeywords,
} from '@/lib/seoContent';
import { UnifiedNavbar } from '@/components/UnifiedNavbar';
import { Footer } from '@/components/landing/Footer';
import { StructuredData } from '@/components/StructuredData';
import { CitiesGrid } from '@/components/CitiesGrid';
import { CityStatsBarChart } from '@/components/CityStatsBarChart';

// This will be used later when we enable static generation for all countries
// For now, we'll just do dynamic rendering
export const dynamic = 'force-dynamic';

// Future: Generate static params for top countries
// export async function generateStaticParams() {
//   const countries = await fetchWorldMap();
//   const topCountries = countries
//     .sort((a, b) => b.scholar_count - a.scholar_count)
//     .slice(0, 100);
//   
//   return topCountries.map((country) => ({
//     countrySlug: countryToSlug(country.country),
//   }));
// }

interface PageProps {
  params: Promise<{
    countrySlug: string;
  }>;
}

// Generate metadata
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { countrySlug } = await params;
  const countryName = slugToCountryName(countrySlug);
  const stats = await fetchCountryStats(countryName);

  if (!stats) {
    return {
      title: 'Country Not Found | ScholarMap',
    };
  }

  const description = generateCountryMetaDescription(countryName, stats);
  const keywords = generateCountryKeywords(countryName);

  return {
    title: `${countryName} Research Opportunities - ${stats.scholar_count.toLocaleString()} Scholars | ScholarMap`,
    description,
    keywords,
    openGraph: {
      title: `Research Opportunities in ${countryName}`,
      description: `${stats.scholar_count.toLocaleString()} active researchers across ${stats.city_count} cities`,
      images: ['/landing_page_figures_optimized/0.webp'],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Research Map: ${countryName}`,
      description: `${stats.scholar_count.toLocaleString()} scholars | ${stats.institution_count.toLocaleString()} institutions`,
    },
  };
}

export default async function CountryPage({ params }: PageProps) {
  const { countrySlug } = await params;
  const countryName = slugToCountryName(countrySlug);
  const stats = await fetchCountryStats(countryName);

  if (!stats) {
    notFound();
  }

  const content = generateCountryContent(stats);
  const introductionParagraphs = content.introduction
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean);
  const researchLandscapeParagraphs = content.researchLandscape
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean);
  const opportunitiesParagraphs = content.opportunities
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean);
  const howToConnectBlocks = content.howToConnect
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
      const listItems = lines.filter((line) => line.startsWith('- ')).map((line) => line.slice(2).trim());
      if (listItems.length > 0) {
        const introLines = lines.filter((line) => !line.startsWith('- '));
        return { type: 'list' as const, intro: introLines.join(' '), items: listItems };
      }
      return { type: 'paragraph' as const, text: lines.join(' ') };
    });
  const faqs = generateCountryFAQs(countryName, stats);
  const demoRunUrl = getDemoRunUrl({ country: countryName });

  // Structured data for SEO
  const placeSchema = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: countryName,
    description: `Research opportunities in ${countryName} with ${stats.scholar_count} scholars`,
    geo: {
      '@type': 'GeoCoordinates',
      // We don't have country-level coordinates, so we'll use the first city
      latitude: stats.cities[0]?.latitude || 0,
      longitude: stats.cities[0]?.longitude || 0,
    },
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
        name: countryName,
        item: `https://scholarmap-frontend.onrender.com/research-jobs/country/${countrySlug}`,
      },
    ],
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
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
            <span className="text-gray-900 font-medium">{countryName}</span>
          </nav>

          {/* Data Disclaimer Banner */}
          <div className="mb-8">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-r-lg p-4 shadow-sm">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm text-blue-800">
                    <strong className="font-semibold">Sample Data:</strong> This page shows example Neural Modulation research for {countryName}. 
                    The actual distribution in your specific field may differ.{' '}
                    
                    <Link href="/auth/register" className="underline hover:text-blue-900 font-medium">
                      Create your free account
                    </Link>{' '}
                    to explore scholars in your research area.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Page Header */}
          <header className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Example Research Opportunities in {countryName}
            </h1>

            {/* Statistics Cards - Compact Card Layout */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 border border-blue-200">
                <div className="text-3xl font-bold text-blue-700 mb-2">
                  {stats.scholar_count.toLocaleString()}
                </div>
                <div className="text-sm font-medium text-gray-700">Active Scholars</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 border border-green-200">
                <div className="text-3xl font-bold text-green-700 mb-2">
                  {stats.city_count}
                </div>
                <div className="text-sm font-medium text-gray-700">Research Cities</div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 border border-purple-200">
                <div className="text-3xl font-bold text-purple-700 mb-2">
                  {stats.institution_count.toLocaleString()}
                </div>
                <div className="text-sm font-medium text-gray-700">Institutions</div>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 border border-orange-200">
                <div className="text-3xl font-bold text-orange-700 mb-2">
                  {stats.paper_count.toLocaleString()}
                </div>
                <div className="text-sm font-medium text-gray-700">Publications</div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <div className="bg-white rounded-xl shadow-lg p-8 md:p-12 mb-12">
            {/* Introduction */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                About Research in {countryName} (Neural Modulation As An Example)
              </h2>
              <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed text-justify space-y-8 prose-p:my-0">
                {introductionParagraphs.map((paragraph, index) => (
                  <p key={`${countrySlug}-intro-${index}`}>{paragraph}</p>
                ))}
              </div>
            </section>

            {/* Research Landscape */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Research Landscape (Neural Modulation As An Example)
              </h2>
              <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed space-y-8 prose-p:my-0">
                {researchLandscapeParagraphs.map((paragraph, index) => (
                  <p key={`${countrySlug}-landscape-${index}`}>{paragraph}</p>
                ))}
              </div>
            </section>

            {/* Top Cities */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Top Research Cities in {countryName}
              </h2>
              <p className="text-lg text-gray-700 leading-relaxed mb-8">
                Compare the top research hubs by scholar and institution counts in our sample dataset.
              </p>

              <CityStatsBarChart cities={stats.top_cities} maxCities={5} />

              {/* Cities Grid with Expand/Collapse */}
              <div className="mt-8">
                <CitiesGrid cities={stats.cities} countryName={countryName} />
              </div>
            </section>

            {/* Opportunities */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Research Opportunities and Career Paths
              </h2>
              <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed space-y-8 prose-p:my-0">
                {opportunitiesParagraphs.map((paragraph, index) => (
                  <p key={`${countrySlug}-opportunities-${index}`}>{paragraph}</p>
                ))}
              </div>
            </section>

            {/* How to Connect */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                How to Connect with Researchers
              </h2>
              <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed space-y-8 prose-p:my-0">
                {howToConnectBlocks.map((block, index) => {
                  if (block.type === 'list') {
                    return (
                      <div key={`${countrySlug}-connect-${index}`} className="space-y-4">
                        {block.intro ? <p>{block.intro}</p> : null}
                        <div className="space-y-2">
                          {block.items.map((item, itemIndex) => (
                            <p key={`${countrySlug}-connect-item-${index}-${itemIndex}`} className="pl-6">
                              - {item}
                            </p>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return <p key={`${countrySlug}-connect-${index}`}>{block.text}</p>;
                })}
              </div>
            </section>

            {/* CTA to Interactive Map */}
            <section className="mb-12">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-8 border-2 border-blue-200 shadow-lg">
                <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">
                  See How the Interactive Map Works
                </h3>
                <p className="text-gray-700 mb-6 leading-relaxed text-center">
                  Explore our example dataset showing {stats.scholar_count.toLocaleString()} scholars across{' '}
                  {countryName}. The interactive map lets you filter by city, explore institutions,
                  and discover researchers. <strong>Create your free account</strong> to map scholars in your specific research area.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <Link
                    href={demoRunUrl}
                    className="inline-flex items-center justify-center bg-white hover:bg-gray-50 text-blue-700 font-semibold px-8 py-4 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg border-2 border-blue-300"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    View Example Map ({countryName})
                  </Link>
                  <Link
                    href="/auth/register"
                    className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-lg transition-colors duration-300 shadow-md hover:shadow-lg"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Your Own Map (Free)
                  </Link>
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
                href="/research-jobs"
                className="block text-blue-600 hover:text-blue-700 font-medium"
              >
                ← Browse All Countries
              </Link>
              <Link
                href={demoRunUrl}
                className="block text-blue-600 hover:text-blue-700 font-medium"
              >
                View {countryName} on Interactive Map →
              </Link>
              <Link
                href="/auth/register"
                className="block text-blue-600 hover:text-blue-700 font-medium"
              >
                Create Your Research Map →
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
