/**
 * Parse stage protection and validation configuration.
 * 
 * This module contains all configuration constants for:
 * - Text validation attempt limits
 * - LLM call attempt limits
 * - Invalid call restrictions
 * 
 * Centralized here for easy management and fine-tuning.
 */

// ============================================================================
// Frontend Attempt Limits
// ============================================================================

/**
 * Text validation attempt limit (before calling LLM)
 * After this many failed validation attempts, the input field will be locked.
 */
export const TEXT_VALIDATION_MAX_ATTEMPTS = 3;

/**
 * Parse Stage 1 maximum attempts
 * Maximum number of times user can try to parse their research description.
 */
export const PARSE_STAGE1_MAX_ATTEMPTS = 3;

/**
 * Parse Stage 2 total maximum attempts
 * Maximum total number of times user can provide additional information.
 */
export const PARSE_STAGE2_MAX_TOTAL_ATTEMPTS = 5;

/**
 * Parse Stage 2 consecutive unhelpful responses before lockout
 * If user provides this many consecutive unhelpful responses, the service will be locked.
 */
export const PARSE_STAGE2_MAX_CONSECUTIVE_UNHELPFUL = 2;

