ALTER TABLE users ADD COLUMN IF NOT EXISTS pro_until TIMESTAMPTZ NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(32) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS paddle_customer_id VARCHAR(64) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS paddle_subscription_id VARCHAR(64) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS paddle_event_at TIMESTAMPTZ NULL;
CREATE INDEX IF NOT EXISTS ix_users_paddle_customer_id ON users (paddle_customer_id);
CREATE INDEX IF NOT EXISTS ix_users_paddle_subscription_id ON users (paddle_subscription_id);
CREATE TABLE IF NOT EXISTS search_usage (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    run_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_search_usage_user_created ON search_usage (user_id, created_at);
