-- ============================================================
-- Migration 002: Subscription plans & status update
-- ============================================================

-- 1. Create subscription_plans table if not exists
CREATE TABLE IF NOT EXISTS subscription_plans (
  id            TEXT PRIMARY KEY,
  display_name  TEXT NOT NULL,
  monthly_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
  max_whatsapp_per_month INT NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Insert plans (upsert so re-running is safe)
INSERT INTO subscription_plans (id, display_name, monthly_price, billing_cycle, max_whatsapp_per_month)
VALUES
  ('monthly', 'מנוי חודשי', 150.00, 'monthly', 500),
  ('annual',  'מנוי שנתי',  1000.00, 'annual',  500)
ON CONFLICT (id) DO UPDATE SET
  display_name  = EXCLUDED.display_name,
  monthly_price = EXCLUDED.monthly_price,
  billing_cycle = EXCLUDED.billing_cycle;

-- 3. Create subscriptions table if not exists
CREATE TABLE IF NOT EXISTS subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id       TEXT REFERENCES subscription_plans(id),
  status        TEXT NOT NULL DEFAULT 'trial'
                  CHECK (status IN ('trial', 'active', 'cancelled', 'expired')),
  billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'annual')),
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ,
  cancelled_at  TIMESTAMPTZ,
  auto_renew    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. If subscriptions table already exists, fix the status constraint to include 'cancelled'
DO $$
BEGIN
  -- Drop old constraint if it exists with wrong values
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subscriptions_status_check'
  ) THEN
    ALTER TABLE subscriptions DROP CONSTRAINT subscriptions_status_check;
  END IF;

  -- Add correct constraint
  ALTER TABLE subscriptions
    ADD CONSTRAINT subscriptions_status_check
    CHECK (status IN ('trial', 'active', 'cancelled', 'expired'));
EXCEPTION WHEN others THEN
  NULL; -- ignore if constraint already correct
END $$;

-- 5. Add cancelled_at column if it doesn't exist
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- 6. Create usage_stats table if not exists
CREATE TABLE IF NOT EXISTS usage_stats (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month         TEXT NOT NULL, -- format: YYYY-MM
  whatsapp_sent INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, month)
);

-- 7. Index for fast subscription lookup by user
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status   ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires  ON subscriptions(expires_at);
