# Work Plan: Multi-user Admin & Role Management

## Overview
Sistem multi-user dengan 4 role berbeda untuk Metropolitan Mall Bekasi event management dashboard.

**Estimated Total Time**: 10-14 hours (5 phases)

---

## Requirements Summary

### Roles & Permissions

| Permission | Superadmin | Admin | Viewer | EO/Tenant |
|-----------|:---:|:---:|:---:|:---:|
| View dashboard & events | ✅ | ✅ | ✅ | ✅ (own only) |
| Create/edit events | ✅ | ✅ | ❌ | ❌ |
| Delete events | ✅ | ✅ | ❌ | ❌ |
| Manage drafts | ✅ | ✅ | ❌ | ❌ |
| View survey results | ✅ | ✅ | ✅ | ✅ (own only) |
| Manage survey config | ✅ | ✅ | ❌ | ❌ |
| View registrations | ✅ | ✅ | ✅ | ❌ |
| Manage themes | ✅ | ✅ | ❌ | ❌ |
| Manage settings | ✅ | ✅ | ❌ | ❌ |
| User management | ✅ | ❌ | ❌ | ❌ |
| View activity log | ✅ | ✅ | ❌ | ❌ |
| Export data | ✅ | ✅ | ✅ | ❌ |

### User Onboarding
- Superadmin can invite via email (user receives link, sets password)
- Superadmin can manually create account (email + password)
- Both methods available

### Activity Log
- Full activity log: create, edit, delete events/drafts/themes
- Log: user_id, action, resource_type, resource_id, details (JSON), timestamp, IP
- Viewable by Superadmin & Admin

### Scale
- 2-5 users initially
- 4 roles: superadmin, admin, viewer, eo_tenant

---

## Technical Constraints

- Vercel Hobby plan: 12 function limit (currently 11 used — **1 slot left**)
- Strategy: NO new API endpoint — extend existing `api/auth.js` and `api/supabase-admin.js`
- Database: Supabase Auth (already in use) + `users` table (already exists)
- Existing auth: `api/_lib/auth.js` already has `requireAuth()` with role checking

---

## Phase 1: Database Schema (1-2 hours)

### Task 1.1: Extend `users` table

The `users` table already exists (used by auth system). Need to verify/add:
- `role` column: TEXT CHECK ('superadmin', 'admin', 'viewer', 'eo_tenant')
- `is_active` column: BOOLEAN (already exists)
- `display_name` column: TEXT (already exists)
- `invited_by` column: UUID (references users.id)
- `last_login_at` column: TIMESTAMPTZ
- `eo_organization` column: TEXT (for EO/tenant — which organization they belong to)
- `assigned_events` column: TEXT[] (event IDs this EO can see)

### Task 1.2: Activity log table

