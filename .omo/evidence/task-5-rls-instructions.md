# Task 5: RLS Policy Fix - Instructions for Andy

## Overview

This migration fixes a **critical security issue** where PII data (pic/name, phone, email) in the `community_registrations` table was publicly accessible.

**Security Issue**: The current RLS policy allows anyone to read all registrations without authentication.

**Solution**: Drop public read policy and create admin-only read policy.

---

## Files Created

- `migrate/fix-community-registration-rls.sql` - SQL migration to fix RLS policies

---

## How to Run the Migration

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Run the Migration

1. Open the file `migrate/fix-community-registration-rls.sql`
2. Copy the entire SQL content
3. Paste into Supabase SQL Editor
4. Click **Run** button

### Step 3: Verify Success

The query should complete without errors. You should see:

```
Success. No rows returned
```

---

## Verification Tests

After running the migration, perform these tests to ensure everything works correctly:

### Test 1: Public Cannot Read Registrations ✅

**Purpose**: Verify PII data is protected from public access

**Steps**:
1. Open Supabase dashboard
2. Go to **Table Editor** > `community_registrations`
3. Try to view the table **without being logged in** (or use anon key in API)
4. Expected: No rows returned or access denied

**Alternative (API Test)**:
```bash
# Using curl with anon key (public access)
curl 'https://YOUR_PROJECT.supabase.co/rest/v1/community_registrations?select=*' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Expected: Empty array [] or 403 Forbidden
```

**Evidence**: Save result to `.sisyphus/evidence/task-5-public-read-blocked.txt`

---

### Test 2: Admin Can Read Registrations ✅

**Purpose**: Verify authenticated admin users can access registrations

**Steps**:
1. Login to your admin dashboard (or authenticate via Supabase)
2. Navigate to registrations section
3. Verify you can see all registrations with PII data
4. Expected: All registrations visible

**Alternative (API Test)**:
```bash
# Using curl with authenticated user token
curl 'https://YOUR_PROJECT.supabase.co/rest/v1/community_registrations?select=*' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_USER_JWT_TOKEN"

# Expected: Array of registrations with all data
```

**Evidence**: Save result to `.sisyphus/evidence/task-5-admin-read-works.txt`

---

### Test 3: Public Can Still Submit Registration ✅

**Purpose**: Verify registration form still works for public users

**Steps**:
1. Open registration form (not logged in)
2. Fill out the form with test data:
   - Community Name: "Test Community"
   - Community Type: "Komunitas Hobi"
   - PIC: "Test User"
   - Phone: "081234567890"
   - Email: "test@example.com"
3. Submit the form
4. Expected: Success message, registration created

**Alternative (API Test)**:
```bash
# Using curl with anon key (public access)
curl -X POST 'https://YOUR_PROJECT.supabase.co/rest/v1/community_registrations' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "community_name": "Test Community",
    "community_type": "Komunitas Hobi",
    "pic": "Test User",
    "phone": "081234567890",
    "email": "test@example.com"
  }'

# Expected: 201 Created with registration data
```

**Evidence**: Save result to `.sisyphus/evidence/task-5-public-insert-works.txt`

---

## Rollback Instructions

If you need to rollback to the previous (insecure) policy:

```sql
-- WARNING: This will re-expose PII data to public!
-- Only use for emergency rollback

DROP POLICY IF EXISTS "Admin can read community_registrations" ON community_registrations;

CREATE POLICY "Public can read community_registrations" 
  ON community_registrations 
  FOR SELECT 
  USING (true);
```

---

## Current Policy Details

After migration, the `community_registrations` table will have these RLS policies:

### 1. Admin Read Policy
- **Name**: "Admin can read community_registrations"
- **Operation**: SELECT
- **Condition**: `auth.uid() IS NOT NULL` (user must be authenticated)
- **Purpose**: Protect PII data from public access

### 2. Public Insert Policy
- **Name**: "Public can insert community_registrations"
- **Operation**: INSERT
- **Condition**: `true` (anyone can insert)
- **Purpose**: Allow registration form to work without authentication

---

## Future Enhancement: Role-Based Access Control

The current policy allows **all authenticated users** to read registrations. For production, you should implement proper role-based access control:

### Option 1: Use Supabase Auth Metadata

1. Add admin role to user metadata:
```sql
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb 
WHERE email = 'admin@example.com';
```

2. Update policy to check role:
```sql
DROP POLICY IF EXISTS "Admin can read community_registrations" ON community_registrations;

CREATE POLICY "Admin can read community_registrations" 
  ON community_registrations 
  FOR SELECT 
  USING (
    auth.uid() IS NOT NULL 
    AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );
```

### Option 2: Create Admin Users Table

1. Create admin_users table:
```sql
CREATE TABLE admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add your admin user
INSERT INTO admin_users (user_id) 
VALUES ('YOUR_USER_UUID');
```

2. Update policy to check admin table:
```sql
DROP POLICY IF EXISTS "Admin can read community_registrations" ON community_registrations;

CREATE POLICY "Admin can read community_registrations" 
  ON community_registrations 
  FOR SELECT 
  USING (
    auth.uid() IS NOT NULL 
    AND EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );
```

---

## Troubleshooting

### Issue: "permission denied for table community_registrations"

**Cause**: RLS is blocking access

**Solution**: 
1. Verify you are authenticated (check `auth.uid()` returns a value)
2. Check policy is created correctly:
```sql
SELECT * FROM pg_policies WHERE tablename = 'community_registrations';
```

### Issue: Registration form not working

**Cause**: Public insert policy might be missing

**Solution**:
```sql
-- Re-create public insert policy
DROP POLICY IF EXISTS "Public can insert community_registrations" ON community_registrations;
CREATE POLICY "Public can insert community_registrations" 
  ON community_registrations 
  FOR INSERT 
  WITH CHECK (true);
```

### Issue: Admin dashboard not showing registrations

**Cause**: User is not authenticated or policy is too restrictive

**Solution**:
1. Verify user is logged in
2. Check `auth.uid()` returns a value:
```sql
SELECT auth.uid();
```
3. If null, user is not authenticated - login required

---

## Summary

✅ **What Changed**:
- Dropped public read policy (security fix)
- Created admin-only read policy (authenticated users only)
- Kept public insert policy (registration form still works)

✅ **Security Improvement**:
- PII data (pic, phone, email) no longer publicly accessible
- Only authenticated users can read registrations

✅ **Functionality Preserved**:
- Registration form still works for public users
- Admin dashboard can still read registrations (if authenticated)

⚠️ **Next Steps**:
- Implement proper role-based access control (see "Future Enhancement" section)
- Test all three scenarios above
- Document evidence in `.sisyphus/evidence/task-5-*-test.txt` files

---

## Questions?

If you encounter any issues or have questions about this migration, refer to:
- Audit report: `.sisyphus/evidence/community-registration-audit.md`
- Work plan: `.sisyphus/plans/fix-community-registration-critical-issues.md`
- Original schema: `migrate/community-registrations.sql`
