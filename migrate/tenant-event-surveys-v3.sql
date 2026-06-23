-- ============================================================================
-- TENANT EVENT SURVEYS V3 — Tenant Identity & Survey Expansion
-- Metropolitan Mall Bekasi
-- ============================================================================
--
-- PURPOSE: Extend tenant_event_surveys with richer tenant identity fields
--          (nama_gerai, lokasi_zona, kategori, tenant_id) and business impact
--          metrics (kenaikan_traffic, kenaikan_sales, feedback_teks).
--          Also make existing NOT NULL fields nullable for flexible partial
--          submissions and mark deprecated columns.
--
-- IDEMPOTENCY: Safe to run multiple times (IF NOT EXISTS / DO blocks)
--
-- New Fields:
--   - nama_gerai            (VARCHAR 100)  — booth/store name
--   - lokasi_zona           (VARCHAR 50)   — zone/location within mall
--   - kategori              (VARCHAR 50)   — category label
--   - kenaikan_traffic      (VARCHAR 50)   — traffic increase description
--   - kenaikan_sales        (VARCHAR 50)   — sales increase description
--   - feedback_teks         (TEXT)         — free-form feedback text
--   - tenant_id             (VARCHAR 100)  — future FK to tenants table
--
-- Schema Changes:
--   - DROP NOT NULL on rating fields (venue, management, org, booth, overall)
--   - DROP NOT NULL on percentage fields (sales_lift_pct, traffic_lift_pct)
--   - DROP NOT NULL on old optional fields (tenant_name, tenant_organization,
--     tenant_email, tenant_phone, business_category, business_subcategory,
--     feedback_comment, improvement_suggestion)
--   - Mark business_category + business_subcategory as DEPRECATED via SQL COMMENT
--
-- ============================================================================


-- ============================================================================
-- STEP 1: Add new columns for tenant identity & survey expansion
-- ============================================================================

ALTER TABLE tenant_event_surveys
  ADD COLUMN IF NOT EXISTS nama_gerai VARCHAR(100),
  ADD COLUMN IF NOT EXISTS lokasi_zona VARCHAR(50),
  ADD COLUMN IF NOT EXISTS kategori VARCHAR(50),
  ADD COLUMN IF NOT EXISTS kenaikan_traffic VARCHAR(50),
  ADD COLUMN IF NOT EXISTS kenaikan_sales VARCHAR(50),
  ADD COLUMN IF NOT EXISTS feedback_teks TEXT,
  ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100);


-- ============================================================================
-- STEP 2: DROP NOT NULL on rating fields (allow partial submissions)
-- ============================================================================

ALTER TABLE tenant_event_surveys
  ALTER COLUMN venue_rating DROP NOT NULL;                    -- 1-5 scale, now optional

ALTER TABLE tenant_event_surveys
  ALTER COLUMN management_rating DROP NOT NULL;               -- 1-5 scale, now optional

ALTER TABLE tenant_event_surveys
  ALTER COLUMN event_organization_rating DROP NOT NULL;       -- 1-5 scale, now optional

ALTER TABLE tenant_event_surveys
  ALTER COLUMN booth_facility_rating DROP NOT NULL;           -- 1-5 scale, now optional

ALTER TABLE tenant_event_surveys
  ALTER COLUMN overall_rating DROP NOT NULL;                  -- 1-5 scale, now optional


-- ============================================================================
-- STEP 3: DROP NOT NULL on percentage fields (allow null for incomplete data)
-- ============================================================================

ALTER TABLE tenant_event_surveys
  ALTER COLUMN sales_lift_pct DROP NOT NULL;                  -- DECIMAL, now optional

ALTER TABLE tenant_event_surveys
  ALTER COLUMN traffic_lift_pct DROP NOT NULL;                -- DECIMAL, now optional


-- ============================================================================
-- STEP 4: DROP NOT NULL on old optional identity/feedback fields
-- ============================================================================

ALTER TABLE tenant_event_surveys
  ALTER COLUMN tenant_name DROP NOT NULL;                     -- VARCHAR, now optional

ALTER TABLE tenant_event_surveys
  ALTER COLUMN tenant_organization DROP NOT NULL;             -- VARCHAR, now optional