```sql
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT NOT NULL,
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'login', 'logout', 'invite'
  resource_type TEXT, -- 'event', 'draft', 'theme', 'user', 'survey_config', 'registration'
  resource_id TEXT,
  details JSONB, -- { before: {...}, after: {...}, changes: [...] }
  ip_address TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Task 1.3: RLS Policies
- activity_logs: SELECT for admin+superadmin, INSERT for authenticated
- users: SELECT for authenticated, UPDATE/DELETE for superadmin only

---

## Phase 2: Backend — Auth & Permissions (2-3 hours)

### Task 2.1: Update `requireAuth()` in `api/_lib/auth.js`
- Already supports role checking via `allowedRoles` parameter
- Add helper: `requireRole(req, res, minRole)` for simpler permission checks
- Add: `canManageUsers(role)`, `canEditEvents(role)`, `canViewOnly(role)`

### Task 2.2: Add user management actions to `api/auth.js`
Extend existing `?action=` routing:
- `?action=users` GET — list all users (superadmin only)
- `?action=invite` POST — invite user by email (superadmin only)
- `?action=create-user` POST — manually create user (superadmin only)
- `?action=update-user` POST — update user role/status (superadmin only)
- `?action=delete-user` POST — deactivate user (superadmin only)
- `?action=activity-log` GET — get activity logs (admin+superadmin)

### Task 2.3: Update existing endpoints with role checks
- `api/supabase-admin.js`: check `canEditEvents(role)` before mutations
- `api/survey.js`: admin actions check role, EO/tenant only sees own events
- `api/community-registration.js`: viewer can't modify

### Task 2.4: Activity logging
- Already have `logActivity()` in `api/_lib/auth.js`
- Integrate into all mutation endpoints (create/edit/delete)

---

## Phase 3: Frontend — User Management UI (3-4 hours)

### Task 3.1: User Management Page (`src/components/admin/UserManagement.tsx`)
- Table of all users: email, display_name, role, status, last_login
- Actions: edit role, activate/deactivate, delete
- Invite form: email + role selection
- Manual create form: email + password + role + display_name

### Task 3.2: Activity Log Page (`src/components/admin/ActivityLog.tsx`)
- Chronological list of all actions
- Filter by: user, action type, resource type, date range
- Detail view: what changed (before/after diff)

### Task 3.3: Admin Sidebar Update
- Add "User Management" under new "System" group (superadmin only)
- Add "Activity Log" under "System" group (admin+superadmin)
- Conditionally show/hide menu items based on role

### Task 3.4: Permission Guards
- Create `usePermission()` hook
- Hide UI elements based on role (edit buttons, delete buttons, etc.)
- Show "read-only" badge for viewers

---

## Phase 4: Frontend — Role-based UI (2-3 hours)

### Task 4.1: Viewer Mode
- All edit/delete buttons hidden
- Forms disabled
- "Read Only" indicator in sidebar
- Can still view all data, export CSV

### Task 4.2: EO/Tenant Mode
- Only sees events where `eo` matches their organization
- Only sees survey results for their events
- Simplified sidebar (no settings, no user management)
- Dashboard shows only their events stats

### Task 4.3: Permission-aware components
- EventCrudModal: disabled for viewer/eo
- DraftCrudModal: disabled for viewer/eo
- DeleteConfirmModal: hidden for viewer/eo
- SurveyDashboard: filtered for eo_tenant

---

## Phase 5: Testing & Polish (1-2 hours)

### Task 5.1: Seed initial superadmin
- Migration to set existing admin user as superadmin
- Ensure backward compatibility with legacy auth

### Task 5.2: Invite flow testing
- Email invite → user clicks link → sets password → logged in with correct role

### Task 5.3: Permission boundary testing
- Verify viewer can't mutate
- Verify EO can only see own events
- Verify activity log captures all mutations

---

## Execution Order

```
Phase 1: Database Schema
  ↓
Phase 2: Backend Auth & Permissions
  ↓
Phase 3: Frontend User Management UI
  ↓
Phase 4: Role-based UI
  ↓
Phase 5: Testing & Polish
```

## API Function Budget

**NO new endpoints needed** — extend existing:
- `api/auth.js` — add user management actions (users, invite, create-user, update-user, delete-user, activity-log)
- `api/supabase-admin.js` — add role checks to existing mutations

**Current: 11/12 → After: 11/12** (no change)

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Vercel function limit | Extend existing endpoints, no new files |
| Breaking existing auth | Backward compatible — legacy auth still works as 'admin' role |
| EO seeing other's data | RLS + application-level filtering |
| Activity log performance | Index on created_at, limit queries to 30 days default |
| Invite email delivery | Use Supabase Auth invite (built-in email) |

---

## Dependencies

No new npm packages needed. Supabase Auth already supports:
- `supabase.auth.admin.inviteUserByEmail()`
- `supabase.auth.admin.createUser()`
- `supabase.auth.admin.updateUserById()`
- `supabase.auth.admin.deleteUser()`
