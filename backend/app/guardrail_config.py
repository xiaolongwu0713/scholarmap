"""
Parse stage protection and validation configuration.

This module contains all configuration constants for:
- Text validation limits
- LLM call attempt limits
- Invalid call restrictions
- Quality check thresholds

Centralized here for easy management and fine-tuning.

Parse Stage 1 - 初次理解阶段
功能：用户第一次输入研究描述时使用
作用：
 - 判断输入的是否是研究描述（而不是小说、诗歌等）
 - 判断研究的可行性（是否荒诞/违背常识）
 - 将用户的描述规范化、重写成可检索的英文
 - 判断是否清晰到可以用于检索
 - 如果不清晰，提出最多3个澄清问题
输入：
 - 候选研究描述（用户的原始输入）


Parse Stage 2 - 迭代收敛阶段
功能：用户回答了 Stage 1 的问题后，进行多轮对话优化
作用：
 - 融合当前描述和用户的补充信息
 - 判断用户的补充是否有帮助（is_helpful）
 - 生成更精确的理解
 - 如果仍不清晰，继续提出问题
 - 保存对话历史（最近10轮）
输入：
 - 当前候选描述
 - 上一轮的问题
 - 用户的补充信息

"""

# ============================================================================
# Frontend Attempt Limits
# ============================================================================

# Text validation attempt limit (before calling LLM)
TEXT_VALIDATION_MAX_ATTEMPTS = 3

# Parse Stage 1 maximum attempts
#用途：防止用户反复提交不合理的初始描述
#触发：用户在 Stage 1 点击"分析"按钮3次后锁定
#原因：初次分析应该一次性给出问题，不需要多次尝试
PARSE_STAGE1_MAX_ATTEMPTS = 2

# Parse Stage 2
#总次数限制：防止无限对话，最多3轮澄清
PARSE_STAGE2_MAX_TOTAL_ATTEMPTS = 3
#连续无帮助限制：如果用户连续2次回答都没帮助（is_helpful=false），自动停止
#例如：用户一直答非所问或提供无关信息
PARSE_STAGE2_MAX_CONSECUTIVE_UNHELPFUL = 2

# Retrieval Framework Adjustment
# Maximum number of times user can adjust the retrieval framework
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

# Text length limits (words)
TEXT_MIN_WORDS = 5
TEXT_MAX_WORDS = 30

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
QUALITY_REPEATED_TRIGRAM_THRESHOLD = 3 # less than 3 is OK

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
RECOMMENDED_ILLEGAL_TRIGRAM_THRESHOLD_10PLUS = QUALITY_REPEATED_TRIGRAM_THRESHOLD

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
