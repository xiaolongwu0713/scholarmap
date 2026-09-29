ALTER TABLE users ADD COLUMN IF NOT EXISTS search_limit_override INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS quota_reset_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMPTZ;
CREATE TABLE IF NOT EXISTS admin_actions (id SERIAL PRIMARY KEY, admin_user_id VARCHAR(64) NOT NULL, target_user_id VARCHAR(64), action VARCHAR(40) NOT NULL, detail JSON, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS ix_admin_actions_created_at ON admin_actions (created_at)
