-- Create Demo User for HOSTLY
-- This user will use mock data provider instead of Beds24

-- Add is_demo column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;

-- Create index for faster demo user lookup
CREATE INDEX IF NOT EXISTS idx_users_is_demo ON users(is_demo);

-- Insert demo user
-- Password: demo2026 (hashed with bcrypt)
INSERT INTO users (
  id, 
  email, 
  password_hash, 
  display_name, 
  first_name,
  last_name,
  property_id, 
  room_id, 
  landing_page_url, 
  phone_number,
  role,
  is_demo
)
VALUES (
  'demo_user_001',
  'demo@hostly.co.il',
  '$2b$10$wKIxJxpFloKevDuJch7eJ.IyfgvrgVMs05hIGAAJlYUauh.bhuJ46',
  'דמו - Mountain View',
  'דמו',
  'משתמש',
  'DEMO_999999',
  'DEMO_ROOM_999',
  'https://demo.hostly.co.il',
  '+972501234567',
  'owner',
  true
)
ON CONFLICT (id) DO UPDATE SET
  is_demo = true,
  email = EXCLUDED.email,
  display_name = EXCLUDED.display_name;

-- Add comment
COMMENT ON COLUMN users.is_demo IS 'Demo user flag - uses mock data instead of Beds24';

-- Done!
SELECT 'Demo user created successfully! Email: demo@hostly.co.il' AS result;
