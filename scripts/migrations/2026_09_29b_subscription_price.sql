ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_interval_months INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_amount_cents INTEGER
