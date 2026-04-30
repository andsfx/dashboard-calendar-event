-- ============================================================================
-- SURVEY KEPUASAN PELANGGAN — Database Schema
-- Metropolitan Mall Bekasi
-- ============================================================================
--
-- PURPOSE: Customer satisfaction survey for event organizers & public attendees
-- IDEMPOTENCY: Safe to run multiple times (IF NOT EXISTS / DO $$ blocks)
--
-- Tables:
--   1. survey_responses  — individual survey submissions
--   2. survey_config     — per-event survey on/off control
--
-- RPC Functions:
--   1. get_survey_summary(event_id)       — public aggregate ratings
--   2. check_survey_submitted(event_id, fingerprint) — duplicate check
--
-- ============================================================================


-- ============================================================================
-- STEP 1: survey_responses table
-- ============================================================================

CREATE TABLE IF NOT EXISTS survey_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT NOT NULL,
  survey_type TEXT NOT NULL CHECK (survey_type IN ('organizer', 'public')),

  -- Identitas responden (opsional)
  respondent_name TEXT DEFAULT '',
  respondent_email TEXT DEFAULT '',
  respondent_phone TEXT DEFAULT '',
  respondent_organization TEXT DEFAULT '',

  -- Rating Mall (skala 1-10, wajib untuk kedua tipe survey)
  mall_cleanliness INTEGER NOT NULL CHECK (mall_cleanliness BETWEEN 1 AND 10),
  mall_staff_service INTEGER NOT NULL CHECK (mall_staff_service BETWEEN 1 AND 10),
  mall_coordination INTEGER NOT NULL CHECK (mall_coordination BETWEEN 1 AND 10),
  mall_security INTEGER NOT NULL CHECK (mall_security BETWEEN 1 AND 10),

  -- Rating Penyelenggara Event (skala 1-10, hanya survey publik)
  -- NULL untuk survey organizer
  eo_event_quality INTEGER CHECK (eo_event_quality IS NULL OR eo_event_quality BETWEEN 1 AND 10),
  eo_organization INTEGER CHECK (eo_organization IS NULL OR eo_organization BETWEEN 1 AND 10),
  eo_committee_service INTEGER CHECK (eo_committee_service IS NULL OR eo_committee_service BETWEEN 1 AND 10),
  eo_promotion_accuracy INTEGER CHECK (eo_promotion_accuracy IS NULL OR eo_promotion_accuracy BETWEEN 1 AND 10),
  eo_recommendation INTEGER CHECK (eo_recommendation IS NULL OR eo_recommendation BETWEEN 1 AND 10),

  -- Komentar (opsional)
  mall_comment TEXT DEFAULT '',
  eo_comment TEXT DEFAULT '',
  general_comment TEXT DEFAULT '',

  -- Device fingerprint untuk soft-limit duplikasi
  device_fingerprint TEXT DEFAULT '',

  -- Metadata
  ip_address TEXT DEFAULT '',
  user_agent TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);


-- ============================================================================
-- STEP 2: survey_config table
-- ============================================================================

CREATE TABLE IF NOT EXISTS survey_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT false,
  auto_activate_after_event BOOLEAN DEFAULT true,
  activated_at TIMESTAMPTZ,
  deactivated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);


-- ============================================================================
-- STEP 3: Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_survey_resp_event_id ON survey_responses(event_id);
CREATE INDEX IF NOT EXISTS idx_survey_resp_type ON survey_responses(survey_type);
CREATE INDEX IF NOT EXISTS idx_survey_resp_fingerprint ON survey_responses(device_fingerprint, event_id)
  WHERE device_fingerprint != '';
