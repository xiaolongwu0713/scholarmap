/**
 * SEO API utilities
 * Wrapper functions for fetching data from demo run map APIs
 */

const DEMO_PROJECT_ID = '6af7ac1b6254';
const DEMO_RUN_ID = '53e099cdb74e';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://scholarmap-backend.onrender.com';

// Cache duration for ISR (24 hours in seconds)
export const SEO_CACHE_DURATION = 86400;

/**
 * World map data point
 */
export interface WorldMapCountry {
  country: string;
  scholar_count: number;
  paper_count: number;
  institution_count: number;
  latitude: number | null;
  longitude: number | null;
}

/**
 * Country map data point (cities)
 */
export interface CountryMapCity {
  city: string;
  scholar_count: number;
  institution_count: number;
  latitude: number | null;
  longitude: number | null;
}

/**
 * City map data point (institutions)
 */
export interface CityMapInstitution {
  institution: string;
  scholar_count: number;
}

/**
 * Fetch all countries from world map API
 */
export async function fetchWorldMap(minConfidence: string = 'low'): Promise<WorldMapCountry[]> {
  const url = `${API_BASE}/api/projects/${DEMO_PROJECT_ID}/runs/${DEMO_RUN_ID}/map/world?min_confidence=${minConfidence}`;
  
  try {
    const response = await fetch(url, {
      next: { revalidate: SEO_CACHE_DURATION }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch world map: ${response.status}`);
    }
    
    const json = await response.json();
    return json.data || [];
  } catch (error) {
    console.error('Error fetching world map:', error);
    return [];
  }
}

/**
 * Fetch cities for a specific country
 */
export async function fetchCountryMap(
  country: string,
  minConfidence: string = 'low'
): Promise<CountryMapCity[]> {
  const url = `${API_BASE}/api/projects/${DEMO_PROJECT_ID}/runs/${DEMO_RUN_ID}/map/country/${encodeURIComponent(country)}?min_confidence=${minConfidence}`;
  
  try {
    const response = await fetch(url, {
      next: { revalidate: SEO_CACHE_DURATION }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch country map for ${country}: ${response.status}`);
    }
    
    const json = await response.json();
    return json.data || [];
  } catch (error) {
    console.error(`Error fetching country map for ${country}:`, error);
    return [];
  }
}

/**
 * Fetch institutions for a specific city
 */
export async function fetchCityMap(
  country: string,
  city: string,
  minConfidence: string = 'low'
): Promise<CityMapInstitution[]> {
  const url = `${API_BASE}/api/projects/${DEMO_PROJECT_ID}/runs/${DEMO_RUN_ID}/map/city/${encodeURIComponent(country)}/${encodeURIComponent(city)}?min_confidence=${minConfidence}`;
  
  try {
    const response = await fetch(url, {
      next: { revalidate: SEO_CACHE_DURATION }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch city map for ${city}, ${country}: ${response.status}`);
    }
    
    const json = await response.json();
    return json.data || [];
  } catch (error) {
    console.error(`Error fetching city map for ${city}, ${country}:`, error);
    return [];
  }
}

/**
 * Get aggregated country stats (computed from cities data)
 */
export interface CountryStats {
  country: string;
  scholar_count: number;
  paper_count: number;
  institution_count: number;
  city_count: number;
  cities: CountryMapCity[];
  top_cities: CountryMapCity[];
}

export async function fetchCountryStats(country: string): Promise<CountryStats | null> {
  try {
    // Fetch world map to get country-level stats
    const worldData = await fetchWorldMap();
    const countryData = worldData.find(c => c.country === country);
    
    if (!countryData) {
      return null;
    }
    
    // Fetch cities for this country
    const cities = await fetchCountryMap(country);
    
    // Sort cities by scholar count
    const sortedCities = [...cities].sort((a, b) => b.scholar_count - a.scholar_count);
    
    return {
      country: countryData.country,
      scholar_count: countryData.scholar_count,
      paper_count: countryData.paper_count,
      institution_count: countryData.institution_count,
      city_count: cities.length,
      cities: sortedCities,
      top_cities: sortedCities.slice(0, 10),
    };
  } catch (error) {
    console.error(`Error fetching country stats for ${country}:`, error);
    return null;
  }
}

/**
 * Get demo run URL with optional filters
 */
export function getDemoRunUrl(filters?: { country?: string; city?: string }): string {
  let url = `/projects/${DEMO_PROJECT_ID}/runs/${DEMO_RUN_ID}`;
  
  if (filters?.country || filters?.city) {
    const params = new URLSearchParams();
    if (filters.country) params.set('country', filters.country);
    if (filters.city) params.set('city', filters.city);
    url += `?${params.toString()}`;
  }
  
  return url;
}
