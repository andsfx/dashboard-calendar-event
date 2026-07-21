import { getAdminSessionToken } from './_lib/auth.js';
import { enforceRateLimit } from './_lib/rateLimit.js';

/**
 * Legacy password-only admin login.
 * Disabled unless ALLOW_LEGACY_ADMIN=1 and ADMIN_PASSWORD is set (no defaults).
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  if (String(process.env.ALLOW_LEGACY_ADMIN || '').trim() !== '1') {
    return res.status(403).json({
      success: false,
      error: 'Legacy admin login dinonaktifkan. Gunakan login email.',
    });
  }

  if (!enforceRateLimit(req, res, 'admin-login', 10, 15 * 60 * 1000)) return;

  const expectedPassword = String(process.env.ADMIN_PASSWORD || '').trim();
  if (!expectedPassword) {
    return res.status(500).json({
      success: false,
      error: 'Admin auth belum dikonfigurasi (ADMIN_PASSWORD missing)',
    });
  }

  let sessionToken;
  try {
    sessionToken = getAdminSessionToken();
  } catch {
    return res.status(500).json({
      success: false,
      error: 'Admin auth belum dikonfigurasi (ADMIN_SESSION_TOKEN missing)',
    });
  }

  const providedPassword = String(req.body?.password || '').trim();
  if (!providedPassword || providedPassword !== expectedPassword) {
    return res.status(401).json({ success: false, error: 'Password salah' });
  }

  res.setHeader(
    'Set-Cookie',
    `admin_session=${encodeURIComponent(sessionToken)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=28800`
  );
  return res.status(200).json({ success: true });
}
