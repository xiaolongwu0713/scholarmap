import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getFieldConfig,
  getAllFieldConfigs,
  isValidFieldSlug,
} from '@/lib/seoFieldConfig';
import { fetchFieldWorldData, fetchFieldCityData, getFieldDemoRunUrl } from '@/lib/seoFieldApi';
import { countryToSlug, slugToCityName, cityToSlug } from '@/lib/geoSlugs';
import {
  generateFieldCityContent,
  generateFieldCityMetaDescription,
  generateFieldCityKeywords,
  generateFieldCityFAQs,
} from '@/lib/seoFieldContent';
import { UnifiedNavbar } from '@/components/UnifiedNavbar';
import { Footer } from '@/components/landing/Footer';
import { StructuredData } from '@/components/StructuredData';
import { SEOPageTracker } from '@/components/SEOPageTracker';
import { TrackedLink } from '@/components/TrackedLink';
import { AIContentSummary } from '@/components/AIContentSummary';
import { DataSourceCitation } from '@/components/DataSourceCitation';

// Enable ISR with 24 hour revalidation
export const revalidate = 86400;

// Generate static params for top 5 cities × all fields
export async function generateStaticParams() {
  const fields = getAllFieldConfigs();
  
  // For each field, generate top 5 cities
  const params: Array<{ fieldSlug: string; citySlug: string }> = [];
  
  for (const field of fields) {
    try {
      const { fetchFieldWorldData } = await import('@/lib/seoFieldApi');
      const worldData = await fetchFieldWorldData(field.slug);
      
      // Collect all cities across countries
      const allCities: Array<{ city: string; country: string; scholar_count: number }> = [];
      
      // Get top 10 countries
      const topCountries = worldData
        .sort((a: any, b: any) => b.scholar_count - a.scholar_count)
        .slice(0, 10);
      
      // Fetch cities from top countries
      for (const countryData of topCountries) {
        try {
          const { fetchFieldCountryData } = await import('@/lib/seoFieldApi');
          const cities = await fetchFieldCountryData(field.slug, countryData.country);
          cities.forEach((city: any) => {
            allCities.push({
              city: city.city,
              country: countryData.country,
              scholar_count: city.scholar_count,
            });
          });
        } catch (error) {
          console.error(`Error fetching cities for ${countryData.country}:`, error);
        }
      }
      
      // Sort by scholar count and take top 5
      const topCities = allCities
        .sort((a, b) => b.scholar_count - a.scholar_count)
        .slice(0, 5);
      
      topCities.forEach((city) => {
        params.push({
          fieldSlug: field.slug,
          citySlug: cityToSlug(city.city),
        });
      });
    } catch (error) {
      console.error(`Error generating params for field ${field.slug}:`, error);
    }
  }
  
  return params;
}

interface PageProps {
  params: Promise<{
    fieldSlug: string;
    citySlug: string;
  }>;
}

