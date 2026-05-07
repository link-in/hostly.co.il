-- Migration 018: Airbnb Co-Host Connect Flow
-- Adds airbnb_connect_token and airbnb_status to the users table

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS airbnb_connect_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS airbnb_status TEXT CHECK (airbnb_status IN ('pending', 'connected')) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS airbnb_invited_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS airbnb_confirmed_at TIMESTAMPTZ DEFAULT NULL;

-- Index for fast token lookup on the public page
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_airbnb_connect_token
  ON users (airbnb_connect_token)
  WHERE airbnb_connect_token IS NOT NULL;
