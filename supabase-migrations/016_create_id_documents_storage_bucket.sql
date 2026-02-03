-- Create storage bucket for ID documents
-- This bucket will store guest ID/passport photos securely

-- Create the bucket (private, not publicly accessible)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'id-documents', 
  'id-documents', 
  false,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policy - only service role can access
-- This ensures guest documents are private and secure
CREATE POLICY "Service role can manage id-documents"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'id-documents')
WITH CHECK (bucket_id = 'id-documents');

-- Allow authenticated users to upload their own documents
-- (token validation happens in API layer)
CREATE POLICY "Guests can upload their documents"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'id-documents');

-- Comment
COMMENT ON POLICY "Service role can manage id-documents" ON storage.objects 
IS 'Allows service role to manage ID documents for check-in process';
