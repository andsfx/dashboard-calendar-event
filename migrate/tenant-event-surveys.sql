-- ============================================================================
-- TENANT EVENT SURVEYS — EO/Tenant Self-Assessment Schema
-- Metropolitan Mall Bekasi
-- ============================================================================
--
-- PURPOSE: Post-event self-assessment by EO/Tenant organizers.
--          Complements the existing survey_responses (visitor-facing).
--
-- IDEMPOTENCY: Safe to run multiple times (IF NOT EXISTS / DO blocks)
--
-- Tenant-facing survey fields (1-5 scale):
--   - venue_rating            (kualitas venue/fasilitas booth)
--   - management_rating       (kualitas manajemen/koordinasi)
--   - event_organization_rating (kualitas organisasi event)
--   - booth_facility_rating   (kualitas fasilitas booth)
--   - feedback_comment        (komentar opsional)
--   - improvement_suggestion  (saran perbaikan opsional)
--
-- Constraint: 1 survey per tenant per event (uniqueness on submitted status)
--
-- ============================================================================


-- ============================================================================
-- STEP 1: tenant_event_surveys table
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_event_surveys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT NOT NULL,

  -- Tenant identity (references auth.users for RLS)
  tenant_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tenant_name TEXT NOT NULL DEFAULT '',
  tenant_organization TEXT DEFAULT '',
  tenant_email TEXT DEFAULT '',
  tenant_phone TEXT DEFAULT '',

  -- ─── Tenant-Facing Survey Ratings (1-5 scale) ──────────────────
  venue_rating INTEGER CHECK (venue_rating IS NULL OR venue_rating BETWEEN 1 AND 5),
  management_rating INTEGER CHECK (management_rating IS NULL OR management_rating BETWEEN 1 AND 5),
  event_organization_rating INTEGER CHECK (event_organization_rating IS NULL OR event_organization_rating BETWEEN 1 AND 5),
  booth_facility_rating INTEGER CHECK (booth_facility_rating IS NULL OR booth_facility_rating BETWEEN 1 AND 5),

  -- Overall composite rating (optional, 1-5)
  overall_rating INTEGER CHECK (overall_rating IS NULL OR overall_rating BETWEEN 1 AND 5),

  -- ─── Optional Comments ─────────────────────────────────────────
  feedback_comment TEXT DEFAULT '',
  improvement_suggestion TEXT DEFAULT '',

  -- ─── Legacy comprehensive fields (kept for backwards compat with
  --     existing UI; nullable). New code should use the 1-5 fields above.
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

  -- ─── Metadata ──────────────────────────────────────────────────
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'reviewed')),
  submitted_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT DEFAULT '',

  -- ─── Public Submission Metadata ────────────────────────────────
  -- device_fingerprint: used as a soft identifier for duplicate
  -- detection on the public route (where tenant_user_id is NULL).
  device_fingerprint TEXT DEFAULT '',
  ip_address TEXT DEFAULT '',
  user_agent TEXT DEFAULT '',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure new columns exist even if table was created by a previous
-- version of this migration (CREATE TABLE IF NOT EXISTS skips when
-- the table already exists).
ALTER TABLE tenant_event_surveys
  ADD COLUMN IF NOT EXISTS device_fingerprint TEXT DEFAULT '';
ALTER TABLE tenant_event_surveys
  ADD COLUMN IF NOT EXISTS ip_address TEXT DEFAULT '';
ALTER TABLE tenant_event_surveys
  ADD COLUMN IF NOT EXISTS user_agent TEXT DEFAULT '';


-- ============================================================================
-- STEP 2: Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tes_event_id ON tenant_event_surveys(event_id);
CREATE INDEX IF NOT EXISTS idx_tes_tenant_user ON tenant_event_surveys(tenant_user_id)
  WHERE tenant_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tes_fingerprint ON tenant_event_surveys(device_fingerprint, event_id)
  WHERE device_fingerprint != '';
CREATE INDEX IF NOT EXISTS idx_tes_status ON tenant_event_surveys(status);
CREATE INDEX IF NOT EXISTS idx_tes_created ON tenant_event_surveys(created_at DESC);

