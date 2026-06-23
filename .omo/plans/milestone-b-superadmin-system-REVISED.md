# Milestone B: Superadmin System — REVISED PLAN

## TL;DR

> **Goal**: Migrate dari single-password admin ke multi-user auth via Supabase Auth, dengan role-based access (superadmin/admin/viewer), session persistence, dan activity logging.
>
> **Total Estimated Effort**: 18-24 jam (4 sub-milestones)
> **Prerequisites**: Milestone A completed ✅
> **Constraint**: SQL migrations harus dijalankan manual oleh Andy via Supabase SQL Editor

---

## Current State (Baseline)

| Aspek | Sekarang |
|-------|----------|
| Auth method | Single shared password (`ADMIN_PASSWORD` env var) |
| Session | Static cookie token (`ADMIN_SESSION_TOKEN`), HttpOnly, 8hr TTL |
| Session persistence | ❌ Page refresh = logout (React state hilang) |
| User accounts | ❌ Tidak ada — 1 password untuk semua |
| Roles | ❌ Tidak ada — binary isAdmin true/false |
| Supabase Auth | ❌ Tidak dipakai sama sekali |
| Audit trail | ❌ Tidak ada activity logging |
| RLS | Semua tabel SELECT = `USING (true)` (termasuk PII di `community_registrations`) |

### Files yang akan di-modify/create:

**Server-side (API):**
- `api/_lib/auth.js` — MODIFY (add Supabase Auth verification)
- `api/admin-login.js` — MODIFY → support both old password + Supabase Auth
- `api/admin-logout.js` — MODIFY → support Supabase Auth signOut
- `api/supabase-admin.js` — MODIFY (use new auth middleware)
- `api/auth-me.js` — NEW (session check endpoint)
- `api/auth-register.js` — NEW (superadmin creates users)
- `api/auth-users.js` — NEW (user management CRUD)
- `api/activity-logs.js` — NEW (read activity logs)

**Client-side (React):**
- `src/hooks/useAuth.ts` — NEW (auth state management hook)
- `src/types/auth.ts` — NEW (auth types)
- `src/components/AdminLoginModal.tsx` — MODIFY (email+password form)
- `src/components/Navbar.tsx` — MODIFY (show user info, role badge)
- `src/App.tsx` — MODIFY (replace isAdmin state with useAuth hook)
- `src/components/superadmin/SuperadminLayout.tsx` — NEW
- `src/components/superadmin/UserManagement.tsx` — NEW
- `src/components/superadmin/ActivityLogViewer.tsx` — NEW
- `src/components/superadmin/SuperadminDashboard.tsx` — NEW

---

## Sub-Milestone B1: Auth Foundation (3-4 jam)

### Goal
Setup database tables + Supabase Auth + server-side auth middleware. Old password auth tetap jalan (dual-auth).

### B1.1 — SQL Migration (Andy runs manually)

```sql
-- ============================================
-- MILESTONE B1: Auth Foundation
-- Run in Supabase SQL Editor
-- ============================================

-- 1. Users table (linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('superadmin', 'admin', 'viewer')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id)
);

-- 2. Activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_email TEXT, -- denormalized for when user is deleted
  action TEXT NOT NULL, -- e.g. 'login', 'create_event', 'update_registration_status'
  resource_type TEXT, -- e.g. 'event', 'draft', 'registration', 'user'
  resource_id TEXT, -- ID of affected resource
  details JSONB, -- extra context
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_resource ON activity_logs(resource_type, resource_id);

-- 4. RLS for users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can read users (not anon)
CREATE POLICY "Authenticated can read users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

-- Only service_role can INSERT/UPDATE/DELETE (via API)
-- (no policy needed — service_role bypasses RLS)

-- 5. RLS for activity_logs
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read activity_logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (true);

-- 6. Updated_at trigger for users
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 7. Seed first superadmin (AFTER creating the auth user via Supabase Auth API)
-- This will be done programmatically in B1.3
```

### B1.2 — Server-side Auth Middleware

**File: `api/_lib/auth.js`** — Add Supabase Auth verification alongside old cookie auth:

```
MODIFY api/_lib/auth.js:
- Keep existing: getCookie(), getAdminSessionToken(), requireAdminSession()
- ADD: verifySupabaseAuth(req) — extracts Bearer token or sb-access-token cookie,
       verifies via supabase.auth.getUser(token), returns { user, dbUser } or null
- ADD: requireAuth(req, res, allowedRoles) — tries Supabase Auth first, falls back
       to old cookie auth (returns { user: null, role: 'admin' } for legacy)
- ADD: logActivity(userId, email, action, resourceType, resourceId, details, ip)
```

