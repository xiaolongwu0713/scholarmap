/**
 * Popular Research Fields Component
 * 
 * Displays links to top research field pages to improve SEO indexing
 * and provide quick navigation for users.
 */

import Link from 'next/link';

const POPULAR_FIELDS = [
  {
    slug: 'brain-computer-interface',
    name: 'Brain-Computer Interface',
    icon: '🧠',
    description: 'Neural interfaces, EEG, and direct brain communication systems',
  },
  {
    slug: 'crispr-gene-editing',
    name: 'CRISPR Gene Editing',
    icon: '🧬',
    description: 'CRISPR-Cas9 and genome editing technologies',
  },
  {
    slug: 'cancer-immunotherapy',
    name: 'Cancer Immunotherapy',
    icon: '💉',
    description: 'CAR-T, checkpoint inhibitors, and immune-based cancer treatments',
  },
  {
    slug: 'neural-modulation',
    name: 'Neural Modulation',
    icon: '⚡',
    description: 'tDCS, TMS, and non-invasive brain stimulation',
  },
  {
    slug: 'ai-drug-discovery',
    name: 'AI in Drug Discovery',
    icon: '🤖',
    description: 'Machine learning for computational drug design',
  },
];

export function PopularResearchFields() {
  return (
    <section className="py-16 bg-white" id="research-fields">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Popular Research Fields
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Explore biomedical research opportunities in cutting-edge fields
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {POPULAR_FIELDS.map((field) => (
            <Link
              key={field.slug}
              href={`/research-jobs/${field.slug}`}
              className="group block p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                <div className="text-4xl flex-shrink-0">{field.icon}</div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {field.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {field.description}
                  </p>
                  <div className="inline-flex items-center text-blue-600 text-sm font-medium group-hover:gap-2 transition-all">
                    Explore researchers
                    <svg
                      className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform"
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
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link
            href="/research-jobs"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
          >
            View all research areas
            <svg
              className="w-4 h-4 ml-1"
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
          </Link>
        </div>
      </div>
    </section>
  );
}
