/**
 * Top Countries Component
 * 
 * Displays links to top research country pages to improve SEO indexing
 * and provide quick navigation for users.
 */

import Link from 'next/link';

const TOP_COUNTRIES = [
  { slug: 'united-states', name: 'United States', icon: '🇺🇸', researchers: '15,000+' },
  { slug: 'china', name: 'China', icon: '🇨🇳', researchers: '12,000+' },
  { slug: 'united-kingdom', name: 'United Kingdom', icon: '🇬🇧', researchers: '8,500+' },
  { slug: 'germany', name: 'Germany', icon: '🇩🇪', researchers: '7,200+' },
  { slug: 'italy', name: 'Italy', icon: '🇮🇹', researchers: '6,800+' },
  { slug: 'canada', name: 'Canada', icon: '🇨🇦', researchers: '5,400+' },
  { slug: 'spain', name: 'Spain', icon: '🇪🇸', researchers: '4,900+' },
  { slug: 'australia', name: 'Australia', icon: '🇦🇺', researchers: '4,600+' },
  { slug: 'france', name: 'France', icon: '🇫🇷', researchers: '4,200+' },
  { slug: 'japan', name: 'Japan', icon: '🇯🇵', researchers: '3,800+' },
  { slug: 'netherlands', name: 'Netherlands', icon: '🇳🇱', researchers: '3,500+' },
  { slug: 'switzerland', name: 'Switzerland', icon: '🇨🇭', researchers: '3,200+' },
];

export function TopCountries() {
  return (
    <section className="py-16 bg-gradient-to-b from-white to-gray-50" id="top-countries">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Explore Research by Country
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Discover biomedical research opportunities and collaboration networks worldwide
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-6xl mx-auto mb-8">
          {TOP_COUNTRIES.map((country) => (
            <Link
              key={country.slug}
              href={`/research-jobs/country/${country.slug}`}
              className="group block p-5 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all duration-300"
            >
              <div className="flex flex-col items-center text-center gap-2">
                <div className="text-4xl mb-1">{country.icon}</div>
                <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {country.name}
                </h3>
                <p className="text-sm text-gray-600">{country.researchers}</p>
                <div className="inline-flex items-center text-blue-600 text-xs font-medium mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  View details
                  <svg
                    className="w-3 h-3 ml-1 group-hover:translate-x-0.5 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/research-jobs"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium text-lg"
          >
            Explore all countries and cities
            <svg
              className="w-5 h-5 ml-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
