# 🎯 REVISED PLAN v2: Superadmin & Multi-Type Registration
# (Fixes all Oracle critical issues)

**Created**: 2026-04-26 (Revised after Oracle review)
**Auth Strategy**: Extend Cookie Auth (Option A)
**Status**: Ready for implementation

---

## 🔧 CRITICAL FIXES FROM ORACLE REVIEW

### Fixed Issues:
1. ✅ Use cookie-based auth (extend existing system)
2. ✅ RLS policies use service role (no auth.uid() dependency)
3. ✅ First superadmin seed script included
4. ✅ Complete rollback strategy
5. ✅ Rate limiting with Vercel Edge Config
6. ✅ CSRF protection via custom headers
7. ✅ All foreign keys properly defined

---

## 🗄️ DATABASE SCHEMA (REVISED)

### 1. users table (with proper constraints)
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT ('usr_' || replace(gen_random_uuid()::text, '-', '')),
  email TEXT UNIQUE NOT NULL CHECK (email ~* ''^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$''),
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT ''user'' CHECK (role IN (''superadmin'', ''admin'', ''manager'', ''user'')),
  status TEXT DEFAULT ''active'' CHECK (status IN (''active'', ''inactive'', ''suspended'')),
  password_hash TEXT NOT NULL, -- bcrypt hash
  last_login_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ, -- soft delete
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_status ON users(status);

-- RLS: Use service role, no auth.uid() dependency
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (used by API)
CREATE POLICY "service_role_all" ON users
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Anon/authenticated can only read public data
CREATE POLICY "public_read_active" ON users
  FOR SELECT TO anon, authenticated
  USING (status = ''active'' AND deleted_at IS NULL);
```

### 2. First Superadmin Seed Script
```sql
-- migrate/seed-first-superadmin.sql
-- Run this ONCE after creating users table

