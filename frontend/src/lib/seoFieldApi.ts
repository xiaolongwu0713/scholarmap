/**
 * SEO Field-Specific API Helper Functions
 * 
 * This file provides helper functions to fetch data for field-specific pages
 * using the field configurations from seoFieldConfig.ts
 */

import { getReadyFieldConfig, type FieldConfig } from './seoFieldConfig';
import { API_URL } from './site';

const API_BASE_URL = API_URL;

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

