import { Metadata } from 'next';
import Link from 'next/link';
import { UnifiedNavbar } from '@/components/UnifiedNavbar';
import { Footer } from '@/components/landing/Footer';

export const metadata: Metadata = {
  title: 'About ScholarMap - Biomedical Research Network Mapping',
  description: 'Learn about ScholarMap\'s mission to make biomedical research networks transparent and accessible. Discover how we help researchers find collaborations and opportunities worldwide.',
  keywords: [
    'about scholarmap',
    'biomedical research mapping',
    'academic collaboration',
    'research network',
    'PubMed visualization',
  ],
};

export default function AboutPage() {
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
            <span className="text-gray-900 font-medium">About</span>
          </nav>

          {/* Header */}
          <header className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              About ScholarMap
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              Making biomedical research networks transparent and accessible to researchers worldwide
            </p>
          </header>

          {/* Main Content */}
          <div className="space-y-12">
            {/* Mission Section */}
            <section>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <p className="text-lg text-gray-700 leading-relaxed mb-4">
                  ScholarMap helps biomedical researchers discover global research opportunities by 
                  visualizing PubMed data geographically.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  We believe that understanding where research happens—by field and location—empowers 
                  researchers to make better decisions about collaborations, career moves, and research 
                  directions. By making this information freely accessible and easy to explore, we aim 
                  to strengthen the global biomedical research community.
                </p>
              </div>
            </section>

            {/* Who We Are */}
            <section>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Who We Are</h2>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <p className="text-gray-700 leading-relaxed mb-6">
                  ScholarMap is built by researchers who have experienced firsthand the challenges of 
                  navigating the global biomedical research landscape. As a neural engineering researcher 
                  searching for postdoc positions and collaboration opportunities, I found myself spending 
                  countless hours manually searching university websites and relying on incomplete rankings. 
                  I realized that the data already existed in PubMed—it just needed to be organized and 
                  visualized geographically. ScholarMap was born from this need.
                </p>

                {/* Core Team Member */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200 mb-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">
                        Dr. Xiaolong "Long" Wu
                      </h3>
                      <p className="text-blue-600 font-semibold mb-4">Lead Developer & Researcher</p>
                      
                      {/* Current Position */}
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                          </svg>
                          <span className="text-gray-700 font-semibold">Current Position</span>
                        </div>
                        <p className="text-gray-700 ml-7">
                          <strong>Postdoctoral Scholar</strong>, Northwestern University
                          <br />
                          <span className="text-sm text-gray-600">
                            710 N Lake Shore Drive, Chicago, IL 60611, United States
                          </span>
                        </p>
                      </div>

                      {/* Education */}
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/>
                          </svg>
                          <span className="text-gray-700 font-semibold">Education</span>
                        </div>
                        <div className="ml-7 space-y-2 text-gray-700">
                          <div>
                            <p><strong>PhD in Electronic & Electrical Engineering</strong></p>
                            <p className="text-sm text-gray-600">University of Bath, UK (2020-2024)</p>
                          </div>
                          <div>
                            <p><strong>MS in Environmental and Engineering Geophysics</strong></p>
                            <p className="text-sm text-gray-600">China University of Geosciences (2010-2013)</p>
                          </div>
                          <div>
                            <p><strong>BS in Geophysics</strong></p>
                            <p className="text-sm text-gray-600">China University of Geosciences (2006-2010)</p>
                          </div>
                        </div>
                      </div>

                      {/* Research Interests */}
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"/>
                          </svg>
                          <span className="text-gray-700 font-semibold">Research Interests</span>
                        </div>
                        <ul className="ml-7 space-y-1 text-gray-700 text-sm">
                          <li>• Brain-Computer Interfaces (BCIs) - Motor and Speech BCIs</li>
                          <li>• Closed-loop Brain Stimulation (EEG + TMS)</li>
                          <li>• Neural Engineering and Intracranial Signal Processing</li>
                          <li>• Deep Learning for Biomedical Applications</li>
                        </ul>
                      </div>

                      {/* Why This Matters */}
                      <div className="bg-white p-4 rounded-lg border border-blue-200 mb-4">
                        <h4 className="font-semibold text-gray-800 mb-2">Why This Background Matters</h4>
                        <p className="text-sm text-gray-700">
                          Having navigated the academic job market across multiple countries and fields, 
                          I understand the frustration of not having a clear view of where research is 
                          happening globally. My experience in neural engineering research, combined with 
                          technical skills in data processing and visualization, enabled me to create a 
                          tool that addresses this gap for the entire biomedical research community.
                        </p>
                      </div>

                      {/* Links */}
                      <div className="flex flex-wrap gap-3">
                        <a
                          href="https://sites.northwestern.edu/neuromodlab/team/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd"/>
                          </svg>
                          Lab Profile
                        </a>
                        <a
                          href="/downloads/xiaolong_wu_cv.pdf"
                          download
                          className="inline-flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd"/>
                          </svg>
                          Download CV
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Future Vision */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h4 className="font-semibold text-gray-800 mb-2">Building for the Community</h4>
                  <p className="text-sm text-gray-700">
                    ScholarMap is more than just a tool—it's a growing platform built by researchers, 
                    for researchers. We're continually expanding our coverage, improving our algorithms, 
                    and adding new features based on feedback from the research community. If you have 
                    ideas or want to contribute, we'd love to hear from you.
                  </p>
                </div>
              </div>
            </section>

            {/* Why We Built This */}
            <section>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Why We Built This</h2>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <p className="text-gray-700 leading-relaxed mb-4">
                  Finding the right research opportunities—whether for postdoc positions, collaborations, 
                  or understanding the global landscape of a field—has traditionally been challenging and 
                  time-consuming. Researchers often rely on word-of-mouth, rankings that don't reflect 
                  specific field strengths, or manual searches through countless university websites.
                </p>
                <p className="text-gray-700 leading-relaxed mb-4">
                  We realized that PubMed, which indexes over 36 million biomedical publications, contains 
                  rich geographic information in author affiliations. By systematically extracting and 
                  organizing this data, we could create a powerful tool to answer questions like:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4 mb-4">
                  <li>Which cities have the strongest research activity in CRISPR gene editing?</li>
                  <li>Where are the emerging hubs for cancer immunotherapy research?</li>
                  <li>Which institutions in Boston are working on brain-computer interfaces?</li>
                  <li>How does research density in my field compare across different countries?</li>
                </ul>
                <p className="text-gray-700 leading-relaxed">
                  ScholarMap makes these insights accessible through interactive visualizations and 
                  comprehensive geographic breakdowns.
                </p>
              </div>
            </section>

            {/* What We Offer */}
            <section>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">What We Offer</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
                  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Geographic Mapping</h3>
                  <p className="text-gray-700">
                    Visualize research distribution across countries, cities, and institutions based 
                    on actual publication data from PubMed.
                  </p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-teal-50 p-6 rounded-lg border border-green-200">
                  <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"/>
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Field-Specific Views</h3>
                  <p className="text-gray-700">
                    Explore research landscapes for specific fields like CRISPR, immunotherapy, 
                    brain-computer interfaces, and more.
                  </p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-lg border border-purple-200">
                  <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Institution Insights</h3>
                  <p className="text-gray-700">
                    Discover which institutions are most active in specific research areas and 
                    compare their research output.
                  </p>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-red-50 p-6 rounded-lg border border-orange-200">
                  <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd"/>
                      <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z"/>
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Career Planning</h3>
                  <p className="text-gray-700">
                    Make informed decisions about postdoc applications, relocations, and career 
                    moves based on research activity data.
                  </p>
                </div>
              </div>
            </section>

            {/* How It Works */}
            <section>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">How It Works</h2>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <p className="text-gray-700 leading-relaxed mb-4">
                  ScholarMap processes data from PubMed to create geographic visualizations of research 
                  networks. Our methodology is fully transparent:
                </p>
                <ol className="list-decimal list-inside text-gray-700 space-y-3 ml-4 mb-6">
                  <li>
                    <strong>Data Collection:</strong> We query PubMed for publications in specific research 
                    fields (2020-2025)
                  </li>
                  <li>
                    <strong>Geographic Extraction:</strong> We parse author affiliations to identify institutions, 
                    cities, and countries
                  </li>
                  <li>
                    <strong>Quality Assurance:</strong> We validate and clean the data through automated and 
                    manual processes
                  </li>
                  <li>
                    <strong>Visualization:</strong> We create interactive maps and statistics to help you explore 
                    the data
                  </li>
                </ol>
                <Link 
                  href="/about/methodology" 
                  className="inline-block bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Read Our Full Methodology →
                </Link>
              </div>
            </section>

            {/* Contact Section */}
            <section>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Get in Touch</h2>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-8 rounded-lg border border-blue-200">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">Contact Information</h3>
                    <div className="space-y-3">
                      <div className="flex items-center text-gray-700">
                        <svg className="w-5 h-5 mr-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                          <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                        </svg>
                        <span>contact@scholarmap.org</span>
                      </div>
                      <div className="flex items-center text-gray-700">
                        <svg className="w-5 h-5 mr-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd"/>
                        </svg>
                        <a href="https://github.com/scholarmap" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
                          GitHub
                        </a>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">We'd Love to Hear From You</h3>
                    <p className="text-gray-700 text-sm leading-relaxed mb-3">
                      Whether you have feedback, questions, or suggestions for improving ScholarMap, 
                      we're always eager to connect with the research community.
                    </p>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      Found an error in the data? Have an idea for a new feature? Let us know!
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* CTA Section */}
            <section className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-8 text-white text-center">
              <h2 className="text-3xl font-bold mb-4">Start Exploring</h2>
              <p className="text-lg mb-6 text-blue-100">
                Discover research opportunities in your field and connect with the global biomedical community.
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
        </div>
      </main>

      <Footer />
    </>
  );
}
