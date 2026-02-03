-- Add check_in_settings column to users table
-- This allows each property owner to customize their check-in process

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS check_in_settings JSONB DEFAULT '{
  "auto_send_on_booking": true,
  "send_days_before": 3,
  "send_reminder": true,
  "access_code_format": "digits",
  "wifi_ssid": "",
  "wifi_password": "",
  "property_guide": "",
  "terms_template": "default"
}'::jsonb;

-- Add index for JSONB column
CREATE INDEX IF NOT EXISTS idx_users_check_in_settings 
ON users USING GIN (check_in_settings);

-- Comment on column
COMMENT ON COLUMN users.check_in_settings IS 'JSON settings for digital check-in customization';

-- Example of accessing settings:
-- SELECT check_in_settings->>'wifi_ssid' as wifi_ssid FROM users WHERE id = 'user_id';
