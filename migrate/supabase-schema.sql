-- ============================================================
-- Supabase Schema for Dashboard Calendar Event
-- Metropolitan Mall Bekasi
-- Migration from Google Sheets
-- ============================================================

-- 1. EVENTS TABLE
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY DEFAULT ('evt_' || replace(gen_random_uuid()::text, '-', '')::text),
  date_str DATE NOT NULL,
  date_end DATE,
  day TEXT NOT NULL DEFAULT '',
  tanggal TEXT NOT NULL DEFAULT '',
  jam TEXT DEFAULT '',
  acara TEXT NOT NULL,
  lokasi TEXT DEFAULT '',
  eo TEXT DEFAULT '',
  pic TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  keterangan TEXT DEFAULT '',
  month TEXT NOT NULL DEFAULT '',
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('draft','upcoming','ongoing','past')),
  category TEXT DEFAULT 'Umum',
  categories TEXT[] DEFAULT '{}',
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
  event_model TEXT DEFAULT '' CHECK (event_model IN ('','free','bayar','support')),
  event_nominal TEXT DEFAULT '',
  event_model_notes TEXT DEFAULT '',
  source_draft_id TEXT DEFAULT '',
  is_multi_day BOOLEAN DEFAULT FALSE,
  day_time_slots JSONB,
  event_type TEXT DEFAULT 'single' CHECK (event_type IN ('single','multi_day','recurring')),
  recurrence_group_id TEXT DEFAULT '',
  is_recurring BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. DRAFT EVENTS TABLE
CREATE TABLE IF NOT EXISTS draft_events (
  id TEXT PRIMARY KEY DEFAULT ('drf_' || replace(gen_random_uuid()::text, '-', '')::text),
  date_str DATE NOT NULL,
  date_end DATE,
  day TEXT NOT NULL DEFAULT '',
  tanggal TEXT NOT NULL DEFAULT '',
  jam TEXT DEFAULT '',
  acara TEXT NOT NULL,
  lokasi TEXT DEFAULT '',
  eo TEXT DEFAULT '',
  pic TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  keterangan TEXT DEFAULT '',
  internal_note TEXT DEFAULT '',
  month TEXT NOT NULL DEFAULT '',
  category TEXT DEFAULT 'Umum',
  categories TEXT[] DEFAULT '{}',
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
  event_model TEXT DEFAULT '' CHECK (event_model IN ('','free','bayar','support')),
  event_nominal TEXT DEFAULT '',
  event_model_notes TEXT DEFAULT '',
  progress TEXT DEFAULT 'draft' CHECK (progress IN ('draft','confirm','cancel')),
  published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  is_multi_day BOOLEAN DEFAULT FALSE,
  day_time_slots JSONB,
  event_type TEXT DEFAULT 'single' CHECK (event_type IN ('single','multi_day','recurring')),
  recurrence_group_id TEXT DEFAULT '',
  is_recurring BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ANNUAL THEMES TABLE
CREATE TABLE IF NOT EXISTS annual_themes (
  id TEXT PRIMARY KEY DEFAULT ('thm_' || replace(gen_random_uuid()::text, '-', '')::text),
  name TEXT NOT NULL,
  date_start DATE NOT NULL,
  date_end DATE NOT NULL,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. HOLIDAYS TABLE
CREATE TABLE IF NOT EXISTS holidays (
  id TEXT PRIMARY KEY DEFAULT ('hdy_' || replace(gen_random_uuid()::text, '-', '')::text),
  tanggal TEXT NOT NULL,
  date_str DATE NOT NULL,
  day TEXT NOT NULL DEFAULT '',
  month TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('libur_nasional','cuti_bersama')),
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_events_date_str ON events (date_str);
CREATE INDEX IF NOT EXISTS idx_events_status ON events (status);
CREATE INDEX IF NOT EXISTS idx_events_recurrence_group ON events (recurrence_group_id) WHERE recurrence_group_id != '';
CREATE INDEX IF NOT EXISTS idx_events_date_end ON events (date_end) WHERE date_end IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_draft_events_progress ON draft_events (progress);
CREATE INDEX IF NOT EXISTS idx_draft_events_deleted ON draft_events (deleted);
CREATE INDEX IF NOT EXISTS idx_draft_events_published ON draft_events (published);

CREATE INDEX IF NOT EXISTS idx_holidays_date_str ON holidays (date_str);

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER draft_events_updated_at
  BEFORE UPDATE ON draft_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE annual_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

-- Public read access for events, themes, holidays
CREATE POLICY "Public can read events" ON events FOR SELECT USING (true);
CREATE POLICY "Public can read annual_themes" ON annual_themes FOR SELECT USING (true);
CREATE POLICY "Public can read holidays" ON holidays FOR SELECT USING (true);

-- Public can insert draft events (for public submission form)
CREATE POLICY "Public can insert draft_events" ON draft_events FOR INSERT WITH CHECK (true);

-- Public can read draft events (needed for admin after login - admin uses service_role anyway)
CREATE POLICY "Public can read draft_events" ON draft_events FOR SELECT USING (true);

-- Service role bypasses RLS automatically, so no explicit admin policies needed
-- All admin mutations go through server-side with service_role key

-- ============================================================
-- ENABLE REALTIME
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE events;
ALTER PUBLICATION supabase_realtime ADD TABLE draft_events;
ALTER PUBLICATION supabase_realtime ADD TABLE annual_themes;
ALTER PUBLICATION supabase_realtime ADD TABLE holidays;
