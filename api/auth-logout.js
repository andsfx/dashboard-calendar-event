import { getServiceSupabase, verifySupabaseAuth, logActivity } from './_lib/auth.js';

/**
 * POST /api/auth-logout
 * 
 * Logout — clears both Supabase Auth session and legacy cookie.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Log activity before clearing session
    const supabaseAuth = await verifySupabaseAuth(req);
    if (supabaseAuth) {
      const authInfo = { user: supabaseAuth.dbUser, legacy: false };
      await logActivity(authInfo, 'logout', 'user', supabaseAuth.dbUser.id, null, req);
    }

    // Clear all auth cookies
    const cookies = [
      'admin_session=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0',
      'sb-access-token=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0',
      'sb-refresh-token=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0',
    ];
    res.setHeader('Set-Cookie', cookies);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('auth-logout error:', error);
    // Still clear cookies even on error
    const cookies = [
      'admin_session=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0',
      'sb-access-token=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0',
      'sb-refresh-token=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0',
    ];
    res.setHeader('Set-Cookie', cookies);
    return res.status(200).json({ success: true });
  }
}
