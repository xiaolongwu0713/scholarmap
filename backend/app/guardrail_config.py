"""
Parse stage protection and validation configuration.

This module contains all configuration constants for:
- Text validation limits
- LLM call attempt limits
- Invalid call restrictions
- Quality check thresholds

Centralized here for easy management and fine-tuning.
"""

# ============================================================================
# Frontend Attempt Limits
# ============================================================================

# Text validation attempt limit (before calling LLM)
TEXT_VALIDATION_MAX_ATTEMPTS = 3

# Parse Stage 1 maximum attempts
PARSE_STAGE1_MAX_ATTEMPTS = 3

# Parse Stage 2 total maximum attempts
PARSE_STAGE2_MAX_TOTAL_ATTEMPTS = 3

# Parse Stage 2 consecutive unhelpful responses before lockout
PARSE_STAGE2_MAX_CONSECUTIVE_UNHELPFUL = 2

# Retrieval Framework adjustment maximum attempts
RETRIEVAL_FRAMEWORK_ADJUST_MAX_ATTEMPTS = 2

# ============================================================================
# Framework Adjustment Input Validation Thresholds
# ============================================================================
# Lighter validation for framework adjustment inputs (no repetition checks)
# These thresholds can be adjusted independently from regular text validation

# Unknown word ratio threshold for adjustment inputs (>= 10 words)
ADJUST_UNKNOWN_RATIO_THRESHOLD_10PLUS = 0.40

# Invalid ratio threshold (unknown + misspelled) for adjustment inputs (>= 10 words)
ADJUST_INVALID_RATIO_THRESHOLD_10PLUS = 0.50

# Gibberish ratio threshold for adjustment inputs (>= 10 words)
ADJUST_GIBBERISH_RATIO_THRESHOLD_10PLUS = 0.40

# Unknown word ratio threshold for adjustment inputs (5-9 words)
ADJUST_UNKNOWN_RATIO_THRESHOLD_5_9 = 0.60

# Invalid ratio threshold (unknown + misspelled) for adjustment inputs (5-9 words)
ADJUST_INVALID_RATIO_THRESHOLD_5_9 = 0.70

# ============================================================================
# Backend API Protection (Server-side enforcement)
# ============================================================================

# Server-side attempt limits (enforced at API level, cannot be bypassed)
# These should match or be stricter than frontend limits
BACKEND_STAGE1_MAX_ATTEMPTS = PARSE_STAGE1_MAX_ATTEMPTS
BACKEND_STAGE2_MAX_TOTAL_ATTEMPTS = PARSE_STAGE2_MAX_TOTAL_ATTEMPTS
BACKEND_STAGE2_MAX_CONSECUTIVE_UNHELPFUL = PARSE_STAGE2_MAX_CONSECUTIVE_UNHELPFUL

# API rate limiting (per project_id + run_id)
# Maximum requests per time window
API_RATE_LIMIT_MAX_REQUESTS = 10  # requests per window
API_RATE_LIMIT_WINDOW_SECONDS = 60  # time window in seconds

# Prompt length limits (to control LLM costs)
# Maximum total prompt length in characters (approximate token count: chars / 4)
PROMPT_MAX_LENGTH_CHARS = 16000  # ~4000 tokens (assuming ~4 chars per token)
PROMPT_MAX_LENGTH_TOKENS = 4000  # Hard limit for token counting if available

# Concurrency control
# Maximum concurrent parse requests per run_id
MAX_CONCURRENT_PARSE_PER_RUN = 1

# ============================================================================
# Text Format Validation
# ============================================================================

# Text length limits (characters)
TEXT_MIN_LENGTH = 50
TEXT_MAX_LENGTH = 300

# Maximum number of line breaks allowed
TEXT_MAX_LINE_BREAKS = 3

# ============================================================================
# Text Quality Check Thresholds (Backend)
# ============================================================================

# For texts with >= 10 words
QUALITY_CHECK_WORD_COUNT_THRESHOLD = 10

# Unknown word ratio threshold (>= 10 words)
QUALITY_UNKNOWN_RATIO_THRESHOLD_10PLUS = 0.40

# Invalid ratio threshold (unknown + misspelled, >= 10 words)
QUALITY_INVALID_RATIO_THRESHOLD_10PLUS = 0.50

# Gibberish ratio threshold (>= 10 words)
QUALITY_GIBBERISH_RATIO_THRESHOLD_10PLUS = 0.40

# Secondary quality check thresholds (>= 10 words)
QUALITY_GIBBERISH_RATIO_SECONDARY_10PLUS = 0.60
QUALITY_UNIQUE_TOKEN_RATIO_THRESHOLD = 0.65
QUALITY_REPEATED_TOKEN_RATIO_THRESHOLD = 0.25
QUALITY_REPEATED_TRIGRAM_THRESHOLD = 1

# For texts with 5-9 words (stricter thresholds)
QUALITY_CHECK_WORD_COUNT_MIN = 5

# Unknown word ratio threshold (5-9 words)
QUALITY_UNKNOWN_RATIO_THRESHOLD_5_9 = 0.60

# Invalid ratio threshold (unknown + misspelled, 5-9 words)
QUALITY_INVALID_RATIO_THRESHOLD_5_9 = 0.70

# For texts with < 5 words
QUALITY_MISSPELLED_RATIO_THRESHOLD_SHORT = 0.40
QUALITY_GIBBERISH_RATIO_THRESHOLD_SHORT = 0.60

# ============================================================================
# Recommended Illegal Thresholds (in analyze_english_text)
# ============================================================================

# Unknown ratio threshold for recommended_illegal (>= 10 words)
RECOMMENDED_ILLEGAL_UNKNOWN_RATIO_10PLUS = 0.40

# Gibberish or misspelled ratio threshold for recommended_illegal (>= 10 words)
RECOMMENDED_ILLEGAL_GIBBERISH_RATIO_10PLUS = 0.40
RECOMMENDED_ILLEGAL_MISSPELLED_RATIO_10PLUS = 0.40

# Unique token ratio, repeated token ratio, trigram repeats for recommended_illegal (>= 10 words)
RECOMMENDED_ILLEGAL_UNIQUE_TOKEN_RATIO_10PLUS = 0.65
RECOMMENDED_ILLEGAL_REPEATED_TOKEN_RATIO_10PLUS = 0.25
RECOMMENDED_ILLEGAL_TRIGRAM_THRESHOLD_10PLUS = 1

# Unknown ratio threshold for recommended_illegal (5-9 words)
RECOMMENDED_ILLEGAL_UNKNOWN_RATIO_5_9 = 0.50

# ============================================================================
# Password Strength Requirements
# ============================================================================

# Password length limits
PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 15

# Password complexity requirements
PASSWORD_REQUIRE_CAPITAL = True  # Require at least one uppercase letter
PASSWORD_REQUIRE_DIGIT = True  # Require at least one digit
PASSWORD_REQUIRE_LETTER = True  # Require at least one letter (a-z, A-Z)
PASSWORD_REQUIRE_SPECIAL = True  # Require at least one special character

# Allowed special characters (including @, #, *)
PASSWORD_SPECIAL_CHARS = "@#*!$%^&*(),.?\":{}|<>"

