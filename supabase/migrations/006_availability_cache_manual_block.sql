-- Distinguish between manual owner blocks and booking-driven blocks in availability_cache.
-- Without this, a cancelled booking's dates are mistakenly preserved as "manual blocks"
-- on the next cache refresh, keeping them closed indefinitely.
--
-- is_manual_block = true  → owner explicitly blocked the date from the dashboard UI
-- is_manual_block = false → date was blocked (or freed) by the booking overlay

ALTER TABLE availability_cache
  ADD COLUMN IF NOT EXISTS is_manual_block boolean NOT NULL DEFAULT false;