// Helper to find city's country
async function findCityCountry(fieldSlug: string, cityName: string): Promise<string | null> {
  try {
    const worldData = await fetchFieldWorldData(fieldSlug);
    
    // Check top countries
    const topCountries = worldData
      .sort((a: any, b: any) => b.scholar_count - a.scholar_count)
      .slice(0, 20);
    
    for (const countryData of topCountries) {
      try {
        const { fetchFieldCountryData } = await import('@/lib/seoFieldApi');
        const cities = await fetchFieldCountryData(fieldSlug, countryData.country);
        const foundCity = cities.find((c: any) => c.city.toLowerCase() === cityName.toLowerCase());
        if (foundCity) {
          return countryData.country;
        }
      } catch (error) {
        continue;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error finding city country:', error);
    return null;
  }
}

// Generate metadata
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { fieldSlug, citySlug } = await params;
  
  if (!isValidFieldSlug(fieldSlug)) {
    return {
      title: 'Field Not Found | ScholarMap',
    };
  }

  const fieldConfig = getFieldConfig(fieldSlug)!;
  const cityName = slugToCityName(citySlug);
  
  try {
    const country = await findCityCountry(fieldSlug, cityName);
    if (!country) {
      return {
        title: `${fieldConfig.name} Research in ${cityName} | ScholarMap`,
        description: `Explore ${fieldConfig.name} research opportunities in ${cityName}.`,
      };
    }

    const cityData = await fetchFieldCityData(fieldSlug, country, cityName);
    const scholarCount = cityData.length;
    
    // Count unique institutions
    const institutions = new Set(cityData.map((s: any) => s.institution));
    const institutionCount = institutions.size;

    const description = generateFieldCityMetaDescription(
      fieldConfig.name,
      cityName,
      country,
      scholarCount,
      institutionCount
    );
    const keywords = generateFieldCityKeywords(fieldConfig, cityName, country);
    
    // Get top 3 institutions for AI summary
    const institutionList = Array.from(institutions).slice(0, 3).join(', ');

    return {
      title: `${fieldConfig.name} Research in ${cityName} | Leading Labs & Researchers | ScholarMap`,
      description,
      keywords,
      
      // GEO: AI-friendly metadata
      other: {
        'ai-summary': `${fieldConfig.name} research in ${cityName}, ${country}: ${scholarCount} researchers across ${institutionCount} institutions. Top institutions: ${institutionList}. Keywords: ${fieldConfig.keywords.slice(0, 3).join(', ')}. Data from PubMed (2000-2026). Visit ScholarMap to explore by institution.`,
        'ai-keywords': fieldConfig.keywords.join(', '),
        'ai-content-type': 'research-data',
        'ai-data-source': 'PubMed scientific publications',
        'ai-last-updated': new Date().toISOString().split('T')[0],
        'ai-geographic-scope': 'city',
        'ai-citable': 'true',
        'ai-citation': `ScholarMap (2026). ${fieldConfig.name} Research in ${cityName}, ${country}. Retrieved from https://scholarmap-frontend.onrender.com/research-jobs/${fieldSlug}/city/${citySlug}`,
      },
      
      openGraph: {
        title: `${fieldConfig.name} Research in ${cityName}`,
        description: `${scholarCount} researchers in ${fieldConfig.keywords[0]} at ${institutionCount} institutions`,
        images: ['/landing_page_figures_optimized/0.webp'],
        type: 'article',
      },
      twitter: {
        card: 'summary_large_image',
        title: `${fieldConfig.name} in ${cityName}`,
        description: `${scholarCount} researchers | ${institutionCount} institutions`,
      },
    };
  } catch (error) {
    console.error('Error generating field-city metadata:', error);
    return {
      title: `${fieldConfig.name} Research in ${cityName} | ScholarMap`,
      description: `Explore ${fieldConfig.name} research opportunities and institutions in ${cityName}.`,
    };
  }
}

export default async function FieldCityPage({ params }: PageProps) {
  const { fieldSlug, citySlug } = await params;
  
  if (!isValidFieldSlug(fieldSlug)) {
    notFound();
  }

  const fieldConfig = getFieldConfig(fieldSlug)!;
  const cityName = slugToCityName(citySlug);
  
  // Find which country this city belongs to
  const country = await findCityCountry(fieldSlug, cityName);
  
  if (!country) {
    notFound();
  }

  let cityData, scholarCount, institutionCount, institutions, content, faqs;
  
  try {
    cityData = await fetchFieldCityData(fieldSlug, country, cityName);
    
    if (!cityData || cityData.length === 0) {
      notFound();
    }

    // Data is already aggregated by institution
    // Each item has: {institution, scholar_count}
    institutionCount = cityData.length;
    scholarCount = cityData.reduce((sum: number, item: any) => sum + (item.scholar_count || 0), 0);
    
    // Sort by scholar count and take top 10
    institutions = [...cityData]
      .sort((a: any, b: any) => b.scholar_count - a.scholar_count)
      .slice(0, 10)
      .map((item: any) => ({
        institution: item.institution || 'Unknown Institution',
        scholar_count: item.scholar_count || 0,
      }));

    content = generateFieldCityContent(fieldConfig, {
      field: fieldConfig.name,
      totalScholars: 0, // Not used in city content
      totalCountries: 0,
      totalCities: 0,
      totalInstitutions: 0,
      country,
      city: cityName,
      scholarCount,
      institutionCount,
      institutions,
    });

    faqs = generateFieldCityFAQs(fieldConfig, cityName, country, scholarCount, institutionCount);
  } catch (error) {
    console.error('Error fetching field-city data:', error);
    notFound();
  }

  const demoRunUrl = getFieldDemoRunUrl(fieldSlug);

  // Structured data
  const breadcrumbList = {
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
        name: fieldConfig.name,
        item: `https://scholarmap-frontend.onrender.com/research-jobs/${fieldSlug}`,
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: cityName,
        item: `https://scholarmap-frontend.onrender.com/research-jobs/${fieldSlug}/city/${citySlug}`,
      },
    ],
  };

  const placeSchema = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: cityName,
    address: {
      '@type': 'PostalAddress',
      addressCountry: country,
      addressLocality: cityName,
    },
    description: `${fieldConfig.name} research in ${cityName}, ${country}`,
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
      <SEOPageTracker 
        pageName={`field_city_${fieldSlug}`}
        location={`${cityName}-${country}-${fieldSlug}`}
      />
      
      <StructuredData 
        data={[breadcrumbList, placeSchema, faqSchema]}
      />
      
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
        <UnifiedNavbar />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
          {/* Header */}
          <div className="mb-8">
            <nav className="text-sm text-gray-600 mb-4">
              <Link href="/" className="hover:text-blue-600">Home</Link>
              <span className="mx-2">/</span>
              <Link href="/research-jobs" className="hover:text-blue-600">Research Jobs</Link>
              <span className="mx-2">/</span>
              <Link href={`/research-jobs/${fieldSlug}`} className="hover:text-blue-600">
                {fieldConfig.name}
              </Link>
              <span className="mx-2">/</span>
              <span className="text-gray-900">{cityName}</span>
            </nav>
            
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {fieldConfig.name} Research in {cityName}
            </h1>
            
            <p className="text-xl text-gray-600 mb-4">
              {cityName}, {country}
            </p>
            
            <div className="flex flex-wrap gap-4 text-lg text-gray-700">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
                <span><strong>{scholarCount}</strong> Researchers</span>
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                </svg>
                <span><strong>{institutionCount}</strong> Institutions</span>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
            {/* Overview */}
            <section className="mb-8">
              <div className="prose prose-lg max-w-none text-gray-700">
                {content.overview.split('\n\n').map((paragraph: string, index: number) => (
                  <p key={index} className="mb-4">{paragraph}</p>
                ))}
              </div>
            </section>

            {/* CTA */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Explore {fieldConfig.name} Research Map for {cityName}
              </h3>
              <p className="text-gray-700 mb-4">
                Discover researchers, labs, and opportunities in {fieldConfig.keywords[0]} across {cityName} with our interactive geographic visualization.
              </p>
              <TrackedLink
                href={demoRunUrl}
                trackingType="demo"
                trackingSource={`field_city_${fieldSlug}`}
                country={country}
                city={cityName}
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
              >
                View Interactive Map →
              </TrackedLink>
            </div>

            {/* Major Institutions */}
            <section className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Major Institutions and Labs
              </h2>
              <div className="prose prose-lg max-w-none text-gray-700 mb-6">
                {content.majorInstitutions.split('\n\n').map((paragraph: string, index: number) => (
                  <p key={index} className="mb-4">{paragraph}</p>
                ))}
              </div>

              {/* Institutions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {institutions.map((inst: any, index: number) => (
                  <div
                    key={inst.institution}
                    className="border border-gray-200 rounded-lg p-5 hover:border-blue-500 hover:shadow-md transition-all bg-white"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="text-2xl font-bold text-blue-600">
                        #{index + 1}
                      </div>
                    </div>
                    <h3 className="font-semibold text-lg text-gray-900 mb-2 min-h-[3.5rem] line-clamp-2">
                      {inst.institution}
                    </h3>
                    <div className="flex items-center text-gray-600 text-sm">
                      <svg className="w-4 h-4 mr-1.5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                      </svg>
                      <span>
                        <strong>{inst.scholar_count}</strong> {inst.scholar_count === 1 ? 'researcher' : 'researchers'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Research Community */}
            <section className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Research Community
              </h2>
              <div className="prose prose-lg max-w-none text-gray-700">
                {content.researchCommunity.split('\n\n').map((paragraph: string, index: number) => (
                  <p key={index} className="mb-4">{paragraph}</p>
                ))}
              </div>
            </section>

            {/* Opportunities */}
            <section className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Research Opportunities
              </h2>
              <div className="prose prose-lg max-w-none text-gray-700">
                {content.opportunities.split('\n\n').map((paragraph: string, index: number) => (
                  <p key={index} className="mb-4">{paragraph}</p>
                ))}
              </div>
            </section>

            {/* FAQ */}
            <section className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Frequently Asked Questions
              </h2>
              <div className="space-y-6">
                {faqs.map((faq, index) => (
                  <div key={index} className="border-b border-gray-200 pb-6 last:border-b-0">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {faq.question}
                    </h3>
                    <p className="text-gray-700">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Cross-links */}
            <section className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Explore More
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link
                  href={`/research-jobs/${fieldSlug}`}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all"
                >
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Global {fieldConfig.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Explore worldwide →
                  </p>
                </Link>
                <Link
                  href={`/research-jobs/${fieldSlug}/country/${countryToSlug(country)}`}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all"
                >
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {fieldConfig.name} in {country}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Explore country →
                  </p>
                </Link>
                <Link
                  href={`/research-jobs/city/${citySlug}`}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all"
                >
                  <h3 className="font-semibold text-gray-900 mb-2">
                    All Research in {cityName}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Explore all fields →
                  </p>
                </Link>
              </div>
            </section>

            {/* Final CTA */}
            <div className="bg-gray-50 rounded-lg p-6 text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Discover {fieldConfig.name} Researchers in {cityName}
              </h3>
              <p className="text-gray-700 mb-4">
                Use ScholarMap's interactive map to explore research groups and identify opportunities in {fieldConfig.keywords[0]}.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <TrackedLink
                  href={demoRunUrl}
                  trackingType="demo"
                  trackingSource={`field_city_${fieldSlug}_bottom`}
                  country={country}
                  city={cityName}
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
                >
                  Explore Interactive Map
                </TrackedLink>
                <TrackedLink
                  href="/auth/register"
                  trackingType="signup"
                  trackingSource={`field_city_${fieldSlug}`}
                  country={country}
                  city={cityName}
                  className="inline-block bg-white hover:bg-gray-50 text-blue-600 font-semibold px-8 py-3 rounded-lg border-2 border-blue-600 transition-colors"
                >
                  Create Free Account
                </TrackedLink>
              </div>
            </div>
          </div>
          
          {/* GEO: AI Content Summary (hidden, for AI crawlers only) */}
          <AIContentSummary 
            pageType="field-city"
            data={{
              title: `${fieldConfig.name} Research Opportunities in ${cityName}, ${country}`,
              fieldName: fieldConfig.name,
              cityName,
              countryName: country,
              totalResearchers: scholarCount,
              totalInstitutions: institutionCount,
              topLocations: institutions.map((i: any) => ({ name: i.institution, count: i.scholar_count })),
              dataSource: 'PubMed scientific publications',
              lastUpdated: '2026-01-27',
              pageUrl: `https://scholarmap-frontend.onrender.com/research-jobs/${fieldSlug}/city/${citySlug}`,
              keywords: fieldConfig.keywords,
            }}
          />
          
          {/* GEO: Data Source Citation (visible, at page bottom) */}
          <DataSourceCitation />
        </main>
        
        <Footer />
      </div>
    </>
  );
}
