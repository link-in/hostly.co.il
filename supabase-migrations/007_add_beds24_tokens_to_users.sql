-- Add Beds24 API tokens to users table
-- This allows each user to have their own Beds24 account

-- Add columns for Beds24 tokens
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS beds24_token TEXT,
ADD COLUMN IF NOT EXISTS beds24_refresh_token TEXT;

-- Create index for faster token lookup
CREATE INDEX IF NOT EXISTS idx_users_beds24_token ON users(beds24_token) WHERE beds24_token IS NOT NULL;

-- Add comments
COMMENT ON COLUMN users.beds24_token IS 'Beds24 API access token - unique per user account';
COMMENT ON COLUMN users.beds24_refresh_token IS 'Beds24 API refresh token - for renewing access token';

-- Done!
SELECT 'Beds24 token columns added to users table' AS result;
