# Milestone A: Multi-Type Registration

## TL;DR

> **Quick Summary**: Expand registration form dari community-only → 8 tipe organisasi (community, school, company, EO, campus, government, NGO, other). Tidak mengubah auth system sama sekali.
>
> **Deliverables**:
> - Organization type selector di registration form
> - Conditional fields per tipe organisasi
> - Updated admin view dengan filter by type
> - Database migration (tambah kolom ke `community_registrations`)
>
> **Estimated Effort**: 4-6 jam
> **Critical Path**: DB migration → Form update → Admin view update → Deploy

---

## Context

### Current State
- Registration form: community-only (`CommunityRegistrationForm.tsx`, 211 lines)
- Supabase table: `community_registrations` dengan fields:
  - `community_name`, `community_type`, `pic`, `phone`, `email`, `instagram`, `description`, `preferred_date`, `status`, `admin_note`, `created_at`
- Admin view: `CommunityRegistrationSection.tsx` + `CommunityRegistrationDetailModal.tsx`
- Auth: single admin password via env var (TIDAK DIUBAH)
- Hosting: Vercel Hobby plan + Supabase

### Target State
- Registration form supports 8 organization types
- Each type has common fields + type-specific fields
- Admin can filter registrations by organization type
- Backward compatible — existing community registrations tetap valid

### Constraints
- **NO auth changes** — existing admin password system tetap
- **NO new tables** — extend existing `community_registrations` table
- **NO new dependencies** — pakai yang sudah ada (React 19, Tailwind v4, Lucide icons)
- **Vercel Hobby plan** — no serverless function size limits concern (simple CRUD)
- **Backward compatible** — existing data harus tetap bisa dibaca

---

## Database Migration

### Strategy: Extend existing table (non-breaking)

```sql
-- Migration: Add multi-type support to community_registrations
-- Safe to run on existing data — all new columns are nullable

-- 1. Add organization_type column (default 'community' for existing rows)
ALTER TABLE community_registrations
  ADD COLUMN IF NOT EXISTS organization_type TEXT DEFAULT 'community';

-- 2. Add type-specific data as JSONB (flexible schema per type)
ALTER TABLE community_registrations
  ADD COLUMN IF NOT EXISTS type_specific_data JSONB DEFAULT '{}';

-- 3. Add organization_name (generic name field, replaces community_name for non-community types)
ALTER TABLE community_registrations
  ADD COLUMN IF NOT EXISTS organization_name TEXT;

-- 4. Backfill existing rows
UPDATE community_registrations
  SET organization_type = 'community',
      organization_name = community_name
  WHERE organization_type IS NULL OR organization_type = 'community';

-- 5. Add index for filtering by type
CREATE INDEX IF NOT EXISTS idx_registrations_org_type
  ON community_registrations(organization_type);

-- 6. Add check constraint for valid types
ALTER TABLE community_registrations
  ADD CONSTRAINT chk_organization_type
  CHECK (organization_type IN ('community', 'school', 'company', 'eo', 'campus', 'government', 'ngo', 'other'));
```

### Why NOT rename the table
- Renaming `community_registrations` → `registrations` would break:
  - `supabaseApi.ts` (3 references)
  - `supabase-admin.js` (2 references)
  - Any existing RLS policies
- Adding columns is non-breaking and simpler

---

## Organization Types & Fields

### Common Fields (all types)
| Field | Required | Notes |
|-------|----------|-------|
| Organization Name | ✅ | Maps to `organization_name` |
| Contact Person (PIC) | ✅ | Existing `pic` field |
| Phone | ✅ | Existing `phone` field |
| Email | ❌ | Existing `email` field |
| Instagram/Social | ❌ | Existing `instagram` field |
| Description/Proposal | ❌ | Existing `description` field |
| Preferred Date | ❌ | Existing `preferred_date` field |

### Type-Specific Fields (stored in `type_specific_data` JSONB)

**Community** (existing flow, minimal change):
- Community Type (musik, dance, seni, gaming, etc.) → existing `community_type`
- Member Count
- Social Media Links

**School / University** (`school`):
- Education Level (SD, SMP, SMA, University)
- Institution Type (Negeri, Swasta)
- Student Count
- Teacher/Advisor Name