-- Duplicate prevention: at most one SUBMITTED survey per tenant per event
-- For LOGGED-IN users (identified by tenant_user_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_tes_event_tenant_unique
  ON tenant_event_surveys(event_id, tenant_user_id)
  WHERE status = 'submitted' AND tenant_user_id IS NOT NULL;

-- For ANONYMOUS public submissions (identified by device_fingerprint)
CREATE UNIQUE INDEX IF NOT EXISTS idx_tes_event_fingerprint_unique
  ON tenant_event_surveys(event_id, device_fingerprint)
  WHERE status = 'submitted' AND tenant_user_id IS NULL AND device_fingerprint != '';


-- ============================================================================
-- STEP 3: Row Level Security
-- ============================================================================

ALTER TABLE tenant_event_surveys ENABLE ROW LEVEL SECURITY;

-- Tenants can INSERT their own surveys (authenticated)
DROP POLICY IF EXISTS "Tenants can insert own surveys" ON tenant_event_surveys;
CREATE POLICY "Tenants can insert own surveys"
  ON tenant_event_surveys FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND tenant_user_id = auth.uid());

-- Anyone can submit a public tenant survey (anonymous)
-- The serverless API (/api/tenant-survey-public) handles auth bypass
-- via service-role key. RLS allows INSERT for anon with fingerprint.
DROP POLICY IF EXISTS "Anyone can submit public tenant survey" ON tenant_event_surveys;
CREATE POLICY "Anyone can submit public tenant survey"
  ON tenant_event_surveys FOR INSERT
  TO anon
  WITH CHECK (
    tenant_user_id IS NULL
    AND device_fingerprint != ''
  );

-- Authenticated users can read public submissions (for their own dashboard)
-- Tenants can SELECT their own surveys; admins see all
DROP POLICY IF EXISTS "Tenants can view own surveys" ON tenant_event_surveys;
CREATE POLICY "Tenants can view own surveys"
  ON tenant_event_surveys FOR SELECT
  USING (
    tenant_user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE public.users.id = auth.uid()
        AND public.users.role IN ('superadmin', 'admin')
    )
  );

-- Tenants can UPDATE their own draft surveys (not submitted ones)
DROP POLICY IF EXISTS "Tenants can update own draft surveys" ON tenant_event_surveys;
CREATE POLICY "Tenants can update own draft surveys"
  ON tenant_event_surveys FOR UPDATE
  USING (
    tenant_user_id = auth.uid() AND status = 'draft'
  );

-- Admins can UPDATE (for review)
DROP POLICY IF EXISTS "Admins can review surveys" ON tenant_event_surveys;
CREATE POLICY "Admins can review surveys"
  ON tenant_event_surveys FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE public.users.id = auth.uid()
        AND public.users.role IN ('superadmin', 'admin')
    )
  );

-- No DELETE policy — surveys are permanent records


-- ============================================================================
-- STEP 4: RPC Functions
-- ============================================================================

-- 4a. Check if a tenant has already submitted a survey for an event
-- (for LOGGED-IN users identified by tenant_user_id)
CREATE OR REPLACE FUNCTION check_tenant_survey_submitted(
  p_event_id TEXT,
  p_tenant_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM tenant_event_surveys
    WHERE event_id = p_event_id
      AND tenant_user_id = p_tenant_user_id
      AND status = 'submitted'
  );
$$;


-- 4a-bis. Check duplicate for ANONYMOUS public submissions (by device fingerprint)
CREATE OR REPLACE FUNCTION check_tenant_survey_submitted_public(
  p_event_id TEXT,
  p_device_fingerprint TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM tenant_event_surveys
    WHERE event_id = p_event_id
      AND device_fingerprint = p_device_fingerprint
      AND tenant_user_id IS NULL
      AND status = 'submitted'
  );
$$;


