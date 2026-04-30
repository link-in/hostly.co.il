-- Allow NULL for password_hash to support Google OAuth users (no password)
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