**Company / Corporate** (`company`):
- Industry
- Employee Count
- Event Purpose (CSR, Team Building, Product Launch, etc.)

**Event Organizer** (`eo`):
- Specialization (Music, Sports, Exhibition, etc.)
- Portfolio/Past Events
- Team Size

**Campus Organization** (`campus`):
- University Name
- Faculty/Department
- Organization Type (BEM, UKM, Himpunan, etc.)
- Member Count

**Government Agency** (`government`):
- Agency Name
- Department
- Program Type

**NGO / Non-Profit** (`ngo`):
- Focus Area
- Registration Number (optional)
- Program Description

**Other** (`other`):
- Organization Type (free text)
- Additional Info

---

## TODOs

- [ ] 1. Database Migration — Add multi-type columns

  **What to do**:
  - Run SQL migration on Supabase to add `organization_type`, `type_specific_data`, `organization_name` columns
  - Backfill existing rows with `organization_type = 'community'`
  - Add index and check constraint
  - Verify existing data is intact

  **Must NOT do**:
  - Do NOT rename the table
  - Do NOT drop existing columns
  - Do NOT modify RLS policies

  **Acceptance Criteria**:
  - [ ] New columns exist on `community_registrations`
  - [ ] Existing rows have `organization_type = 'community'`
  - [ ] Check constraint prevents invalid types
  - [ ] Index on `organization_type` exists

  **Verification**: Query Supabase to confirm schema change

  **Commit**: NO (database change, not code)

---

- [ ] 2. Update TypeScript Types & API Layer

  **What to do**:
  - Update `CommunityRegistration` interface in `src/types.ts`:
    - Add `organizationType: OrganizationType`
    - Add `organizationName: string`
    - Add `typeSpecificData: Record<string, string | number>`
  - Add `OrganizationType` type: `'community' | 'school' | 'company' | 'eo' | 'campus' | 'government' | 'ngo' | 'other'`
  - Update `submitCommunityRegistration()` in `supabaseApi.ts`:
    - Accept new fields
    - Send `organization_type`, `organization_name`, `type_specific_data` to Supabase
  - Update `fetchCommunityRegistrations()` in `supabaseApi.ts`:
    - Map new columns to TypeScript interface
  - Update `readRegistrations` action in `api/supabase-admin.js`:
    - Already uses `select('*')` so new columns auto-included ✅

  **Must NOT do**:
  - Do NOT rename functions yet (keep `submitCommunityRegistration` name for now)
  - Do NOT break existing form submission

  **Acceptance Criteria**:
  - [ ] TypeScript types include new fields
  - [ ] API functions handle new fields
  - [ ] Existing community submissions still work (backward compatible)
  - [ ] `npm run build` passes with 0 errors

  **Commit**: `feat: add multi-type registration types and API support`

---

- [ ] 3. Create Multi-Type Registration Form

  **What to do**:
  - Create `src/components/community/OrganizationTypeSelector.tsx`:
    - Visual card selector for 8 organization types
    - Each card: icon (Lucide) + label + short description
    - Selected state with accent border/bg
    - Responsive grid (2 cols mobile, 4 cols desktop)
  - Create `src/components/community/TypeSpecificFields.tsx`:
    - Renders conditional fields based on selected type
    - Each type has its own field set (see Organization Types section above)
    - Uses same input styling as existing form
  - Update `CommunityRegistrationForm.tsx`:
    - Add OrganizationTypeSelector at top (step 1)
    - Show common fields + TypeSpecificFields after type selection (step 2)
    - For `community` type: keep existing `communityType` dropdown
    - For other types: show type-specific fields
    - Update form submission to include new fields
    - Add smooth transition between steps

  **Must NOT do**:
  - Do NOT delete existing form — extend it
  - Do NOT change form styling/theme (keep existing warm cream aesthetic)
  - Do NOT add new dependencies
  - Do NOT break mobile responsiveness

  **Acceptance Criteria**:
  - [ ] Type selector shows 8 options with icons
  - [ ] Selecting a type reveals appropriate fields
  - [ ] Community type shows existing fields (backward compatible UX)
  - [ ] All types can be submitted successfully
  - [ ] Form validates required fields per type
  - [ ] Mobile responsive (stacks properly)
  - [ ] Dark mode works

  **Commit**: `feat: multi-type organization registration form`

