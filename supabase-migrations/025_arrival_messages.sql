-- Arrival-day WhatsApp automation
-- Table 1: per-user settings for the morning check-in message
-- Table 2: dedup + audit log (mirrors review_reminders_log pattern)

-- ── Settings ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS arrival_message_settings (
  user_id               TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  enabled               BOOLEAN NOT NULL DEFAULT false,
  photo_url             TEXT,
  photo_storage_path    TEXT,
  intro_text            TEXT,
  waze_link             TEXT,
  house_rules           TEXT,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE arrival_message_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY arrival_message_settings_service_role_all ON arrival_message_settings
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ── Log / dedup ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS arrival_messages_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      TEXT NOT NULL UNIQUE,   -- dedup key; skipped_manual rows are inserted before cron runs
  user_id         TEXT NOT NULL,
  guest_name      TEXT,
  guest_phone     TEXT,
  check_in_date   DATE,
  status          TEXT NOT NULL DEFAULT 'sent',   -- sent | failed | skipped_no_phone | skipped_manual
  whatsapp_error  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_arrival_messages_log_user_id    ON arrival_messages_log(user_id);
CREATE INDEX IF NOT EXISTS idx_arrival_messages_log_booking_id ON arrival_messages_log(booking_id);

ALTER TABLE arrival_messages_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY arrival_messages_log_service_role_all ON arrival_messages_log
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE arrival_message_settings IS 'Per-host settings for the morning-of-arrival WhatsApp automation';
COMMENT ON TABLE arrival_messages_log      IS 'Dedup log for arrival-day WhatsApp messages; skipped_manual rows block the cron from sending';
COMMENT ON COLUMN arrival_messages_log.booking_id IS 'UNIQUE constraint acts as dedup; insert skipped_manual to prevent send; delete to re-enable';
