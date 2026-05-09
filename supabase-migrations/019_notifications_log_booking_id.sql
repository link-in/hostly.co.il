-- Add booking_id column to notifications_log for webhook deduplication
ALTER TABLE notifications_log
  ADD COLUMN IF NOT EXISTS booking_id TEXT;

CREATE INDEX IF NOT EXISTS idx_notifications_log_booking_id
  ON notifications_log (booking_id)
  WHERE booking_id IS NOT NULL;
