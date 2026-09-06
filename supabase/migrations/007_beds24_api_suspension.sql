-- Track when Beds24 API credit/quota runs out for a user.
-- These columns are set automatically when any Beds24 API call returns
-- a credit-exhaustion error (HTTP 402 or specific error body).
-- Cleared manually by the user after they've recharged their Beds24 credits.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS beds24_api_suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS beds24_api_error_msg    TEXT;
