/**
 * HTML Sitemap Page
 * 
 * Human-readable sitemap to help users and search engines discover all pages.
 * This complements the XML sitemap and improves indexing speed.
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { UnifiedNavbar } from '@/components/UnifiedNavbar';
import { Footer } from '@/components/landing/Footer';
import { getAllFieldConfigs } from '@/lib/seoFieldConfig';

export const metadata: Metadata = {
  title: 'Sitemap | ScholarMap',
  description: 'Complete sitemap of ScholarMap - explore all research fields, countries, and cities.',
};

export default function SitemapPage() {
  const fields = getAllFieldConfigs();

  return (
    <>
      <UnifiedNavbar variant="landing" />
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="container mx-auto px-4 py-12 max-w-6xl">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Sitemap</h1>
          
          {/* Main Pages */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Main Pages</h2>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-blue-600 hover:underline">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/research-jobs" className="text-blue-600 hover:underline">
                  Research Jobs by Country
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-blue-600 hover:underline">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/about/methodology" className="text-blue-600 hover:underline">
                  Methodology
                </Link>
              </li>
              <li>
                <Link href="/use-cases" className="text-blue-600 hover:underline">
                  Use Cases
                </Link>
              </li>
            </ul>
          </section>

          {/* Research Fields */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Research Fields</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fields.map((field) => (
                <div key={field.slug} className="bg-white p-4 rounded-lg border border-gray-200">
                  <Link
                    href={`/research-jobs/${field.slug}`}
                    className="text-lg font-semibold text-blue-600 hover:underline mb-2 block"
                  >
                    {field.name}
                  </Link>
                  <p className="text-sm text-gray-600 mb-3">{field.description}</p>
                  <div className="space-y-1 text-sm">
                    <div>
                      <Link
                        href={`/research-jobs/${field.slug}/country/united-states`}
                        className="text-blue-500 hover:underline"
                      >
                        {field.name} in United States
                      </Link>
                    </div>
                    <div>
                      <Link
                        href={`/research-jobs/${field.slug}/country/china`}
                        className="text-blue-500 hover:underline"
                      >
                        {field.name} in China
                      </Link>
                    </div>
                    <div>
                      <Link
                        href={`/research-jobs/${field.slug}/city/boston`}
                        className="text-blue-500 hover:underline"
                      >
                        {field.name} in Boston
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Top Countries */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Top Research Countries</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                'China', 'United States', 'Italy', 'Germany', 'Canada',
                'Australia', 'United Kingdom', 'Spain', 'Switzerland', 'Netherlands',
                'Brazil', 'India', 'Japan', 'Mexico', 'Finland',
              ].map((country) => (
                <Link
                  key={country}
                  href={`/research-jobs/country/${country.toLowerCase().replace(/\s+/g, '-')}`}
                  className="text-blue-600 hover:underline"
                >
                  {country}
                </Link>
              ))}
            </div>
          </section>

          {/* Top Cities */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Top Research Cities</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                'Beijing', 'Boston', 'Shanghai', 'Rome', 'Toronto',
                'New York', 'London', 'Sydney', 'Paris', 'Berlin',
                'Tokyo', 'Singapore', 'San Francisco', 'Chicago', 'Los Angeles',
              ].map((city) => (
                <Link
                  key={city}
                  href={`/research-jobs/city/${city.toLowerCase().replace(/\s+/g, '-')}`}
                  className="text-blue-600 hover:underline"
                >
                  {city}
                </Link>
              ))}
            </div>
          </section>

          {/* Note */}
          <section className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <p className="text-sm text-gray-700">
              <strong>Note:</strong> This sitemap shows the main pages and popular destinations. 
              For a complete list of all pages, see our{' '}
              <a
                href="/sitemap.xml"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                XML sitemap
              </a>
              .
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </>
  );
}
