/**
 * Parse stage protection and validation configuration.
 * 
 * This module now dynamically loads configuration from backend API
 * to ensure frontend and backend always use the same limits.
 * 
 * Configuration is cached after first load to avoid repeated API calls.
 */

import { getFrontendConfig, type FrontendConfig } from "./api";

// Re-export FrontendConfig type for use in other modules
export type { FrontendConfig };

// ============================================================================
// Configuration Cache
// ============================================================================

let configCache: FrontendConfig | null = null;
let configPromise: Promise<FrontendConfig> | null = null;

/**
 * Get configuration from backend (with caching).
 * 
 * Usage:
 * ```typescript
 * const config = await getConfig();
 * console.log(config.parse_stage1_max_attempts);
 * ```
 */
export async function getConfig(): Promise<FrontendConfig> {
  // Return cached config if available
  if (configCache) {
    return configCache;
  }

  // If a request is already in progress, wait for it
  if (configPromise) {
    return configPromise;
  }

  // Fetch config from backend
  configPromise = getFrontendConfig().then((config) => {
    configCache = config;
    configPromise = null;
    return config;
  }).catch((error) => {
    configPromise = null;
    console.error("Failed to load config from backend, using fallback defaults:", error);
    
    // Fallback to default values if API fails
    const fallbackConfig: FrontendConfig = {
      text_validation_max_attempts: 3,
      parse_stage1_max_attempts: 2,
      parse_stage2_max_total_attempts: 3,
      parse_stage2_max_consecutive_unhelpful: 2,
      retrieval_framework_adjust_max_attempts: 2,
    };
    
    configCache = fallbackConfig;
    return fallbackConfig;
  });

  return configPromise;
}

/**
 * Clear the configuration cache.
 * Useful for testing or when config needs to be reloaded.
 */
export function clearConfigCache(): void {
  configCache = null;
  configPromise = null;
}

// ============================================================================
// Legacy exports (for backward compatibility)
// ============================================================================

/**
 * @deprecated Use `getConfig()` instead to get latest backend values.
 * These constants are fallback defaults only.
 */
export const TEXT_VALIDATION_MAX_ATTEMPTS = 3;

/**
 * @deprecated Use `getConfig()` instead to get latest backend values.
 * These constants are fallback defaults only.
 */
export const PARSE_STAGE1_MAX_ATTEMPTS = 2;

/**
 * @deprecated Use `getConfig()` instead to get latest backend values.
 * These constants are fallback defaults only.
 */
export const PARSE_STAGE2_MAX_TOTAL_ATTEMPTS = 3;

/**
 * @deprecated Use `getConfig()` instead to get latest backend values.
 * These constants are fallback defaults only.
 */
export const PARSE_STAGE2_MAX_CONSECUTIVE_UNHELPFUL = 2;

/**
 * @deprecated Use `getConfig()` instead to get latest backend values.
 * These constants are fallback defaults only.
 */
export const RETRIEVAL_FRAMEWORK_ADJUST_MAX_ATTEMPTS = 2;
