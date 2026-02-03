-- Add booking_source column to customers table

-- Add the column
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS booking_source TEXT;

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_customers_booking_source ON customers(booking_source);

-- Update existing customers to have 'unknown' source
UPDATE customers 
SET booking_source = 'unknown' 
WHERE booking_source IS NULL;
