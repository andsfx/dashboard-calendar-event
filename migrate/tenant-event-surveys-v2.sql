-- ============================================================================
-- TENANT EVENT SURVEYS V2 — Business Impact Enhancement
-- Metropolitan Mall Bekasi
-- ============================================================================
--
-- PURPOSE: Extend tenant_event_surveys with business impact metrics
--          (sales/traffic lift percentages + business type segmentation)
--
-- IDEMPOTENCY: Safe to run multiple times (IF NOT EXISTS / DO blocks)
--
-- New Fields:
--   - business_category     (ENUM: fnb, retail, jasa, other)
--   - business_subcategory  (TEXT: specific business type)
--   - sales_lift_pct        (DECIMAL: -100.00 to 1000.00)
--   - traffic_lift_pct      (DECIMAL: -100.00 to 1000.00)
--
-- Design Decision: User prefers percentage input over absolute Rupiah values
--                  for privacy and simpler comparison across business sizes
--
-- ============================================================================


-- ============================================================================
-- STEP 1: Create business_category enum type
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'business_category_enum') THEN
    CREATE TYPE business_category_enum AS ENUM ('fnb', 'retail', 'jasa', 'other');
  END IF;
END $$;


-- ============================================================================
-- STEP 2: Add new columns to tenant_event_surveys table
-- ============================================================================

ALTER TABLE tenant_event_surveys
  ADD COLUMN IF NOT EXISTS business_category business_category_enum,
  ADD COLUMN IF NOT EXISTS business_subcategory TEXT,
  ADD COLUMN IF NOT EXISTS sales_lift_pct DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS traffic_lift_pct DECIMAL(5,2);


-- ============================================================================
-- STEP 3: Add CHECK constraints for percentage ranges
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tenant_event_surveys_sales_lift_pct_range'
  ) THEN
    ALTER TABLE tenant_event_surveys
      ADD CONSTRAINT tenant_event_surveys_sales_lift_pct_range
      CHECK (sales_lift_pct IS NULL OR (sales_lift_pct >= -100 AND sales_lift_pct <= 1000));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tenant_event_surveys_traffic_lift_pct_range'
  ) THEN
    ALTER TABLE tenant_event_surveys
      ADD CONSTRAINT tenant_event_surveys_traffic_lift_pct_range
      CHECK (traffic_lift_pct IS NULL OR (traffic_lift_pct >= -100 AND traffic_lift_pct <= 1000));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tenant_event_surveys_business_subcategory_length'
  ) THEN
    ALTER TABLE tenant_event_surveys
      ADD CONSTRAINT tenant_event_surveys_business_subcategory_length
      CHECK (business_subcategory IS NULL OR (char_length(business_subcategory) >= 1 AND char_length(business_subcategory) <= 50));
  END IF;
END $$;


-- ============================================================================
-- STEP 4: Add indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tenant_surveys_business_category
  ON tenant_event_surveys(business_category);

CREATE INDEX IF NOT EXISTS idx_tenant_surveys_event_lift
  ON tenant_event_surveys(event_id, sales_lift_pct, traffic_lift_pct);

CREATE INDEX IF NOT EXISTS idx_tenant_surveys_business_category_lift
  ON tenant_event_surveys(business_category, sales_lift_pct, traffic_lift_pct);


-- ============================================================================
-- STEP 5: Add column comments for documentation
-- ============================================================================

COMMENT ON COLUMN tenant_event_surveys.business_category IS
  'High-level business category: fnb (F&B), retail, jasa (services), other';

COMMENT ON COLUMN tenant_event_surveys.business_subcategory IS
  'Specific business type within the category (e.g., Restoran, Café, Fashion, etc.)';

COMMENT ON COLUMN tenant_event_surveys.sales_lift_pct IS
  'Sales lift percentage vs 7-day baseline (-100% to +1000%)';

COMMENT ON COLUMN tenant_event_surveys.traffic_lift_pct IS
  'Customer traffic lift percentage vs 7-day baseline (-100% to +1000%)';


-- ============================================================================
-- VERIFICATION QUERIES (commented out - run manually if needed)
-- ============================================================================

-- SELECT column_name, data_type, character_maximum_length, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'tenant_event_surveys'
--   AND column_name IN ('business_category', 'business_subcategory', 'sales_lift_pct', 'traffic_lift_pct')
-- ORDER BY column_name;

-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'tenant_event_surveys'
--   AND indexname LIKE 'idx_tenant_surveys_%';
