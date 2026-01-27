import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getFieldConfig,
  getAllFieldConfigs,
  isValidFieldSlug,
} from '@/lib/seoFieldConfig';
import { fetchFieldWorldData, getFieldDemoRunUrl } from '@/lib/seoFieldApi';
import { countryToSlug } from '@/lib/geoSlugs';
import {
  generateFieldOverviewContent,
  generateFieldOverviewMetaDescription,
  generateFieldOverviewKeywords,
  generateFieldOverviewFAQs,
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

// Generate static params for all configured fields
export async function generateStaticParams() {
  const fields = getAllFieldConfigs();
  return fields.map((field) => ({
    fieldSlug: field.slug,
  }));
}

interface PageProps {
  params: Promise<{
    fieldSlug: string;
  }>;
}

// Generate metadata
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { fieldSlug } = await params;
  
  if (!isValidFieldSlug(fieldSlug)) {
    return {
      title: 'Field Not Found | ScholarMap',
    };
  }

  const fieldConfig = getFieldConfig(fieldSlug)!;
  
  try {
    const worldData = await fetchFieldWorldData(fieldSlug);
    const totalScholars = worldData.reduce((sum: number, c: any) => sum + c.scholar_count, 0);
    const totalCountries = worldData.length;
    
    // Get top 3 countries for AI summary
    const topCountries = worldData
      .sort((a: any, b: any) => b.scholar_count - a.scholar_count)
      .slice(0, 3)
      .map((c: any) => c.country);

    const description = generateFieldOverviewMetaDescription(
      fieldConfig.name,
      totalScholars,
      totalCountries
    );
    const keywords = generateFieldOverviewKeywords(fieldConfig);

    return {
      title: `${fieldConfig.name} Research Opportunities | Find Labs & Researchers Globally | ScholarMap`,
      description,
      keywords,
      
      // GEO: AI-friendly metadata
      other: {
        // AI can quickly understand the page summary
        'ai-summary': `${fieldConfig.name} research data: ${totalScholars.toLocaleString()} researchers across ${totalCountries} countries. Top locations: ${topCountries.join(', ')}. Data from PubMed publications (2000-2026). Visit ScholarMap to explore interactive map, find collaborators, and discover research opportunities. Free account available.`,
        
        // Structured AI keywords
        'ai-keywords': fieldConfig.keywords.join(', '),
        
        // Content type identifier
        'ai-content-type': 'research-data',
        
        // Data source declaration
        'ai-data-source': 'PubMed scientific publications',
        
        // Last updated
        'ai-last-updated': new Date().toISOString().split('T')[0],
        
        // Geographic scope
        'ai-geographic-scope': 'global',
        
        // Citability declaration
        'ai-citable': 'true',
        
        // Suggested citation format
        'ai-citation': `ScholarMap (2026). ${fieldConfig.name} Research Map. Retrieved from https://scholarmap-frontend.onrender.com/research-jobs/${fieldSlug}`,
      },
      
      openGraph: {
        title: `${fieldConfig.name} Research Map`,
        description: `${totalScholars.toLocaleString()} researchers in ${fieldConfig.keywords[0]} across ${totalCountries} countries`,
        images: ['/landing_page_figures_optimized/0.webp'],
        type: 'article',
      },
      twitter: {
        card: 'summary_large_image',
        title: `Global ${fieldConfig.name} Research`,
        description: `Discover ${totalScholars.toLocaleString()} researchers | ${totalCountries} countries | ${fieldConfig.keywords[0]}`,
      },
    };
  } catch (error) {
    console.error('Error generating field overview metadata:', error);
    return {
      title: `${fieldConfig.name} Research Opportunities | ScholarMap`,
      description: fieldConfig.description,
    };
  }
}

