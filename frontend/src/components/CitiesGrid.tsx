'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cityToSlug } from '@/lib/geoSlugs';

interface City {
  city: string;
  scholar_count: number;
  institution_count: number;
}

interface CitiesGridProps {
  cities: City[];
  countryName: string;
}

export function CitiesGrid({ cities, countryName }: CitiesGridProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Show 3 rows worth of cards by default (15 cities for 5 cols on xl screens)
  const defaultCount = 15;
  const displayedCities = isExpanded ? cities : cities.slice(0, defaultCount);
  const hasMore = cities.length > defaultCount;

  return (
    <div>
      {/* Cities Grid - Compact Card Layout */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {displayedCities.map((city) => {
          const citySlug = cityToSlug(city.city);
          return (
            <Link
              key={city.city}
              href={`/research-jobs/city/${citySlug}`}
              className="block bg-white rounded-lg p-4 border border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <h3 className="text-base font-semibold text-gray-900 mb-3 line-clamp-2 min-h-[3rem]">
                {city.city}
              </h3>
              <div className="space-y-1.5 text-xs text-gray-600">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Scholars:</span>
                  <span className="font-bold text-blue-600">
                    {city.scholar_count.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Institutions:</span>
                  <span className="font-semibold text-gray-700">
                    {city.institution_count.toLocaleString()}
                  </span>
                </div>
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
              <span className="text-sm text-blue-100">({cities.length} cities)</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
