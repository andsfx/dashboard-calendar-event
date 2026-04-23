-- Event Photos table
CREATE TABLE IF NOT EXISTS event_photos (
  id TEXT PRIMARY KEY DEFAULT ('eph_' || replace(gen_random_uuid()::text, '-', '')),
  url TEXT NOT NULL,
  caption TEXT NOT NULL,
  event_date TEXT DEFAULT '',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE event_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read event_photos" ON event_photos;
CREATE POLICY "Public can read event_photos" ON event_photos FOR SELECT USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE event_photos;

CREATE INDEX IF NOT EXISTS idx_event_photos_sort ON event_photos (sort_order);

-- Storage bucket for event photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('event-photos', 'event-photos', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Public can read event photos" ON storage.objects;
CREATE POLICY "Public can read event photos" ON storage.objects FOR SELECT USING (bucket_id = 'event-photos');

DROP POLICY IF EXISTS "Anyone can upload event photos" ON storage.objects;
CREATE POLICY "Anyone can upload event photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'event-photos');

DROP POLICY IF EXISTS "Anyone can delete event photos" ON storage.objects;
CREATE POLICY "Anyone can delete event photos" ON storage.objects FOR DELETE USING (bucket_id = 'event-photos');