export default async function FieldOverviewPage({ params }: PageProps) {
  const { fieldSlug } = await params;
  
  if (!isValidFieldSlug(fieldSlug)) {
    notFound();
  }

  const fieldConfig = getFieldConfig(fieldSlug)!;
  
  let worldData, totalScholars, totalCountries, topCountries, content, faqs;
  
  try {
    worldData = await fetchFieldWorldData(fieldSlug);
    totalScholars = worldData.reduce((sum: number, c: any) => sum + c.scholar_count, 0);
    totalCountries = worldData.length;
    
    topCountries = worldData
      .sort((a: any, b: any) => b.scholar_count - a.scholar_count)
      .slice(0, 10)
      .map((c: any) => ({
        country: c.country,
        scholar_count: c.scholar_count,
        institution_count: c.institution_count || 0,
      }));

    content = generateFieldOverviewContent(fieldConfig, {
      totalScholars,
      totalCountries,
      topCountries,
    });

    faqs = generateFieldOverviewFAQs(fieldConfig, totalScholars, totalCountries);
  } catch (error) {
    console.error('Error fetching field overview data:', error);
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
    ],
  };

  const researchProjectSchema = {
    '@context': 'https://schema.org',
    '@type': 'ResearchProject',
    name: `Global ${fieldConfig.name} Research`,
    description: fieldConfig.description,
    keywords: fieldConfig.keywords.join(', '),
    sponsor: {
      '@type': 'Organization',
      name: 'ScholarMap',
    },
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
        pageName={`field_overview_${fieldSlug}`}
        location={fieldSlug}
      />
      
      <StructuredData 
        data={[breadcrumbList, researchProjectSchema, faqSchema]}
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
              <span className="text-gray-900">{fieldConfig.name}</span>
            </nav>
            
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {fieldConfig.name} Research Opportunities
            </h1>
            
            <div className="flex flex-wrap gap-4 text-lg text-gray-700">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
                <span><strong>{totalScholars.toLocaleString()}</strong> Researchers</span>
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                </svg>
                <span><strong>{totalCountries}</strong> Countries</span>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
            {/* Introduction */}
            <section className="mb-8">
              <div className="prose prose-lg max-w-none text-gray-700">
                {content.introduction.split('\n\n').map((paragraph: string, index: number) => (
                  <p key={index} className="mb-4">{paragraph}</p>
                ))}
              </div>
            </section>

            {/* CTA */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Explore Interactive {fieldConfig.name} Research Map
              </h3>
              <p className="text-gray-700 mb-4">
                Discover researchers, institutions, and opportunities in {fieldConfig.keywords[0]} worldwide with our interactive geographic visualization.
              </p>
              <TrackedLink
                href={demoRunUrl}
                trackingType="demo"
                trackingSource={`field_overview_${fieldSlug}`}
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
              >
                View Interactive Map →
              </TrackedLink>
            </div>

            {/* Why This Field Matters */}
            <section className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Why {fieldConfig.name} Matters
              </h2>
              <div className="prose prose-lg max-w-none text-gray-700">
                {content.whyThisFieldMatters.split('\n\n').map((paragraph: string, index: number) => (
                  <p key={index} className="mb-4">{paragraph}</p>
                ))}
              </div>
            </section>

            {/* Current Trends */}
            <section className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Current Trends in {fieldConfig.name}
              </h2>
              <div className="prose prose-lg max-w-none text-gray-700">
                {content.currentTrends.split('\n\n').map((paragraph: string, index: number) => (
                  <p key={index} className="mb-4">{paragraph}</p>
                ))}
              </div>
            </section>

            {/* Global Distribution */}
            <section className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Global Distribution of {fieldConfig.name} Research
              </h2>
              <div className="prose prose-lg max-w-none text-gray-700 mb-6">
                {content.globalDistribution.split('\n\n').map((paragraph: string, index: number) => (
                  <p key={index} className="mb-4">{paragraph}</p>
                ))}
              </div>

              {/* Top Countries Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {topCountries.map((country: any, index: number) => (
                  <TrackedLink
                    key={country.country}
                    href={`/research-jobs/${fieldSlug}/country/${countryToSlug(country.country)}`}
                    trackingType="none"
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900 mb-1">
                          {index + 1}. {country.country}
                        </h3>
                        <p className="text-gray-600">
                          {country.scholar_count.toLocaleString()} researchers
                        </p>
                        <p className="text-sm text-gray-500">
                          {country.institution_count} institutions
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

            {/* Opportunities */}
            <section className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Opportunities in {fieldConfig.name}
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

            {/* Final CTA */}
            <div className="bg-gray-50 rounded-lg p-6 text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Ready to Explore {fieldConfig.name} Research?
              </h3>
              <p className="text-gray-700 mb-4">
                Use ScholarMap's interactive map to discover researchers, institutions, and opportunities in {fieldConfig.keywords[0]} worldwide.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <TrackedLink
                  href={demoRunUrl}
                  trackingType="demo"
                  trackingSource={`field_overview_${fieldSlug}_bottom`}
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
                >
                  Explore Interactive Map
                </TrackedLink>
                <TrackedLink
                  href="/auth/register"
                  trackingType="signup"
                  trackingSource={`field_overview_${fieldSlug}`}
                  className="inline-block bg-white hover:bg-gray-50 text-blue-600 font-semibold px-8 py-3 rounded-lg border-2 border-blue-600 transition-colors"
                >
                  Create Free Account
                </TrackedLink>
              </div>
            </div>
          </div>
          
          {/* GEO: AI Content Summary (hidden, for AI crawlers only) */}
          <AIContentSummary 
            pageType="field"
            data={{
              title: `${fieldConfig.name} Research Opportunities Worldwide`,
              fieldName: fieldConfig.name,
              totalResearchers: totalScholars,
              totalCountries,
              topLocations: topCountries.map((c: any) => ({ name: c.country, count: c.scholar_count })),
              dataSource: 'PubMed scientific publications',
              lastUpdated: '2026-01-27',
              pageUrl: `https://scholarmap-frontend.onrender.com/research-jobs/${fieldSlug}`,
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
