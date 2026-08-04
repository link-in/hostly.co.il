-- Unified log of every WhatsApp message Hostly attempts to send.
-- Powers the dashboard "הודעות WhatsApp" page and debugging of failed sends.

CREATE TABLE IF NOT EXISTS whatsapp_messages_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  booking_id TEXT,
  message_type TEXT NOT NULL,
  recipient_role TEXT NOT NULL DEFAULT 'other',
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT,
  message_body TEXT,
  status TEXT NOT NULL,
  provider TEXT,
  provider_message_id TEXT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_log_user_id
  ON whatsapp_messages_log (user_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_log_created_at
  ON whatsapp_messages_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_log_status
  ON whatsapp_messages_log (status);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_log_booking_id
  ON whatsapp_messages_log (booking_id);

ALTER TABLE whatsapp_messages_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY whatsapp_messages_log_service_role_all ON whatsapp_messages_log
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE whatsapp_messages_log IS 'Per-attempt log of outbound WhatsApp sends (Whapi), including status and errors';
COMMENT ON COLUMN whatsapp_messages_log.message_type IS 'e.g. new_booking_guest, cancellation_owner, check_in_guest, review_reminder_guest';
COMMENT ON COLUMN whatsapp_messages_log.recipient_role IS 'guest | owner | other';
COMMENT ON COLUMN whatsapp_messages_log.status IS 'sent | failed | skipped';
