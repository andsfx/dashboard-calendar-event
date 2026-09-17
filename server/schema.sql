-- ============================================================================
-- VPS Postgres Schema — Opsi B (Supabase dilepas, backend Express/Postgres VPS)
-- Metropolitan Mall Bekasi
-- ----------------------------------------------------------------------------
-- SUMBER KOLOM: dump aktual prod (information_schema + pg_constraint + pg_indexes
-- via Management API, 2026-09-08) — BUKAN asumsi dari migrate/*.sql lama.
--
-- Aturan:
--   * events.date_str = TEXT (drift prod; migrate lama memakai DATE).
--   * events.id = TEXT (campuran 189 'evt_...' + 61 UUID polos di prod).
--   * users: TIDAK ada auth.users di VPS — tabel users mandiri (uuid PK),
--     password_hash TEXT baru utk bcrypt compare (login Opsi B).
--   * FK ke auth.users dihilangkan (auth.users tidak ada di VPS); FK penerima
--     diganti ke public.users(id).
--   * Tanpa RLS / realtime publication (bukan Supabase) — akses via API layer.
--   * Tanpa enum business_category_enum — dipakai tenant_event_surveys
--     persis seperti prod (USER-DEFINED enum 'business_category_enum').
--
-- Tabel "deferred" (ada di prod tapi TIDAK direferensi kode):
--   batches, batch_slots, join_requests, venue_feedback, admin_credentials,
--   admin_settings — lihat komentar di akhir file. Tidak dimigrasi.
-- ============================================================================

-- ============================================================================
-- 0. ENUM
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'business_category_enum') THEN
    CREATE TYPE business_category_enum AS ENUM ('fnb', 'retail', 'jasa', 'other');
  END IF;
END $$;

-- ============================================================================
-- 1. EVENT AREAS
-- ============================================================================

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

CREATE INDEX IF NOT EXISTS idx_event_areas_sort ON event_areas (sort_order);

-- Canonical master lokasi — unique name (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_areas_name ON event_areas (lower(trim(name)));

-- Normalize existing area record (canonical name per user decision)
UPDATE event_areas SET name = 'Panggung Funworld Lt. 3' WHERE lower(trim(name)) = 'panggung lt. 3';

-- Seed canonical area (idempotent — skip bila nama sudah ada)
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT * FROM (VALUES
      ('Panggung Funworld Lt. 3', 0),
      ('Panggung Lt. Dasar', 1),
      ('Musholla Lt. 3', 2),
      ('Atrium 2 Lt. Dasar', 3),
      ('Foodventure Lt. 2', 4),
      ('Parkir Timur', 5),
      ('Gedung Parkir Mobil P7', 6),
      ('Keliling Mall', 7)
    ) AS t(name, sort_order)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM event_areas WHERE lower(trim(name)) = lower(trim(rec.name))) THEN
      INSERT INTO event_areas (name, sort_order, is_active) VALUES (rec.name, rec.sort_order, true);
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- 2. COMMUNITY REGISTRATIONS (target FK events.organization_id)
-- ============================================================================

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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  admin_note TEXT DEFAULT '',
  organization_type TEXT DEFAULT 'komunitas',
  type_specific_data JSONB DEFAULT '{}',
  organization_name TEXT,
  proposal_file_url TEXT DEFAULT '',
  proposal_file_name TEXT DEFAULT '',
  proposal_file_size INTEGER DEFAULT 0
);

-- CHECK constraint organization_type: 8-value canonical + legacy (prod aktual)
ALTER TABLE community_registrations
  DROP CONSTRAINT IF EXISTS chk_organization_type;
ALTER TABLE community_registrations
  ADD CONSTRAINT chk_organization_type CHECK (
    organization_type IS NULL OR organization_type IN (
      'community', 'school', 'company', 'eo', 'campus', 'government', 'ngo', 'other',
      'komunitas', 'umkm', 'organisasi', 'lainnya'
    )
  );

-- Length constraints (prod aktual)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_community_name_length' AND conrelid = 'community_registrations'::regclass) THEN
    ALTER TABLE community_registrations ADD CONSTRAINT chk_community_name_length
      CHECK (length(trim(community_name)) >= 3 AND length(trim(community_name)) <= 200);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_organization_name_length' AND conrelid = 'community_registrations'::regclass) THEN
    ALTER TABLE community_registrations ADD CONSTRAINT chk_organization_name_length
      CHECK (organization_name IS NULL OR (length(trim(organization_name)) >= 3 AND length(trim(organization_name)) <= 200));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_pic_length' AND conrelid = 'community_registrations'::regclass) THEN
    ALTER TABLE community_registrations ADD CONSTRAINT chk_pic_length
      CHECK (length(trim(pic)) >= 3 AND length(trim(pic)) <= 100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_phone_length' AND conrelid = 'community_registrations'::regclass) THEN
    ALTER TABLE community_registrations ADD CONSTRAINT chk_phone_length
      CHECK (length(phone) >= 10 AND length(phone) <= 15);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_email_length' AND conrelid = 'community_registrations'::regclass) THEN
    ALTER TABLE community_registrations ADD CONSTRAINT chk_email_length
      CHECK (email = '' OR length(email) <= 255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_instagram_length' AND conrelid = 'community_registrations'::regclass) THEN
    ALTER TABLE community_registrations ADD CONSTRAINT chk_instagram_length
      CHECK (instagram = '' OR length(instagram) <= 100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_description_length' AND conrelid = 'community_registrations'::regclass) THEN
    ALTER TABLE community_registrations ADD CONSTRAINT chk_description_length
      CHECK (description = '' OR length(description) <= 2000);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_registrations_org_type ON community_registrations (organization_type);
CREATE INDEX IF NOT EXISTS idx_registrations_org_name ON community_registrations (organization_name);
CREATE INDEX IF NOT EXISTS idx_registrations_email_phone ON community_registrations (email, phone) WHERE email != '' AND phone != '';
CREATE INDEX IF NOT EXISTS idx_community_registrations_created_at ON community_registrations (created_at);
CREATE INDEX IF NOT EXISTS idx_community_registrations_status ON community_registrations (status);

-- ============================================================================
-- 3. EVENTS (33 kolom prod; date_str TEXT)
-- ============================================================================

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),  -- prod: campuran evt_... + UUID polos; default prod = gen_random_uuid()
  sheet_row INTEGER,
  row_index INTEGER DEFAULT 0,
  tanggal TEXT NOT NULL,
  date_str TEXT NOT NULL,                          -- prod drift: TEXT (migrate lama DATE)
  day TEXT,
  jam TEXT,
  acara TEXT NOT NULL,
  lokasi TEXT NOT NULL,
  eo TEXT,
  keterangan TEXT,
  month TEXT,
  status TEXT DEFAULT 'upcoming',                  -- prod tanpa CHECK (hanya FKs)
  category TEXT DEFAULT 'Umum',
  priority TEXT DEFAULT 'medium',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  date_end DATE,
  pic TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  categories TEXT[] DEFAULT '{}',
  event_model TEXT DEFAULT '',
  event_nominal TEXT DEFAULT '',
  event_model_notes TEXT DEFAULT '',
  source_draft_id TEXT DEFAULT '',
  is_multi_day BOOLEAN DEFAULT false,
  day_time_slots JSONB,
  event_type TEXT DEFAULT 'single',
  recurrence_group_id TEXT DEFAULT '',
  is_recurring BOOLEAN DEFAULT false,
  poster_url TEXT,
  organization_id TEXT REFERENCES community_registrations(id),  -- prod: tanpa ON DELETE
  area_id TEXT REFERENCES event_areas(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_events_date_str ON events (date_str);
CREATE INDEX IF NOT EXISTS idx_events_status ON events (status);
CREATE INDEX IF NOT EXISTS idx_events_category ON events (category);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events (event_type);
CREATE INDEX IF NOT EXISTS idx_events_priority ON events (priority);
CREATE INDEX IF NOT EXISTS idx_events_date_end ON events (date_end) WHERE date_end IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_recurrence_group ON events (recurrence_group_id) WHERE recurrence_group_id != '';
CREATE INDEX IF NOT EXISTS idx_events_organization_id ON events (organization_id);
CREATE INDEX IF NOT EXISTS idx_events_area_date ON events (area_id, date_str) WHERE area_id IS NOT NULL;

-- ============================================================================
-- 4. DRAFT EVENTS (prod: date_str DATE; 33 kolom)
-- ============================================================================

CREATE TABLE IF NOT EXISTS draft_events (
  id TEXT PRIMARY KEY DEFAULT ('drf_' || replace(gen_random_uuid()::text, '-', '')),
  date_str DATE NOT NULL,
  date_end DATE,
  day TEXT NOT NULL DEFAULT '',
  tanggal TEXT NOT NULL DEFAULT '',
  jam TEXT DEFAULT '',
  acara TEXT NOT NULL,
  lokasi TEXT DEFAULT '',
  area_id TEXT REFERENCES event_areas(id) ON DELETE SET NULL,
  eo TEXT DEFAULT '',
  pic TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  keterangan TEXT DEFAULT '',
  internal_note TEXT DEFAULT '',
  month TEXT NOT NULL DEFAULT '',
  category TEXT DEFAULT 'Umum',
  categories TEXT[] DEFAULT '{}',
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  event_model TEXT DEFAULT '' CHECK (event_model IN ('', 'free', 'bayar', 'support')),
  event_nominal TEXT DEFAULT '',
  event_model_notes TEXT DEFAULT '',
  progress TEXT DEFAULT 'draft' CHECK (progress IN ('draft', 'confirm', 'cancel')),
  published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  is_multi_day BOOLEAN DEFAULT FALSE,
  day_time_slots JSONB,
  event_type TEXT DEFAULT 'single' CHECK (event_type IN ('single', 'multi_day', 'recurring')),
  recurrence_group_id TEXT DEFAULT '',
  is_recurring BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_draft_events_date_str ON draft_events (date_str);
CREATE INDEX IF NOT EXISTS idx_draft_events_progress ON draft_events (progress);
CREATE INDEX IF NOT EXISTS idx_draft_events_deleted ON draft_events (deleted);
CREATE INDEX IF NOT EXISTS idx_draft_events_published ON draft_events (published);
CREATE INDEX IF NOT EXISTS idx_draft_events_category ON draft_events (category);
CREATE INDEX IF NOT EXISTS idx_draft_events_area_date ON draft_events (area_id, date_str) WHERE area_id IS NOT NULL;

-- ============================================================================
-- 5. USERS (tanpa auth.users; password_hash baru utk bcrypt)
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('superadmin', 'admin', 'viewer', 'eo_tenant', 'tenant_relation')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  password_hash TEXT,                              -- bcrypt; NULL utk user legacy sampai di-seed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  eo_organization TEXT DEFAULT '',
  assigned_events TEXT[] DEFAULT '{}',
  avatar_url TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users (is_active);
CREATE INDEX IF NOT EXISTS idx_users_eo_org ON users (eo_organization) WHERE eo_organization != '';

-- ============================================================================
-- 6. ANNUAL THEMES
-- ============================================================================

CREATE TABLE IF NOT EXISTS annual_themes (
  id TEXT PRIMARY KEY DEFAULT ('thm_' || replace(gen_random_uuid()::text, '-', '')),
  name TEXT NOT NULL,
  date_start DATE NOT NULL,
  date_end DATE NOT NULL,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 7. HOLIDAYS (prod tanpa CHECK type)
-- ============================================================================

CREATE TABLE IF NOT EXISTS holidays (
  id TEXT PRIMARY KEY DEFAULT ('hdy_' || replace(gen_random_uuid()::text, '-', '')),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  date_str DATE,
  tanggal TEXT DEFAULT '',
  day TEXT DEFAULT '',
  month TEXT DEFAULT '',
  description TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_holidays_date_str ON holidays (date_str);

-- ============================================================================
-- 8. NEWS ARTICLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS news_articles (
  id TEXT PRIMARY KEY DEFAULT ('news_' || replace(gen_random_uuid()::text, '-', '')),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT DEFAULT '',
  content TEXT DEFAULT '',
  cover_image_url TEXT DEFAULT '',
  author TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_news_articles_slug ON news_articles (slug);
CREATE INDEX IF NOT EXISTS idx_news_articles_published ON news_articles (published_at DESC);

-- ============================================================================
-- 9. PHOTO ALBUMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS photo_albums (
  id TEXT PRIMARY KEY DEFAULT ('alb_' || replace(gen_random_uuid()::text, '-', '')),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  event_date TEXT DEFAULT '',
  cover_photo_url TEXT DEFAULT '',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  event_id TEXT DEFAULT '',
  lokasi TEXT DEFAULT '',
  theme_id TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_photo_albums_slug ON photo_albums (slug);
CREATE INDEX IF NOT EXISTS idx_photo_albums_sort ON photo_albums (sort_order);
CREATE INDEX IF NOT EXISTS idx_photo_albums_event ON photo_albums (event_id) WHERE event_id != '';
CREATE INDEX IF NOT EXISTS idx_photo_albums_theme ON photo_albums (theme_id) WHERE theme_id != '';
-- (prod juga punya dup idx_photo_albums_sort_order — sengaja tidak direplikasi)

-- ============================================================================
-- 10. EVENT PHOTOS (tanpa FK — prod: plain text album_id/event_id)
-- ============================================================================

CREATE TABLE IF NOT EXISTS event_photos (
  id TEXT PRIMARY KEY DEFAULT ('eph_' || replace(gen_random_uuid()::text, '-', '')),
  url TEXT NOT NULL,
  caption TEXT NOT NULL,
  event_date TEXT DEFAULT '',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  album_id TEXT,
  event_id TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_event_photos_sort ON event_photos (sort_order);
CREATE INDEX IF NOT EXISTS idx_event_photos_album ON event_photos (album_id);
CREATE INDEX IF NOT EXISTS idx_event_photos_event_id ON event_photos (event_id) WHERE event_id != '';
CREATE INDEX IF NOT EXISTS idx_event_photos_created_at ON event_photos (created_at);

-- ============================================================================
-- 11. AREA PHOTOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS area_photos (
  id TEXT PRIMARY KEY DEFAULT ('aph_' || replace(gen_random_uuid()::text, '-', '')),
  area_id TEXT NOT NULL REFERENCES event_areas(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT DEFAULT '',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_area_photos_area ON area_photos (area_id);
CREATE INDEX IF NOT EXISTS idx_area_photos_sort ON area_photos (sort_order);

-- ============================================================================
-- 12. SITE SETTINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 13. SURVEY CONFIG (kepuasan pelanggan)
-- ============================================================================

CREATE TABLE IF NOT EXISTS survey_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT FALSE,
  auto_activate_after_event BOOLEAN DEFAULT TRUE,
  activated_at TIMESTAMPTZ,
  deactivated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_survey_config_active ON survey_config (is_active) WHERE is_active = true;

-- ============================================================================
-- 14. SURVEY RESPONSES
-- ============================================================================

CREATE TABLE IF NOT EXISTS survey_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT NOT NULL,
  survey_type TEXT NOT NULL CHECK (survey_type IN ('organizer', 'public')),
  respondent_name TEXT DEFAULT '',
  respondent_email TEXT DEFAULT '',
  respondent_phone TEXT DEFAULT '',
  respondent_organization TEXT DEFAULT '',
  mall_cleanliness INTEGER NOT NULL CHECK (mall_cleanliness BETWEEN 1 AND 10),
  mall_staff_service INTEGER NOT NULL CHECK (mall_staff_service BETWEEN 1 AND 10),
  mall_coordination INTEGER NOT NULL CHECK (mall_coordination BETWEEN 1 AND 10),
  mall_security INTEGER NOT NULL CHECK (mall_security BETWEEN 1 AND 10),
  eo_event_quality INTEGER CHECK (eo_event_quality IS NULL OR eo_event_quality BETWEEN 1 AND 10),
  eo_organization INTEGER CHECK (eo_organization IS NULL OR eo_organization BETWEEN 1 AND 10),
  eo_committee_service INTEGER CHECK (eo_committee_service IS NULL OR eo_committee_service BETWEEN 1 AND 10),
  eo_promotion_accuracy INTEGER CHECK (eo_promotion_accuracy IS NULL OR eo_promotion_accuracy BETWEEN 1 AND 10),
  eo_recommendation INTEGER CHECK (eo_recommendation IS NULL OR eo_recommendation BETWEEN 1 AND 10),
  mall_comment TEXT DEFAULT '',
  eo_comment TEXT DEFAULT '',
  general_comment TEXT DEFAULT '',
  device_fingerprint TEXT DEFAULT '',
  ip_address TEXT DEFAULT '',
  user_agent TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_survey_resp_event_id ON survey_responses (event_id);
CREATE INDEX IF NOT EXISTS idx_survey_resp_type ON survey_responses (survey_type);
CREATE INDEX IF NOT EXISTS idx_survey_resp_fingerprint ON survey_responses (device_fingerprint, event_id) WHERE device_fingerprint != '';
CREATE INDEX IF NOT EXISTS idx_survey_resp_created ON survey_responses (created_at DESC);

-- ============================================================================
-- 15. TENANT SURVEY CONFIG
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_survey_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  activated_at TIMESTAMPTZ,
  deactivated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tsc_is_active ON tenant_survey_config (is_active) WHERE is_active = true;

-- ============================================================================
-- 16. TENANT EVENT SURVEYS (54 kolom prod)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_event_surveys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT NOT NULL,
  tenant_user_id UUID REFERENCES users(id) ON DELETE SET NULL,   -- VPS: public.users (bukan auth.users)
  tenant_name TEXT DEFAULT '',
  tenant_organization TEXT DEFAULT '',
  tenant_email TEXT DEFAULT '',
  tenant_phone TEXT DEFAULT '',

  venue_rating INTEGER CHECK (venue_rating IS NULL OR venue_rating BETWEEN 1 AND 5),
  management_rating INTEGER CHECK (management_rating IS NULL OR management_rating BETWEEN 1 AND 5),
  event_organization_rating INTEGER CHECK (event_organization_rating IS NULL OR event_organization_rating BETWEEN 1 AND 5),
  booth_facility_rating INTEGER CHECK (booth_facility_rating IS NULL OR booth_facility_rating BETWEEN 1 AND 5),
  overall_rating INTEGER CHECK (overall_rating IS NULL OR overall_rating BETWEEN 1 AND 5),

  feedback_comment TEXT DEFAULT '',
  improvement_suggestion TEXT DEFAULT '',

  -- Legacy comprehensive fields (kept for backwards compat)
  venue_preparation INTEGER,
  logistics_smoothness INTEGER,
  setup_teardown_efficiency INTEGER,
  mall_coordination_rating INTEGER,
  mall_support_rating INTEGER,
  communication_quality INTEGER,
  event_execution_quality INTEGER,
  crowd_management INTEGER,
  visitor_satisfaction_estimate INTEGER,
  overall_self_rating INTEGER,
  would_repeat BOOLEAN DEFAULT NULL,
  what_went_well TEXT DEFAULT '',
  what_went_wrong TEXT DEFAULT '',
  improvements_needed TEXT DEFAULT '',
  issues_encountered TEXT DEFAULT '',
  suggestions_for_mall TEXT DEFAULT '',
  additional_notes TEXT DEFAULT '',

  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'reviewed')),
  submitted_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,      -- VPS: public.users
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT DEFAULT '',

  device_fingerprint TEXT DEFAULT '',
  ip_address TEXT DEFAULT '',
  user_agent TEXT DEFAULT '',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  business_category business_category_enum,                      -- prod: USER-DEFINED enum
  business_subcategory TEXT,
  sales_lift_pct NUMERIC(5,2) CHECK (sales_lift_pct IS NULL OR (sales_lift_pct >= -100 AND sales_lift_pct <= 1000)),
  traffic_lift_pct NUMERIC(5,2) CHECK (traffic_lift_pct IS NULL OR (traffic_lift_pct >= -100 AND traffic_lift_pct <= 1000)),
  nama_gerai VARCHAR(100),
  lokasi_zona VARCHAR(50),
  kategori VARCHAR(50),
  kenaikan_traffic VARCHAR(50),
  kenaikan_sales VARCHAR(50),
  feedback_teks TEXT,
  tenant_id VARCHAR(100),
  pic_name VARCHAR(100),
  pic_phone VARCHAR(20)
);

-- Constraint business_subcategory length (prod aktual; CHECK terpisah supaya
-- idempotent terpisah dari CREATE TABLE)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tenant_event_surveys_business_subcategory_length' AND conrelid = 'tenant_event_surveys'::regclass) THEN
    ALTER TABLE tenant_event_surveys ADD CONSTRAINT tenant_event_surveys_business_subcategory_length
      CHECK (business_subcategory IS NULL OR (char_length(business_subcategory) >= 1 AND char_length(business_subcategory) <= 50));
  END IF;
END $$;

-- Anti-duplikat: maksimal satu survey SUBMITTED per tenant per event
CREATE UNIQUE INDEX IF NOT EXISTS idx_tes_event_tenant_unique
  ON tenant_event_surveys (event_id, tenant_user_id)
  WHERE status = 'submitted' AND tenant_user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tes_event_fingerprint_unique
  ON tenant_event_surveys (event_id, device_fingerprint)
  WHERE status = 'submitted' AND tenant_user_id IS NULL AND device_fingerprint != '';

CREATE INDEX IF NOT EXISTS idx_tes_event_id ON tenant_event_surveys (event_id);
CREATE INDEX IF NOT EXISTS idx_tes_tenant_user ON tenant_event_surveys (tenant_user_id) WHERE tenant_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tes_fingerprint ON tenant_event_surveys (device_fingerprint, event_id) WHERE device_fingerprint != '';
CREATE INDEX IF NOT EXISTS idx_tes_status ON tenant_event_surveys (status);
CREATE INDEX IF NOT EXISTS idx_tes_created ON tenant_event_surveys (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tenant_surveys_business_category ON tenant_event_surveys (business_category);
CREATE INDEX IF NOT EXISTS idx_tenant_surveys_event_lift ON tenant_event_surveys (event_id, sales_lift_pct, traffic_lift_pct);
CREATE INDEX IF NOT EXISTS idx_tenant_surveys_business_category_lift ON tenant_event_surveys (business_category, sales_lift_pct, traffic_lift_pct);

-- ============================================================================
-- 17. ACTIVITY LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,          -- VPS: public.users
  user_email TEXT,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource ON activity_logs (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs (action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_created_at ON activity_logs (action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource_type ON activity_logs (resource_type);

-- ============================================================================
-- 18. SPONSOR LEADS
-- ============================================================================

CREATE TABLE IF NOT EXISTS sponsor_leads (
  id TEXT PRIMARY KEY DEFAULT ('sld_' || replace(gen_random_uuid()::text, '-', '')),
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'agreed', 'declined')),
  internal_notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sponsor_leads_event_id ON sponsor_leads (event_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_leads_status ON sponsor_leads (status);

-- ============================================================================
-- 19. EVENT PROPOSALS (1-to-1 per event)
-- ============================================================================

CREATE TABLE IF NOT EXISTS event_proposals (
  id TEXT PRIMARY KEY DEFAULT ('prp_' || replace(gen_random_uuid()::text, '-', '')),
  event_id TEXT UNIQUE NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL DEFAULT '',
  mime_type TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_proposals_event_id ON event_proposals (event_id);

-- ============================================================================
-- 20. GENERATED LETTERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS generated_letters (
  id TEXT PRIMARY KEY DEFAULT ('ltr_' || replace(gen_random_uuid()::text, '-', '')),
  event_id TEXT REFERENCES events(id) ON DELETE SET NULL,
  draft_event_id TEXT REFERENCES draft_events(id) ON DELETE SET NULL,
  letter_data JSONB NOT NULL,
  pdf_url TEXT,
  pdf_base64 TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted'))
);

CREATE INDEX IF NOT EXISTS idx_generated_letters_event_id ON generated_letters (event_id);
CREATE INDEX IF NOT EXISTS idx_generated_letters_draft_event_id ON generated_letters (draft_event_id);
CREATE INDEX IF NOT EXISTS idx_generated_letters_created_at ON generated_letters (created_at DESC);

-- ============================================================================
-- 21. PAMERAN (Casual Leasing) + LEAD KOLABORASI + AKTIVASI
-- ----------------------------------------------------------------------------
-- Pameran = program induk (mis. Beauty Fair). Aktivasi = event resmi yang
-- ditautkan ke pameran (bukan salinan jadwal). Lead = minat brand/EO.
-- Approve lead TIDAK membuat event (sejalan ADR 003).
-- ============================================================================

CREATE TABLE IF NOT EXISTS exhibitions (
  id TEXT PRIMARY KEY DEFAULT ('exh_' || replace(gen_random_uuid()::text, '-', '')),
  title TEXT NOT NULL,
  theme TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  date_start DATE NOT NULL,
  date_end DATE NOT NULL,
  collaboration_brief TEXT NOT NULL DEFAULT '',
  leasing_pic TEXT NOT NULL DEFAULT '',
  marcomm_pic TEXT NOT NULL DEFAULT '',
  publication TEXT NOT NULL DEFAULT 'draft' CHECK (publication IN ('draft', 'published', 'archived')),
  accepting_applications BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_exhibitions_period CHECK (date_end >= date_start),
  CONSTRAINT chk_exhibitions_title CHECK (length(trim(title)) BETWEEN 3 AND 200)
);

CREATE INDEX IF NOT EXISTS idx_exhibitions_publication ON exhibitions (publication);
CREATE INDEX IF NOT EXISTS idx_exhibitions_period ON exhibitions (date_start, date_end);

CREATE TABLE IF NOT EXISTS exhibition_leads (
  id TEXT PRIMARY KEY DEFAULT ('exl_' || replace(gen_random_uuid()::text, '-', '')),
  exhibition_id TEXT NOT NULL REFERENCES exhibitions(id) ON DELETE CASCADE,
  organization_name TEXT NOT NULL,
  organization_type TEXT NOT NULL CHECK (organization_type IN ('brand', 'eo')),
  participation TEXT NOT NULL CHECK (participation IN ('booth', 'activation', 'both')),
  contact_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  proposal TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'approved', 'rejected')),
  internal_notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_exhibition_leads_org CHECK (length(trim(organization_name)) BETWEEN 3 AND 200),
  CONSTRAINT chk_exhibition_leads_contact CHECK (length(trim(contact_name)) BETWEEN 3 AND 100),
  CONSTRAINT chk_exhibition_leads_phone CHECK (length(phone) BETWEEN 10 AND 15)
);

CREATE INDEX IF NOT EXISTS idx_exhibition_leads_exhibition ON exhibition_leads (exhibition_id);
CREATE INDEX IF NOT EXISTS idx_exhibition_leads_status ON exhibition_leads (status);

-- Satu event hanya boleh jadi aktivasi satu pameran (PK event_id).
CREATE TABLE IF NOT EXISTS exhibition_activations (
  event_id TEXT PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
  exhibition_id TEXT NOT NULL REFERENCES exhibitions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exhibition_activations_exhibition ON exhibition_activations (exhibition_id);

-- Invarian periode aktivasi (defense in depth, melengkapi cek API):
-- event yang tertaut TIDAK boleh keluar periode pameran lewat jalur apapun
-- (link langsung, edit tanggal legacy updateEvent, maupun penyusutan periode
-- exhibitions). Trigger memakai ERRCODE 23514 agar admin.js memetakan jadi 409
-- ramah pengguna. DELETE event sengaja TIDAK diblokir — FK ON DELETE CASCADE
-- menghapus tautan aktivasi bersama eventnya.
CREATE OR REPLACE FUNCTION enforce_exhibition_activation_period()
RETURNS TRIGGER AS $$
DECLARE
  v_exhibition_id TEXT;
  v_ex_start DATE;
  v_ex_end DATE;
  v_ev_start DATE;
  v_ev_end DATE;
BEGIN
  IF TG_TABLE_NAME = 'exhibitions' THEN
    IF EXISTS (
      SELECT 1
      FROM exhibition_activations ea
      JOIN events e ON e.id = ea.event_id
      WHERE ea.exhibition_id = NEW.id
        AND (e.date_str::date < NEW.date_start
          OR COALESCE(e.date_end, e.date_str::date) > NEW.date_end)
    ) THEN
      RAISE EXCEPTION 'Periode baru membuat event aktivasi berada di luar pameran. Lepas atau ubah jadwal aktivasi terlebih dahulu.' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'exhibition_activations' THEN
    v_exhibition_id := NEW.exhibition_id;
    SELECT date_start, date_end INTO v_ex_start, v_ex_end FROM exhibitions WHERE id = NEW.exhibition_id;
    SELECT date_str::date, COALESCE(date_end, date_str::date) INTO v_ev_start, v_ev_end FROM events WHERE id = NEW.event_id;
  ELSIF TG_TABLE_NAME = 'events' THEN
    SELECT exhibition_id INTO v_exhibition_id FROM exhibition_activations WHERE event_id = NEW.id;
    IF NOT FOUND THEN
      RETURN NEW;
    END IF;
    SELECT date_start, date_end INTO v_ex_start, v_ex_end FROM exhibitions WHERE id = v_exhibition_id;
    v_ev_start := NEW.date_str::date;
    v_ev_end := COALESCE(NEW.date_end, NEW.date_str::date);
  ELSE
    RETURN NEW;
  END IF;

  IF v_ex_start IS NULL OR v_ev_start IS NULL THEN
    RETURN NEW;
  END IF;
  IF v_ev_start < v_ex_start OR v_ev_end > v_ex_end THEN
    RAISE EXCEPTION 'Tanggal event berada di luar periode pameran' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_exhibition_activations_period ON exhibition_activations;
CREATE TRIGGER trg_exhibition_activations_period
  BEFORE INSERT OR UPDATE ON exhibition_activations
  FOR EACH ROW EXECUTE FUNCTION enforce_exhibition_activation_period();

DROP TRIGGER IF EXISTS trg_events_activation_period ON events;
CREATE TRIGGER trg_events_activation_period
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION enforce_exhibition_activation_period();

DROP TRIGGER IF EXISTS trg_exhibitions_period_guard ON exhibitions;
CREATE TRIGGER trg_exhibitions_period_guard
  BEFORE UPDATE ON exhibitions
  FOR EACH ROW EXECUTE FUNCTION enforce_exhibition_activation_period();

-- ============================================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS events_updated_at ON events;
CREATE TRIGGER events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS draft_events_updated_at ON draft_events;
CREATE TRIGGER draft_events_updated_at BEFORE UPDATE ON draft_events FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS survey_config_updated_at ON survey_config;
CREATE TRIGGER survey_config_updated_at BEFORE UPDATE ON survey_config FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS tenant_survey_config_updated_at ON tenant_survey_config;
CREATE TRIGGER tenant_survey_config_updated_at BEFORE UPDATE ON tenant_survey_config FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_tenant_survey_updated_at ON tenant_event_surveys;
CREATE TRIGGER trg_tenant_survey_updated_at BEFORE UPDATE ON tenant_event_surveys FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS exhibitions_updated_at ON exhibitions;
CREATE TRIGGER exhibitions_updated_at BEFORE UPDATE ON exhibitions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS exhibition_leads_updated_at ON exhibition_leads;
CREATE TRIGGER exhibition_leads_updated_at BEFORE UPDATE ON exhibition_leads FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS event_areas_updated_at ON event_areas;
CREATE TRIGGER event_areas_updated_at BEFORE UPDATE ON event_areas FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- TABEL DEFERRED (ada di prod, TIDAK direferensi kode — tidak dimigrasi)
-- ============================================================================
-- -- deferred: batches
-- -- deferred: batch_slots
-- -- deferred: join_requests
-- -- deferred: venue_feedback
-- -- deferred: admin_credentials
-- -- deferred: admin_settings
--
-- Jika suatu saat dibutuhkan, salin DDL prod dari:
--   SELECT column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns WHERE table_schema='public'
--   AND table_name IN ('batches','batch_slots','join_requests','venue_feedback','admin_credentials','admin_settings');