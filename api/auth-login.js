import { getAnonSupabase, getServiceSupabase, logActivity } from './_lib/auth.js';

/**
 * POST /api/auth-login
 * 
 * Login via Supabase Auth (email + password).
 * Uses anon client for signIn (service_role can't do user-level sign-in).
 * Uses service client for DB lookups.
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
    // Use anon client for signIn (service_role can't do user-level auth)
    console.log('[auth-login] Creating Supabase clients...');
    const anonSb = getAnonSupabase();
    const serviceSb = getServiceSupabase();
    console.log('[auth-login] Clients created successfully');

    // 1. Sign in with Supabase Auth (anon client)
    console.log('[auth-login] Attempting signInWithPassword for:', email);
    const { data: authData, error: authError } = await anonSb.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.error('[auth-login] Auth error:', authError);
      // Map common Supabase Auth errors to Indonesian
      const errorMap = {
        'Invalid login credentials': 'Email atau password salah',
        'Email not confirmed': 'Email belum dikonfirmasi',
        'Too many requests': 'Terlalu banyak percobaan. Coba lagi nanti.',
        'Invalid CSRF token': 'Sesi login tidak valid. Silakan refresh halaman dan coba lagi.',
        'PKCE verification failed': 'Verifikasi keamanan gagal. Silakan coba lagi.',
      };
      const message = errorMap[authError.message] || authError.message;
      return res.status(401).json({ success: false, error: message });
    }

    if (!authData.user || !authData.session) {
      return res.status(401).json({ success: false, error: 'Login gagal' });
    }

    // 2. Look up user in our users table (use service client to bypass RLS)
    const { data: dbUser, error: dbError } = await serviceSb
      .from('users')
      .select('id, email, display_name, role, is_active')
      .eq('id', authData.user.id)
      .single();

    if (dbError || !dbUser) {
      // Auth user exists but no entry in users table
      return res.status(403).json({
        success: false,
        error: 'Akun tidak terdaftar di sistem. Hubungi superadmin.',
      });
    }

    if (!dbUser.is_active) {
      return res.status(403).json({
        success: false,
        error: 'Akun dinonaktifkan. Hubungi superadmin.',
      });
    }

    // 3. Update last_login_at
    await serviceSb
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', dbUser.id)
      .catch(() => {}); // non-critical

    // 4. Set access token cookie (HttpOnly, Secure)
    const maxAge = authData.session.expires_in || 3600; // default 1 hour
    const isProduction = process.env.NODE_ENV === 'production';
    const domain = isProduction ? process.env.COOKIE_DOMAIN : undefined;
    
    console.log('[auth-login] Setting cookies with domain:', domain || 'default');
    
    const cookies = [
      `sb-access-token=${authData.session.access_token}; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=${maxAge}${domain ? `; Domain=${domain}` : ''}`,
      `sb-refresh-token=${authData.session.refresh_token}; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=${60 * 60 * 24 * 30}${domain ? `; Domain=${domain}` : ''}`, // 30 days
    ];
    res.setHeader('Set-Cookie', cookies);

    // 5. Log activity
    const authInfo = { user: dbUser, legacy: false };
    await logActivity(authInfo, 'login', 'user', dbUser.id, { email: dbUser.email }, req);

    // 6. Return user info
    console.log('[auth-login] Login successful for user:', dbUser.id);
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
    console.error('[auth-login] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      error: 'Login gagal. Coba lagi nanti.',
      debug: process.env.NODE_ENV !== 'production' ? error.message : undefined,
    });
  }
}