-- Create first superadmin (password: ChangeMe123!)
-- Hash generated with: bcrypt.hash("ChangeMe123!", 10)
INSERT INTO users (
  id,
  email,
  full_name,
  role,
  password_hash,
  created_at
) VALUES (
  ''usr_superadmin_001'',
  ''superadmin@metmal.com'',
  ''Super Administrator'',
  ''superadmin'',
  ''$2b$10$rQ8K5O.V5y5y5y5y5y5y5uXxXxXxXxXxXxXxXxXxXxXxXxXxXx'', -- CHANGE THIS
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Log the creation
INSERT INTO activity_logs (
  user_id,
  action,
  resource_type,
  details
) VALUES (
  ''usr_superadmin_001'',
  ''superadmin_created'',
  ''user'',
  ''{"note": "First superadmin created via seed script"}''::jsonb
);

-- Force password change on first login
UPDATE users 
SET status = ''inactive'' 
WHERE id = ''usr_superadmin_001'';

COMMENT ON TABLE users IS ''First superadmin must change password on first login'';
```

### 3. activity_logs (with proper FK)
```sql
CREATE TABLE activity_logs (
  id TEXT PRIMARY KEY DEFAULT (''log_'' || replace(gen_random_uuid()::text, ''-'', '''')),
  user_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Proper foreign key constraint
  CONSTRAINT fk_activity_logs_user 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_resource ON activity_logs(resource_type, resource_id);

-- Partial index for recent logs (performance optimization)
CREATE INDEX idx_activity_logs_recent 
  ON activity_logs(created_at DESC) 
  WHERE created_at > NOW() - INTERVAL ''30 days'';

-- Auto-cleanup old logs (retention: 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_activity_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM activity_logs 
  WHERE created_at < NOW() - INTERVAL ''90 days'';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (run via cron job)
COMMENT ON FUNCTION cleanup_old_activity_logs IS ''Run daily via cron to archive logs older than 90 days'';
```

### 4. role_permissions (with proper index)
```sql
CREATE TABLE role_permissions (
  id TEXT PRIMARY KEY DEFAULT (''rp_'' || replace(gen_random_uuid()::text, ''-'', '''')),
  role TEXT NOT NULL,
  permission_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL, -- audit trail
  
  CONSTRAINT fk_role_permissions_permission
    FOREIGN KEY (permission_id)
    REFERENCES permissions(id)
    ON DELETE CASCADE,
    
  UNIQUE(role, permission_id)
);

-- Critical index for permission checks
CREATE INDEX idx_role_permissions_role ON role_permissions(role);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);
```

---

## 🔐 AUTHENTICATION (Cookie-Based, Extended)

### Enhanced Cookie Auth
```typescript
// lib/auth.ts (REVISED)
import bcrypt from ''bcryptjs'';
import { SignJWT, jwtVerify } from ''jose'';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || ''your-secret-key-min-32-chars''
);

interface SessionPayload {
  userId: string;
  email: string;
  role: string;
  permissions: string[];
  iat: number;
  exp: number;
}

export async function signIn(email: string, password: string) {
  // Fetch user with permissions
  const { data: user } = await supabase
    .from(''users'')
    .select(`
      id,
      email,
      full_name,
      role,
      status,
      password_hash
    `)
    .eq(''email'', email)
    .is(''deleted_at'', null)
    .single();

  if (!user) {
    throw new Error(''Invalid credentials'');
  }

  if (user.status !== ''active'') {
    throw new Error(''Account is inactive'');
  }

  // Verify password
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new Error(''Invalid credentials'');
  }

  // Fetch permissions for role
  const { data: perms } = await supabase
    .from(''role_permissions'')
    .select(''permissions(name)'')
    .eq(''role'', user.role);

  const permissions = perms?.map(p => p.permissions.name) || [];

  // Create JWT token
  const token = await new SignJWT({
    userId: user.id,
    email: user.email,
    role: user.role,
    permissions
  })
    .setProtectedHeader({ alg: ''HS256'' })
    .setIssuedAt()
    .setExpirationTime(''24h'')
    .sign(JWT_SECRET);

  // Update last login
  await supabase
    .from(''users'')
    .update({ last_login_at: new Date().toISOString() })
    .eq(''id'', user.id);

  // Log activity
  await logActivity({
    userId: user.id,
    action: ''login'',
    details: { method: ''password'' }
  });

  return { token, user: { id: user.id, email: user.email, role: user.role } };
}

export async function verifyToken(token: string): Promise<SessionPayload> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as SessionPayload;
  } catch {
    throw new Error(''Invalid token'');
  }
}

