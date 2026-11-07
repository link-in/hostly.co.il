-- Beds24 V1 JSON API property key (SETTINGS > PROPERTIES > LINK > propKey).
-- API V2 returns no pictures, so the site builder reads them through V1
-- getPropertyContent, which requires this key per property.
-- Server-side only: read with the service role, never copied into the session.

ALTER TABLE users ADD COLUMN IF NOT EXISTS beds24_prop_key TEXT;
