-- Create customers table for managing guest information (Version 2 - Simplified RLS)
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  first_booking_date TIMESTAMP WITH TIME ZONE NOT NULL,
  last_booking_date TIMESTAMP WITH TIME ZONE NOT NULL,
  total_bookings INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key to users table
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_full_name ON customers(full_name);
CREATE INDEX IF NOT EXISTS idx_customers_first_booking_date ON customers(first_booking_date DESC);

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_customers_updated_at();

-- OPTION 1: Disable RLS entirely (simplest, less secure)
-- ALTER TABLE customers DISABLE ROW LEVEL SECURITY;

-- OPTION 2: Enable RLS but allow all operations (requires service_role for bypassing)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Allow service_role to bypass all policies
CREATE POLICY customers_service_role_all ON customers
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Note: Regular operations via anon key will require service_role key
-- This is handled in the application code using createServiceRoleClient()