Logic flow:
```
requireAuth(req, res, ['superadmin', 'admin']):
  1. Check Authorization header for Bearer token
  2. If found → supabase.auth.getUser(token) → lookup users table → check role
  3. If not found → fall back to requireAdminSession() (old cookie)
  4. If old cookie valid → return { user: null, role: 'admin', legacy: true }
  5. If both fail → 401
```

### B1.3 — New API Endpoints

**File: `api/auth-me.js`** — Session check (GET):
```
GET /api/auth-me
- Reads Supabase access token from cookie or Authorization header
- Returns { user: { id, email, display_name, role } } or { user: null }
- Also checks legacy cookie → returns { user: null, legacy: true, role: 'admin' }
- Used by frontend on page load to restore session
```

**File: `api/auth-login.js`** — Supabase Auth login (POST):
```
POST /api/auth-login
Body: { email, password }
- Calls supabase.auth.signInWithPassword({ email, password })
- On success: looks up users table, checks is_active
- Sets Supabase session cookies (access_token, refresh_token)
- Logs activity: 'login'
- Returns { user: { id, email, display_name, role }, session }
```

> **Note**: `api/admin-login.js` stays unchanged — old password login still works during transition.

### B1.4 — Seed Superadmin Account

Script/endpoint to create first superadmin:
1. Call Supabase Auth Admin API: `supabase.auth.admin.createUser({ email, password, email_confirm: true })`
2. Insert into `users` table: `{ id: auth_user.id, email, display_name: 'Andy', role: 'superadmin' }`
3. This can be a one-time API endpoint or done via SQL Editor

### B1.5 — Verification
- [ ] `users` table exists with correct schema
- [ ] `activity_logs` table exists with indexes
- [ ] `GET /api/auth-me` returns user info for valid Supabase token
- [ ] `GET /api/auth-me` returns legacy admin for valid old cookie
- [ ] `POST /api/auth-login` works with Supabase Auth credentials
- [ ] Old `POST /api/admin-login` still works (backward compat)
- [ ] All existing admin API calls still work with old cookie

---

## Sub-Milestone B2: Login UI + Session Persistence (3-4 jam)

### Goal
Update frontend login flow to support email+password via Supabase Auth, add session persistence (no more logout on refresh), and create useAuth hook.

### B2.1 — Auth Types

**File: `src/types/auth.ts`** — NEW:
```typescript
export type UserRole = 'superadmin' | 'admin' | 'viewer';

export interface AuthUser {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
}

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;       // true during initial session check
  isAuthenticated: boolean;  // user !== null
  isAdmin: boolean;          // role === 'admin' || role === 'superadmin'
  isSuperadmin: boolean;     // role === 'superadmin'
  isLegacy: boolean;         // old password auth (no user object)
}
```

### B2.2 — useAuth Hook

**File: `src/hooks/useAuth.ts`** — NEW:
```
useAuth() hook:
- On mount: calls GET /api/auth-me to check existing session
- Returns: AuthState + login(email, pw) + legacyLogin(pw) + logout()
- login(): POST /api/auth-login → sets user state
- legacyLogin(): POST /api/admin-login → sets isAdmin=true, isLegacy=true
- logout(): POST /api/admin-logout + clear Supabase session
- Session persistence: auth-me check on every page load
- Handles token refresh via Supabase client onAuthStateChange
```

### B2.3 — Update AdminLoginModal

**File: `src/components/AdminLoginModal.tsx`** — MODIFY:
```
Current: password-only input
New: 
- Tab toggle: "Email Login" | "Password Legacy"
- Email Login tab: email + password fields → calls login(email, pw)
- Password Legacy tab: password field only → calls legacyLogin(pw) (backward compat)
- Default tab: Email Login (encourage migration)
- Show user-friendly errors from Supabase Auth
```

### B2.4 — Update App.tsx

**File: `src/App.tsx`** — MODIFY:
```
Current:
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  // ... handleLogin, handleLogout callbacks

New:
  const auth = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  // Remove: handleLogin, handleLogout, isAdmin state
  // Replace all `isAdmin` references with `auth.isAdmin`
  // Replace handleLogin with auth.login / auth.legacyLogin
  // Replace handleLogout with auth.logout
  // Add loading state: show skeleton while auth.isLoading
```

### B2.5 — Update Navbar

**File: `src/components/Navbar.tsx`** — MODIFY:
```
Current: shows "Admin" badge when isAdmin
New:
- If auth.user: show display_name + role badge (superadmin=red, admin=purple, viewer=blue)
- If auth.isLegacy: show "Admin (Legacy)" badge with migration prompt
- Logout button calls auth.logout()
```

### B2.6 — Verification
- [ ] Login with email+password → session persists after page refresh
- [ ] Login with old password → still works (legacy mode)
- [ ] Navbar shows user name + role badge
- [ ] Logout clears session properly
- [ ] Loading skeleton shown during initial auth check
- [ ] All existing admin features still work

