-- Add email column to notifications_log table
-- This allows storing guest email alongside phone number

-- Add email column (optional field)
ALTER TABLE notifications_log 
ADD COLUMN IF NOT EXISTS guest_email TEXT;

-- Add index for faster email lookups (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_notifications_log_email 
ON notifications_log(guest_email);

-- Add comment to document the column
COMMENT ON COLUMN notifications_log.guest_email IS 'Guest email address (optional)';

-- Example query to verify:
-- SELECT id, guest_name, phone, guest_email, check_in_date, created_at 
-- FROM notifications_log 
-- ORDER BY created_at DESC 
-- LIMIT 10;
