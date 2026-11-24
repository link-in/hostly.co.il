-- Automated promotions: detect free dates, draft AI ad copy, publish to ad channels
-- after host approval (src/lib/promotions). Channel-agnostic: `channel` identifies
-- the publisher ('meta_ads' first), channel-specific data lives in JSONB.

-- Host's connection to an ad channel. `access_token_enc` is AES-256-GCM encrypted
-- (src/lib/security/secretBox.ts) — never store a plaintext token here.
CREATE TABLE IF NOT EXISTS promotion_connections (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel             TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending_setup'
                        CHECK (status IN ('pending_setup', 'active', 'expired', 'revoked')),
  access_token_enc    TEXT NOT NULL,
  token_expires_at    TIMESTAMPTZ,
  assets              JSONB NOT NULL DEFAULT '{}'::jsonb,
  monthly_budget_cap  NUMERIC,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, channel)
);

-- When to promote. `room_id` NULL = every room of the host.
CREATE TABLE IF NOT EXISTS promotion_rules (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  trigger           TEXT NOT NULL,
  room_id           TEXT,
  days_before       INT NOT NULL DEFAULT 7 CHECK (days_before BETWEEN 1 AND 60),
  min_free_nights   INT NOT NULL DEFAULT 1 CHECK (min_free_nights BETWEEN 1 AND 30),
  daily_budget      NUMERIC NOT NULL CHECK (daily_budget > 0),
  max_total_budget  NUMERIC NOT NULL CHECK (max_total_budget > 0),
  discount_pct      NUMERIC CHECK (discount_pct IS NULL OR (discount_pct > 0 AND discount_pct < 100)),
  audience          JSONB NOT NULL DEFAULT '{}'::jsonb,
  channels          TEXT[] NOT NULL DEFAULT ARRAY['meta_ads'],
  enabled           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS promotion_rules_user_idx ON promotion_rules (user_id);

-- One campaign per (room, free window, channel). Created as `pending_approval`;
-- nothing reaches the channel until the host approves.
CREATE TABLE IF NOT EXISTS promotion_campaigns (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rule_id       UUID REFERENCES promotion_rules(id) ON DELETE SET NULL,
  channel       TEXT NOT NULL,
  trigger       TEXT NOT NULL,
  room_id       TEXT NOT NULL,
  room_name     TEXT,
  check_in      DATE NOT NULL,
  check_out     DATE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending_approval'
                  CHECK (status IN ('pending_approval', 'launching', 'active', 'rejected', 'stopped', 'failed', 'expired')),
  content       JSONB NOT NULL,
  image_urls    TEXT[] NOT NULL DEFAULT '{}',
  landing_url   TEXT NOT NULL,
  total_budget  NUMERIC NOT NULL,
  currency      TEXT NOT NULL DEFAULT 'ILS',
  audience      JSONB NOT NULL DEFAULT '{}'::jsonb,
  nightly_price NUMERIC,
  external_ids  JSONB NOT NULL DEFAULT '{}'::jsonb,
  stats         JSONB NOT NULL DEFAULT '{}'::jsonb,
  error         TEXT,
  stop_reason   TEXT,
  approved_at   TIMESTAMPTZ,
  launched_at   TIMESTAMPTZ,
  stopped_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, room_id, channel, check_in, check_out)
);

CREATE INDEX IF NOT EXISTS promotion_campaigns_user_status_idx ON promotion_campaigns (user_id, status);
CREATE INDEX IF NOT EXISTS promotion_campaigns_status_idx ON promotion_campaigns (status);

-- Read and written only by API routes / crons with the service role.
ALTER TABLE promotion_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON promotion_connections USING (FALSE);
CREATE POLICY "service_role_only" ON promotion_rules USING (FALSE);
CREATE POLICY "service_role_only" ON promotion_campaigns USING (FALSE);