---

## Sub-Milestone B3: Superadmin Dashboard (6-8 jam)

### Goal
Build superadmin-only pages: user management, activity log viewer, enhanced registration management.

### B3.1 — Route Structure

```
/dashboard          — existing event dashboard (admin + public)
/superadmin         — NEW superadmin dashboard (superadmin only)
/superadmin/users   — NEW user management
/superadmin/logs    — NEW activity log viewer
```

### B3.2 — Superadmin Layout

**File: `src/components/superadmin/SuperadminLayout.tsx`** — NEW:
```
- Sidebar navigation: Dashboard | Users | Activity Logs | ← Back to Events
- Top bar: user info + role badge + logout
- Content area with Outlet
- Access guard: redirects to /dashboard if not superadmin
- Responsive: sidebar collapses to hamburger on mobile
```

### B3.3 — Superadmin Dashboard

**File: `src/components/superadmin/SuperadminDashboard.tsx`** — NEW:
```
Overview cards:
- Total Users (active/inactive)
- Total Registrations (by status)
- Recent Activity (last 24h)
- System Health (Supabase connection status)

Quick actions:
- Create User
- View Recent Logs
- Pending Registrations count
```

### B3.4 — User Management

**File: `src/components/superadmin/UserManagement.tsx`** — NEW:

**API: `api/auth-users.js`** — NEW:
```
GET  /api/auth-users          — list all users (superadmin only)
POST /api/auth-users/create   — create user (superadmin only)
POST /api/auth-users/update   — update user role/status (superadmin only)
POST /api/auth-users/deactivate — deactivate user (superadmin only)
```

UI Features:
```
- Table: email, display_name, role, is_active, last_login, created_at
- Create User modal: email, display_name, role, temporary password
  → Calls supabase.auth.admin.createUser() + inserts into users table
- Edit User: change role, display_name
- Deactivate/Reactivate toggle (soft delete — never hard delete)
- Cannot deactivate yourself
- Cannot change your own role
- Search/filter by role, status
```

### B3.5 — Activity Log Viewer

**File: `src/components/superadmin/ActivityLogViewer.tsx`** — NEW:

**API: `api/activity-logs.js`** — NEW:
```
GET /api/activity-logs?page=1&limit=50&action=login&user_id=xxx&from=2024-01-01&to=2024-12-31
- Superadmin only
- Paginated
- Filterable by: action, user, date range, resource_type
```

UI Features:
```
- Table: timestamp, user_email, action, resource_type, resource_id, details
- Filters: action type dropdown, user dropdown, date range picker
- Pagination (50 per page)
- Color-coded action types (login=green, delete=red, update=blue, etc.)
- Click row → expand details JSON
```

### B3.6 — Activity Logging Integration

Add `logActivity()` calls to existing admin actions in `api/supabase-admin.js`:
```
- createEvent → log('create_event', 'event', event.id)
- updateEvent → log('update_event', 'event', event.id)
- deleteEvent → log('delete_event', 'event', event.id)
- publishDraft → log('publish_draft', 'draft', draft.id)
- updateRegistrationStatus → log('update_registration', 'registration', reg.id, { old_status, new_status })
- createAlbum → log('create_album', 'album', album.id)
- ... etc for all 22 actions
```

### B3.7 — Verification
- [ ] /superadmin accessible only by superadmin role
- [ ] Non-superadmin redirected to /dashboard
- [ ] User CRUD works (create, edit role, deactivate)
- [ ] Activity logs show all admin actions
- [ ] Filters and pagination work
- [ ] Responsive on mobile

---

## Sub-Milestone B4: Security Hardening + Migration (3-4 jam)

### Goal
Harden RLS policies, fix storage permissions, clean up legacy auth, and finalize migration.

### B4.1 — SQL Migration: RLS Hardening (Andy runs manually)

```sql
-- ============================================
-- MILESTONE B4: Security Hardening
-- Run in Supabase SQL Editor
-- ============================================

-- 1. Restrict community_registrations SELECT to authenticated only
DROP POLICY IF EXISTS "Public can read community_registrations" ON community_registrations;
CREATE POLICY "Authenticated can read community_registrations"
  ON community_registrations FOR SELECT
  TO authenticated
  USING (true);

-- Keep public INSERT (registration form)
-- "Public can insert community_registrations" stays

-- 2. Restrict draft_events SELECT to authenticated only
-- (public can still INSERT drafts)
DROP POLICY IF EXISTS "Public can read draft_events" ON draft_events;
CREATE POLICY "Authenticated can read draft_events"
  ON draft_events FOR SELECT
  TO authenticated
  USING (true);

-- 3. Fix storage policies — restrict upload/delete to authenticated
DROP POLICY IF EXISTS "Anyone can upload event photos" ON storage.objects;
CREATE POLICY "Authenticated can upload event photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'event-photos');

DROP POLICY IF EXISTS "Anyone can delete event photos" ON storage.objects;
CREATE POLICY "Authenticated can delete event photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'event-photos');

-- 4. Remove unused realtime publication (optional, saves resources)
-- ALTER PUBLICATION supabase_realtime DROP TABLE events, annual_themes, holidays, site_settings, event_photos, photo_albums;
-- Only keep draft_events if realtime is actually needed
```

