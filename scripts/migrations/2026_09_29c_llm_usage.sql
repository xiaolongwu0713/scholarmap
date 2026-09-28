CREATE TABLE IF NOT EXISTS llm_usage (id SERIAL PRIMARY KEY, run_id VARCHAR(64), model VARCHAR(100) NOT NULL, prompt_tokens INTEGER NOT NULL, completion_tokens INTEGER NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS ix_llm_usage_run_id ON llm_usage (run_id)
