import { SITE_URL, DEMO_RUN_PATH } from '@/lib/site';
import { MetadataRoute } from 'next';
import { fetchWorldMap, fetchCountryMap } from '@/lib/seoApi';
import { countryToSlug, cityToSlug, isInvalidCityName } from '@/lib/geoSlugs';
import { fetchFieldSitemapData, topFieldCitySlugs } from '@/lib/seoFieldApi';


export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;
  const currentDate = new Date().toISOString();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/research-jobs`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about/methodology`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/use-cases`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/for-industry`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    ...['terms', 'privacy', 'refund'].map((path) => ({
      url: `${baseUrl}/${path}`,
      lastModified: currentDate,
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    })),
    {
      url: `${baseUrl}${DEMO_RUN_PATH}`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/projects`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.6,
    },
  ];

  try {
    // Fetch all countries from demo run
    const countries = await fetchWorldMap();
    
    // Generate country pages (all countries with data)
    const countryPages: MetadataRoute.Sitemap = countries.map((country) => ({
      url: `${baseUrl}/research-jobs/country/${countryToSlug(country.country)}`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    // Generate city pages (top 200 cities globally)
    const allCities: Array<{ city: string; country: string; scholar_count: number }> = [];
    
    // Fetch cities from top 30 countries (to limit API calls)
    const topCountries = countries
      .sort((a, b) => b.scholar_count - a.scholar_count)
      .slice(0, 30);

    // Use Promise.all for parallel requests, but limit concurrency
    const BATCH_SIZE = 5;
    for (let i = 0; i < topCountries.length; i += BATCH_SIZE) {
      const batch = topCountries.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async (country) => {
          try {
            const cities = await fetchCountryMap(country.country);
            // Filter out invalid city names
            return cities
              .filter(city => !isInvalidCityName(city.city))
              .map(city => ({
                city: city.city,
                country: country.country,
                scholar_count: city.scholar_count,
              }));
          } catch (error) {
            console.error(`Error fetching cities for ${country.country}:`, error);
            return [];
          }
        })
      );
      
      results.forEach(cityList => {
        allCities.push(...cityList);
      });
    }

    // Sort by scholar count and take top 200
    const topCities = allCities
      .sort((a, b) => b.scholar_count - a.scholar_count)
      .slice(0, 200);

    // Filter out invalid city names before generating URLs
    const validCities = topCities.filter(city => !isInvalidCityName(city.city));
    
    const cityPages: MetadataRoute.Sitemap = validCities.map((city) => ({
      url: `${baseUrl}/research-jobs/city/${cityToSlug(city.city)}`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

    // Generate field-specific pages
    const fieldPages: MetadataRoute.Sitemap = [];
    const fieldCountryPages: MetadataRoute.Sitemap = [];
    const fieldCityPages: MetadataRoute.Sitemap = [];

    try {
      for (const field of await fetchFieldSitemapData()) {
        fieldPages.push({
          url: `${baseUrl}/research-jobs/${field.slug}`,
          lastModified: currentDate,
          changeFrequency: 'weekly',
          priority: 0.8,
        });
        for (const country of field.countries) {
          fieldCountryPages.push({
            url: `${baseUrl}/research-jobs/${field.slug}/country/${countryToSlug(country.country)}`,
            lastModified: currentDate,
            changeFrequency: 'weekly',
            priority: 0.75,
          });
        }
        for (const citySlug of topFieldCitySlugs(field)) {
          fieldCityPages.push({
            url: `${baseUrl}/research-jobs/${field.slug}/city/${citySlug}`,
            lastModified: currentDate,
            changeFrequency: 'weekly',
            priority: 0.7,
          });
        }
      }
    } catch (error) {
      console.error('Error generating field-specific sitemap entries:', error);
    }

    return [
      ...staticPages,
      ...countryPages,
      ...cityPages,
      ...fieldPages,
      ...fieldCountryPages,
      ...fieldCityPages,
    ];
  } catch (error) {
    console.error('Error generating sitemap:', error);
    // Return static pages only if API fails
    return staticPages;
  }
}