ALTER TABLE tenant_event_surveys
  ALTER COLUMN tenant_email DROP NOT NULL;                    -- VARCHAR, now optional

ALTER TABLE tenant_event_surveys
  ALTER COLUMN tenant_phone DROP NOT NULL;                    -- VARCHAR, now optional

ALTER TABLE tenant_event_surveys
  ALTER COLUMN business_category DROP NOT NULL;               -- ENUM, now optional

ALTER TABLE tenant_event_surveys
  ALTER COLUMN business_subcategory DROP NOT NULL;            -- TEXT, now optional

ALTER TABLE tenant_event_surveys
  ALTER COLUMN feedback_comment DROP NOT NULL;                -- TEXT, now optional

ALTER TABLE tenant_event_surveys
  ALTER COLUMN improvement_suggestion DROP NOT NULL;          -- TEXT, now optional


-- ============================================================================
-- STEP 5: Mark deprecated columns via SQL COMMENT
-- ============================================================================
-- business_category + business_subcategory are superseded by the new
-- kategori VARCHAR(50) column which provides a simpler, more flexible
-- categorization model.

COMMENT ON COLUMN tenant_event_surveys.business_category IS
  'DEPRECATED — use kategori (VARCHAR) instead. Enum: fnb, retail, jasa, other';

COMMENT ON COLUMN tenant_event_surveys.business_subcategory IS
  'DEPRECATED — use kategori (VARCHAR) for free-form category input';


-- ============================================================================
-- STEP 6: Add column comments for documentation
-- ============================================================================

COMMENT ON COLUMN tenant_event_surveys.nama_gerai IS
  'Nama booth atau gerai tenant di event';

COMMENT ON COLUMN tenant_event_surveys.lokasi_zona IS
  'Lokasi atau zona booth di dalam mall (contoh: GF Atrium, L1 Food Court)';

COMMENT ON COLUMN tenant_event_surveys.kategori IS
  'Kategori tenant (contoh: F&B, Fashion, Otomotif, Komunitas) — flexible VARCHAR';

COMMENT ON COLUMN tenant_event_surveys.kenaikan_traffic IS
  'Deskripsi kenaikan traffic (contoh: Naik 30%, Tetap, Menurun)';

COMMENT ON COLUMN tenant_event_surveys.kenaikan_sales IS
  'Deskripsi kenaikan sales (contoh: Naik 50%, Tidak Signifikan)';

COMMENT ON COLUMN tenant_event_surveys.feedback_teks IS
  'Feedback teks bebas dari tenant mengenai event';

COMMENT ON COLUMN tenant_event_surveys.tenant_id IS
  'Future FK reference to tenants table — NULL until tenants table is populated';


-- ============================================================================
-- VERIFICATION QUERIES (commented out — run manually if needed)
-- ============================================================================

-- -- Check new columns exist
-- SELECT column_name, data_type, character_maximum_length, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'tenant_event_surveys'
--   AND column_name IN (
--     'nama_gerai', 'lokasi_zona', 'kategori',
--     'kenaikan_traffic', 'kenaikan_sales', 'feedback_teks', 'tenant_id'
--   )
-- ORDER BY ordinal_position;

-- -- Check NOT NULL dropped on target columns
-- SELECT column_name, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'tenant_event_surveys'
--   AND column_name IN (
--     'venue_rating', 'management_rating', 'event_organization_rating',
--     'booth_facility_rating', 'overall_rating',
--     'sales_lift_pct', 'traffic_lift_pct',
--     'tenant_name', 'tenant_organization', 'tenant_email', 'tenant_phone',
--     'business_category', 'business_subcategory',
--     'feedback_comment', 'improvement_suggestion'
--   )
-- ORDER BY column_name;

-- -- Check deprecation comments
-- SELECT
--   pgd.description
-- FROM pg_catalog.pg_description pgd
-- JOIN pg_catalog.pg_class pgc ON pgd.objoid = pgc.oid
-- JOIN pg_catalog.pg_attribute pga ON pgd.objsubid = pga.attnum
-- WHERE pgc.relname = 'tenant_event_surveys'
--   AND pga.attname IN ('business_category', 'business_subcategory')
--   AND pgd.description LIKE '%DEPRECATED%';