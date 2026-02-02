import { MetadataRoute } from 'next';
import { fetchWorldMap, fetchCountryMap } from '@/lib/seoApi';
import { countryToSlug, cityToSlug, isInvalidCityName } from '@/lib/geoSlugs';
import { getAllFieldConfigs } from '@/lib/seoFieldConfig';
import { fetchFieldWorldData, fetchFieldCountryData } from '@/lib/seoFieldApi';

const DEMO_PROJECT_ID = '6af7ac1b6254';
const DEMO_RUN_ID = '53e099cdb74e';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://scholarmap-frontend.onrender.com';
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
      url: `${baseUrl}/projects/${DEMO_PROJECT_ID}/runs/${DEMO_RUN_ID}`,
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
      const fields = getAllFieldConfigs();
      
      for (const field of fields) {
        // Field overview page
        fieldPages.push({
          url: `${baseUrl}/research-jobs/${field.slug}`,
          lastModified: currentDate,
          changeFrequency: 'weekly',
          priority: 0.8,
        });

        try {
          // Get top 10 countries for this field
          const fieldWorldData = await fetchFieldWorldData(field.slug);
          const topFieldCountries = fieldWorldData
            .sort((a: any, b: any) => b.scholar_count - a.scholar_count)
            .slice(0, 10);

          // Generate field × country pages
          const fieldCitySet = new Set<string>(); // Track unique cities to avoid duplicates
          
          for (const country of topFieldCountries) {
            fieldCountryPages.push({
              url: `${baseUrl}/research-jobs/${field.slug}/country/${countryToSlug(country.country)}`,
              lastModified: currentDate,
              changeFrequency: 'weekly',
              priority: 0.75,
            });

            try {
              // Get top 5 cities for this field × country
              const fieldCities = await fetchFieldCountryData(field.slug, country.country);
              const topFieldCities = fieldCities
                .sort((a: any, b: any) => b.scholar_count - a.scholar_count)
                .slice(0, 5);

              // Collect cities for later aggregation (don't add URLs yet)
              for (const city of topFieldCities) {
                // Skip cities with no data, invalid names, or institution names
                if (!city.city || city.scholar_count === 0 || isInvalidCityName(city.city)) {
                  continue;
                }
                
                const citySlug = cityToSlug(city.city);
                // Track city with its count for later sorting
                if (!fieldCitySet.has(citySlug)) {
                  fieldCitySet.add(citySlug);
                  // Store city info for sorting
                  (fieldCityPages as any).tempCities = (fieldCityPages as any).tempCities || [];
                  (fieldCityPages as any).tempCities.push({
                    citySlug,
                    scholarCount: city.scholar_count,
                  });
                }
              }
            } catch (error) {
              console.error(`Error fetching cities for field ${field.slug} in ${country.country}:`, error);
            }
          }
          
          // After collecting all cities from all countries, take only top 5 globally
          if ((fieldCityPages as any).tempCities) {
            const topGlobalCities = (fieldCityPages as any).tempCities
              .sort((a: any, b: any) => b.scholarCount - a.scholarCount)
              .slice(0, 5);
            
            topGlobalCities.forEach((city: any) => {
              fieldCityPages.push({
                url: `${baseUrl}/research-jobs/${field.slug}/city/${city.citySlug}`,
                lastModified: currentDate,
                changeFrequency: 'weekly',
                priority: 0.7,
              });
            });
            
            // Clean up temp data
            delete (fieldCityPages as any).tempCities;
          }
        } catch (error) {
          console.error(`Error generating field pages for ${field.slug}:`, error);
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

