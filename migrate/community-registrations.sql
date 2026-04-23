CREATE TABLE IF NOT EXISTS community_registrations (
  id TEXT PRIMARY KEY DEFAULT ('crg_' || replace(gen_random_uuid()::text, '-', '')),
  community_name TEXT NOT NULL,
  community_type TEXT NOT NULL,
  pic TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT DEFAULT '',
  instagram TEXT DEFAULT '',
  description TEXT DEFAULT '',
  preferred_date TEXT DEFAULT '',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE community_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can insert community_registrations" ON community_registrations;
CREATE POLICY "Public can insert community_registrations" ON community_registrations FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can read community_registrations" ON community_registrations;
CREATE POLICY "Public can read community_registrations" ON community_registrations FOR SELECT USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE community_registrations;
