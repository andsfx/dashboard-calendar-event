-- Migration: Fix community_registrations schema
-- Adds missing columns for multi-type registration support
-- Safe to run multiple times (idempotent with IF NOT EXISTS)
-- Run via Supabase SQL Editor

-- ============================================================================
-- STEP 1: Add new columns for multi-type support
-- ============================================================================

-- Add organization_type column (enum-like constraint)
ALTER TABLE community_registrations
  ADD COLUMN IF NOT EXISTS organization_type TEXT DEFAULT 'komunitas';

-- Add organization_name (generic name field for all types)
ALTER TABLE community_registrations
  ADD COLUMN IF NOT EXISTS organization_name TEXT;

-- Add type_specific_data (flexible JSONB for type-specific fields)
ALTER TABLE community_registrations
  ADD COLUMN IF NOT EXISTS type_specific_data JSONB DEFAULT '{}';


-- ============================================================================
-- STEP 2: Add length constraints to existing TEXT columns
-- ============================================================================

-- Add constraint for community_name (3-200 chars)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_community_name_length'
  ) THEN
    ALTER TABLE community_registrations
      ADD CONSTRAINT chk_community_name_length
      CHECK (length(trim(community_name)) >= 3 AND length(trim(community_name)) <= 200);
  END IF;
END $$;

-- Add constraint for organization_name (3-200 chars)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_organization_name_length'
  ) THEN
    ALTER TABLE community_registrations
      ADD CONSTRAINT chk_organization_name_length
      CHECK (organization_name IS NULL OR (length(trim(organization_name)) >= 3 AND length(trim(organization_name)) <= 200));
  END IF;
END $$;

-- Add constraint for pic (3-100 chars)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_pic_length'
  ) THEN
    ALTER TABLE community_registrations
      ADD CONSTRAINT chk_pic_length
      CHECK (length(trim(pic)) >= 3 AND length(trim(pic)) <= 100);
  END IF;
END $$;

-- Add constraint for phone (10-15 chars after normalization)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_phone_length'
  ) THEN
    ALTER TABLE community_registrations
      ADD CONSTRAINT chk_phone_length
      CHECK (length(phone) >= 10 AND length(phone) <= 15);
  END IF;
END $$;

-- Add constraint for email (max 255 chars)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_email_length'
  ) THEN
    ALTER TABLE community_registrations
      ADD CONSTRAINT chk_email_length
      CHECK (email = '' OR length(email) <= 255);
  END IF;
END $$;

-- Add constraint for instagram (max 100 chars)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_instagram_length'
  ) THEN
    ALTER TABLE community_registrations
      ADD CONSTRAINT chk_instagram_length
      CHECK (instagram = '' OR length(instagram) <= 100);
  END IF;
END $$;

-- Add constraint for description (max 2000 chars)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_description_length'
  ) THEN
    ALTER TABLE community_registrations
      ADD CONSTRAINT chk_description_length
      CHECK (description = '' OR length(description) <= 2000);
  END IF;
END $$;


-- ============================================================================
-- STEP 3: Add validation constraints
-- ============================================================================

-- Add CHECK constraint for organization_type (enum values)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_organization_type'
  ) THEN
    ALTER TABLE community_registrations
      ADD CONSTRAINT chk_organization_type
      CHECK (organization_type IN ('komunitas', 'umkm', 'organisasi', 'lainnya'));
  END IF;
END $$;


-- ============================================================================
-- STEP 4: Add unique constraint to prevent duplicates
-- ============================================================================

-- Add unique constraint on (email, phone) combination
-- This prevents the same person from registering multiple times
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'uq_email_phone'
  ) THEN
    -- Only create unique constraint if there are no existing duplicates
    IF NOT EXISTS (
      SELECT email, phone, COUNT(*)
      FROM community_registrations
      WHERE email != '' AND phone != ''
      GROUP BY email, phone
      HAVING COUNT(*) > 1
    ) THEN
      ALTER TABLE community_registrations
        ADD CONSTRAINT uq_email_phone
        UNIQUE (email, phone);
    ELSE
      RAISE NOTICE 'Duplicate (email, phone) combinations found. Please clean data before adding unique constraint.';
    END IF;
  END IF;
END $$;


-- ============================================================================
-- STEP 5: Backfill existing data
-- ============================================================================

-- Backfill organization_type and organization_name for existing rows
UPDATE community_registrations
SET 
  organization_type = 'komunitas',
  organization_name = community_name
WHERE 
  organization_type IS NULL 
  OR organization_name IS NULL;


-- ============================================================================
-- STEP 6: Add indexes for performance
-- ============================================================================

-- Index for filtering by organization_type
CREATE INDEX IF NOT EXISTS idx_registrations_org_type
  ON community_registrations(organization_type);

-- Index for searching by organization_name
CREATE INDEX IF NOT EXISTS idx_registrations_org_name
  ON community_registrations(organization_name);

-- Index for duplicate detection (email + phone)
CREATE INDEX IF NOT EXISTS idx_registrations_email_phone
  ON community_registrations(email, phone)
  WHERE email != '' AND phone != '';


-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these queries after migration to verify success:

-- 1. Check new columns exist
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'community_registrations'
-- ORDER BY ordinal_position;

-- 2. Check constraints
-- SELECT conname, contype, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'community_registrations'::regclass;

-- 3. Check indexes
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'community_registrations';

-- 4. Verify backfill
-- SELECT 
--   COUNT(*) as total_rows,
--   COUNT(organization_type) as has_org_type,
--   COUNT(organization_name) as has_org_name,
--   COUNT(type_specific_data) as has_type_data
-- FROM community_registrations;

-- 5. Check for duplicates (should return 0 rows if unique constraint applied)
-- SELECT email, phone, COUNT(*)
-- FROM community_registrations
-- WHERE email != '' AND phone != ''
-- GROUP BY email, phone
-- HAVING COUNT(*) > 1;