---

- [ ] 4. Update Admin Registration View

  **What to do**:
  - Update `CommunityRegistrationSection.tsx`:
    - Add organization type filter tabs/dropdown (in addition to status tabs)
    - Show organization type badge on each registration card
    - Show `organization_name` instead of `communityName` for non-community types
  - Update `CommunityRegistrationDetailModal.tsx`:
    - Show organization type prominently
    - Render type-specific data fields in detail view
    - Update WhatsApp templates to use `organization_name`
  - Update type badge colors per organization type

  **Must NOT do**:
  - Do NOT change admin auth flow
  - Do NOT modify status workflow (pending → reviewed → approved/rejected)
  - Do NOT break existing WhatsApp template functionality

  **Acceptance Criteria**:
  - [ ] Admin can filter by organization type
  - [ ] Type badge visible on registration cards
  - [ ] Detail modal shows type-specific fields
  - [ ] Existing community registrations display correctly
  - [ ] WhatsApp templates work for all types

  **Commit**: `feat: admin view for multi-type registrations`

---

- [ ] 5. Landing Page — Update Registration Section

  **What to do**:
  - Update `CommunityLandingPage.tsx` registration section:
    - Update section title: "Daftar Komunitas" → "Daftar Organisasi / Komunitas"
    - Update subtitle to mention multiple organization types
    - Keep "Community" as the default/highlighted type
  - Update `CommunitySteps.tsx` if it references community-only flow
  - Update `CommunityBenefits.tsx` if benefits are community-specific

  **Must NOT do**:
  - Do NOT rename component files (keep `Community*` naming for now)
  - Do NOT change page layout or design
  - Do NOT modify hero section

  **Acceptance Criteria**:
  - [ ] Landing page mentions multiple organization types
  - [ ] Registration form accessible from landing page
  - [ ] Steps section updated if needed
  - [ ] No broken links or references

  **Commit**: `feat: update landing page for multi-type registration`

---

- [ ] 6. Build, Test & Deploy

  **What to do**:
  - Run `npm run build` — verify 0 errors
  - Test locally with `npm run dev`:
    - Submit registration for each type
    - Verify admin can see all types
    - Verify existing community registrations still display
  - Run existing tests: `npm run test`
  - Deploy: `vercel --prod`
  - Verify live site

  **Must NOT do**:
  - Do NOT deploy without build passing
  - Do NOT skip testing existing community flow

  **Acceptance Criteria**:
  - [ ] Build passes with 0 errors
  - [ ] All 8 types can register
  - [ ] Admin view works for all types
  - [ ] Existing data intact
  - [ ] Live on Vercel

  **Commit**: NO (deploy only)

---

## File Change Summary

| File | Change |
|------|--------|
| `src/types.ts` | Add `OrganizationType`, update `CommunityRegistration` |
| `src/utils/supabaseApi.ts` | Update submit/fetch functions for new fields |
| `src/components/community/OrganizationTypeSelector.tsx` | **NEW** — type selector component |
| `src/components/community/TypeSpecificFields.tsx` | **NEW** — conditional fields per type |
| `src/components/community/CommunityRegistrationForm.tsx` | Extend with type selector + new fields |
| `src/components/CommunityRegistrationSection.tsx` | Add type filter + type badges |
| `src/components/CommunityRegistrationDetailModal.tsx` | Show type-specific data |
| `src/components/CommunityLandingPage.tsx` | Update section titles |
| `src/components/community/CommunitySteps.tsx` | Minor text updates |

---

## Risk Mitigation

1. **Existing data corruption**: Migration is additive only (ADD COLUMN, not ALTER/DROP). Existing rows get default values.
2. **Form regression**: Community type is default selection — existing UX preserved for community registrations.
3. **Admin confusion**: Type badge + filter makes it clear which type each registration is.
4. **JSONB flexibility**: `type_specific_data` allows adding new fields per type without schema changes.

---

## What This Does NOT Include (Milestone B)
- ❌ Superadmin system / multi-user auth
- ❌ User management dashboard
- ❌ Role-based access control
- ❌ Activity logging
- ❌ JWT / bcrypt auth
- ❌ Rate limiting (server-side)

These are deferred to Milestone B.
