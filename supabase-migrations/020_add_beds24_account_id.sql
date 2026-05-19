-- Migration 020: Add beds24_account_id column to users table
-- This column stores the Beds24 sub-account ID used to disable accounts on user deletion.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS beds24_account_id TEXT;
