-- Adds an optional secondary phone number (e.g. a co-host / property manager)
-- that receives the same owner-facing WhatsApp system notifications as the
-- primary phone_number: new bookings (from Beds24 webhook or the direct
-- booking website) and check-in-completed messages.
ALTER TABLE users ADD COLUMN IF NOT EXISTS secondary_phone_number TEXT;

COMMENT ON COLUMN users.secondary_phone_number IS 'Optional additional phone number (e.g. co-host/manager) that receives the same owner-facing WhatsApp notifications as phone_number';
