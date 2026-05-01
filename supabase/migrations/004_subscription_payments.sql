-- Tracks every subscription payment attempt (Cardcom LowProfile)
CREATE TABLE IF NOT EXISTS subscription_payments (
  id               TEXT PRIMARY KEY,           -- our uniqueId sent to Cardcom
  user_id          TEXT NOT NULL,
  plan_id          TEXT NOT NULL,              -- 'monthly' | 'annual'
  amount           NUMERIC(10, 2) NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
  cardcom_low_profile_id  TEXT,
  cardcom_transaction_id  TEXT,
  cardcom_auth_num        TEXT,
  cardcom_last4           TEXT,
  cardcom_document_number TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_payments_user_id ON subscription_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_sub_payments_low_profile ON subscription_payments(cardcom_low_profile_id);
