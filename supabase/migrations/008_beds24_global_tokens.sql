-- Store the global Beds24 API tokens in the database so they are
-- automatically persisted whenever the token manager refreshes them.
-- This eliminates the need to manually update Vercel environment variables
-- every time the refresh token expires (~30 days).

CREATE TABLE IF NOT EXISTS beds24_global_tokens (
  id            TEXT PRIMARY KEY DEFAULT 'global',  -- single-row table
  access_token  TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only the service role can read/write this table (server-side only)
ALTER TABLE beds24_global_tokens ENABLE ROW LEVEL SECURITY;

-- No public access whatsoever
CREATE POLICY "service_role_only" ON beds24_global_tokens
  USING (FALSE);
