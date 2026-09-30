/**
 * SEO research-field configuration.
 *
 * Field metadata lives in src/data/seo-fields.json (shared with the backend).
 * Fields with a fixed `runId` are always published; the others are built by the
 * backend in the background and only published once /api/seo/fields reports them ready.
 */

import fieldsFile from '@/data/seo-fields.json';
import { API_URL } from './site';

export interface FieldConfig {
  slug: string;
  name: string;
  runId: string;
  projectId: string;
  description: string;
  keywords: string[];
  category: FieldCategory;
  priority: number; // 1 = highest priority (order in seo-fields.json)
}

/** Field groups for list pages, in display order. */
export const FIELD_CATEGORIES = {
  neuroscience: 'Neuroscience',
  cancer: 'Cancer Research',
  immunology: 'Immunology & Infectious Disease',
  cardiometabolic: 'Cardiovascular & Metabolic Disease',
  genomics: 'Genomics & Molecular Biology',
  'cell-biology': 'Cell Biology & Regenerative Medicine',
  bioengineering: 'Therapeutics & Bioengineering',
} as const;

export type FieldCategory = keyof typeof FIELD_CATEGORIES;

interface FieldDefinition {
  slug: string;
  name: string;
  category: FieldCategory;
  description: string;
  keywords: string[];
  runId?: string;
}

/** SEO project (owned by the admin account). Must match backend SEO_PROJECT_ID. */
export const SEO_PROJECT_ID = '3b9280a68d3d';

const DEFINITIONS = fieldsFile.fields as FieldDefinition[];

function toConfig(def: FieldDefinition, index: number, runId: string, projectId = SEO_PROJECT_ID): FieldConfig {
  return {
    slug: def.slug,
    name: def.name,
    description: def.description,
    keywords: def.keywords,
    category: def.category,
    runId,
    projectId,
    priority: index + 1,
  };
}

/** Fields with a fixed run ID — used if the backend can't be reached. */
function staticFieldConfigs(): FieldConfig[] {
  return DEFINITIONS.flatMap((def, i) => (def.runId ? [toConfig(def, i, def.runId)] : []));
}

/**
 * Published fields (data ready), in priority order.
 * Revalidated hourly so newly built fields appear without a redeploy.
 */
export async function getReadyFieldConfigs(): Promise<FieldConfig[]> {
  return (await loadReadyFieldConfigs()).configs;
}

async function loadReadyFieldConfigs(): Promise<{ configs: FieldConfig[]; complete: boolean }> {
  try {
    const res = await fetch(`${API_URL}/api/seo/fields`, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const { fields } = (await res.json()) as {
      fields: { slug: string; run_id: string; project_id: string }[];
    };
    const ready = new Map(fields.map((f) => [f.slug, f]));
    const configs = DEFINITIONS.flatMap((def, i) => {
      const f = ready.get(def.slug);
      return f ? [toConfig(def, i, f.run_id, f.project_id)] : [];
    });
    return { configs, complete: true };
  } catch (error) {
    console.error('Could not load ready SEO fields, using static list:', error);
    return { configs: staticFieldConfigs(), complete: false };
  }
}

/**
 * A published field by slug, or undefined if unknown or not built yet.
 * Throws if the backend is unreachable and the field isn't in the static list, so the
 * page fails (and is retried) instead of caching a 404 for a field that does exist.
 */
export async function getReadyFieldConfig(slug: string): Promise<FieldConfig | undefined> {
  const { configs, complete } = await loadReadyFieldConfigs();
  const config = configs.find((f) => f.slug === slug);
  if (!config && !complete && DEFINITIONS.some((def) => def.slug === slug)) {
    throw new Error(`SEO field list unavailable; cannot resolve ${slug}`);
  }
  return config;
}

/** Fields grouped by category, in category display order; empty groups are left out. */
export function groupFieldsByCategory(
  fields: FieldConfig[]
): { category: FieldCategory; label: string; fields: FieldConfig[] }[] {
  return (Object.keys(FIELD_CATEGORIES) as FieldCategory[])
    .map((category) => ({
      category,
      label: FIELD_CATEGORIES[category],
      fields: fields.filter((f) => f.category === category),
    }))
    .filter((group) => group.fields.length > 0);
}
