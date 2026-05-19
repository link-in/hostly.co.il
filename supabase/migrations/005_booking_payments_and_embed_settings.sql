-- ── booking_payments ─────────────────────────────────────────────────────────
-- Tracks every guest booking payment attempt via the embed calendar.
-- A record is created before redirecting to Cardcom, then updated by the webhook.
CREATE TABLE IF NOT EXISTS booking_payments (
  id                     TEXT PRIMARY KEY,            -- UUID, sent as ReturnValue to Cardcom
  user_id                TEXT NOT NULL,               -- Hostly property owner's user_id
  room_id                TEXT NOT NULL,               -- Beds24 room ID
  amount                 NUMERIC(10, 2) NOT NULL,     -- Total price in NIS (server-calculated)
  check_in               DATE NOT NULL,
  check_out              DATE NOT NULL,
  guest_first            TEXT,
  guest_last             TEXT,
  guest_email            TEXT,
  guest_phone            TEXT,
  num_adult              INT NOT NULL DEFAULT 1,
  num_child              INT NOT NULL DEFAULT 0,
  notes                  TEXT,
  status                 TEXT NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
  cardcom_low_profile_id TEXT,
  cardcom_transaction_id TEXT,
  cardcom_auth_num       TEXT,
  cardcom_last4          TEXT,
  beds24_booking_id      TEXT,                        -- filled after successful Beds24 creation
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_payments_user_id
  ON booking_payments(user_id);

CREATE INDEX IF NOT EXISTS idx_booking_payments_low_profile
  ON booking_payments(cardcom_low_profile_id);

-- ── embed_settings ────────────────────────────────────────────────────────────
-- Per-user configuration for the embedded calendar behaviour.
CREATE TABLE IF NOT EXISTS embed_settings (
  user_id          TEXT PRIMARY KEY,
  payment_required BOOLEAN NOT NULL DEFAULT false,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
