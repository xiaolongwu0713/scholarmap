'use client';

import { useState } from 'react';
import { CityMapInstitution } from '@/lib/seoApi';
import { TrackedLink } from './TrackedLink';

interface CityInstitutionsGridProps {
  institutions: CityMapInstitution[];
  city: string;
  country: string;
}

export function CityInstitutionsGrid({ institutions, city, country }: CityInstitutionsGridProps) {
  const [showAll, setShowAll] = useState(false);
  const displayCount = showAll ? institutions.length : Math.min(12, institutions.length);
  const displayedInstitutions = institutions.slice(0, displayCount);
  const hasMore = institutions.length > 12;

  if (institutions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No institution data available for {city}.
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {displayedInstitutions.map((institution, index) => (
          <div
            key={`${institution.institution}-${index}`}
            className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-5 border border-blue-200 hover:shadow-lg transition-shadow"
          >
            <h3 className="font-semibold text-gray-900 mb-2 text-sm leading-tight">
              {institution.institution}
            </h3>
            <div className="flex items-center text-sm text-gray-700">
              <svg className="w-4 h-4 mr-1 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
              <span className="font-medium">{institution.scholar_count}</span>
              <span className="ml-1">researchers</span>
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
          >
            {showAll ? (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
                Show Less
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                Show All {institutions.length} Institutions
              </>
            )}
          </button>
        </div>
      )}

      <div className="mt-8 p-5 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-700">
          <strong>Note:</strong> Institution counts represent researchers publishing from {city}, {country} in 
          biomedical and life sciences journals indexed in PubMed. Actual research capacity may include 
          additional laboratories and facilities not captured in publication data.
        </p>
      </div>
    </div>
  );
}
