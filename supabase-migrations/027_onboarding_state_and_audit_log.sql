-- Migration 027: Client onboarding wizard
-- Tracks per-step onboarding progress on users and logs every Beds24 call made during onboarding.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS onboarding_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN users.onboarding_state IS 'Per-step onboarding wizard results: { steps: { <stepId>: { status, data, error, updatedAt } } }';
COMMENT ON COLUMN users.onboarding_completed_at IS 'Set when the onboarding wizard finalize step succeeds';

-- Clients that were set up before the wizard existed are already live.
UPDATE users
  SET onboarding_completed_at = NOW()
  WHERE onboarding_completed_at IS NULL
    AND property_id IS NOT NULL
    AND property_id <> '';

CREATE TABLE IF NOT EXISTS onboarding_audit_log (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  step              TEXT NOT NULL,
  method            TEXT NOT NULL,
  path              TEXT NOT NULL,
  http_status       INTEGER,
  success           BOOLEAN NOT NULL,
  error             TEXT,
  request_cost      NUMERIC,
  credits_remaining NUMERIC,
  created_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_onboarding_audit_log_user
  ON onboarding_audit_log (user_id, created_at DESC);

-- No policies on purpose: only the service-role client (which bypasses RLS) may read or write.
ALTER TABLE onboarding_audit_log ENABLE ROW LEVEL SECURITY;
