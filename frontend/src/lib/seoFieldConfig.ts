/**
 * SEO Field-Specific Run Configuration
 * 
 * This file maps research field slugs to their corresponding run IDs
 * in the SEO project. Update this file when creating new field-specific runs.
 */

export interface FieldConfig {
  slug: string;
  name: string;
  runId: string;
  projectId: string;
  description: string;
  keywords: string[];
  priority: number; // 1 = highest priority
}

/**
 * SEO Project ID (under super user account)
 */
export const SEO_PROJECT_ID = "seo-project-id"; // TODO: Replace with actual SEO project ID

/**
 * Field-specific run configurations
 */
export const FIELD_CONFIGS: Record<string, FieldConfig> = {
  "brain-computer-interface": {
    slug: "brain-computer-interface",
    name: "Brain-Computer Interface (BCI)",
    runId: "bci-run-id-here", // TODO: Replace after creating BCI run
    projectId: SEO_PROJECT_ID,
    description: "Brain-computer interfaces, neural interfaces, and direct brain communication systems",
    keywords: ["BCI", "brain-computer interface", "neural interface", "EEG", "brain signals"],
    priority: 1,
  },
  
  "neural-modulation": {
    slug: "neural-modulation",
    name: "Neural Modulation (tDCS/TMS)",
    runId: "neural-mod-run-id", // TODO: Replace after creating neural modulation run
    projectId: SEO_PROJECT_ID,
    description: "Non-invasive brain stimulation including tDCS, TMS, and other neuromodulation techniques",
    keywords: ["tDCS", "TMS", "transcranial magnetic stimulation", "neuromodulation", "brain stimulation"],
    priority: 2,
  },
  
  "crispr-gene-editing": {
    slug: "crispr-gene-editing",
    name: "CRISPR Gene Editing",
    runId: "crispr-run-id", // TODO: Replace after creating CRISPR run
    projectId: SEO_PROJECT_ID,
    description: "CRISPR-Cas9 and other gene editing technologies for therapeutic and research applications",
    keywords: ["CRISPR", "gene editing", "CRISPR-Cas9", "genome editing", "genetic engineering"],
    priority: 3,
  },
  
  "cancer-immunotherapy": {
    slug: "cancer-immunotherapy",
    name: "Cancer Immunotherapy",
    runId: "immunotherapy-run-id", // TODO: Replace after creating immunotherapy run
    projectId: SEO_PROJECT_ID,
    description: "Cancer immunotherapy including CAR-T, checkpoint inhibitors, and immune-based cancer treatments",
    keywords: ["immunotherapy", "CAR-T", "checkpoint inhibitors", "cancer vaccines", "immune therapy"],
    priority: 4,
  },
  
  "ai-drug-discovery": {
    slug: "ai-drug-discovery",
    name: "AI in Drug Discovery",
    runId: "ai-drug-run-id", // TODO: Replace after creating AI drug discovery run
    projectId: SEO_PROJECT_ID,
    description: "Artificial intelligence and machine learning applications in drug discovery and development",
    keywords: ["AI drug discovery", "machine learning", "computational drug design", "AI pharmacology"],
    priority: 5,
  },
  
  // Tier 2 fields (add after validating Tier 1)
  // "neurodegenerative-diseases": { ... },
  // "stem-cell-research": { ... },
  // "microbiome-research": { ... },
  // "precision-medicine": { ... },
  // "organoid-technology": { ... },
};

/**
 * Get field configuration by slug
 */
export function getFieldConfig(slug: string): FieldConfig | undefined {
  return FIELD_CONFIGS[slug];
}

/**
 * Get all field configurations sorted by priority
 */
export function getAllFieldConfigs(): FieldConfig[] {
  return Object.values(FIELD_CONFIGS).sort((a, b) => a.priority - b.priority);
}

/**
 * Get run ID for a specific field
 */
export function getFieldRunId(fieldSlug: string): string | undefined {
  return FIELD_CONFIGS[fieldSlug]?.runId;
}

/**
 * Check if a field slug is valid
 */
export function isValidFieldSlug(slug: string): boolean {
  return slug in FIELD_CONFIGS;
}

/**
 * Get field name from slug
 */
export function getFieldName(slug: string): string | undefined {
  return FIELD_CONFIGS[slug]?.name;
}

/**
 * Convert field slug to URL-friendly format
 */
export function fieldSlugToUrl(slug: string): string {
  return slug; // Already in URL-friendly format
}

/**
 * Extract field slug from URL
 */
export function urlToFieldSlug(url: string): string {
  return url; // Already in slug format
}

