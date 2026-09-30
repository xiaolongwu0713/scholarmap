ALTER TABLE pass_purchases ADD COLUMN IF NOT EXISTS refund_status VARCHAR(20);
ALTER TABLE pass_purchases ADD COLUMN IF NOT EXISTS refund_requested_at TIMESTAMPTZ