### B4.2 — Migrate Existing Admin

1. Create Supabase Auth account for Andy (superadmin)
2. Verify all features work with new auth
3. Update Vercel env vars: remove `ADMIN_PASSWORD` default
4. Keep `ADMIN_SESSION_TOKEN` as fallback for 2 weeks

### B4.3 — Legacy Auth Deprecation (gradual)

```
Week 1-2: Dual auth (both work)
Week 3: Show warning on legacy login: "Gunakan email login"
Week 4: Remove legacy login tab from UI (API still accepts for emergency)
Week 8: Remove legacy auth code entirely
```

### B4.4 — API Auth Migration

Update all protected endpoints to use `requireAuth()` instead of `requireAdminSession()`:

| File | Change |
|------|--------|
| `api/supabase-admin.js` | `requireAdminSession` → `requireAuth(req, res, ['superadmin', 'admin'])` |
| `api/apps-script-admin.js` | Same |
| `api/r2-upload.js` | Same |
| `api/r2-delete.js` | Same |

### B4.5 — Role-Based Feature Gating

| Feature | superadmin | admin | viewer |
|---------|-----------|-------|--------|
| View events | ✅ | ✅ | ✅ |
| Create/edit/delete events | ✅ | ✅ | ❌ |
| Manage drafts | ✅ | ✅ | ❌ |
| Manage registrations | ✅ | ✅ | ❌ |
| Manage albums/photos | ✅ | ✅ | ❌ |
| View activity logs | ✅ | ❌ | ❌ |
| Manage users | ✅ | ❌ | ❌ |
| Access /superadmin | ✅ | ❌ | ❌ |

### B4.6 — Verification
- [ ] `community_registrations` not readable by anon
- [ ] Storage upload/delete requires auth
- [ ] Legacy login shows deprecation warning
- [ ] All admin features work with new auth
- [ ] Role-based gating works (viewer can't edit, admin can't manage users)
- [ ] Activity logs capture all admin actions

---

## Implementation Order

```
B1: Auth Foundation (3-4 jam)
  ├── SQL migration (Andy)
  ├── Server-side auth middleware
  ├── auth-me + auth-login endpoints
  └── Seed superadmin account
  → DEPLOY & VERIFY
  
B2: Login UI + Session Persistence (3-4 jam)
  ├── useAuth hook
  ├── Update AdminLoginModal (email+password)
  ├── Update App.tsx (replace isAdmin)
  └── Update Navbar (user info)
  → DEPLOY & VERIFY

B3: Superadmin Dashboard (6-8 jam)
  ├── Route structure + layout
  ├── User management CRUD
  ├── Activity log viewer
  └── Activity logging integration
  → DEPLOY & VERIFY

B4: Security Hardening (3-4 jam)
  ├── SQL migration: RLS hardening (Andy)
  ├── Migrate admin to Supabase Auth
  ├── Update all API endpoints
  └── Role-based feature gating
  → DEPLOY & VERIFY
```

**Each sub-milestone is independently deployable.** Setelah B1+B2, sistem sudah functional dengan dual auth. B3 dan B4 bisa dikerjakan kapan saja setelahnya.

---

## Risk & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| SQL migration gagal | 🔴 Auth broken | Test SQL di Supabase SQL Editor dulu, rollback script ready |
| Supabase Auth rate limit | 🟡 Login throttled | Free tier: 30 requests/hour per IP — cukup untuk admin |
| Legacy auth removal terlalu cepat | 🔴 Locked out | Keep legacy as fallback for 8 weeks minimum |
| Token refresh failure | 🟡 Session expires | useAuth hook handles refresh via onAuthStateChange |
| RLS change breaks public features | 🔴 Site down | Test public pages after each RLS change |

---

## Dependencies

| Sub-milestone | Depends on | Andy's action needed |
|---------------|-----------|---------------------|
| B1 | Milestone A ✅ | Run SQL migration in Supabase SQL Editor |
| B2 | B1 | None |
| B3 | B2 | None |
| B4 | B3 | Run SQL migration (RLS hardening) |

---

**Status**: REVISED — ready for review by Andy before implementation
