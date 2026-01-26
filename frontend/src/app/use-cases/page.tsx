import { Metadata } from 'next';
import Link from 'next/link';
import { UnifiedNavbar } from '@/components/UnifiedNavbar';
import { Footer } from '@/components/landing/Footer';
import { TrackedLink } from '@/components/TrackedLink';

export const metadata: Metadata = {
  title: 'Use Cases - How to Use ScholarMap for Research | ScholarMap',
  description: 'Learn how to use ScholarMap to find postdoc positions, discover collaboration opportunities, and compare research environments across cities. Step-by-step guides with real examples.',
  keywords: [
    'find postdoc positions',
    'research collaboration opportunities',
    'compare research cities',
    'academic job search',
    'biomedical research opportunities',
    'how to use scholarmap',
  ],
  openGraph: {
    title: 'Use Cases - How to Use ScholarMap for Research',
    description: 'Discover how researchers use ScholarMap to find postdoc positions, collaborations, and compare research environments.',
  },
};

export default function UseCasesPage() {
  return (
    <>
      <UnifiedNavbar variant="landing" />
      
      <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Breadcrumb */}
          <nav className="text-sm text-gray-600 mb-8" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-blue-600">
              Home
            </Link>
            <span className="mx-2">→</span>
            <span className="text-gray-900 font-medium">Use Cases</span>
          </nav>

          {/* Header */}
          <header className="mb-12 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              How Researchers Use ScholarMap
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
              Real-world examples of how ScholarMap helps biomedical researchers discover 
              opportunities, find collaborators, and make informed career decisions
            </p>
          </header>

          {/* Quick Navigation */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-12">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 text-center">Jump to Use Case</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <a 
                href="#postdoc-search" 
                className="block bg-white p-4 rounded-lg hover:shadow-md transition-shadow text-center"
              >
                <div className="text-3xl mb-2">🎓</div>
                <div className="font-semibold text-gray-900">Find Postdoc Positions</div>
              </a>
              <a 
                href="#collaboration" 
                className="block bg-white p-4 rounded-lg hover:shadow-md transition-shadow text-center"
              >
                <div className="text-3xl mb-2">🤝</div>
                <div className="font-semibold text-gray-900">Find Collaborators</div>
              </a>
              <a 
                href="#compare-cities" 
                className="block bg-white p-4 rounded-lg hover:shadow-md transition-shadow text-center"
              >
                <div className="text-3xl mb-2">🗺️</div>
                <div className="font-semibold text-gray-900">Compare Cities</div>
              </a>
            </div>
          </div>

          {/* Use Case 1: Find Postdoc Positions */}
          <section id="postdoc-search" className="mb-16 scroll-mt-24">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white">
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-5xl">🎓</div>
                  <div>
                    <h2 className="text-3xl font-bold">Use Case 1</h2>
                    <p className="text-xl text-blue-100">Find Postdoc Positions in Your Field</p>
                  </div>
                </div>
              </div>

              <div className="p-8">
                {/* The Problem */}
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                    <span className="bg-red-100 text-red-600 rounded-full w-8 h-8 flex items-center justify-center mr-3 text-lg">!</span>
                    The Problem
                  </h3>
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                    <p className="text-gray-700 italic">
                      "I'm a PhD student in CRISPR research. I want to find postdoc opportunities in cities 
                      with strong gene editing labs, but I don't know where to start. University rankings 
                      don't tell me which specific cities or institutions are actively publishing in my field."
                    </p>
                  </div>
                </div>

                {/* The Solution */}
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                    <span className="bg-green-100 text-green-600 rounded-full w-8 h-8 flex items-center justify-center mr-3 text-lg">✓</span>
                    The Solution
                  </h3>
                  <div className="bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-lg p-6">
                    <p className="text-gray-700 mb-4">
                      ScholarMap shows you exactly where CRISPR research is happening globally, broken 
                      down by country, city, and institution—all based on actual PubMed publication data.
                    </p>
                    
                    {/* Visual Representation */}
                    <div className="bg-white rounded-lg p-6 border border-gray-200">
                      <div className="text-center text-gray-500 mb-4">
                        <svg className="w-16 h-16 mx-auto mb-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
                        </svg>
                        <p className="text-sm font-medium">Interactive Map Visualization</p>
                      </div>
                      <p className="text-xs text-gray-600 text-center">
                        Select CRISPR → View global distribution → Click Boston → See 12 institutions → 
                        Browse 75 researchers
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step-by-Step */}
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Step-by-Step Guide</h3>
                  <div className="space-y-4">
                    {[
                      {
                        step: 1,
                        title: 'Go to the CRISPR Gene Editing field page',
                        description: 'Start by selecting your research field from the available options.',
                        action: 'Browse Fields'
                      },
                      {
                        step: 2,
                        title: 'View the global distribution map',
                        description: 'See which countries and cities have the highest concentration of CRISPR researchers.',
                        action: 'Explore Map'
                      },
                      {
                        step: 3,
                        title: 'Click on your target city (e.g., Boston)',
                        description: 'Dive deeper into a specific city to see all institutions with active CRISPR research.',
                        action: 'Select City'
                      },
                      {
                        step: 4,
                        title: 'Browse institutions and researcher counts',
                        description: 'View the list of institutions ranked by research activity, with exact researcher counts.',
                        action: 'Compare Labs'
                      },
                      {
                        step: 5,
                        title: 'Use this information for your applications',
                        description: 'Now you have a data-driven list of target institutions to research further and apply to.',
                        action: 'Take Action'
                      },
                    ].map((item) => (
                      <div key={item.step} className="flex gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                            {item.step}
                          </div>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">{item.title}</h4>
                          <p className="text-sm text-gray-600">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Try It Yourself */}
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Try It Yourself</h3>
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-white">
                    <p className="mb-4">
                      Explore CRISPR research opportunities in Boston, one of the world's leading gene 
                      editing hubs with 75+ active researchers across major institutions.
                    </p>
                    <TrackedLink
                      href="/research-jobs/crispr-gene-editing/city/boston"
                      trackingType="demo"
                      trackingSource="use_case_postdoc"
                      city="boston"
                      className="inline-block bg-white text-blue-600 font-semibold px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      Explore CRISPR Research in Boston →
                    </TrackedLink>
                  </div>
                </div>

                {/* What You'll Get */}
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">What You'll Get</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="font-semibold text-gray-900 mb-2">📊 Researcher Counts</div>
                      <p className="text-sm text-gray-700">
                        See exactly how many researchers are publishing in your field at each institution.
                      </p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="font-semibold text-gray-900 mb-2">🏛️ Institution Rankings</div>
                      <p className="text-sm text-gray-700">
                        Institutions ranked by research activity, not general reputation.
                      </p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="font-semibold text-gray-900 mb-2">🎯 Focused Search</div>
                      <p className="text-sm text-gray-700">
                        A curated list of target institutions for further research and applications.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Use Case 2: Find Collaborators */}
          <section id="collaboration" className="mb-16 scroll-mt-24">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-8 text-white">
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-5xl">🤝</div>
                  <div>
                    <h2 className="text-3xl font-bold">Use Case 2</h2>
                    <p className="text-xl text-purple-100">Identify Research Collaboration Opportunities</p>
                  </div>
                </div>
              </div>

              <div className="p-8">
                {/* The Problem */}
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                    <span className="bg-red-100 text-red-600 rounded-full w-8 h-8 flex items-center justify-center mr-3 text-lg">!</span>
                    The Problem
                  </h3>
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                    <p className="text-gray-700 italic">
                      "I'm at MIT studying cancer immunotherapy. I want to find nearby labs working on 
                      similar topics for potential collaborations, but I don't have a systematic way to 
                      identify which institutions in my area have active immunotherapy research programs."
                    </p>
                  </div>
                </div>

                {/* The Solution */}
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                    <span className="bg-green-100 text-green-600 rounded-full w-8 h-8 flex items-center justify-center mr-3 text-lg">✓</span>
                    The Solution
                  </h3>
                  <div className="bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-lg p-6">
                    <p className="text-gray-700 mb-4">
                      View all institutions in your city or region working on your research topic, ranked 
                      by research density. Perfect for identifying collaboration partners and attending 
                      local seminars.
                    </p>
                    
                    {/* Visual Representation */}
                    <div className="bg-white rounded-lg p-6 border border-gray-200">
                      <div className="text-center text-gray-500 mb-4">
                        <svg className="w-16 h-16 mx-auto mb-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                        </svg>
                        <p className="text-sm font-medium">City-Level Research Landscape</p>
                      </div>
                      <p className="text-xs text-gray-600 text-center">
                        Select Immunotherapy → Choose Boston → See all nearby institutions → 
                        Compare research density
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step-by-Step */}
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Step-by-Step Guide</h3>
                  <div className="space-y-4">
                    {[
                      {
                        step: 1,
                        title: 'Select your research field',
                        description: 'Choose the field you want to find collaborators in (e.g., Cancer Immunotherapy).',
                      },
                      {
                        step: 2,
                        title: 'Choose your city or nearby cities',
                        description: 'View research activity in your local area or cities you frequently visit.',
                      },
                      {
                        step: 3,
                        title: 'View institutions by research density',
                        description: 'See which nearby institutions have the most active research programs in your field.',
                      },
                      {
                        step: 4,
                        title: 'Identify potential collaboration partners',
                        description: 'Make a list of institutions to reach out to for seminars, joint projects, or shared resources.',
                      },
                      {
                        step: 5,
                        title: 'Reach out and build connections',
                        description: 'Use this information to attend local seminars, propose collaborations, or join multi-institutional projects.',
                      },
                    ].map((item) => (
                      <div key={item.step} className="flex gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                            {item.step}
                          </div>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">{item.title}</h4>
                          <p className="text-sm text-gray-600">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Try It Yourself */}
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Try It Yourself</h3>
                  <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-6 text-white">
                    <p className="mb-4">
                      Discover cancer immunotherapy research institutions in Boston and identify 
                      potential collaboration partners in your area.
                    </p>
                    <TrackedLink
                      href="/research-jobs/cancer-immunotherapy/city/boston"
                      trackingType="demo"
                      trackingSource="use_case_collaboration"
                      city="boston"
                      className="inline-block bg-white text-purple-600 font-semibold px-6 py-3 rounded-lg hover:bg-purple-50 transition-colors"
                    >
                      Find Immunotherapy Collaborators →
                    </TrackedLink>
                  </div>
                </div>

                {/* What You'll Get */}
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">What You'll Get</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <div className="font-semibold text-gray-900 mb-2">🗺️ Local Research Landscape</div>
                      <p className="text-sm text-gray-700">
                        Complete view of research activity in your city or region.
                      </p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <div className="font-semibold text-gray-900 mb-2">📈 Institution Comparisons</div>
                      <p className="text-sm text-gray-700">
                        Compare research output across nearby institutions.
                      </p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <div className="font-semibold text-gray-900 mb-2">🔗 Collaboration Opportunities</div>
                      <p className="text-sm text-gray-700">
                        Identify potential partners for joint projects and resources.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Use Case 3: Compare Cities */}
          <section id="compare-cities" className="mb-16 scroll-mt-24">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-orange-600 to-red-600 p-8 text-white">
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-5xl">🗺️</div>
                  <div>
                    <h2 className="text-3xl font-bold">Use Case 3</h2>
                    <p className="text-xl text-orange-100">Compare Cities for Your Research Area</p>
                  </div>
                </div>
              </div>

              <div className="p-8">
                {/* The Problem */}
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                    <span className="bg-red-100 text-red-600 rounded-full w-8 h-8 flex items-center justify-center mr-3 text-lg">!</span>
                    The Problem
                  </h3>
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                    <p className="text-gray-700 italic">
                      "I'm deciding between Boston, San Francisco, and New York for my postdoc. Which city 
                      has the strongest brain-computer interface (BCI) research community? I need data, not 
                      just reputation."
                    </p>
                  </div>
                </div>

                {/* The Solution */}
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                    <span className="bg-green-100 text-green-600 rounded-full w-8 h-8 flex items-center justify-center mr-3 text-lg">✓</span>
                    The Solution
                  </h3>
                  <div className="bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-lg p-6">
                    <p className="text-gray-700 mb-4">
                      Compare multiple cities side-by-side using objective metrics: researcher counts, 
                      institution density, and top labs. Make data-driven location decisions.
                    </p>
                    
                    {/* Comparison Table */}
                    <div className="bg-white rounded-lg p-6 border border-gray-200 overflow-x-auto">
                      <p className="text-sm font-medium text-gray-700 mb-4 text-center">Example: BCI Research Comparison</p>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-300">
                            <th className="text-left py-2 px-3 font-semibold text-gray-900">City</th>
                            <th className="text-center py-2 px-3 font-semibold text-gray-900">Researchers</th>
                            <th className="text-center py-2 px-3 font-semibold text-gray-900">Institutions</th>
                            <th className="text-left py-2 px-3 font-semibold text-gray-900">Top Labs</th>
                          </tr>
                        </thead>
                        <tbody className="text-gray-700">
                          <tr className="border-b border-gray-200">
                            <td className="py-2 px-3 font-medium">Boston</td>
                            <td className="text-center py-2 px-3">45</td>
                            <td className="text-center py-2 px-3">8</td>
                            <td className="py-2 px-3 text-xs">MIT, Harvard, Boston Univ</td>
                          </tr>
                          <tr className="border-b border-gray-200">
                            <td className="py-2 px-3 font-medium">San Francisco</td>
                            <td className="text-center py-2 px-3">32</td>
                            <td className="text-center py-2 px-3">6</td>
                            <td className="py-2 px-3 text-xs">Stanford, UCSF, Berkeley</td>
                          </tr>
                          <tr>
                            <td className="py-2 px-3 font-medium">New York</td>
                            <td className="text-center py-2 px-3">28</td>
                            <td className="text-center py-2 px-3">7</td>
                            <td className="py-2 px-3 text-xs">Columbia, NYU, Cornell</td>
                          </tr>
                        </tbody>
                      </table>
                      <p className="text-xs text-gray-500 mt-3 text-center">Data based on recent PubMed publications</p>
                    </div>
                  </div>
                </div>

                {/* Step-by-Step */}
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Step-by-Step Guide</h3>
                  <div className="space-y-4">
                    {[
                      {
                        step: 1,
                        title: 'Go to your field overview page',
                        description: 'Start with the global view of your research field (e.g., Brain-Computer Interface).',
                      },
                      {
                        step: 2,
                        title: 'Check the top cities ranking',
                        description: 'See which cities globally have the highest concentration of researchers in your field.',
                      },
                      {
                        step: 3,
                        title: 'Click each city for detailed view',
                        description: 'Dive into each city on your shortlist to see institution breakdowns and researcher counts.',
                      },
                      {
                        step: 4,
                        title: 'Compare institutions and density',
                        description: 'Look at not just total numbers, but also how research is distributed across institutions.',
                      },
                      {
                        step: 5,
                        title: 'Consider cost of living and fit',
                        description: 'Balance research strength with other factors like living costs, visa requirements, and quality of life.',
                      },
                    ].map((item) => (
                      <div key={item.step} className="flex gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-orange-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                            {item.step}
                          </div>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">{item.title}</h4>
                          <p className="text-sm text-gray-600">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Try It Yourself */}
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Try It Yourself</h3>
                  <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-lg p-6 text-white">
                    <p className="mb-4">
                      Start by exploring the global distribution of BCI research, then compare specific 
                      cities to find the best fit for your career goals.
                    </p>
                    <TrackedLink
                      href="/research-jobs/brain-computer-interface"
                      trackingType="demo"
                      trackingSource="use_case_compare"
                      className="inline-block bg-white text-orange-600 font-semibold px-6 py-3 rounded-lg hover:bg-orange-50 transition-colors"
                    >
                      Compare BCI Research Cities →
                    </TrackedLink>
                  </div>
                </div>

                {/* What You'll Get */}
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">What You'll Get</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <div className="font-semibold text-gray-900 mb-2">📊 Multi-City Comparison</div>
                      <p className="text-sm text-gray-700">
                        Objective data to compare research strength across cities.
                      </p>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <div className="font-semibold text-gray-900 mb-2">🏙️ Research Density Analysis</div>
                      <p className="text-sm text-gray-700">
                        Understand concentration vs. distribution of research activity.
                      </p>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <div className="font-semibold text-gray-900 mb-2">🎯 Informed Decision</div>
                      <p className="text-sm text-gray-700">
                        Make location choices based on data, not just reputation.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Tips Section */}
          <section className="mb-16">
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-8 border border-indigo-200">
              <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
                💡 5 Tips for Using ScholarMap Effectively
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white p-5 rounded-lg border border-indigo-200">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                    <span className="text-indigo-600 mr-2">1.</span>
                    Don't Only Focus on Top Cities
                  </h3>
                  <p className="text-sm text-gray-700">
                    High-density cities often have higher living costs and more competition. Consider 
                    emerging hubs with strong research programs and better quality of life.
                  </p>
                </div>

                <div className="bg-white p-5 rounded-lg border border-indigo-200">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                    <span className="text-indigo-600 mr-2">2.</span>
                    Look at Research Density, Not Just Total Numbers
                  </h3>
                  <p className="text-sm text-gray-700">
                    A city with 50 researchers across 3 institutions might offer a tighter research 
                    community than 100 researchers spread across 20 institutions.
                  </p>
                </div>

                <div className="bg-white p-5 rounded-lg border border-indigo-200">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                    <span className="text-indigo-600 mr-2">3.</span>
                    Explore Related Fields
                  </h3>
                  <p className="text-sm text-gray-700">
                    Cities strong in adjacent fields (e.g., neuroscience + AI) often provide the best 
                    opportunities for interdisciplinary collaborations.
                  </p>
                </div>

                <div className="bg-white p-5 rounded-lg border border-indigo-200">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                    <span className="text-indigo-600 mr-2">4.</span>
                    Use as a Starting Point
                  </h3>
                  <p className="text-sm text-gray-700">
                    ScholarMap helps you narrow down options. Follow up by checking lab websites, 
                    recent publications, and funding status for final decisions.
                  </p>
                </div>

                <div className="bg-white p-5 rounded-lg border border-indigo-200">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                    <span className="text-indigo-600 mr-2">5.</span>
                    Check Multiple Fields if You're Interdisciplinary
                  </h3>
                  <p className="text-sm text-gray-700">
                    If your work spans multiple areas, explore each field separately to find cities 
                    with strength across your interests.
                  </p>
                </div>

                <div className="bg-white p-5 rounded-lg border border-indigo-200">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                    <span className="text-indigo-600 mr-2">💬</span>
                    Combine with Other Resources
                  </h3>
                  <p className="text-sm text-gray-700">
                    Use ScholarMap alongside job boards, university career services, and your professional 
                    network for the most comprehensive search.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-8 text-white text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Explore?</h2>
            <p className="text-lg mb-6 text-blue-100 max-w-2xl mx-auto">
              Start discovering research opportunities in your field and make data-driven decisions 
              about your academic career.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/research-jobs" 
                className="inline-block bg-white text-blue-600 font-semibold px-8 py-3 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Browse Research Opportunities
              </Link>
              <Link 
                href="/auth/register" 
                className="inline-block bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg hover:bg-blue-800 transition-colors border-2 border-blue-400"
              >
                Create Free Account
              </Link>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}
