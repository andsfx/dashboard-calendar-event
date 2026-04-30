-- ============================================================================
-- FIX RLS POLICY FOR COMMUNITY_REGISTRATIONS TABLE
-- ============================================================================
-- 
-- PURPOSE: Protect PII data (pic, phone, email) from public access
-- 
-- SECURITY ISSUE: Current policy allows public read access to all registrations
--   - Line 20-21 in community-registrations.sql: "Public can read community_registrations"
--   - This exposes sensitive PII data to anyone
-- 
-- SOLUTION:
--   1. Drop existing public read policy
--   2. Create admin-only read policy (authenticated users only)
--   3. Keep public insert policy (registration form needs this)
-- 
-- IDEMPOTENCY: Safe to run multiple times (uses IF EXISTS/IF NOT EXISTS)
-- 
-- ============================================================================

-- Drop the insecure public read policy
-- This policy allowed anyone to read all registrations including PII data
DROP POLICY IF EXISTS "Public can read community_registrations" ON community_registrations;

-- Create admin-only read policy
-- Only authenticated users can read registrations
-- Note: In Supabase, authenticated users are identified by auth.uid() IS NOT NULL
-- For more granular control (e.g., specific admin role), you would need to:
--   1. Add a role column to auth.users metadata, OR
--   2. Create a separate admin_users table with user_id references
-- 
-- Current implementation: All authenticated users can read (basic protection)
-- Recommended: Add role-based check once admin system is implemented
DROP POLICY IF EXISTS "Admin can read community_registrations" ON community_registrations;
CREATE POLICY "Admin can read community_registrations" 
  ON community_registrations 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

-- Keep public insert policy unchanged
-- Registration form requires public users to submit without authentication
-- This policy is already in place from community-registrations.sql
-- Included here for documentation completeness
DROP POLICY IF EXISTS "Public can insert community_registrations" ON community_registrations;
CREATE POLICY "Public can insert community_registrations" 
  ON community_registrations 
  FOR INSERT 
  WITH CHECK (true);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- 
-- After running this migration, verify policies are correct:
-- 
-- 1. List all policies on community_registrations:
--    SELECT * FROM pg_policies WHERE tablename = 'community_registrations';
-- 
-- 2. Expected policies:
--    - "Admin can read community_registrations" (SELECT, auth.uid() IS NOT NULL)
--    - "Public can insert community_registrations" (INSERT, true)
-- 
-- ============================================================================
-- FUTURE ENHANCEMENT: Role-Based Access Control
-- ============================================================================
-- 
-- To implement proper admin role checking, you can:
-- 
-- Option 1: Use Supabase auth.users metadata
-- UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb WHERE email = 'admin@example.com';
-- 
-- Then update policy:
-- CREATE POLICY "Admin can read community_registrations" 
--   ON community_registrations 
--   FOR SELECT 
--   USING (
--     auth.uid() IS NOT NULL 
--     AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
--   );
-- 
-- Option 2: Create admin_users table
-- CREATE TABLE admin_users (
--   user_id UUID PRIMARY KEY REFERENCES auth.users(id),
--   created_at TIMESTAMPTZ DEFAULT NOW()
-- );
-- 
-- Then update policy:
-- CREATE POLICY "Admin can read community_registrations" 
--   ON community_registrations 
--   FOR SELECT 
--   USING (
--     auth.uid() IS NOT NULL 
--     AND EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
--   );
-- 
-- ============================================================================
