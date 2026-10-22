-- Site builder wizard drafts: one saved draft per user, so editing can be
-- resumed later. `draft` is validated with `storedDraftSchema` before saving
-- (src/lib/landingBuilder/persistence/storedDraft.ts).

CREATE TABLE IF NOT EXISTS landing_builder_drafts (
  user_id    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  draft      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Read and written only by server actions with the service role.
ALTER TABLE landing_builder_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON landing_builder_drafts
  USING (FALSE);
