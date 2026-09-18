/**
 * Auth — JWT (jose HS256) + cookie sb-access-token / sb-refresh-token.
 *
 * Pengganti api/_lib/auth.js (Supabase Auth) di VPS:
 *   - login : bcrypt compare users.password_hash → terbitkan JWT berpasangan,
 *             set cookie HttpOnly, update last_login_at, logActivity.
 *   - me    : verifikasi access; bila kedaluwarsa → refresh token diputar
 *             (akses baru + cookie refresh baru).
 *   - logout: hapus cookie.
 *
 * Payload JWT: { sub: user.id, role, email, display_name, typ: 'access'|'refresh' }
 *
 * Role guard default admin/superadmin; matriks tenant-survey dipertahankan:
 *   STAFF_ROLES         superadmin, admin
 *   ANALYTICS_READ_ROLES  + tenant_relation
 *   LIST_READ_ROLES      + eo_tenant
 *
 * Env: JWT_SECRET (wajib utk login/me; tanpa ini endpoint auth menolak 503
 * bersih), COOKIE_DOMAIN (opsional), COOKIE_SECURE (default: produksi).
 */
import { SignJWT, jwtVerify } from 'jose';
import { db } from './db.js';
import { clientIp } from './lib/rateLimit.js';

export const ACCESS_TOKEN_TTL = 60 * 60;          // 1 jam
const REFRESH_TOKEN_TTL = 60 * 60 * 24 * 30;      // 30 hari
const ACCESS_COOKIE = 'sb-access-token';
const REFRESH_COOKIE = 'sb-refresh-token';

export const STAFF_ROLES = ['superadmin', 'admin'];
export const ANALYTICS_READ_ROLES = ['superadmin', 'admin', 'tenant_relation'];
export const LIST_READ_ROLES = ['superadmin', 'admin', 'tenant_relation', 'eo_tenant'];

/**
 * Role `demo` — akun peragaan: boleh MELIHAT seluruh permukaan dashboard
 * (termasuk yang biasanya staff-only), tapi TIDAK boleh mengubah apa pun.
 *
 * Ditegakkan di backend, bukan hanya menyembunyikan tombol di UI: setiap
 * aksi tulis ditolak 403 di sini, jadi request langsung ke API pun gagal.
 * Baca tetap dibuka lewat ACTION_READ_ALLOWLIST di routes/admin.js.
 */
export const DEMO_ROLE = 'demo';
export const DEMO_READ_ROLES = [...STAFF_ROLES, DEMO_ROLE];
export const ANALYTICS_READ_ROLES_WITH_DEMO = [...ANALYTICS_READ_ROLES, DEMO_ROLE];
export const LIST_READ_ROLES_WITH_DEMO = [...LIST_READ_ROLES, DEMO_ROLE];

/**
 * Aksi admin yang AMAN dibaca role `demo` (read-only). Semua aksi lain
 * dianggap tulis dan ditolak 403 untuk demo.
 *
 * Sengaja allowlist (bukan blocklist): aksi baru otomatis TERTUTUP untuk
 * demo. Lupa menambahkannya berarti demo tidak bisa membacanya — bukan
 * berarti demo bisa menulisnya.
 */
export const DEMO_READ_ACTIONS = new Set([
  'readDrafts',
  'readRegistrations',
  'listLetters',
  'listNewsArticles',
  'listSponsorLeads',
  'getLocationMapping',
  'listExhibitions',
  'listExhibitionLeads',
  'listExhibitionActivations',
]);

/** Boleh tidak role ini menjalankan aksi admin tersebut? (demo = baca saja) */
export function canPerformAdminAction(role, action) {
  if (role !== DEMO_ROLE) return true; // role lain diatur requireRole
  return DEMO_READ_ACTIONS.has(action);
}

function secretKey() {
  const secret = process.env.JWT_SECRET || '';
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

/** Cookie flags: HttpOnly selalu; Secure kecuali COOKIE_SECURE=false di non-prod.
 *  SameSite: 'lax' default (SPA sama origin). 'none' Wajib utk frontend cross-site
 *  (mis. Vercel → api domain lain) — hanya valid bersama Secure. */
function cookieBase() {
  const isSecure = process.env.COOKIE_SECURE === undefined
    ? process.env.NODE_ENV === 'production'
    : process.env.COOKIE_SECURE === 'true';
  const sameSite = String(process.env.COOKIE_SAMESITE || 'lax').toLowerCase();
  const valid = ['lax', 'strict', 'none'];
  return {
    httpOnly: true,
    sameSite: valid.includes(sameSite) ? sameSite : 'lax',
    secure: isSecure,
    domain: process.env.COOKIE_DOMAIN ? process.env.COOKIE_DOMAIN.replace(/^\./, '') : undefined,
  };
}

export function setAuthCookies(res, accessToken, refreshToken) {
  res.cookie(ACCESS_COOKIE, accessToken, { ...cookieBase(), maxAge: ACCESS_TOKEN_TTL * 1000, path: '/' });
  res.cookie(REFRESH_COOKIE, refreshToken, { ...cookieBase(), maxAge: REFRESH_TOKEN_TTL * 1000, path: '/' });
}

export function clearAuthCookies(res) {
  res.clearCookie(ACCESS_COOKIE, { ...cookieBase(), path: '/' });
  res.clearCookie(REFRESH_COOKIE, { ...cookieBase(), path: '/' });
}

/**
 * Port getCookie dari api/_lib/auth.js — baca header cookie manual
 * (fallback bila cookie-parser tidak dipasang di suatu route).
 */
export function getCookie(req, name) {
  if (req.cookies && req.cookies[name] !== undefined) return req.cookies[name];
  const cookieHeader = req.headers.cookie || '';
  const parts = cookieHeader.split(';').map((part) => part.trim());
  const prefix = `${name}=`;
  const hit = parts.find((part) => part.startsWith(prefix));
  return hit ? decodeURIComponent(hit.slice(prefix.length)) : '';
}

function extractAccessToken(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) return authHeader.slice(7).trim();
  return getCookie(req, ACCESS_COOKIE) || '';
}

