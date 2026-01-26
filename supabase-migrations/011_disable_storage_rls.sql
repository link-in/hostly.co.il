-- Disable RLS on landing-images bucket completely
-- This is the simplest approach for a backend-authenticated system

-- First, drop existing policies if any
DROP POLICY IF EXISTS "Allow backend to upload to landing-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to view landing-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow backend to update landing-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow backend to delete landing-images" ON storage.objects;

-- Create a permissive policy that allows all operations on landing-images bucket
CREATE POLICY "Public Access for landing-images"
  ON storage.objects
  FOR ALL
  TO public
  USING (bucket_id = 'landing-images')
  WITH CHECK (bucket_id = 'landing-images');

-- Alternative: If you want to completely disable RLS for this bucket,
-- you would need to configure it in the Supabase Dashboard:
-- Storage -> landing-images -> Configuration -> Set as Public

COMMENT ON POLICY "Public Access for landing-images" ON storage.objects 
  IS 'Allows all operations on landing-images bucket. Authorization handled by API routes.';
