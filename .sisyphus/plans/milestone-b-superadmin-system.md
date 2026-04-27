# Milestone B: Superadmin System (DRAFT — implement after Milestone A)

## TL;DR

> **Quick Summary**: Add multi-user auth via Supabase Auth, superadmin dashboard for user & registration management, and activity logging. Built on top of Milestone A's multi-type registration.
>
> **Estimated Effort**: 10-14 jam
> **Prerequisites**: Milestone A completed & deployed
> **Status**: DRAFT — review before implementation

---

## Key Design Decisions

### 1. Use Supabase Auth (NOT custom JWT)
- Project already has `@supabase/supabase-js`
- Supabase Auth handles: email/password, session management, token refresh, password reset
- No need for `jose`, `bcryptjs`, or custom JWT logic
- Existing cookie-based admin auth stays as fallback during migration

### 2. Simple Role Check (NOT database-driven RBAC)
- 3 roles: `superadmin`, `admin`, `viewer`
- Role stored in `users` table (linked to `auth.users`)
- Permission check: simple `if (user.role === 'superadmin')` in code
- No `permissions` or `role_permissions` tables needed

### 3. Extend Existing API Pattern
- Keep `api/supabase-admin.js` pattern
- Replace `requireAdminSession()` with `requireAuth(req, ['superadmin', 'admin'])`
- Gradual migration — old admin password still works during transition

---

## High-Level Phases

### Phase 1: Database & Auth Setup (2-3 hrs)
- Create `users` table linked to Supabase `auth.users`
- Create `activity_logs` table
- Set up Supabase Auth (email/password)
- Seed first superadmin account

### Phase 2: Auth API & Middleware (2-3 hrs)
- Create `api/auth-login.js`, `api/auth-logout.js`, `api/auth-me.js`
- Update `api/_lib/auth.js` to support both old + new auth
- Create `useAuth()` React hook

### Phase 3: Superadmin Dashboard UI (4-5 hrs)
- Superadmin layout with sidebar
- User management (list, create, edit, deactivate)
- Registration management (enhanced from Milestone A)
- Activity log viewer

### Phase 4: Migration & Cleanup (2-3 hrs)
- Migrate existing admin to Supabase Auth user
- Remove old password-based auth
- Update all `requireAdminSession` calls
- Deploy & verify

---

## Notes
- This plan will be refined after Milestone A is complete
- Supabase Auth free tier: 50,000 MAU (more than enough)
- Rate limiting: use Supabase's built-in rate limiting on auth endpoints
- CSRF: Supabase Auth handles this via secure cookies

---

**Status**: DRAFT — do not implement yet
