import { verifySupabaseAuth, getCookie, getAdminSessionToken } from './_lib/auth.js';

/**
 * GET /api/auth-me
 * 
 * Check current session. Returns user info if authenticated.
 * Supports both Supabase Auth and legacy cookie auth.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // 1. Try Supabase Auth
    const supabaseAuth = await verifySupabaseAuth(req);
    if (supabaseAuth) {
      return res.status(200).json({
        success: true,
        user: {
          id: supabaseAuth.dbUser.id,
          email: supabaseAuth.dbUser.email,
          display_name: supabaseAuth.dbUser.display_name,
          role: supabaseAuth.dbUser.role,
        },
        legacy: false,
      });
    }

    // 2. Try legacy cookie
    const expected = getAdminSessionToken();
    const actual = getCookie(req, 'admin_session');
    if (expected && actual && actual === expected) {
      return res.status(200).json({
        success: true,
        user: null,
        role: 'admin',
        legacy: true,
      });
    }

    // 3. Not authenticated
    return res.status(200).json({
      success: true,
      user: null,
      legacy: false,
    });
  } catch (error) {
    console.error('auth-me error:', error);
    return res.status(500).json({
      success: false,
      error: 'Gagal memeriksa sesi',
    });
  }
}
