import { MetadataRoute } from 'next';
import { fetchWorldMap } from '@/lib/seoApi';
import { countryToSlug } from '@/lib/geoSlugs';

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

    return [...staticPages, ...countryPages];
  } catch (error) {
    console.error('Error generating sitemap:', error);
    // Return static pages only if API fails
    return staticPages;
  }
}

