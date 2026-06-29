-- ============================================================================
-- TENANT SURVEY CONFIG — Per-event survey on/off control
-- Metropolitan Mall Bekasi
-- ============================================================================
--
-- PURPOSE: Enable admin to toggle tenant survey active/inactive per event
-- IDEMPOTENCY: Safe to run multiple times (IF NOT EXISTS / DO blocks)
--
-- ============================================================================

-- ============================================================================
-- STEP 1: tenant_survey_config table
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_survey_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  activated_at TIMESTAMPTZ,
  deactivated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- STEP 2: Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tsc_event_id ON tenant_survey_config(event_id);
CREATE INDEX IF NOT EXISTS idx_tsc_is_active ON tenant_survey_config(is_active)
  WHERE is_active = true;

-- ============================================================================
-- STEP 3: Row Level Security
-- ============================================================================

ALTER TABLE tenant_survey_config ENABLE ROW LEVEL SECURITY;

-- Public can read config (to check if survey is active)
DROP POLICY IF EXISTS "Public can read tenant survey config" ON tenant_survey_config;
CREATE POLICY "Public can read tenant survey config"
  ON tenant_survey_config FOR SELECT
  USING (true);

-- Authenticated users can manage config
DROP POLICY IF EXISTS "Authenticated can manage tenant survey config" ON tenant_survey_config;
CREATE POLICY "Authenticated can manage tenant survey config"
  ON tenant_survey_config FOR ALL
  USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- STEP 4: Auto-update trigger
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'tenant_survey_config_updated_at'
  ) THEN
    CREATE TRIGGER tenant_survey_config_updated_at
      BEFORE UPDATE ON tenant_survey_config
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
--
-- SELECT table_name FROM information_schema.tables
-- WHERE table_name = 'tenant_survey_config';
--
-- SELECT * FROM pg_policies WHERE tablename = 'tenant_survey_config';
--