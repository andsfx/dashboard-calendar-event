-- ============================================================================
-- MULTI-USER ADMIN & ROLE MANAGEMENT — Schema Extension
-- Metropolitan Mall Bekasi
-- ============================================================================
--
-- PURPOSE: Add eo_tenant role, extend users table, add RLS & indexes
-- IDEMPOTENCY: Safe to run multiple times
--
-- Changes:
--   1. Update role CHECK constraint to include 'eo_tenant'
--   2. Add eo_organization column to users
--   3. Add assigned_events column to users
--   4. Add indexes for activity_logs
--   5. Add RLS policies for activity_logs
--   6. Add RLS policies for users table
--
-- ============================================================================


-- ============================================================================
-- STEP 1: Update role CHECK constraint to include 'eo_tenant'
-- ============================================================================

-- Drop existing constraint and recreate with new value
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
    CHECK (role = ANY (ARRAY['superadmin', 'admin', 'viewer', 'eo_tenant']));
END $$;


-- ============================================================================
-- STEP 2: Add columns for EO/Tenant support
-- ============================================================================

-- Organization name for EO/Tenant users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS eo_organization TEXT DEFAULT '';

-- Array of event IDs this EO/Tenant can access
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS assigned_events TEXT[] DEFAULT '{}';

-- Avatar URL (optional, for future use)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '';


-- ============================================================================
-- STEP 3: Indexes for activity_logs
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at
  ON activity_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id
  ON activity_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_activity_logs_resource
  ON activity_logs(resource_type, resource_id);

CREATE INDEX IF NOT EXISTS idx_activity_logs_action
  ON activity_logs(action);


-- ============================================================================
-- STEP 4: RLS for activity_logs
-- ============================================================================

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can INSERT (for logging)
DROP POLICY IF EXISTS "Authenticated can insert activity logs" ON activity_logs;
CREATE POLICY "Authenticated can insert activity logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only admin/superadmin can read activity logs
DROP POLICY IF EXISTS "Admin can read activity logs" ON activity_logs;
CREATE POLICY "Admin can read activity logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('superadmin', 'admin')
    )
  );


-- ============================================================================
-- STEP 5: RLS for users table
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read the users table (for display names, etc.)
DROP POLICY IF EXISTS "Authenticated can read users" ON public.users;
CREATE POLICY "Authenticated can read users"
  ON public.users FOR SELECT
  TO authenticated
  USING (true);

-- Only superadmin can insert/update/delete users
DROP POLICY IF EXISTS "Superadmin can manage users" ON public.users;
CREATE POLICY "Superadmin can manage users"
  ON public.users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role = 'superadmin'
    )
  );

-- Users can update their own display_name and avatar_url
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());


-- ============================================================================
-- STEP 6: Index for users table
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_eo_org ON public.users(eo_organization)
  WHERE eo_organization != '';


-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
--
-- 1. Check updated constraint:
--    SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--    WHERE conrelid = 'public.users'::regclass AND conname LIKE '%role%';
--
-- 2. Check new columns:
--    SELECT column_name, data_type FROM information_schema.columns
--    WHERE table_name = 'users' AND column_name IN ('eo_organization', 'assigned_events', 'avatar_url');
--
-- 3. Check activity_logs indexes:
--    SELECT indexname FROM pg_indexes WHERE tablename = 'activity_logs';
--
-- 4. Check RLS policies:
--    SELECT * FROM pg_policies WHERE tablename IN ('users', 'activity_logs');
--
-- ============================================================================
