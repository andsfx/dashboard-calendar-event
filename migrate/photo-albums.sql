-- Photo Albums table
CREATE TABLE IF NOT EXISTS photo_albums (
  id TEXT PRIMARY KEY DEFAULT ('alb_' || replace(gen_random_uuid()::text, '-', '')),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  event_date TEXT DEFAULT '',
  cover_photo_url TEXT DEFAULT '',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE photo_albums ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read photo_albums" ON photo_albums;
CREATE POLICY "Public can read photo_albums" ON photo_albums FOR SELECT USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE photo_albums;

CREATE INDEX IF NOT EXISTS idx_photo_albums_slug ON photo_albums (slug);
CREATE INDEX IF NOT EXISTS idx_photo_albums_sort ON photo_albums (sort_order);

-- Update event_photos: add album_id column
ALTER TABLE event_photos ADD COLUMN IF NOT EXISTS album_id TEXT;
CREATE INDEX IF NOT EXISTS idx_event_photos_album ON event_photos (album_id);
