ALTER TABLE users ADD COLUMN IF NOT EXISTS pass_until TIMESTAMPTZ;
CREATE TABLE IF NOT EXISTS pass_purchases (transaction_id VARCHAR(64) PRIMARY KEY, user_id VARCHAR(64) NOT NULL, days INTEGER NOT NULL, currency VARCHAR(3), amount_cents INTEGER, earnings_usd_cents INTEGER, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), refunded_at TIMESTAMPTZ);
CREATE INDEX IF NOT EXISTS ix_pass_purchases_user_id ON pass_purchases (user_id);
CREATE INDEX IF NOT EXISTS ix_pass_purchases_created_at ON pass_purchases (created_at)
