-- Migration 017: Availability Cache & API Keys
-- Cache table: one row per tenant (user) + room + date
-- user_id is mandatory because Beds24 room_ids can overlap across different accounts
CREATE TABLE IF NOT EXISTS availability_cache (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id     TEXT NOT NULL,
  property_id TEXT NOT NULL,
  date        DATE NOT NULL,
  price       NUMERIC NOT NULL,
  num_avail   INTEGER NOT NULL DEFAULT 1,  -- 0 = blocked/unavailable
  min_stay    INTEGER DEFAULT 1,
  cached_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, room_id, date)
);

CREATE INDEX IF NOT EXISTS idx_availability_cache_lookup
  ON availability_cache (user_id, room_id, date);

-- API Keys table: each customer gets one or more keys to embed in their website
CREATE TABLE IF NOT EXISTS api_keys (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  key              TEXT UNIQUE NOT NULL,  -- format: hst_live_<random>
  allowed_room_ids TEXT[] DEFAULT '{}',   -- empty = all rooms of this user
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  last_used_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_api_keys_key
  ON api_keys (key);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id
  ON api_keys (user_id);
