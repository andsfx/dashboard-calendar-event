CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read site_settings" ON site_settings;
CREATE POLICY "Public can read site_settings" ON site_settings FOR SELECT USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE site_settings;

INSERT INTO site_settings (key, value) VALUES (
  'instagram_posts',
  '["https://www.instagram.com/p/DXYxAlQkXrD/", "https://www.instagram.com/metmalbekasi/", ""]'
) ON CONFLICT (key) DO NOTHING;