-- 4b. Get tenant-scoped analytics
CREATE OR REPLACE FUNCTION get_tenant_survey_analytics(p_user_id UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  result JSON;
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.users
  WHERE public.users.id = auth.uid()
  LIMIT 1;

  IF user_role IN ('superadmin', 'admin') THEN
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    INTO result
    FROM (
      SELECT
        tenant_user_id,
        tenant_organization,
        COUNT(*) AS total_surveys,
        COUNT(*) FILTER (WHERE status = 'submitted') AS submitted_surveys,
        ROUND(AVG(venue_rating) FILTER (WHERE venue_rating IS NOT NULL), 2) AS avg_venue_rating,
        ROUND(AVG(management_rating) FILTER (WHERE management_rating IS NOT NULL), 2) AS avg_management_rating,
        ROUND(AVG(event_organization_rating) FILTER (WHERE event_organization_rating IS NOT NULL), 2) AS avg_event_organization_rating,
        ROUND(AVG(booth_facility_rating) FILTER (WHERE booth_facility_rating IS NOT NULL), 2) AS avg_booth_facility_rating,
        ROUND(AVG(overall_rating) FILTER (WHERE overall_rating IS NOT NULL), 2) AS avg_overall_rating,
        MAX(created_at) AS last_survey_at
      FROM tenant_event_surveys
      WHERE status IN ('submitted', 'reviewed')
      GROUP BY tenant_user_id, tenant_organization
    ) t;
  ELSE
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    INTO result
    FROM (
      SELECT
        tenant_user_id,
        tenant_organization,
        COUNT(*) AS total_surveys,
        COUNT(*) FILTER (WHERE status = 'submitted') AS submitted_surveys,
        ROUND(AVG(venue_rating) FILTER (WHERE venue_rating IS NOT NULL), 2) AS avg_venue_rating,
        ROUND(AVG(management_rating) FILTER (WHERE management_rating IS NOT NULL), 2) AS avg_management_rating,
        ROUND(AVG(event_organization_rating) FILTER (WHERE event_organization_rating IS NOT NULL), 2) AS avg_event_organization_rating,
        ROUND(AVG(booth_facility_rating) FILTER (WHERE booth_facility_rating IS NOT NULL), 2) AS avg_booth_facility_rating,
        ROUND(AVG(overall_rating) FILTER (WHERE overall_rating IS NOT NULL), 2) AS avg_overall_rating,
        MAX(created_at) AS last_survey_at
      FROM tenant_event_surveys
      WHERE status IN ('submitted', 'reviewed')
        AND tenant_user_id = COALESCE(p_user_id, auth.uid())
      GROUP BY tenant_user_id, tenant_organization
    ) t;
  END IF;

  RETURN result;
END;
$$;


-- 4c. Get per-event combined summary (tenant self-assessment + visitor ratings)
CREATE OR REPLACE FUNCTION get_tenant_survey_event_summary(p_event_id TEXT)
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    row_to_json(t),
    json_build_object('event_id', p_event_id, 'tenant_survey_status', 'none')
  )
  FROM (
    SELECT
      tes.event_id,
      tes.tenant_name,
      tes.tenant_organization,
      tes.status AS tenant_survey_status,
      tes.venue_rating,
      tes.management_rating,
      tes.event_organization_rating,
      tes.booth_facility_rating,
      tes.overall_rating,
      tes.feedback_comment,
      tes.improvement_suggestion,
      tes.created_at AS tenant_survey_created_at,
      COALESCE(sr.total_visitor_responses, 0) AS total_visitor_responses,
      sr.visitor_mall_overall,
      sr.visitor_eo_overall
    FROM tenant_event_surveys tes
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) AS total_visitor_responses,
        ROUND(AVG((mall_cleanliness + mall_staff_service + mall_coordination + mall_security)::numeric / 4), 1) AS visitor_mall_overall,
        ROUND(AVG(
          (COALESCE(eo_event_quality, 0) + COALESCE(eo_organization, 0) +
           COALESCE(eo_committee_service, 0) + COALESCE(eo_promotion_accuracy, 0) +
           COALESCE(eo_recommendation, 0))::numeric / 5
        ) FILTER (WHERE survey_type = 'public'), 1) AS visitor_eo_overall
      FROM survey_responses
      WHERE survey_responses.event_id = tes.event_id
    ) sr ON true
    WHERE tes.event_id = p_event_id
    ORDER BY tes.created_at DESC
    LIMIT 1
  ) t;
$$;


-- ============================================================================
-- STEP 5: Enable Realtime
-- ============================================================================
--
-- Uses pg_publication_tables (system catalog) instead of
-- supabase_realtime.publications, which only exists in self-hosted
-- Supabase Realtime instances.
--
-- Safe to run multiple times — checks before adding.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'tenant_event_surveys'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tenant_event_surveys;
  END IF;
END;
$$;


-- ============================================================================
-- STEP 6: Updated_at trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_tenant_survey_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tenant_survey_updated_at ON tenant_event_surveys;
CREATE TRIGGER trg_tenant_survey_updated_at
  BEFORE UPDATE ON tenant_event_surveys
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_survey_updated_at();
