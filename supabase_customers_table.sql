-- Create customers table for managing guest information
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

-- Add RLS (Row Level Security) policies
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own customers
CREATE POLICY customers_select_policy ON customers
  FOR SELECT
  USING (user_id = current_setting('app.current_user_id', TRUE)::TEXT OR current_setting('app.current_user_role', TRUE) = 'admin');

-- Policy: Users can only insert their own customers
CREATE POLICY customers_insert_policy ON customers
  FOR INSERT
  WITH CHECK (user_id = current_setting('app.current_user_id', TRUE)::TEXT);

-- Policy: Users can only update their own customers
CREATE POLICY customers_update_policy ON customers
  FOR UPDATE
  USING (user_id = current_setting('app.current_user_id', TRUE)::TEXT);

-- Policy: Users can only delete their own customers
CREATE POLICY customers_delete_policy ON customers
  FOR DELETE
  USING (user_id = current_setting('app.current_user_id', TRUE)::TEXT OR current_setting('app.current_user_role', TRUE) = 'admin');
