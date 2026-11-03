-- AI assistant (web chat now, WhatsApp later).
-- All tables are server-side only: accessed with the service role, never from the browser.
-- Beds24 tokens are NOT stored here — users.beds24_token / beds24_refresh_token stay the single source of truth.
-- Safe to re-run: every statement is idempotent. Runs in one transaction, so it applies fully or not at all.

BEGIN;

-- Write actions proposed by the assistant. Nothing reaches Beds24 until a human confirms.
-- Doubles as the audit log of every change the assistant made.
CREATE TABLE IF NOT EXISTS ai_pending_actions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel      TEXT NOT NULL CHECK (channel IN ('web', 'whatsapp')),
  action_type  TEXT NOT NULL CHECK (action_type IN ('block_dates', 'update_price')),
  payload      JSONB NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending',
  result       JSONB,
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '15 minutes',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at  TIMESTAMPTZ
);
-- 'executing' = claimed by exactly one confirmation; guards against double-clicks running a change twice.
ALTER TABLE ai_pending_actions DROP CONSTRAINT IF EXISTS ai_pending_actions_status_check;
ALTER TABLE ai_pending_actions ADD CONSTRAINT ai_pending_actions_status_check
  CHECK (status IN ('pending', 'executing', 'executed', 'rejected', 'expired', 'failed'));
CREATE INDEX IF NOT EXISTS idx_ai_pending_actions_user_status ON ai_pending_actions(user_id, status);

-- One row per model request: per-user rate limiting and cost tracking.
CREATE TABLE IF NOT EXISTS ai_assistant_requests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel        TEXT NOT NULL CHECK (channel IN ('web', 'whatsapp')),
  model_id       TEXT NOT NULL,
  input_tokens   INTEGER,
  output_tokens  INTEGER,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_assistant_requests_user_time ON ai_assistant_requests(user_id, created_at DESC);

-- Phase 2: maps a WhatsApp sender to a Hostly user.
CREATE TABLE IF NOT EXISTS whatsapp_users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone_e164          TEXT NOT NULL UNIQUE,
  beds24_property_id  TEXT,  -- default property for this sender; NULL = all of the user's properties
  display_name        TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  verified_at         TIMESTAMPTZ,
  last_message_at     TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT whatsapp_users_phone_e164_format CHECK (phone_e164 ~ '^\+[1-9][0-9]{7,14}$')
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_users_user_id ON whatsapp_users(user_id);

-- Phase 2: server-side conversation history. UNIQUE wa_message_id dedupes Meta webhook retries.
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wa_message_id  TEXT UNIQUE,
  direction      TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  role           TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool')),
  content        JSONB NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user_time ON whatsapp_messages(user_id, created_at DESC);

ALTER TABLE ai_pending_actions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_assistant_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_only" ON ai_pending_actions;
DROP POLICY IF EXISTS "service_role_only" ON ai_assistant_requests;
DROP POLICY IF EXISTS "service_role_only" ON whatsapp_users;
DROP POLICY IF EXISTS "service_role_only" ON whatsapp_messages;

CREATE POLICY "service_role_only" ON ai_pending_actions    USING (FALSE);
CREATE POLICY "service_role_only" ON ai_assistant_requests USING (FALSE);
CREATE POLICY "service_role_only" ON whatsapp_users        USING (FALSE);
CREATE POLICY "service_role_only" ON whatsapp_messages     USING (FALSE);

COMMIT;

-- Verification: should list 4 tables, each with rowsecurity = true.
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('ai_pending_actions', 'ai_assistant_requests', 'whatsapp_users', 'whatsapp_messages')
ORDER BY tablename;
