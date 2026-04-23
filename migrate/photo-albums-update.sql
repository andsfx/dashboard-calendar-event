ALTER TABLE photo_albums ADD COLUMN IF NOT EXISTS event_id TEXT DEFAULT '';
ALTER TABLE photo_albums ADD COLUMN IF NOT EXISTS lokasi TEXT DEFAULT '';
ALTER TABLE photo_albums ADD COLUMN IF NOT EXISTS theme_id TEXT DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_photo_albums_event ON photo_albums (event_id) WHERE event_id != '';
CREATE INDEX IF NOT EXISTS idx_photo_albums_theme ON photo_albums (theme_id) WHERE theme_id != '';
