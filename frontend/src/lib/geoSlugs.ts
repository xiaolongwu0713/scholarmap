/**
 * Geographic slug conversion utilities
 * Handles conversion between country/city names and URL-safe slugs
 */

/**
 * Country name to slug mapping
 * Maintains proper country names for slug-to-name conversion
 */
export const COUNTRY_SLUG_MAP: Record<string, string> = {
  'united-states': 'United States',
  'united-kingdom': 'United Kingdom',
  'south-korea': 'South Korea',
  'north-korea': 'North Korea',
  'south-africa': 'South Africa',
  'new-zealand': 'New Zealand',
  'saudi-arabia': 'Saudi Arabia',
  'united-arab-emirates': 'United Arab Emirates',
  'czech-republic': 'Czech Republic',
  'dominican-republic': 'Dominican Republic',
  'cote-divoire': "Côte d'Ivoire",
  'bosnia-and-herzegovina': 'Bosnia and Herzegovina',
  'trinidad-and-tobago': 'Trinidad and Tobago',
  'antigua-and-barbuda': 'Antigua and Barbuda',
  'saint-vincent-and-the-grenadines': 'Saint Vincent and the Grenadines',
  // Fix common country name variations from PubMed data
  'turkiye': 'Turkey',
  'turkey': 'Turkey',
  'the-netherlands': 'Netherlands',
  'netherlands': 'Netherlands',
  'taiwan-province-of-china': 'Taiwan',
  'taiwan': 'Taiwan',
  'iran-islamic-republic-of': 'Iran',
  'iran': 'Iran',
  'special-administrative-region-of-china': 'Hong Kong',
  'hong-kong': 'Hong Kong',
};

/**
 * City name to slug mapping
 * For cities with special characters or common variations
 */
export const CITY_SLUG_MAP: Record<string, string> = {
  'new-york': 'New York',
  'los-angeles': 'Los Angeles',
  'san-francisco': 'San Francisco',
  'sao-paulo': 'São Paulo',
  'rio-de-janeiro': 'Rio de Janeiro',
  'mexico-city': 'Mexico City',
  'buenos-aires': 'Buenos Aires',
  'hong-kong': 'Hong Kong',
  'tel-aviv': 'Tel Aviv',
  'kuala-lumpur': 'Kuala Lumpur',
  'saint-petersburg': 'Saint Petersburg',
};

/**
 * Convert a country name to URL-safe slug
 * Example: "United States" -> "united-states"
 */
export function countryToSlug(country: string): string {
  return country
    .toLowerCase()
    .normalize('NFD') // Decompose unicode characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/[^a-z0-9-]/g, '') // Remove special characters
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Convert a slug to proper country name
 * Uses mapping for known countries, falls back to title case
 */
export function slugToCountryName(slug: string): string {
  // Check mapping first
  if (COUNTRY_SLUG_MAP[slug]) {
    return COUNTRY_SLUG_MAP[slug];
  }
  
  // Fall back to title case conversion
  return toTitleCase(slug.replace(/-/g, ' '));
}

/**
 * Convert a city name to URL-safe slug
 * Example: "New York" -> "new-york"
 */
export function cityToSlug(city: string): string {
  return city
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Convert a slug to proper city name
 * Uses mapping for known cities, falls back to title case
 */
export function slugToCityName(slug: string): string {
  if (CITY_SLUG_MAP[slug]) {
    return CITY_SLUG_MAP[slug];
  }
  
  return toTitleCase(slug.replace(/-/g, ' '));
}

/**
 * Convert string to title case
 * Example: "united states" -> "United States"
 */
function toTitleCase(str: string): string {
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Build slug mapping from country names array
 * Useful for populating COUNTRY_SLUG_MAP from API data
 */
export function buildCountrySlugMap(countries: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  countries.forEach(country => {
    const slug = countryToSlug(country);
    map[slug] = country;
  });
  return map;
}

/**
 * Validate if a slug is valid (alphanumeric and hyphens only)
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug);
}

/**
 * Check if a city name is likely invalid (institution, state code, etc.)
 * Returns true if the city name should be filtered out
 */
export function isInvalidCityName(cityName: string): boolean {
  const lowerCity = cityName.toLowerCase();
  
  // Institution indicators
  const institutionPatterns = [
    'universit', 'university', 'institut', 'college', 'school',
    'hospital', 'ospedaliero', 'azienda', 'medical center',
    'research center', 'laboratory', 'cnrs', 'umr', 'inra',
    'federico ii', 'ludwig-maximilians', 'complutense',
  ];
  
  // State/region codes (mainly Australia, Brazil, USA)
  const stateCodes = [
    'nsw', 'qld', 'vic', 'sa', 'wa', 'tas', 'nt', 'act', // Australia
    'sp', 'rj', 'mg', 'rs', 'pr', 'ba', 'ce', 'pe', // Brazil states (abbreviated)
  ];
  
  // Address fragments that shouldn't be cities
  const addressFragments = [
    'av-', 'avenue', 'street', 'rua-', 'via-',
    'do-norte', 'do-sul', 'de-', 'chagas-filho',
    'province-of', 'administrative-region',
  ];
  
  // Check for institution patterns
  for (const pattern of institutionPatterns) {
    if (lowerCity.includes(pattern)) {
      return true;
    }
  }
  
  // Check for exact state code matches
  if (stateCodes.includes(lowerCity)) {
    return true;
  }
  
  // Check for address fragments
  for (const fragment of addressFragments) {
    if (lowerCity.includes(fragment)) {
      return true;
    }
  }
  
  // City names that are too short (likely acronyms or codes)
  if (cityName.length <= 2) {
    return true;
  }
  
  return false;
}
