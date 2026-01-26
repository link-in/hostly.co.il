-- Fix Storage RLS policies for landing-images bucket
-- Allow backend to upload/manage images

-- Enable RLS on storage.objects (if not already enabled)
-- Note: This might already be enabled by default

-- Policy: Allow all operations on landing-images bucket
-- Since we're using NextAuth (not Supabase Auth), we allow all authenticated backend requests

-- Insert (Upload)
CREATE POLICY "Allow backend to upload to landing-images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'landing-images');

-- Select (View/Download)
CREATE POLICY "Allow public to view landing-images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'landing-images');

-- Update (Metadata)
CREATE POLICY "Allow backend to update landing-images"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'landing-images')
  WITH CHECK (bucket_id = 'landing-images');

-- Delete
CREATE POLICY "Allow backend to delete landing-images"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'landing-images');

-- Note: Authorization is handled by the API route with NextAuth session
