-- =======================
-- Landing Pages System Migration
-- =======================

-- נקה טבלאות קודמות אם קיימות
DROP TABLE IF EXISTS landing_images CASCADE;
DROP TABLE IF EXISTS landing_sections CASCADE;
DROP TABLE IF EXISTS landing_pages CASCADE;
DROP FUNCTION IF EXISTS create_default_sections(UUID);
DROP FUNCTION IF EXISTS update_landing_updated_at();

-- =======================
-- 1. טבלה ראשית - landing_pages
-- =======================
CREATE TABLE IF NOT EXISTS landing_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  subdomain TEXT UNIQUE NOT NULL,
  
  -- מטא דאטה בסיסית
  site_title TEXT NOT NULL DEFAULT '',
  site_subtitle TEXT DEFAULT '',
  
  -- הגדרות כלליות (JSON לגמישות)
  meta_settings JSONB DEFAULT '{
    "whatsapp_number": "",
    "waze_link": "",
    "phone": "",
    "email": "",
    "address": ""
  }'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CHECK (subdomain ~ '^[a-z0-9-]+$')
);

CREATE INDEX idx_landing_subdomain ON landing_pages(subdomain);
CREATE INDEX idx_landing_user ON landing_pages(user_id);

-- =======================
-- 2. טבלת Sections - תוכן דינמי
-- =======================
CREATE TABLE IF NOT EXISTS landing_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landing_page_id UUID NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
  
  -- סוג הסעיף
  section_type TEXT NOT NULL, -- 'hero', 'features', 'portfolio', 'attractions', etc.
  order_index INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  
  -- תוכן דינמי (JSON)
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(landing_page_id, section_type)
);

CREATE INDEX idx_sections_page ON landing_sections(landing_page_id);
CREATE INDEX idx_sections_type ON landing_sections(section_type);

-- =======================
-- 3. טבלת תמונות - מעקב אחר uploads
-- =======================
CREATE TABLE IF NOT EXISTS landing_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landing_page_id UUID NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
  
  section_type TEXT NOT NULL, -- 'hero', 'portfolio', etc.
  storage_path TEXT NOT NULL, -- landing-images/{user_id}/hero/img1.jpg
  public_url TEXT NOT NULL,
  
  order_index INTEGER DEFAULT 0,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_images_page ON landing_images(landing_page_id);
CREATE INDEX idx_images_section ON landing_images(section_type);

-- =======================
-- 4. Row Level Security (RLS)
-- =======================
ALTER TABLE landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_images ENABLE ROW LEVEL SECURITY;

-- Policy: משתמש רואה רק את הדף שלו
CREATE POLICY "Users can view own landing page"
  ON landing_pages FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update own landing page"
  ON landing_pages FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own landing page"
  ON landing_pages FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Policy: sections
CREATE POLICY "Users can view own sections"
  ON landing_sections FOR SELECT
  USING (landing_page_id IN (SELECT id FROM landing_pages WHERE user_id = auth.uid()::text));

CREATE POLICY "Users can manage own sections"
  ON landing_sections FOR ALL
  USING (landing_page_id IN (SELECT id FROM landing_pages WHERE user_id = auth.uid()::text));

-- Policy: images
CREATE POLICY "Users can view own images"
  ON landing_images FOR SELECT
  USING (landing_page_id IN (SELECT id FROM landing_pages WHERE user_id = auth.uid()::text));

CREATE POLICY "Users can manage own images"
  ON landing_images FOR ALL
  USING (landing_page_id IN (SELECT id FROM landing_pages WHERE user_id = auth.uid()::text));

-- Public access for site display (no auth)
CREATE POLICY "Public can view published landing pages"
  ON landing_pages FOR SELECT
  USING (true);

CREATE POLICY "Public can view published sections"
  ON landing_sections FOR SELECT
  USING (is_visible = true);

CREATE POLICY "Public can view published images"
  ON landing_images FOR SELECT
  USING (true);

-- =======================
-- 5. Auto-update timestamps
-- =======================
CREATE OR REPLACE FUNCTION update_landing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER landing_pages_updated_at
BEFORE UPDATE ON landing_pages
FOR EACH ROW
EXECUTE FUNCTION update_landing_updated_at();

CREATE TRIGGER landing_sections_updated_at
BEFORE UPDATE ON landing_sections
FOR EACH ROW
EXECUTE FUNCTION update_landing_updated_at();

-- =======================
-- 6. Helper: יצירת sections ברירת מחדל ללקוח חדש
-- =======================
CREATE OR REPLACE FUNCTION create_default_sections(page_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Hero Section
  INSERT INTO landing_sections (landing_page_id, section_type, order_index, content)
  VALUES (page_id, 'hero', 1, '{
    "images": [],
    "title": "ברוכים הבאים",
    "subtitle": ""
  }'::jsonb);
  
  -- Features Section
  INSERT INTO landing_sections (landing_page_id, section_type, order_index, content)
  VALUES (page_id, 'features', 2, '{
    "title": "בין פלגי הדן אל מול נופי חרמון",
    "description": "היחידה שלנו מציעה לכם חוויה מושלמת",
    "items": [
      {"icon": "🛏️", "title": "2 חדרי שינה"},
      {"icon": "📍", "title": "מיקום נוח במרכז"},
      {"icon": "🚪", "title": "כניסה נפרדת ופרטיות"},
      {"icon": "🏞️", "title": "מרפסת נוף ענקית"},
      {"icon": "🍽️", "title": "מטבח מאובזר"},
      {"icon": "🛋️", "title": "חלל משותף נוח"}
    ]
  }'::jsonb);
  
  -- Portfolio Section
  INSERT INTO landing_sections (landing_page_id, section_type, order_index, content)
  VALUES (page_id, 'portfolio', 3, '{
    "categories": [
      {"id": "living_room", "name": "חלל משותף"},
      {"id": "master_bedroom", "name": "יחידת הורים"},
      {"id": "porch", "name": "המרפסת שלנו"},
      {"id": "extra_room", "name": "חדר נוסף"}
    ],
    "images": []
  }'::jsonb);
  
  -- Contact Section
  INSERT INTO landing_sections (landing_page_id, section_type, order_index, content)
  VALUES (page_id, 'contact', 8, '{
    "location": "כתובת כאן",
    "phone": "",
    "email": ""
  }'::jsonb);
  
  -- Attractions, Restaurants, Reviews - אופציונלי
  INSERT INTO landing_sections (landing_page_id, section_type, order_index, content)
  VALUES 
    (page_id, 'attractions', 4, '{"items": []}'::jsonb),
    (page_id, 'restaurants', 5, '{"items": []}'::jsonb),
    (page_id, 'reviews', 6, '{"items": []}'::jsonb),
    (page_id, 'secret_trails', 7, '{"items": []}'::jsonb);
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE landing_pages IS 'דפי נחיתה ללקוחות - מטא דאטה';
COMMENT ON TABLE landing_sections IS 'סעיפי תוכן דינמיים - JSON גמיש';
COMMENT ON TABLE landing_images IS 'מעקב אחר תמונות שהועלו ל-Storage';
