-- Publishing from the site builder wizard (docs/site-publishing.md, phase P1).
-- "Publish" copies the wizard draft (validated with `storedDraftSchema`) into
-- `published_draft`; edits in `landing_builder_drafts` stay private until the
-- next publish. Rows without `published_draft` keep the old landing renderer.

ALTER TABLE landing_pages
  ADD COLUMN IF NOT EXISTS published_draft JSONB,
  ADD COLUMN IF NOT EXISTS published_at    TIMESTAMPTZ;