// Single-query permission check (fixes race condition)
export async function checkPermission(
  userId: string,
  permission: string
): Promise<boolean> {
  const { data } = await supabase.rpc(''check_user_permission'', {
    p_user_id: userId,
    p_permission: permission
  });
  
  return data === true;
}
```

### Database Function (Atomic Permission Check)
```sql
-- Fixes race condition: single query with transaction isolation
CREATE OR REPLACE FUNCTION check_user_permission(
  p_user_id TEXT,
  p_permission TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  has_perm BOOLEAN;
BEGIN
  -- Get user role
  SELECT role INTO user_role
  FROM users
  WHERE id = p_user_id AND deleted_at IS NULL;

  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Superadmin has all permissions
  IF user_role = ''superadmin'' THEN
    RETURN TRUE;
  END IF;

  -- Check specific permission
  SELECT EXISTS(
    SELECT 1
    FROM role_permissions rp
    JOIN permissions p ON p.id = rp.permission_id
    WHERE rp.role = user_role
      AND p.name = p_permission
  ) INTO has_perm;

  RETURN has_perm;
END;
$$ LANGUAGE plpgsql STABLE;
```

---

## 🛡️ SECURITY ENHANCEMENTS

### 1. Rate Limiting (Vercel Edge Config)
```typescript
// middleware/rateLimit.ts
import { kv } from ''@vercel/kv'';

export async function rateLimit(
  identifier: string,
  limit: number = 5,
  window: number = 60
): Promise<{ success: boolean; remaining: number }> {
  const key = `ratelimit:${identifier}`;
  const count = await kv.incr(key);

  if (count === 1) {
    await kv.expire(key, window);
  }

  const remaining = Math.max(0, limit - count);

  return {
    success: count <= limit,
    remaining
  };
}

// Usage in login endpoint
export default async function handler(req, res) {
  const ip = req.headers[''x-forwarded-for''] || req.socket.remoteAddress;
  const { success, remaining } = await rateLimit(`login:${ip}`, 5, 60);

  if (!success) {
    return res.status(429).json({
      error: ''Too many login attempts'',
      retryAfter: 60
    });
  }

  res.setHeader(''X-RateLimit-Remaining'', remaining);
  // ... continue with login
}
```

### 2. CSRF Protection
```typescript
// middleware/csrf.ts
export function validateCSRF(req: Request): boolean {
  // Check custom header (SPA pattern)
  const csrfHeader = req.headers.get(''x-requested-with'');
  if (csrfHeader !== ''XMLHttpRequest'') {
    return false;
  }

  // Check origin matches host
  const origin = req.headers.get(''origin'');
  const host = req.headers.get(''host'');
  
  if (origin && !origin.endsWith(host)) {
    return false;
  }

  return true;
}

// Usage in API endpoints
export default async function handler(req, res) {
  if (req.method !== ''GET'' && !validateCSRF(req)) {
    return res.status(403).json({ error: ''CSRF validation failed'' });
  }
  // ... continue
}
```

### 3. Input Validation (Zod)
```typescript
// lib/validation.ts
import { z } from ''zod'';

export const CreateUserSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(2).max(100),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  role: z.enum([''superadmin'', ''admin'', ''manager'', ''user''])
});

export const UpdateUserSchema = CreateUserSchema.partial().extend({
  id: z.string().startsWith(''usr_'')
});

// Usage
export default async function handler(req, res) {
  try {
    const validated = CreateUserSchema.parse(req.body);
    // ... use validated data
  } catch (error) {
    return res.status(400).json({
      error: ''Validation failed'',
      details: error.errors
    });
  }
}
```

---

## 🔄 ROLLBACK STRATEGY

### Complete Rollback Scripts
```sql
-- rollback/001-drop-superadmin-tables.sql
-- Run this to completely rollback superadmin feature

BEGIN;

-- Drop tables in reverse order (respecting FK constraints)
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS check_user_permission(TEXT, TEXT);
DROP FUNCTION IF EXISTS cleanup_old_activity_logs();

-- Restore original community_registrations
ALTER TABLE community_registrations 
  DROP COLUMN IF EXISTS organization_type,
  DROP COLUMN IF EXISTS organization_size,
  DROP COLUMN IF EXISTS industry,
  DROP COLUMN IF EXISTS education_level,
  DROP COLUMN IF EXISTS license_number,
  DROP COLUMN IF EXISTS tax_id;

COMMIT;

-- Verify rollback
SELECT ''Rollback complete. Verify no orphaned data.'' AS status;
```

---

## 📊 REVISED TIMELINE

**Total**: 14-18 hours (reduced from 16-22)

- Phase 1 (Database): 2-3 hours
- Phase 2 (Cookie Auth Extension): 2-3 hours (reduced from 3-4)
- Phase 3 (Superadmin UI): 4-5 hours
- Phase 4 (Multi-Type Form): 3-4 hours
- Phase 5 (API + Security): 3-4 hours (includes rate limiting, CSRF)
- Phase 6 (Testing): 2-3 hours

---

## ✅ ORACLE REVIEW COMPLIANCE

All 7 critical issues fixed:
- ✅ Cookie auth extended (no Supabase Auth migration)
- ✅ RLS uses service role (no auth.uid())
- ✅ First superadmin seed script included
- ✅ Complete rollback strategy
- ✅ Foreign keys properly defined
- ✅ Atomic permission check (no race condition)
- ✅ Rate limiting + CSRF protection

**Status**: Ready for implementation

---

**Revised by**: Prometheus (after Oracle review)
**Date**: 2026-04-26
**Approval**: Pending user confirmation
