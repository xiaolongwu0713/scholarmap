import { Metadata } from 'next';
import Link from 'next/link';
import { UnifiedNavbar } from '@/components/UnifiedNavbar';
import { Footer } from '@/components/landing/Footer';

export const metadata: Metadata = {
  title: 'Methodology - How We Map Biomedical Research | ScholarMap',
  description: 'Learn how ScholarMap collects and processes PubMed data to map global biomedical research networks. Understand our data sources, extraction methods, and quality assurance processes.',
  keywords: [
    'PubMed data analysis',
    'research methodology',
    'biomedical research mapping',
    'data collection methods',
    'geographic research visualization',
    'academic network analysis',
    'research data quality',
  ],
  openGraph: {
    title: 'Methodology - How We Map Biomedical Research',
    description: 'Transparent documentation of our data sources, collection methods, and quality assurance for mapping global biomedical research.',
  },
};

export default function MethodologyPage() {
  return (
    <>
      <UnifiedNavbar variant="landing" />
      
      <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Breadcrumb */}
          <nav className="text-sm text-gray-600 mb-8" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-blue-600">
              Home
            </Link>
            <span className="mx-2">→</span>
            <Link href="/about" className="hover:text-blue-600">
              About
            </Link>
            <span className="mx-2">→</span>
            <span className="text-gray-900 font-medium">Methodology</span>
          </nav>

          {/* Header */}
          <header className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Our Methodology
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              Transparent documentation of how we map global biomedical research networks using PubMed data
            </p>
          </header>

          {/* Trust Banner */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-lg mb-12">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  Built on Trusted Data Sources
                </h3>
                <p className="text-blue-800">
                  All our data comes from <strong>PubMed</strong>, the U.S. National Library of Medicine's 
                  authoritative database containing over 36 million biomedical citations. We do not modify 
                  or editorialize the research data—we only organize and visualize it geographically.
                </p>
              </div>
            </div>
          </div>

          {/* Main Content Sections */}
          <div className="space-y-12">
            {/* Section 1: Data Sources */}
            <section>
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="bg-blue-100 text-blue-600 rounded-full w-10 h-10 flex items-center justify-center mr-3 text-lg font-bold">
                  1
                </span>
                Data Sources
              </h2>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Primary Source: PubMed</h3>
                    <p className="text-gray-700 leading-relaxed">
                      PubMed is maintained by the U.S. National Library of Medicine (NLM) and provides free 
                      access to MEDLINE, the premier bibliographic database of life sciences and biomedical information.
                    </p>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-800 mb-2">Coverage Scope</h4>
                      <ul className="text-gray-700 space-y-1 text-sm">
                        <li>• Biomedical & Life Sciences</li>
                        <li>• Medicine & Clinical Research</li>
                        <li>• Neuroscience & Psychology</li>
                        <li>• Pharmacology & Toxicology</li>
                        <li>• Public Health & Epidemiology</li>
                      </ul>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-800 mb-2">Time Range</h4>
                      <p className="text-gray-700 text-sm">
                        We analyze publications from <strong>2020 to 2025</strong> to ensure data reflects 
                        current research activity and institutional affiliations.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 2: Data Collection Method */}
            <section>
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="bg-green-100 text-green-600 rounded-full w-10 h-10 flex items-center justify-center mr-3 text-lg font-bold">
                  2
                </span>
                Data Collection Method
              </h2>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-3">Query Construction</h3>
                    <p className="text-gray-700 leading-relaxed mb-3">
                      For each research field (e.g., "CRISPR Gene Editing"), we construct targeted search 
                      queries using field-specific keywords and MeSH (Medical Subject Headings) terms.
                    </p>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-2">Example query for CRISPR research:</p>
                      <code className="text-xs text-gray-800 block bg-white p-3 rounded border">
                        (CRISPR OR "CRISPR-Cas9" OR "gene editing" OR "genome editing") AND 
                        ("2020"[Date - Publication] : "2025"[Date - Publication])
                      </code>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-3">Paper Retrieval</h3>
                    <p className="text-gray-700 leading-relaxed">
                      Using the official <strong>PubMed E-utilities API</strong>, we retrieve all matching 
                      publications including metadata such as title, authors, affiliations, publication date, 
                      and journal information.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-3">Author Identification</h3>
                    <p className="text-gray-700 leading-relaxed">
                      From each paper's metadata, we extract all listed authors and their institutional 
                      affiliations as provided in the publication. We count each unique author-affiliation 
                      combination as a research contributor.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 3: Geographic Information Extraction */}
            <section>
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="bg-purple-100 text-purple-600 rounded-full w-10 h-10 flex items-center justify-center mr-3 text-lg font-bold">
                  3
                </span>
                Geographic Information Extraction
              </h2>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-3">Institution Identification</h3>
                    <p className="text-gray-700 leading-relaxed">
                      We parse author affiliation strings (e.g., "Department of Biology, Harvard University, 
                      Cambridge, MA, USA") to extract institution names, departments, and location information.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-3">Geographic Coding</h3>
                    <p className="text-gray-700 leading-relaxed mb-3">
                      Extracted institutions are geocoded to determine their city and country. This process 
                      involves:
                    </p>
                    <ol className="list-decimal list-inside text-gray-700 space-y-2 ml-4">
                      <li>Parsing location information from affiliation strings</li>
                      <li>Standardizing institution names (e.g., "MIT" → "Massachusetts Institute of Technology")</li>
                      <li>Mapping institutions to cities using geographic databases</li>
                      <li>Resolving ambiguous cases through multiple data sources</li>
                    </ol>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-3">Validation Mechanism</h3>
                    <p className="text-gray-700 leading-relaxed">
                      We cross-reference institution locations using multiple sources including institutional 
                      databases, GeoNames, and manual verification for high-volume institutions. Ambiguous 
                      cases are flagged for review.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 4: Data Processing Flow */}
            <section>
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="bg-orange-100 text-orange-600 rounded-full w-10 h-10 flex items-center justify-center mr-3 text-lg font-bold">
                  4
                </span>
                Data Processing Flow
              </h2>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="space-y-6">
                  <p className="text-gray-700 leading-relaxed">
                    Our data pipeline processes publications through the following stages:
                  </p>
                  
                  <div className="relative">
                    {/* Flowchart */}
                    <div className="space-y-4">
                      {[
                        { step: 1, title: 'PubMed Query', desc: 'Search for publications by field and date range' },
                        { step: 2, title: 'Paper Retrieval', desc: 'Fetch publication metadata via API' },
                        { step: 3, title: 'Author Extraction', desc: 'Parse author names and affiliations' },
                        { step: 4, title: 'Institution Recognition', desc: 'Identify and standardize institution names' },
                        { step: 5, title: 'Geographic Coding', desc: 'Map institutions to cities and countries' },
                        { step: 6, title: 'Aggregation & Statistics', desc: 'Count researchers by location and field' },
                        { step: 7, title: 'Quality Validation', desc: 'Verify data accuracy and completeness' },
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-start">
                          <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mr-4">
                            {item.step}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-800">{item.title}</h4>
                            <p className="text-sm text-gray-600">{item.desc}</p>
                          </div>
                          {idx < 6 && (
                            <div className="absolute left-4 w-0.5 h-8 bg-blue-200" style={{ top: `${(idx + 1) * 72}px` }}></div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 5: Update Frequency */}
            <section>
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="bg-teal-100 text-teal-600 rounded-full w-10 h-10 flex items-center justify-center mr-3 text-lg font-bold">
                  5
                </span>
                Update Frequency
              </h2>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="space-y-4">
                  <div className="grid md:grid-cols-1 gap-4">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                      <div className="flex items-center mb-2">
                        <svg className="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                        </svg>
                        <h4 className="font-semibold text-gray-800">Data Synchronization</h4>
                      </div>
                      <p className="text-gray-700 text-sm">
                        Our data stays synchronized with PubMed. As new publications are indexed in PubMed, 
                        they are incorporated into our analysis pipeline to ensure you see the most current 
                        research landscape.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 6: Coverage and Limitations */}
            <section>
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="bg-red-100 text-red-600 rounded-full w-10 h-10 flex items-center justify-center mr-3 text-lg font-bold">
                  6
                </span>
                Coverage and Limitations
              </h2>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-green-600 mb-3 flex items-center">
                      <span className="mr-2">✅</span> What We Cover
                    </h3>
                    <ul className="grid md:grid-cols-2 gap-3 text-gray-700">
                      <li className="flex items-start">
                        <span className="text-green-500 mr-2">•</span>
                        <span>Medicine & Clinical Research</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-green-500 mr-2">•</span>
                        <span>Biology & Life Sciences</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-green-500 mr-2">•</span>
                        <span>Neuroscience & Cognitive Science</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-green-500 mr-2">•</span>
                        <span>Pharmacology & Drug Development</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-green-500 mr-2">•</span>
                        <span>Public Health & Epidemiology</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-green-500 mr-2">•</span>
                        <span>Genetics & Genomics</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-green-500 mr-2">•</span>
                        <span>Immunology & Microbiology</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-green-500 mr-2">•</span>
                        <span>Biotechnology Applications</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-red-600 mb-3 flex items-center">
                      <span className="mr-2">❌</span> What We Don't Include
                    </h3>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-start">
                        <span className="text-red-500 mr-2">•</span>
                        <span>Economics, Business, or Finance research</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-red-500 mr-2">•</span>
                        <span>Social Sciences (unless health-related)</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-red-500 mr-2">•</span>
                        <span>Engineering (except biomedical engineering)</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-red-500 mr-2">•</span>
                        <span>Computer Science (unless bioinformatics/health informatics)</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-red-500 mr-2">•</span>
                        <span>Physics, Chemistry, or Mathematics (unless applied to biological systems)</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                    <h4 className="font-semibold text-yellow-900 mb-2">Important Limitations</h4>
                    <ul className="space-y-2 text-sm text-yellow-800">
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span><strong>Publication Lag:</strong> Researchers without recent publications (2020-2025) may not appear in our data.</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span><strong>Early Career Researchers:</strong> PhD students or postdocs who haven't yet published may be underrepresented.</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span><strong>Clinical-Only Positions:</strong> Clinicians focused solely on patient care without research publications won't be included.</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span><strong>Affiliation Accuracy:</strong> We rely on author-provided affiliation information, which may occasionally be incomplete or outdated.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 7: Data Quality Assurance */}
            <section>
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="bg-indigo-100 text-indigo-600 rounded-full w-10 h-10 flex items-center justify-center mr-3 text-lg font-bold">
                  7
                </span>
                Data Quality Assurance
              </h2>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="space-y-4">
                  <p className="text-gray-700 leading-relaxed">
                    We implement multiple quality control measures to ensure data accuracy:
                  </p>
                  
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center mb-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                          <svg className="w-6 h-6 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                          </svg>
                        </div>
                        <h4 className="font-semibold text-gray-800">Deduplication</h4>
                      </div>
                      <p className="text-sm text-gray-600">
                        We identify and merge duplicate researchers based on name, institution, and publication patterns.
                      </p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center mb-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                          <svg className="w-6 h-6 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                          </svg>
                        </div>
                        <h4 className="font-semibold text-gray-800">Anomaly Detection</h4>
                      </div>
                      <p className="text-sm text-gray-600">
                        Statistical algorithms flag unusual patterns such as implausible researcher counts or geographic mismatches.
                      </p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center mb-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                          <svg className="w-6 h-6 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                          </svg>
                        </div>
                        <h4 className="font-semibold text-gray-800">Manual Spot Checks</h4>
                      </div>
                      <p className="text-sm text-gray-600">
                        We manually verify a sample of high-volume institutions and popular research fields to ensure geocoding accuracy.
                      </p>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mt-6">
                    <h4 className="font-semibold text-blue-900 mb-2">Continuous Improvement</h4>
                    <p className="text-sm text-blue-800">
                      We welcome user feedback to improve our data quality. If you notice any inaccuracies, 
                      please <Link href="/about" className="underline font-medium">contact us</Link> with 
                      specific details so we can investigate and correct them.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Call to Action */}
            <section className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-8 text-white text-center">
              <h2 className="text-3xl font-bold mb-4">Ready to Explore?</h2>
              <p className="text-lg mb-6 text-blue-100">
                Now that you understand our methodology, start discovering research opportunities in your field.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link 
                  href="/research-jobs" 
                  className="inline-block bg-white text-blue-600 font-semibold px-8 py-3 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Browse by Country
                </Link>
                <Link 
                  href="/auth/register" 
                  className="inline-block bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg hover:bg-blue-800 transition-colors border-2 border-blue-400"
                >
                  Create Free Account
                </Link>
              </div>
            </section>

            {/* Related Resources */}
            <section className="border-t pt-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Related Resources</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <Link 
                  href="/about" 
                  className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
                >
                  <h4 className="font-semibold text-gray-900 mb-2">About ScholarMap</h4>
                  <p className="text-sm text-gray-600">Learn about our mission and team</p>
                </Link>
                
                <Link 
                  href="/research-jobs" 
                  className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
                >
                  <h4 className="font-semibold text-gray-900 mb-2">Explore Research Opportunities</h4>
                  <p className="text-sm text-gray-600">Browse by country and field</p>
                </Link>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
