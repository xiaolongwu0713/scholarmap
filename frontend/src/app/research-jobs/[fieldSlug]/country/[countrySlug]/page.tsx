import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getFieldConfig,
  getAllFieldConfigs,
  isValidFieldSlug,
} from '@/lib/seoFieldConfig';
import { fetchFieldCountryData, getFieldDemoRunUrl } from '@/lib/seoFieldApi';
import { countryToSlug, slugToCountryName, cityToSlug } from '@/lib/geoSlugs';
import {
  generateFieldCountryContent,
  generateFieldCountryMetaDescription,
  generateFieldCountryKeywords,
  generateFieldCountryFAQs,
} from '@/lib/seoFieldContent';
import { UnifiedNavbar } from '@/components/UnifiedNavbar';
import { Footer } from '@/components/landing/Footer';
import { StructuredData } from '@/components/StructuredData';
import { SEOPageTracker } from '@/components/SEOPageTracker';
import { TrackedLink } from '@/components/TrackedLink';

// Enable ISR with 24 hour revalidation
export const revalidate = 86400;

// Generate static params for top 10 countries × all fields
export async function generateStaticParams() {
  const fields = getAllFieldConfigs();
  
  // For each field, generate top 10 countries
  const params: Array<{ fieldSlug: string; countrySlug: string }> = [];
  
  for (const field of fields) {
    try {
      const { fetchFieldWorldData } = await import('@/lib/seoFieldApi');
      const worldData = await fetchFieldWorldData(field.slug);
      const topCountries = worldData
        .sort((a: any, b: any) => b.scholar_count - a.scholar_count)
        .slice(0, 10);
      
      topCountries.forEach((country: any) => {
        params.push({
          fieldSlug: field.slug,
          countrySlug: countryToSlug(country.country),
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
    countrySlug: string;
  }>;
}

// Generate metadata
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { fieldSlug, countrySlug } = await params;
  
  if (!isValidFieldSlug(fieldSlug)) {
    return {
      title: 'Field Not Found | ScholarMap',
    };
  }

  const fieldConfig = getFieldConfig(fieldSlug)!;
  const countryName = slugToCountryName(countrySlug);
  
  try {
    const countryData = await fetchFieldCountryData(fieldSlug, countryName);
    const scholarCount = countryData.reduce((sum: number, c: any) => sum + c.scholar_count, 0);
    const institutionCount = countryData.reduce((sum: number, c: any) => sum + c.institution_count, 0);

    const description = generateFieldCountryMetaDescription(
      fieldConfig.name,
      countryName,
      scholarCount,
      institutionCount
    );
    const keywords = generateFieldCountryKeywords(fieldConfig, countryName);

    return {
      title: `${fieldConfig.name} Research in ${countryName} | Top Institutions & Opportunities | ScholarMap`,
      description,
      keywords,
      openGraph: {
        title: `${fieldConfig.name} Research in ${countryName}`,
        description: `${scholarCount.toLocaleString()} researchers in ${fieldConfig.keywords[0]} across ${institutionCount} institutions`,
        images: ['/landing_page_figures_optimized/0.webp'],
        type: 'article',
      },
      twitter: {
        card: 'summary_large_image',
        title: `${fieldConfig.name} in ${countryName}`,
        description: `${scholarCount.toLocaleString()} researchers | ${institutionCount} institutions`,
      },
    };
  } catch (error) {
    console.error('Error generating field-country metadata:', error);
    return {
      title: `${fieldConfig.name} Research in ${countryName} | ScholarMap`,
      description: `Explore ${fieldConfig.name} research opportunities and institutions in ${countryName}.`,
    };
  }
}

export default async function FieldCountryPage({ params }: PageProps) {
  const { fieldSlug, countrySlug } = await params;
  
  if (!isValidFieldSlug(fieldSlug)) {
    notFound();
  }

  const fieldConfig = getFieldConfig(fieldSlug)!;
  const countryName = slugToCountryName(countrySlug);
  
  let countryData, scholarCount, cityCount, institutionCount, topCities, content, faqs;
  
  try {
    countryData = await fetchFieldCountryData(fieldSlug, countryName);
    
    if (!countryData || countryData.length === 0) {
      notFound();
    }

    scholarCount = countryData.reduce((sum: number, c: any) => sum + c.scholar_count, 0);
    cityCount = countryData.length;
    institutionCount = countryData.reduce((sum: number, c: any) => sum + c.institution_count, 0);
    
    topCities = countryData
      .sort((a: any, b: any) => b.scholar_count - a.scholar_count)
      .slice(0, 10)
      .map((c: any) => ({
        city: c.city,
        scholar_count: c.scholar_count,
        institution_count: c.institution_count || 0,
      }));

    content = generateFieldCountryContent(fieldConfig, {
      field: fieldConfig.name,
      totalScholars: 0, // Not used in country content
      totalCountries: 0,
      totalCities: 0,
      totalInstitutions: 0,
      country: countryName,
      scholarCount,
      cityCount,
      institutionCount,
      topCities,
    });

    faqs = generateFieldCountryFAQs(fieldConfig, countryName, scholarCount, institutionCount);
  } catch (error) {
    console.error('Error fetching field-country data:', error);
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
        name: countryName,
        item: `https://scholarmap-frontend.onrender.com/research-jobs/${fieldSlug}/country/${countrySlug}`,
      },
    ],
  };

  const placeSchema = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: countryName,
    description: `${fieldConfig.name} research in ${countryName}`,
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
        pageType="field-country"
        geoData={{ field: fieldSlug, country: countryName }}
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
              <span className="text-gray-900">{countryName}</span>
            </nav>
            
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {fieldConfig.name} Research in {countryName}
            </h1>
            
            <div className="flex flex-wrap gap-4 text-lg text-gray-700">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
                <span><strong>{scholarCount.toLocaleString()}</strong> Researchers</span>
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                </svg>
                <span><strong>{institutionCount}</strong> Institutions</span>
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <span><strong>{cityCount}</strong> Cities</span>
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
                Explore {fieldConfig.name} Research Map for {countryName}
              </h3>
              <p className="text-gray-700 mb-4">
                Discover researchers, institutions, and opportunities in {fieldConfig.keywords[0]} across {countryName} with our interactive geographic visualization.
              </p>
              <TrackedLink
                href={demoRunUrl}
                eventName="seo_field_to_demo_click"
                eventData={{ field: fieldSlug, country: countryName, page_type: 'field_country' }}
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
              >
                View Interactive Map →
              </TrackedLink>
            </div>

            {/* Leading Institutions */}
            <section className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Leading Institutions in {fieldConfig.name}
              </h2>
              <div className="prose prose-lg max-w-none text-gray-700">
                {content.leadingInstitutions.split('\n\n').map((paragraph: string, index: number) => (
                  <p key={index} className="mb-4">{paragraph}</p>
                ))}
              </div>
            </section>

            {/* Research Cities */}
            <section className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Top Cities for {fieldConfig.name} in {countryName}
              </h2>
              <div className="prose prose-lg max-w-none text-gray-700 mb-6">
                {content.researchCities.split('\n\n').map((paragraph: string, index: number) => (
                  <p key={index} className="mb-4">{paragraph}</p>
                ))}
              </div>

              {/* Cities Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {topCities.map((city: any, index: number) => (
                  <TrackedLink
                    key={city.city}
                    href={`/research-jobs/${fieldSlug}/city/${cityToSlug(city.city)}`}
                    eventName="seo_field_city_link_click"
                    eventData={{ field: fieldSlug, country: countryName, city: city.city }}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900 mb-1">
                          {city.city}
                        </h3>
                        <p className="text-gray-600">
                          {city.scholar_count.toLocaleString()} researchers
                        </p>
                        <p className="text-sm text-gray-500">
                          {city.institution_count} institutions
                        </p>
                      </div>
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </TrackedLink>
                ))}
              </div>
            </section>

            {/* Funding and Opportunities */}
            <section className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Funding and Opportunities
              </h2>
              <div className="prose prose-lg max-w-none text-gray-700">
                {content.fundingAndOpportunities.split('\n\n').map((paragraph: string, index: number) => (
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link
                  href={`/research-jobs/${fieldSlug}`}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all"
                >
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Global {fieldConfig.name} Research
                  </h3>
                  <p className="text-sm text-gray-600">
                    Explore {fieldConfig.keywords[0]} research worldwide →
                  </p>
                </Link>
                <Link
                  href={`/research-jobs/country/${countrySlug}`}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all"
                >
                  <h3 className="font-semibold text-gray-900 mb-2">
                    All Research in {countryName}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Explore all biomedical research in {countryName} →
                  </p>
                </Link>
              </div>
            </section>

            {/* Final CTA */}
            <div className="bg-gray-50 rounded-lg p-6 text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Ready to Explore {fieldConfig.name} in {countryName}?
              </h3>
              <p className="text-gray-700 mb-4">
                Use ScholarMap's interactive map to discover researchers and institutions in {fieldConfig.keywords[0]} across {countryName}.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <TrackedLink
                  href={demoRunUrl}
                  eventName="seo_field_to_demo_click"
                  eventData={{ field: fieldSlug, country: countryName, page_type: 'field_country', location: 'bottom_cta' }}
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
                >
                  Explore Interactive Map
                </TrackedLink>
                <TrackedLink
                  href="/auth/register"
                  eventName="seo_to_signup_start"
                  eventData={{ source: 'field_country', field: fieldSlug, country: countryName }}
                  className="inline-block bg-white hover:bg-gray-50 text-blue-600 font-semibold px-8 py-3 rounded-lg border-2 border-blue-600 transition-colors"
                >
                  Create Free Account
                </TrackedLink>
              </div>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
}
