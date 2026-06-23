# Migration Instructions: Fix Community Registration Schema

**File:** `migrate/fix-community-registration-schema.sql`  
**Status:** ✅ Ready to run  
**Estimated time:** < 1 minute  
**Risk level:** LOW (idempotent, backward compatible)

---

## What This Migration Does

Adds missing columns and constraints to `community_registrations` table to support multi-type registration (komunitas, UMKM, organisasi, lainnya).

### Changes Applied:

1. **New Columns:**
   - `organization_type` TEXT (enum: komunitas, umkm, organisasi, lainnya)
   - `organization_name` TEXT (generic name field for all types)
   - `type_specific_data` JSONB (flexible storage for type-specific fields)

2. **Length Constraints:**
   - `community_name`: 3-200 characters
   - `organization_name`: 3-200 characters (nullable)
   - `pic`: 3-100 characters
   - `phone`: 10-15 characters
   - `email`: max 255 characters
   - `instagram`: max 100 characters
   - `description`: max 2000 characters

3. **Validation Constraints:**
   - `organization_type` must be one of: komunitas, umkm, organisasi, lainnya
   - Unique constraint on (email, phone) to prevent duplicate registrations

4. **Indexes:**
   - `idx_registrations_org_type` - for filtering by type
   - `idx_registrations_org_name` - for searching by name
   - `idx_registrations_email_phone` - for duplicate detection

5. **Data Backfill:**
   - Existing rows: `organization_type` = 'komunitas', `organization_name` = `community_name`

---

## How to Run

### Step 1: Open Supabase SQL Editor

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **SQL Editor** (left sidebar)

### Step 2: Execute Migration

1. Click **New Query**
2. Copy the entire contents of `migrate/fix-community-registration-schema.sql`
3. Paste into the SQL Editor
4. Click **Run** (or press Ctrl+Enter)

### Step 3: Verify Success

Run these verification queries in the SQL Editor:

```sql
-- 1. Check new columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'community_registrations'
ORDER BY ordinal_position;

-- 2. Check constraints
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'community_registrations'::regclass;

-- 3. Verify backfill (should show all rows have organization_type and organization_name)
SELECT 
  COUNT(*) as total_rows,
  COUNT(organization_type) as has_org_type,
  COUNT(organization_name) as has_org_name,
  COUNT(type_specific_data) as has_type_data
FROM community_registrations;

-- 4. Check for duplicates (should return 0 rows if unique constraint applied)
SELECT email, phone, COUNT(*)
FROM community_registrations
WHERE email != '' AND phone != ''
GROUP BY email, phone
HAVING COUNT(*) > 1;
```

**Expected Results:**
- Query 1: Should show 15 columns including new ones
- Query 2: Should show all constraints including `chk_organization_type`, `uq_email_phone`, etc.
- Query 3: All counts should match `total_rows`
- Query 4: Should return 0 rows (no duplicates)

---

## Safety Features

✅ **Idempotent:** Safe to run multiple times (uses `IF NOT EXISTS`)  
✅ **Backward Compatible:** Existing data remains valid  
✅ **No Data Loss:** No columns dropped, no data deleted  
✅ **Nullable New Columns:** Won't break existing rows  
✅ **Backfill Included:** Existing rows automatically updated  

---

## Rollback Instructions

If something goes wrong (unlikely), you can rollback:

```sql
-- Remove new columns
ALTER TABLE community_registrations DROP COLUMN IF EXISTS organization_type;
ALTER TABLE community_registrations DROP COLUMN IF EXISTS organization_name;
ALTER TABLE community_registrations DROP COLUMN IF EXISTS type_specific_data;

-- Remove constraints (if they were added)
ALTER TABLE community_registrations DROP CONSTRAINT IF EXISTS chk_organization_type;
ALTER TABLE community_registrations DROP CONSTRAINT IF EXISTS chk_community_name_length;
ALTER TABLE community_registrations DROP CONSTRAINT IF EXISTS chk_organization_name_length;
ALTER TABLE community_registrations DROP CONSTRAINT IF EXISTS chk_pic_length;
ALTER TABLE community_registrations DROP CONSTRAINT IF EXISTS chk_phone_length;
ALTER TABLE community_registrations DROP CONSTRAINT IF EXISTS chk_email_length;
ALTER TABLE community_registrations DROP CONSTRAINT IF EXISTS chk_instagram_length;
ALTER TABLE community_registrations DROP CONSTRAINT IF EXISTS chk_description_length;
ALTER TABLE community_registrations DROP CONSTRAINT IF EXISTS uq_email_phone;

-- Remove indexes
DROP INDEX IF EXISTS idx_registrations_org_type;
DROP INDEX IF EXISTS idx_registrations_org_name;
DROP INDEX IF EXISTS idx_registrations_email_phone;
```

---

## Troubleshooting

### Issue: Unique constraint fails to create

**Cause:** Duplicate (email, phone) combinations exist in the database.

**Solution:**
1. Run the duplicate detection query (verification query #4)
2. Manually resolve duplicates (delete or update)
3. Re-run the migration

### Issue: Length constraint fails

**Cause:** Existing data violates length constraints (e.g., community_name < 3 chars).

**Solution:**
1. Find violating rows:
   ```sql
   SELECT * FROM community_registrations
   WHERE length(trim(community_name)) < 3 OR length(trim(community_name)) > 200;
   ```
2. Fix the data manually
3. Re-run the migration

---

## Next Steps After Migration

1. ✅ Verify migration success (run verification queries)
2. Update API endpoint to use new columns (`/api/community-registration`)
3. Update frontend form to support multi-type registration
4. Test registration flow for all types (komunitas, UMKM, organisasi, lainnya)
5. Monitor for any issues in production

---

## Questions?

If you encounter any issues:
1. Check the Supabase logs for error details
2. Run the verification queries to diagnose
3. Use rollback instructions if needed
4. Contact the development team

---

**Created:** 2026-04-30  
**Author:** Sisyphus-Junior (enowX Labs AI)  
**Related:** `.sisyphus/plans/milestone-a-multi-type-registration.md`
