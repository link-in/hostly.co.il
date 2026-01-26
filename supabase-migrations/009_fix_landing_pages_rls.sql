-- Fix RLS policies for landing_pages to work with NextAuth
-- NextAuth doesn't use Supabase Auth, so we can't rely on auth.uid()

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own landing page" ON landing_pages;
DROP POLICY IF EXISTS "Users can update own landing page" ON landing_pages;
DROP POLICY IF EXISTS "Users can insert own landing page" ON landing_pages;
DROP POLICY IF EXISTS "Users can view own sections" ON landing_sections;
DROP POLICY IF EXISTS "Users can manage own sections" ON landing_sections;
DROP POLICY IF EXISTS "Users can view own images" ON landing_images;
DROP POLICY IF EXISTS "Users can manage own images" ON landing_images;

-- Simple policies: Allow authenticated backend to manage everything
-- The API route will handle authorization with NextAuth session

-- Landing Pages: Allow all operations (authorization handled in API)
CREATE POLICY "Allow backend access to landing_pages"
  ON landing_pages
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Landing Sections: Allow all operations
CREATE POLICY "Allow backend access to landing_sections"
  ON landing_sections
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Landing Images: Allow all operations
CREATE POLICY "Allow backend access to landing_images"
  ON landing_images
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Note: Public can still view published pages (existing policies remain)
-- The "Public can view" policies should still work for public display
