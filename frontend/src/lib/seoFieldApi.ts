/**
 * SEO Field-Specific API Helper Functions
 * 
 * This file provides helper functions to fetch data for field-specific pages
 * using the field configurations from seoFieldConfig.ts
 */

import { getReadyFieldConfig, getReadyFieldConfigs, type FieldConfig } from './seoFieldConfig';
import { API_URL } from './site';
import { cityToSlug, countryToSlug, isInvalidCityName } from './geoSlugs';

const API_BASE_URL = API_URL;

export interface FieldSitemapEntry {
  slug: string;
  countries: Array<{ country: string; scholar_count: number }>;
  cities: Array<{ country: string; city: string; scholar_count: number }>;
}

/**
 * Top countries and cities of every ready field in one request.
 * Used for the sitemap and static params, which would otherwise make hundreds of map calls.
 */
export async function fetchFieldSitemapData(): Promise<FieldSitemapEntry[]> {
  const response = await fetch(`${API_BASE_URL}/api/seo/sitemap`, {
    next: { revalidate: 3600 },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch field sitemap data: ${response.statusText}`);
  }
  const json = await response.json();
  return json.fields || [];
}

/**
 * Fields whose page for this city or country exists (it's among the field's top places),
 * for cross-links from the general city/country pages. Empty if the backend is unreachable.
 */
export async function fieldsWithPlace(
  place: { citySlug: string } | { countrySlug: string },
  limit: number = 6
): Promise<FieldConfig[]> {
  try {
    const [configs, entries] = await Promise.all([getReadyFieldConfigs(), fetchFieldSitemapData()]);
    const hasPlace = (entry: FieldSitemapEntry) =>
      'citySlug' in place
        ? entry.cities.some((c) => !isInvalidCityName(c.city) && cityToSlug(c.city) === place.citySlug)
        : entry.countries.some((c) => countryToSlug(c.country) === place.countrySlug);
    return configs
      .filter((config) => entries.some((entry) => entry.slug === config.slug && hasPlace(entry)))
      .slice(0, limit);
  } catch (error) {
    console.error('Could not load field cross-links:', error);
    return [];
  }
}

/** A field's top cities that have a valid name, one per URL slug. */
export function topFieldCitySlugs(entry: FieldSitemapEntry, limit: number = 5): string[] {
  const slugs: string[] = [];
  for (const city of entry.cities) {
    if (isInvalidCityName(city.city)) continue;
    const slug = cityToSlug(city.city);
    if (!slugs.includes(slug)) slugs.push(slug);
    if (slugs.length === limit) break;
  }
  return slugs;
}

/**
 * Fetch world map data for a specific research field
 */
export async function fetchFieldWorldData(fieldSlug: string, minConfidence: string = 'low') {
  const config = await getReadyFieldConfig(fieldSlug);
  if (!config) {
    throw new Error(`Invalid field slug: ${fieldSlug}`);
  }

  const url = `${API_BASE_URL}/api/projects/${config.projectId}/runs/${config.runId}/map/world?min_confidence=${minConfidence}`;
  
  const response = await fetch(url, {
    next: { revalidate: 86400 } // 24 hour cache
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch field world data: ${response.statusText}`);
  }
  
  const json = await response.json();
  return json.data || [];
}

/**
 * Fetch country map data for a specific research field
 */
export async function fetchFieldCountryData(
  fieldSlug: string, 
  country: string, 
  minConfidence: string = 'low'
) {
  const config = await getReadyFieldConfig(fieldSlug);
  if (!config) {
    throw new Error(`Invalid field slug: ${fieldSlug}`);
  }

  const url = `${API_BASE_URL}/api/projects/${config.projectId}/runs/${config.runId}/map/country/${encodeURIComponent(country)}?min_confidence=${minConfidence}`;
  
  const response = await fetch(url, {
    next: { revalidate: 86400 } // 24 hour cache
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch field country data: ${response.statusText}`);
  }
  
  const json = await response.json();
  return json.data || [];
}

/**
 * Fetch city map data for a specific research field
 */
export async function fetchFieldCityData(
  fieldSlug: string,
  country: string,
  city: string,
  minConfidence: string = 'low'
) {
  const config = await getReadyFieldConfig(fieldSlug);
  if (!config) {
    throw new Error(`Invalid field slug: ${fieldSlug}`);
  }

  const url = `${API_BASE_URL}/api/projects/${config.projectId}/runs/${config.runId}/map/city/${encodeURIComponent(country)}/${encodeURIComponent(city)}?min_confidence=${minConfidence}`;
  
  const response = await fetch(url, {
    next: { revalidate: 86400 } // 24 hour cache
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch field city data: ${response.statusText}`);
  }
  
  const json = await response.json();
  return json.data || [];
}

/**
 * Fetch institution scholars for a specific research field
 */
export async function fetchFieldInstitutionScholars(
  fieldSlug: string,
  institution: string,
  country: string,
  city: string,
  minConfidence: string = 'low'
) {
  const config = await getReadyFieldConfig(fieldSlug);
  if (!config) {
    throw new Error(`Invalid field slug: ${fieldSlug}`);
  }

  const params = new URLSearchParams({
    institution,
    country,
    city,
    min_confidence: minConfidence,
  });

  const url = `${API_BASE_URL}/api/projects/${config.projectId}/runs/${config.runId}/map/institution?${params}`;
  
  const response = await fetch(url, {
    next: { revalidate: 86400 } // 24 hour cache
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch field institution scholars: ${response.statusText}`);
  }
  
  const json = await response.json();
  return json.data || [];
}

/**
 * Generate demo run URL for a specific field
 */
export function getFieldDemoRunUrl(config: FieldConfig): string {
  return `/projects/${config.projectId}/runs/${config.runId}`;
}

