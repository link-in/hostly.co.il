-- Create check_ins table for digital check-in system
-- This table manages the entire digital check-in process for guests

CREATE TABLE IF NOT EXISTS check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id TEXT NOT NULL,
  user_id TEXT NOT NULL, -- Property owner
  token TEXT UNIQUE NOT NULL, -- Unique token for check-in link
  
  -- Booking details
  guest_name TEXT NOT NULL,
  guest_phone TEXT NOT NULL,
  guest_email TEXT,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  num_adults INTEGER DEFAULT 2,
  num_children INTEGER DEFAULT 0,
  
  -- Information collected during check-in
  id_document_url TEXT, -- URL to ID document in Storage
  id_document_type TEXT, -- 'id_card' | 'passport' | 'drivers_license'
  id_number TEXT,
  date_of_birth DATE,
  address TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  actual_num_guests INTEGER,
  estimated_arrival_time TIME,
  
  -- Digital signature
  signature_data_url TEXT, -- base64 of the signature
  signature_timestamp TIMESTAMPTZ,
  terms_accepted BOOLEAN DEFAULT false,
  terms_version TEXT DEFAULT 'v1.0',
  ip_address TEXT, -- For legal documentation
  
  -- Status
  status TEXT DEFAULT 'pending', -- 'pending' | 'completed' | 'expired'
  completed_at TIMESTAMPTZ,
  
  -- Access code
  access_code TEXT,
  access_code_sent_at TIMESTAMPTZ,
  
  -- Reminders
  reminder_sent_at TIMESTAMPTZ,
  
  -- Timing
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
  
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_check_ins_token ON check_ins(token);
CREATE INDEX IF NOT EXISTS idx_check_ins_booking_id ON check_ins(booking_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_user_id ON check_ins(user_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_status ON check_ins(status);
CREATE INDEX IF NOT EXISTS idx_check_ins_check_in_date ON check_ins(check_in_date);

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_check_ins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_ins_updated_at
  BEFORE UPDATE ON check_ins
  FOR EACH ROW
  EXECUTE FUNCTION update_check_ins_updated_at();

-- Enable RLS
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;

-- Allow service_role to bypass all policies
CREATE POLICY check_ins_service_role_all ON check_ins
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Comment on table
COMMENT ON TABLE check_ins IS 'Digital check-in records for guests';
