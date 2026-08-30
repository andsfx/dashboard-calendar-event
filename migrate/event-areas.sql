-- Foto Area Event — tabel area event + foto area
-- Diterapkan manual via SQL Editor / node migrate/run-schema.mjs (DDL manual user step).

-- 1. EVENT AREAS
CREATE TABLE IF NOT EXISTS event_areas (
  id TEXT PRIMARY KEY DEFAULT ('era_' || replace(gen_random_uuid()::text, '-', '')),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  cover_photo_url TEXT DEFAULT '',
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE event_areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read event_areas" ON event_areas;
CREATE POLICY "Public can read event_areas" ON event_areas FOR SELECT USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE event_areas;

CREATE INDEX IF NOT EXISTS idx_event_areas_sort ON event_areas (sort_order);

-- 2. AREA PHOTOS (foto per area — tampil dalam galeri area di landing)
CREATE TABLE IF NOT EXISTS area_photos (
  id TEXT PRIMARY KEY DEFAULT ('aph_' || replace(gen_random_uuid()::text, '-', '')),
  area_id TEXT NOT NULL REFERENCES event_areas(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT DEFAULT '',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE area_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read area_photos" ON area_photos;
CREATE POLICY "Public can read area_photos" ON area_photos FOR SELECT USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE area_photos;

CREATE INDEX IF NOT EXISTS idx_area_photos_area ON area_photos (area_id);
CREATE INDEX IF NOT EXISTS idx_area_photos_sort ON area_photos (sort_order);