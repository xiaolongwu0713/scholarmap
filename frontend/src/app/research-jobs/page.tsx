import { Metadata } from 'next';
import Link from 'next/link';
import { fetchCountryMap, fetchWorldMap } from '@/lib/seoApi';
import { UnifiedNavbar } from '@/components/UnifiedNavbar';
import { Footer } from '@/components/landing/Footer';
import { CountryCardsGrid } from '@/components/CountryCardsGrid';
import { SEOPageTracker } from '@/components/SEOPageTracker';
import { TrackedLink } from '@/components/TrackedLink';

export const metadata: Metadata = {
  title: 'Global Biomedical Research Opportunities by Country | ScholarMap',
  description: 'Explore biomedical and life sciences research opportunities across 150+ countries. Find PubMed researchers, medical institutions, and academic collaborations in medicine, biology, neuroscience, and health sciences.',
  keywords: [
    'biomedical research opportunities worldwide',
    'life sciences postdoc positions',
    'medical research collaborations',
    'PubMed global researchers',
    'neuroscience research network',
    'clinical research opportunities',
    'biomedical academic jobs',
    'pharmacology research positions',
    'public health researchers',
    'biology research institutions',
  ],
  openGraph: {
    title: 'Global Biomedical Research Opportunities by Country',
    description: 'Explore biomedical research in 150+ countries. Find life sciences researchers and collaborations in medicine, biology, and health sciences.',
    images: ['/landing_page_figures_optimized/0.webp'],
  },
};

export default async function ResearchJobsLanding() {
  // Fetch all countries from world map
  const countries = await fetchWorldMap();
  
  // Sort by scholar count (descending)
  const sortedCountries = [...countries].sort((a, b) => b.scholar_count - a.scholar_count);
  
  // Statistics
  const totalScholars = countries.reduce((sum, c) => sum + c.scholar_count, 0);
  const totalInstitutions = countries.reduce((sum, c) => sum + c.institution_count, 0);
  const cityCounts = await Promise.all(
    countries.map((country) => fetchCountryMap(country.country).then((cities) => cities.length))
  );
  const totalCities = cityCounts.reduce((sum, count) => sum + count, 0);

  return (
    <>
      <SEOPageTracker pageName="research_jobs_landing" location="global" />
      <UnifiedNavbar variant="landing" />
      
      <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 pt-20">
        {/* Hero Section */}
        <div className="container mx-auto px-4 py-16">
          {/* Breadcrumb */}
          <nav className="text-sm text-gray-600 mb-8" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-blue-600">
              Home
            </Link>
            <span className="mx-2">→</span>
            <span className="text-gray-900 font-medium">Research Jobs by Country</span>
          </nav>

          {/* Field Scope Banner */}
          <div className="max-w-4xl mx-auto mb-8">
            <div className="bg-gradient-to-r from-green-50 to-teal-50 border-l-4 border-green-600 rounded-r-lg p-5 shadow-sm">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm text-green-900">
                    <strong className="font-semibold">Biomedical & Life Sciences Focus:</strong>{' '}
                    ScholarMap uses PubMed data, covering biomedical research including medicine, 
                    biology, neuroscience, pharmacology, public health, and related fields. 
                    Not suitable for economics, social sciences, or non-biomedical engineering.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Data Disclaimer Banner */}
          <div className="max-w-4xl mx-auto mb-8">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-r-lg p-4 shadow-sm">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm text-blue-800">
                    <strong className="font-semibold">Sample Research Data:</strong> The data shown represents an example research area (Neural Modulation). 
                    The actual distribution of researchers in your field may vary.{' '}
                    <Link href="/auth/register" className="underline hover:text-blue-900 font-medium">
                      Create a free account
                    </Link>{' '}
                    to map scholars in your specific research interest.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Page Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-4xl font-bold text-gray-900 mb-6 text-center">
              You Have a Dream Country, City, or Institution
              <br />
              What's the Next Step?
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              In this example biomedical research area (Neural Modulation), you can explore research activity across{' '}
              <strong>{countries.length} countries</strong>, <strong>{totalCities.toLocaleString()} cities</strong> and{' '}
              <strong>{totalInstitutions.toLocaleString()} institutions</strong>.
            </p>
          </div>

          {/* Overview Text */}
          <div className="max-w-5xl mx-auto mb-16 prose prose-lg text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Your Gateway to Global Academic Opportunities
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Whether you're a PhD student seeking postdoctoral positions in life sciences, a medical researcher looking for international collaborations, or a biomedical professional exploring new career opportunities, our comprehensive research map helps you discover and connect with researchers in medicine, biology, neuroscience, and health sciences at your dream country, city, or institution.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              Each country page provides detailed insights into the local research landscape, including:
            </p>
            <div className="flex justify-center mb-6">
              <ul className="inline-block list-disc list-outside text-gray-700 space-y-2 pl-6 text-left">
                <li>Number of active researchers and research output</li>
                <li>Major research cities and their academic strengths</li>
                <li>Leading institutions and research centers</li>
                <li>Interactive visualization of the research community</li>
              </ul>
            </div>
          </div>

          {/* Countries Grid - Card Layout with Expand/Collapse */}
          <CountryCardsGrid countries={sortedCountries} />

          {/* CTA Section */}
          <div className="max-w-4xl mx-auto bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-8 border-2 border-blue-200 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
              See How ScholarMap Works
            </h2>
            <p className="text-gray-700 text-center mb-6">
              Explore the interactive research map for this example research area (Neural Modulation). Then create your own 
              free account to map scholars in your specific field of interest.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <TrackedLink
                href="/projects/6af7ac1b6254/runs/53e099cdb74e"
                trackingType="demo"
                trackingSource="landing_page"
                className="inline-flex items-center bg-white hover:bg-gray-50 text-blue-700 font-semibold px-8 py-4 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg border-2 border-blue-300"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                View Example Map
              </TrackedLink>
              <TrackedLink
                href="/auth/register"
                trackingType="signup"
                trackingSource="landing_page"
                className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-lg transition-colors duration-300 shadow-md hover:shadow-lg"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Your Map (Free)
              </TrackedLink>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
