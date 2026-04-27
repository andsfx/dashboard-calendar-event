import { createClient } from '@supabase/supabase-js';

// ─── Cookie helpers ───────────────────────────────────────────────
export function getCookie(req, name) {
  const cookieHeader = req.headers.cookie || '';
  const parts = cookieHeader.split(';').map(part => part.trim());
  const prefix = `${name}=`;
  const hit = parts.find(part => part.startsWith(prefix));
  return hit ? decodeURIComponent(hit.slice(prefix.length)) : '';
}

// ─── Legacy auth (old password-based) ─────────────────────────────
export function getAdminSessionToken() {
  return String(process.env.ADMIN_SESSION_TOKEN || 'admin-session-testing').trim();
}

export function requireAdminSession(req, res) {
  const expected = getAdminSessionToken();
  if (!expected) {
    res.status(500).json({ success: false, error: 'ADMIN_SESSION_TOKEN belum dikonfigurasi' });
    return false;
  }

  const actual = getCookie(req, 'admin_session');
  if (!actual || actual !== expected) {
    res.status(401).json({ success: false, error: 'Unauthorized admin session' });
    return false;
  }

  return true;
}

// ─── Supabase client helpers ──────────────────────────────────────
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

export function getServiceSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase belum dikonfigurasi');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Get anon Supabase client — needed for signInWithPassword
 * (service_role client can't do user-level sign-in)
 */
export function getAnonSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase anon key belum dikonfigurasi');
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// ─── Supabase Auth verification ───────────────────────────────────
/**
 * Extract access token from request:
 * 1. Authorization: Bearer <token>
 * 2. sb-access-token cookie
 */
function extractAccessToken(req) {
  // Check Authorization header first
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  // Fall back to cookie
  return getCookie(req, 'sb-access-token') || '';
}

/**
 * Verify Supabase Auth token and get user + role from DB.
 * Returns { authUser, dbUser } or null if invalid.
 */
export async function verifySupabaseAuth(req) {
  const token = extractAccessToken(req);
  if (!token) return null;

  try {
    const sb = getServiceSupabase();

    // Verify token with Supabase Auth
    const { data: { user: authUser }, error: authError } = await sb.auth.getUser(token);
    if (authError || !authUser) return null;

    // Look up user in our users table
    const { data: dbUser, error: dbError } = await sb
      .from('users')
      .select('id, email, display_name, role, is_active')
      .eq('id', authUser.id)
      .single();

    if (dbError || !dbUser) return null;

    // Check if user is active
    if (!dbUser.is_active) return null;

    return { authUser, dbUser };
  } catch {
    return null;
  }
}

// ─── Unified auth middleware (dual: Supabase Auth + legacy) ───────
/**
 * requireAuth — tries Supabase Auth first, falls back to legacy cookie.
 * 
 * @param {object} req - Request object
 * @param {object} res - Response object
 * @param {string[]} allowedRoles - Roles that can access (e.g. ['superadmin', 'admin'])
 * @returns {Promise<{user: object|null, role: string, legacy: boolean}|false>}
 *          Returns auth info or false (already sent 401/403).
 */
export async function requireAuth(req, res, allowedRoles = ['superadmin', 'admin']) {
  // 1. Try Supabase Auth
  const supabaseAuth = await verifySupabaseAuth(req);
  if (supabaseAuth) {
    const { dbUser } = supabaseAuth;

    // Check role
    if (!allowedRoles.includes(dbUser.role)) {
      res.status(403).json({
        success: false,
        error: `Akses ditolak. Butuh role: ${allowedRoles.join(' atau ')}`
      });
      return false;
    }

    return { user: dbUser, role: dbUser.role, legacy: false };
  }

  // 2. Fall back to legacy cookie auth
  const expected = getAdminSessionToken();
  const actual = getCookie(req, 'admin_session');
  if (expected && actual && actual === expected) {
    // Legacy auth — treat as 'admin' role
    // Check if 'admin' is in allowed roles (legacy can't be superadmin)
    if (!allowedRoles.includes('admin')) {
      res.status(403).json({
        success: false,
        error: 'Fitur ini membutuhkan akun superadmin. Silakan login dengan email.'
      });
      return false;
    }
    return { user: null, role: 'admin', legacy: true };
  }

  // 3. Both failed
  res.status(401).json({ success: false, error: 'Unauthorized — silakan login' });
  return false;
}

// ─── Activity logging ─────────────────────────────────────────────
/**
 * Log an admin activity. Fire-and-forget (doesn't throw on failure).
 */
export async function logActivity(authInfo, action, resourceType, resourceId, details, req) {
  try {
    const sb = getServiceSupabase();
    const ip = req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim()
      || req?.headers?.['x-real-ip']
      || req?.socket?.remoteAddress
      || '';

    await sb.from('activity_logs').insert({
      user_id: authInfo?.user?.id || null,
      user_email: authInfo?.user?.email || (authInfo?.legacy ? 'legacy-admin' : 'unknown'),
      action,
      resource_type: resourceType || null,
      resource_id: resourceId || null,
      details: details || null,
      ip_address: ip,
    });
  } catch (err) {
    // Fire-and-forget — don't break the main request
    console.error('Failed to log activity:', err.message);
  }
}
