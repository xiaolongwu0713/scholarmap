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
  priority: number; // 1 = highest priority (order in seo-fields.json)
}

interface FieldDefinition {
  slug: string;
  name: string;
  description: string;
  keywords: string[];
  runId?: string;
}

/** SEO project (owned by the admin account). Must match backend SEO_PROJECT_ID. */
export const SEO_PROJECT_ID = '3b9280a68d3d';

const DEFINITIONS: FieldDefinition[] = fieldsFile.fields;

function toConfig(def: FieldDefinition, index: number, runId: string, projectId = SEO_PROJECT_ID): FieldConfig {
  return {
    slug: def.slug,
    name: def.name,
    description: def.description,
    keywords: def.keywords,
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
  try {
    const res = await fetch(`${API_URL}/api/seo/fields`, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const { fields } = (await res.json()) as {
      fields: { slug: string; run_id: string; project_id: string }[];
    };
    const ready = new Map(fields.map((f) => [f.slug, f]));
    return DEFINITIONS.flatMap((def, i) => {
      const f = ready.get(def.slug);
      return f ? [toConfig(def, i, f.run_id, f.project_id)] : [];
    });
  } catch (error) {
    console.error('Could not load ready SEO fields, using static list:', error);
    return staticFieldConfigs();
  }
}

/** A published field by slug, or undefined if unknown or not built yet. */
export async function getReadyFieldConfig(slug: string): Promise<FieldConfig | undefined> {
  return (await getReadyFieldConfigs()).find((f) => f.slug === slug);
}
