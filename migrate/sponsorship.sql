-- ============================================================
-- Sponsorship / Akuisisi Sponsor — Metropolitan Mall Bekasi
-- Mengikuti CONTEXT.md domain: Proposal Event (1 file/event),
-- Minat Support (lead), Lead Sponsor (status review)
-- ============================================================

-- 1. EVENT PROPOSALS — 1-to-1 dengan Event via FK event_id UNIQUE
CREATE TABLE IF NOT EXISTS event_proposals (
  id TEXT PRIMARY KEY DEFAULT ('prp_' || replace(gen_random_uuid()::text, '-', '')),
  event_id TEXT UNIQUE NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL DEFAULT '',
  mime_type TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SPONSOR LEADS — Minat Support publik
CREATE TABLE IF NOT EXISTS sponsor_leads (
  id TEXT PRIMARY KEY DEFAULT ('sld_' || replace(gen_random_uuid()::text, '-', '')),
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','contacted','agreed','declined')),
  internal_notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RLS
ALTER TABLE event_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsor_leads ENABLE ROW LEVEL SECURITY;

-- Publik bisa baca proposal (file R2 public; landing butuh daftar event ber-proposal)
DROP POLICY IF EXISTS "Public can read event proposals" ON event_proposals;
CREATE POLICY "Public can read event proposals" ON event_proposals FOR SELECT USING (true);

-- Publik bisa insert lead (form no-login); read/write lain via proxy service-role
DROP POLICY IF EXISTS "Public can insert sponsor leads" ON sponsor_leads;
CREATE POLICY "Public can insert sponsor leads" ON sponsor_leads FOR INSERT WITH CHECK (true);

-- 4. INDEX
CREATE INDEX IF NOT EXISTS idx_event_proposals_event_id ON event_proposals (event_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_leads_event_id ON sponsor_leads (event_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_leads_status ON sponsor_leads (status);
