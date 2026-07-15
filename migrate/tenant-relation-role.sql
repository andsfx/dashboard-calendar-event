-- ============================================================================
-- Add tenant_relation role for Tenant Relation analytics access
-- IDEMPOTENT: safe to re-run
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_role_check' AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users DROP CONSTRAINT users_role_check;
  END IF;

  ALTER TABLE public.users
    ADD CONSTRAINT users_role_check
    CHECK (role = ANY (ARRAY[
      'superadmin',
      'admin',
      'viewer',
      'eo_tenant',
      'tenant_relation'
    ]));
END $$;
