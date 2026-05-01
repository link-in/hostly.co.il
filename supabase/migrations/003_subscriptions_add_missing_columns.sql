-- Migration 003: add missing columns and fix constraints on existing subscriptions table
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'annual'));

-- Allow NULL plan_id so trial subscriptions don't require a plan
ALTER TABLE subscriptions ALTER COLUMN plan_id DROP NOT NULL;