/** Payload user publik (tanpa hash/PII). */
export function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    display_name: row.display_name,
    role: row.role,
  };
}

export async function signAccess(user) {
  return new SignJWT({ role: user.role, email: user.email, display_name: user.display_name, typ: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL}s`)
    .sign(secretKey());
}

export async function signRefresh(userId) {
  return new SignJWT({ typ: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_TOKEN_TTL}s`)
    .sign(secretKey());
}

async function verifyToken(token, expectedTyp) {
  const key = secretKey();
  if (!key || !token) return null;
  try {
    const { payload } = await jwtVerify(token, key);
    if (payload.typ && payload.typ !== expectedTyp) return null;
    return payload;
  } catch {
    return null;
  }
}

async function loadUser(id) {
  const result = await db.query(
    'SELECT id, email, display_name, role, is_active FROM users WHERE id = $1',
    [id],
  );
  return result.rows[0] || null;
}

/**
 * Verifikasi sesi: access token (Bearer/cookie) → refresh token bila
 * access kedaluwarsa (rotasi + set cookie baru).
 * @returns {Promise<{ user: object } | null>}
 */
export async function authenticate(req, res) {
  const key = secretKey();
  if (!key) return null;

  const access = extractAccessToken(req);
  const accessPayload = access ? await verifyToken(access, 'access') : null;
  if (accessPayload && accessPayload.sub) {
    const user = await loadUser(accessPayload.sub);
    if (user && user.is_active) return { user };
  }

  // Access invalid/expired → coba refresh (rotasi token).
  const refresh = getCookie(req, REFRESH_COOKIE);
  if (!refresh) return null;
  const refreshPayload = await verifyToken(refresh, 'refresh');
  if (!refreshPayload?.sub) return null;

  const user = await loadUser(refreshPayload.sub);
  if (!user || !user.is_active) return null;

  try {
    const [accessToken, refreshToken] = await Promise.all([
      signAccess(user),
      signRefresh(user.id),
    ]);
    setAuthCookies(res, accessToken, refreshToken);
  } catch {
    return null;
  }
  return { user };
}

/**
 * Middleware requireRole — mirror requireAuth(api/_lib/auth.js) default.
 * allowedRoles default ['superadmin','admin'].
 */
export function requireRole(allowedRoles = STAFF_ROLES) {
  return async (req, res, next) => {
    let auth;
    try {
      auth = await authenticate(req, res);
    } catch (err) {
      if (err?.code === 'DB_UNAVAILABLE') return next(err);
      return res.status(500).json({ success: false, error: 'Gagal memverifikasi sesi' });
    }
    if (!auth) {
      return res.status(401).json({ success: false, error: 'Tidak terautentikasi — silakan login' });
    }
    if (!allowedRoles.includes(auth.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Akses ditolak. Butuh role: ${allowedRoles.join(' atau ')}`,
      });
    }
    req.auth = auth;
    next();
  };
}

/**
 * Samarkan email untuk role read-only (demo): `sindi@mail.com` → `s***i@mail.com`.
 * Domain dibiarkan agar struktur tetap terbaca, identitas tidak.
 */
export function maskEmail(email) {
  if (typeof email !== 'string' || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0] ?? ''}***@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

/** Public user row → session payload (untuk /auth/me dan /auth/login). */
export const sessionUserPayload = publicUser;

/**
 * PII strip helper — buang field sensitif dari row (untuk tenant_relation
 * dan endpoint publik). Mengembalikan salinan row TANPA field tersebut.
 * @param {object|null|undefined} row
 * @param {string[]} [fields] nama kolom yang dihapus
 */
export function stripPii(row, fields = ['pic', 'phone', 'pic_name', 'pic_phone', 'tenant_email', 'tenant_phone', 'email']) {
  if (!row || typeof row !== 'object') return row;
  const out = { ...row };
  for (const f of fields) delete out[f];
  return out;
}

/**
 * Catat aktivitas admin — fire-and-forget (tidak menggagalkan request).
 * @param {object|null} user      req.auth?.user
 * @param {string} action         mis. 'create_event'
 * @param {string} [resourceType]
 * @param {string} [resourceId]
 * @param {object|null} [details]
 * @param {object} [req]
 */
export async function logActivity(user, action, resourceType, resourceId, details, req) {
  try {
    // IP via clientIp bersama (X-Real-IP hasil real_ip nginx; XFF mentah diabaikan).
    const ip = clientIp(req || {});
    await db.query(
      `INSERT INTO activity_logs (user_id, user_email, action, resource_type, resource_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        user?.id || null,
        user?.email || 'unknown',
        action,
        resourceType || null,
        resourceId || null,
        details ? JSON.stringify(details) : null,
        ip,
      ],
    );
  } catch (err) {
    // Fire-and-forget — jangan sampai memutus request utama.
    console.error('[logActivity] gagal:', err.message);
  }
}