'use client';

import { useState } from 'react';
import Link from 'next/link';
import { countryToSlug } from '@/lib/geoSlugs';

interface Country {
  country: string;
  scholar_count: number;
  institution_count: number;
}

interface CountryCardsGridProps {
  countries: Country[];
}

export function CountryCardsGrid({ countries }: CountryCardsGridProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Show 3 rows worth of cards by default
  // Grid is: 2 cols (mobile), 3 cols (tablet), 4 cols (laptop), 5 cols (xl)
  // We'll use 15 as a reasonable default (3 rows × 5 cols on large screens)
  const defaultCount = 15;
  const displayedCountries = isExpanded ? countries : countries.slice(0, defaultCount);
  const hasMore = countries.length > defaultCount;

  return (
    <div className="mb-12">
      <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
        Browse Research by Country (Neural Modulation As An Example)
      </h2>
      
      {/* Responsive grid: 2 cols on mobile, 3 on tablet, 4 on desktop, 5 on large screens */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {displayedCountries.map((country) => {
          const slug = countryToSlug(country.country);
          return (
            <Link
              key={country.country}
              href={`/research-jobs/country/${slug}`}
              className="block bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 p-4 border border-gray-200 hover:border-blue-400 hover:-translate-y-1"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-2 min-h-[3rem]">
                {country.country}
              </h3>
              <div className="space-y-1.5 text-sm text-gray-600">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Scholars:</span>
                  <span className="font-bold text-blue-600 text-base">
                    {country.scholar_count.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Institutions:</span>
                  <span className="font-semibold text-gray-700 text-base">
                    {country.institution_count.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="mt-3 text-blue-600 hover:text-blue-700 font-medium text-sm">
                Explore →
              </div>
            </Link>
          );
        })}
      </div>

      {/* Expand/Collapse Button */}
      {hasMore && (
        <div className="flex justify-center mt-8">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3.5 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg"
          >
            <span className="text-base">{isExpanded ? 'Collapse' : 'Expand'}</span>
            <svg 
              className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {!isExpanded && (
              <span className="text-sm text-blue-100">({countries.length} countries)</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
