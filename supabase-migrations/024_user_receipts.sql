-- Per-host receipt provider settings (iCount first; swappable later)
-- and a log of documents issued from bookings.

CREATE TABLE IF NOT EXISTS user_receipt_settings (
  user_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'icount',
  credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
  default_vat_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE user_receipt_settings IS 'Per-user fiscal receipt provider credentials (e.g. iCount API token)';
COMMENT ON COLUMN user_receipt_settings.provider IS 'icount | mock (extensible)';
COMMENT ON COLUMN user_receipt_settings.credentials IS 'Provider secrets JSON, e.g. { "apiToken": "..." } — never expose raw token to client';

CREATE TABLE IF NOT EXISTS issued_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  beds24_booking_id TEXT NOT NULL,
  document_type TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  customer_vat_id TEXT,
  description TEXT,
  provider TEXT NOT NULL,
  external_doc_id TEXT,
  external_doc_number TEXT,
  pdf_url TEXT,
  raw_response JSONB,
  status TEXT NOT NULL DEFAULT 'issued',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_issued_receipts_user_booking
  ON issued_receipts (user_id, beds24_booking_id);

CREATE INDEX IF NOT EXISTS idx_issued_receipts_user_created
  ON issued_receipts (user_id, created_at DESC);

COMMENT ON TABLE issued_receipts IS 'Fiscal documents issued from dashboard bookings via receipt providers';
COMMENT ON COLUMN issued_receipts.document_type IS 'receipt | tax_invoice | tax_invoice_receipt';
COMMENT ON COLUMN issued_receipts.payment_method IS 'cash | credit_card | bank_transfer | bit | other';
COMMENT ON COLUMN issued_receipts.status IS 'issued | failed';

ALTER TABLE user_receipt_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE issued_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_receipt_settings_service_role_all ON user_receipt_settings
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY issued_receipts_service_role_all ON issued_receipts
  FOR ALL
  USING (true)
  WITH CHECK (true);
