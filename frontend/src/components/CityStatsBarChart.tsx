interface CityStat {
  city: string;
  scholar_count: number;
  institution_count: number;
}

interface CityStatsBarChartProps {
  cities: CityStat[];
  maxCities?: number;
}

export function CityStatsBarChart({ cities, maxCities = 5 }: CityStatsBarChartProps) {
  const topCities = cities.slice(0, maxCities);
  const maxValue = Math.max(
    1,
    ...topCities.map((city) => Math.max(city.scholar_count, city.institution_count))
  );

  if (topCities.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-600">
        No city data available yet.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-gray-600">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-6 rounded-sm bg-blue-600" aria-hidden="true" />
          Scholars
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-6 rounded-sm bg-emerald-500" aria-hidden="true" />
          Institutions
        </span>
      </div>

      <div className="mt-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 items-end">
          {topCities.map((city) => {
            const scholarHeight = Math.round((city.scholar_count / maxValue) * 100);
            const institutionHeight = Math.round((city.institution_count / maxValue) * 100);

            return (
              <div key={city.city} className="flex flex-col items-center gap-3">
                <div className="flex items-end justify-center gap-4 h-40 w-full">
                  <div className="h-full flex flex-col items-center justify-end w-8">
                    <div className="text-[11px] font-semibold text-blue-700 mb-1">
                      {city.scholar_count.toLocaleString()}
                    </div>
                    <div
                      className="w-full rounded-t-md bg-blue-600"
                      style={{ height: `${scholarHeight}%`, minHeight: '4px' }}
                      aria-label={`${city.city} scholars`}
                      title={`${city.scholar_count.toLocaleString()} scholars`}
                    />
                  </div>
                  <div className="h-full flex flex-col items-center justify-end w-8">
                    <div className="text-[11px] font-semibold text-emerald-700 mb-1">
                      {city.institution_count.toLocaleString()}
                    </div>
                    <div
                      className="w-full rounded-t-md bg-emerald-500"
                      style={{ height: `${institutionHeight}%`, minHeight: '4px' }}
                      aria-label={`${city.city} institutions`}
                      title={`${city.institution_count.toLocaleString()} institutions`}
                    />
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-gray-900">{city.city}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 text-xs text-gray-500 text-center">
          Scholars and Instituition counts for top 5 cities.
        </div>
      </div>
    </div>
  );
}
