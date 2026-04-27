import { getServiceSupabase, logActivity } from './_lib/auth.js';

/**
 * POST /api/auth-login
 * 
 * Login via Supabase Auth (email + password).
 * Returns user info + sets access token cookie.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '').trim();

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email dan password harus diisi',
    });
  }

  try {
    const sb = getServiceSupabase();

    // 1. Sign in with Supabase Auth
    const { data: authData, error: authError } = await sb.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      // Map common Supabase Auth errors to Indonesian
      const errorMap = {
        'Invalid login credentials': 'Email atau password salah',
        'Email not confirmed': 'Email belum dikonfirmasi',
        'Too many requests': 'Terlalu banyak percobaan. Coba lagi nanti.',
      };
      const message = errorMap[authError.message] || authError.message;
      return res.status(401).json({ success: false, error: message });
    }

    if (!authData.user || !authData.session) {
      return res.status(401).json({ success: false, error: 'Login gagal' });
    }

    // 2. Look up user in our users table
    const { data: dbUser, error: dbError } = await sb
      .from('users')
      .select('id, email, display_name, role, is_active')
      .eq('id', authData.user.id)
      .single();

    if (dbError || !dbUser) {
      // Auth user exists but no entry in users table
      // Sign them out since they're not authorized
      await sb.auth.admin.signOut(authData.session.access_token).catch(() => {});
      return res.status(403).json({
        success: false,
        error: 'Akun tidak terdaftar di sistem. Hubungi superadmin.',
      });
    }

    if (!dbUser.is_active) {
      await sb.auth.admin.signOut(authData.session.access_token).catch(() => {});
      return res.status(403).json({
        success: false,
        error: 'Akun dinonaktifkan. Hubungi superadmin.',
      });
    }

    // 3. Update last_login_at
    await sb
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', dbUser.id)
      .catch(() => {}); // non-critical

    // 4. Set access token cookie (HttpOnly, Secure)
    const maxAge = authData.session.expires_in || 3600; // default 1 hour
    const cookies = [
      `sb-access-token=${authData.session.access_token}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${maxAge}`,
      `sb-refresh-token=${authData.session.refresh_token}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${60 * 60 * 24 * 30}`, // 30 days
    ];
    res.setHeader('Set-Cookie', cookies);

    // 5. Log activity
    const authInfo = { user: dbUser, legacy: false };
    await logActivity(authInfo, 'login', 'user', dbUser.id, { email: dbUser.email }, req);

    // 6. Return user info
    return res.status(200).json({
      success: true,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        display_name: dbUser.display_name,
        role: dbUser.role,
      },
      session: {
        access_token: authData.session.access_token,
        expires_at: authData.session.expires_at,
      },
    });
  } catch (error) {
    console.error('auth-login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Login gagal. Coba lagi nanti.',
    });
  }
}
