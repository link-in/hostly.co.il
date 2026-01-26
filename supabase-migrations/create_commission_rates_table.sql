-- Create commission_rates table
CREATE TABLE IF NOT EXISTS commission_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform_name TEXT NOT NULL UNIQUE,
  commission_rate DECIMAL(5,4) NOT NULL CHECK (commission_rate >= 0 AND commission_rate <= 1),
  display_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default commission rates
INSERT INTO commission_rates (platform_name, commission_rate, display_name) VALUES
('booking', 0.1500, 'Booking.com'),
('airbnb', 0.1600, 'Airbnb'),
('direct', 0.0000, 'הזמנה ישירה')
ON CONFLICT (platform_name) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_commission_rates_platform ON commission_rates(platform_name);
CREATE INDEX IF NOT EXISTS idx_commission_rates_active ON commission_rates(is_active);

-- Add RLS policies
ALTER TABLE commission_rates ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read commission rates
CREATE POLICY "Allow authenticated users to read commission rates" 
ON commission_rates FOR SELECT 
TO authenticated 
USING (true);

-- Allow admin users to update commission rates
CREATE POLICY "Allow admin users to update commission rates" 
ON commission_rates FOR UPDATE 
TO authenticated 
USING (true);

-- Allow admin users to insert commission rates
CREATE POLICY "Allow admin users to insert commission rates" 
ON commission_rates FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Add comment
COMMENT ON TABLE commission_rates IS 'Commission rates for different booking platforms';