CREATE INDEX IF NOT EXISTS idx_survey_resp_created ON survey_responses(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_survey_config_event ON survey_config(event_id);
CREATE INDEX IF NOT EXISTS idx_survey_config_active ON survey_config(is_active)
  WHERE is_active = true;


-- ============================================================================
-- STEP 4: Row Level Security
-- ============================================================================

ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_config ENABLE ROW LEVEL SECURITY;

-- survey_responses: anyone can INSERT (anonymous survey)
DROP POLICY IF EXISTS "Anyone can submit survey" ON survey_responses;
CREATE POLICY "Anyone can submit survey"
  ON survey_responses FOR INSERT
  WITH CHECK (true);

-- survey_responses: authenticated users can read (admin uses service_role anyway)
DROP POLICY IF EXISTS "Authenticated can read survey responses" ON survey_responses;
CREATE POLICY "Authenticated can read survey responses"
  ON survey_responses FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- survey_config: authenticated users can manage
DROP POLICY IF EXISTS "Authenticated can manage survey config" ON survey_config;
CREATE POLICY "Authenticated can manage survey config"
  ON survey_config FOR ALL
  USING (auth.uid() IS NOT NULL);

-- survey_config: public can read (to check if survey is active)
DROP POLICY IF EXISTS "Public can read survey config" ON survey_config;
CREATE POLICY "Public can read survey config"
  ON survey_config FOR SELECT
  USING (true);


-- ============================================================================
-- STEP 5: RPC Functions (SECURITY DEFINER — bypass RLS for public aggregates)
-- ============================================================================

-- 5a. Get survey summary (public aggregate ratings per event)
CREATE OR REPLACE FUNCTION get_survey_summary(p_event_id TEXT)
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT json_build_object(
      'event_id', p_event_id,
      'total_responses', COUNT(*)::int,
      'organizer_responses', COUNT(*) FILTER (WHERE survey_type = 'organizer')::int,
      'public_responses', COUNT(*) FILTER (WHERE survey_type = 'public')::int,
      'mall_avg', json_build_object(
        'cleanliness', ROUND(AVG(mall_cleanliness)::numeric, 1),
        'staff_service', ROUND(AVG(mall_staff_service)::numeric, 1),
        'coordination', ROUND(AVG(mall_coordination)::numeric, 1),
        'security', ROUND(AVG(mall_security)::numeric, 1),
        'overall', ROUND(
          AVG((mall_cleanliness + mall_staff_service + mall_coordination + mall_security)::numeric / 4), 1
        )
      ),
      'eo_avg', CASE
        WHEN COUNT(*) FILTER (WHERE survey_type = 'public') > 0 THEN
          json_build_object(
            'event_quality', ROUND(AVG(eo_event_quality) FILTER (WHERE survey_type = 'public')::numeric, 1),
            'organization', ROUND(AVG(eo_organization) FILTER (WHERE survey_type = 'public')::numeric, 1),
            'committee_service', ROUND(AVG(eo_committee_service) FILTER (WHERE survey_type = 'public')::numeric, 1),
            'promotion_accuracy', ROUND(AVG(eo_promotion_accuracy) FILTER (WHERE survey_type = 'public')::numeric, 1),
            'recommendation', ROUND(AVG(eo_recommendation) FILTER (WHERE survey_type = 'public')::numeric, 1),
            'overall', ROUND(
              AVG(
                (COALESCE(eo_event_quality, 0) + COALESCE(eo_organization, 0) +
                 COALESCE(eo_committee_service, 0) + COALESCE(eo_promotion_accuracy, 0) +
                 COALESCE(eo_recommendation, 0))::numeric / 5
              ) FILTER (WHERE survey_type = 'public'), 1
            )
          )
        ELSE NULL
      END
    )
    FROM survey_responses
    WHERE event_id = p_event_id),
    json_build_object(
      'event_id', p_event_id,
      'total_responses', 0,
      'organizer_responses', 0,
      'public_responses', 0,
      'mall_avg', NULL,
      'eo_avg', NULL
    )
  );
$$;

-- 5b. Check if device already submitted survey for an event
CREATE OR REPLACE FUNCTION check_survey_submitted(p_event_id TEXT, p_fingerprint TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM survey_responses
    WHERE event_id = p_event_id
    AND device_fingerprint = p_fingerprint
    AND p_fingerprint != ''
  );
$$;


-- ============================================================================
-- STEP 6: Enable Realtime
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'survey_responses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE survey_responses;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'survey_config'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE survey_config;
  END IF;
END $$;


-- ============================================================================
-- STEP 7: Auto-update updated_at trigger for survey_config
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'survey_config_updated_at'
  ) THEN
    CREATE TRIGGER survey_config_updated_at
      BEFORE UPDATE ON survey_config
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;


-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
--
-- 1. Check tables exist:
--    SELECT table_name FROM information_schema.tables
--    WHERE table_schema = 'public' AND table_name LIKE 'survey%';
--
-- 2. Check columns:
--    SELECT column_name, data_type, is_nullable, column_default
--    FROM information_schema.columns
--    WHERE table_name = 'survey_responses' ORDER BY ordinal_position;
--
-- 3. Check RLS policies:
--    SELECT * FROM pg_policies WHERE tablename LIKE 'survey%';
--
-- 4. Check indexes:
--    SELECT indexname, indexdef FROM pg_indexes WHERE tablename LIKE 'survey%';
--
-- 5. Test RPC functions:
--    SELECT get_survey_summary('test_event_id');
--    SELECT check_survey_submitted('test_event_id', 'test_fingerprint');
--
-- ============================================================================
