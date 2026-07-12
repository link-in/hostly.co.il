-- Adds a per-host Google review link and a log table for the post-checkout
-- WhatsApp review-request feature (sent the morning after checkout).

ALTER TABLE users ADD COLUMN IF NOT EXISTS google_review_url TEXT;

CREATE TABLE IF NOT EXISTS review_reminders_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  guest_name TEXT,
  guest_phone TEXT,
  channel TEXT NOT NULL, -- 'airbnb' | 'booking.com' | 'direct' | 'other'
  check_out_date DATE,
  status TEXT NOT NULL DEFAULT 'sent', -- 'sent' | 'failed' | 'skipped_no_phone'
  whatsapp_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_reminders_user_id ON review_reminders_log(user_id);
CREATE INDEX IF NOT EXISTS idx_review_reminders_booking_id ON review_reminders_log(booking_id);

-- Enable RLS
ALTER TABLE review_reminders_log ENABLE ROW LEVEL SECURITY;

-- Allow service_role to bypass all policies (cron runs with the service role key)
CREATE POLICY review_reminders_log_service_role_all ON review_reminders_log
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE review_reminders_log IS 'Log of post-checkout WhatsApp review-request messages, keyed by booking_id for dedup';
COMMENT ON COLUMN users.google_review_url IS 'Host-wide Google review link, sent to guests after direct-booking checkouts';
