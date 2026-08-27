-- Canonicalize organization_type to the 8-value English enum.
-- Column is TEXT with a CHECK constraint (chk_organization_type) limiting it
-- to the legacy 4 Indonesian values. This migration drops that constraint so
-- all 8 canonical values are accepted, then backfills legacy rows.
--
-- Run in Supabase SQL Editor or `supabase db push`.

BEGIN;

-- 1. Drop the restrictive CHECK constraint
ALTER TABLE public.community_registrations
  DROP CONSTRAINT IF EXISTS chk_organization_type;

-- 2. Replace with a permissive constraint matching the 8-value canonical enum.
--    Legacy values are also allowed so nothing breaks mid-migration.
ALTER TABLE public.community_registrations
  ADD CONSTRAINT chk_organization_type CHECK (
    organization_type IN (
      'community', 'school', 'company', 'eo', 'campus', 'government', 'ngo', 'other',
      -- legacy (kept so migration is safe even if partially re-run)
      'komunitas', 'umkm', 'organisasi', 'lainnya'
    )
  );

-- 3. Backfill legacy Indonesian values to English (disambiguate via community_type)
UPDATE public.community_registrations
SET organization_type = 'eo'
WHERE organization_type = 'organisasi' AND community_type = 'eo';

UPDATE public.community_registrations
SET organization_type = 'government'
WHERE organization_type = 'organisasi' AND community_type = 'government';

UPDATE public.community_registrations
SET organization_type = 'school'
WHERE organization_type = 'organisasi' AND community_type = 'school';

UPDATE public.community_registrations
SET organization_type = 'campus'
WHERE organization_type = 'organisasi' AND community_type = 'campus';

-- Remaining "organisasi" rows with no granular hint default to ngo
UPDATE public.community_registrations
SET organization_type = 'ngo'
WHERE organization_type = 'organisasi';

UPDATE public.community_registrations
SET organization_type = 'community'
WHERE organization_type = 'komunitas';

UPDATE public.community_registrations
SET organization_type = 'company'
WHERE organization_type = 'umkm';

UPDATE public.community_registrations
SET organization_type = 'other'
WHERE organization_type = 'lainnya';

COMMIT;
