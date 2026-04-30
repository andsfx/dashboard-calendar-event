import { getAnonSupabase, getServiceSupabase, verifySupabaseAuth, getCookie, getAdminSessionToken, logActivity } from './_lib/auth.js';

/**
 * /api/auth?action=login   POST  — email+password login
 * /api/auth?action=logout  POST  — clear session
 * /api/auth?action=me      GET   — check current session
 */
export default async function handler(req, res) {
  const action = String(req.query?.action || req.body?.action || '').trim();

  // ── me ──────────────────────────────────────────────────────────────
  if (action === 'me') {
    if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });
    try {
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
      const expected = getAdminSessionToken();
      const actual = getCookie(req, 'admin_session');
      if (expected && actual && actual === expected) {
        return res.status(200).json({ success: true, user: null, role: 'admin', legacy: true });
      }
      return res.status(200).json({ success: true, user: null, legacy: false });
    } catch (err) {
      console.error('[auth/me]', err);
      return res.status(500).json({ success: false, error: 'Gagal memeriksa sesi' });
    }
  }

  // ── logout ───────────────────────────────────────────────────────────
  if (action === 'logout') {
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
    try {
      const supabaseAuth = await verifySupabaseAuth(req);
      if (supabaseAuth) {
        await logActivity({ user: supabaseAuth.dbUser, legacy: false }, 'logout', 'user', supabaseAuth.dbUser.id, null, req);
      }
    } catch { /* fire-and-forget */ }
    const cleared = [
      'admin_session=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0',
      'sb-access-token=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0',
      'sb-refresh-token=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0',
    ];
    res.setHeader('Set-Cookie', cleared);
    return res.status(200).json({ success: true });
  }

  // ── login ────────────────────────────────────────────────────────────
  if (action === 'login') {
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '').trim();

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email dan password harus diisi' });
    }

    try {
      console.log('[auth/login] step 1: creating clients');
      const anonSb = getAnonSupabase();
      const serviceSb = getServiceSupabase();

      console.log('[auth/login] step 2: signInWithPassword');
      const { data: authData, error: authError } = await anonSb.auth.signInWithPassword({ email, password });

      if (authError) {
        console.error('[auth/login] authError:', authError.message);
        const errorMap = {
          'Invalid login credentials': 'Email atau password salah',
          'Email not confirmed': 'Email belum dikonfirmasi. Cek inbox kamu.',
          'Too many requests': 'Terlalu banyak percobaan. Coba lagi nanti.',
        };
        const message = errorMap[authError.message] || authError.message;
        return res.status(401).json({ success: false, error: message });
      }

      if (!authData.user || !authData.session) {
        return res.status(401).json({ success: false, error: 'Login gagal' });
      }

      console.log('[auth/login] step 3: lookup user in DB, userId:', authData.user.id);
      const { data: dbUser, error: dbError } = await serviceSb
        .from('users')
        .select('id, email, display_name, role, is_active')
        .eq('id', authData.user.id)
        .single();

      if (dbError || !dbUser) {
        console.error('[auth/login] dbError:', dbError?.message, 'userId:', authData.user.id);
        return res.status(403).json({ success: false, error: 'Akun tidak terdaftar di sistem. Hubungi superadmin.' });
      }

      if (!dbUser.is_active) {
        return res.status(403).json({ success: false, error: 'Akun dinonaktifkan. Hubungi superadmin.' });
      }

      console.log('[auth/login] step 4: update last_login_at');
      try { await serviceSb.from('users').update({ last_login_at: new Date().toISOString() }).eq('id', dbUser.id); } catch {};

      console.log('[auth/login] step 5: set cookies');
      const maxAge = authData.session.expires_in || 3600;
      const domainStr = process.env.COOKIE_DOMAIN ? `; Domain=${process.env.COOKIE_DOMAIN}` : '';

      res.setHeader('Set-Cookie', [
        `sb-access-token=${authData.session.access_token}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${maxAge}${domainStr}`,
        `sb-refresh-token=${authData.session.refresh_token}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${60 * 60 * 24 * 30}${domainStr}`,
      ]);

      console.log('[auth/login] step 6: log activity');
      await logActivity({ user: dbUser, legacy: false }, 'login', 'user', dbUser.id, { email: dbUser.email }, req).catch(() => {});

      console.log('[auth/login] step 7: return success');
      return res.status(200).json({
        success: true,
        user: { id: dbUser.id, email: dbUser.email, display_name: dbUser.display_name, role: dbUser.role },
        session: { access_token: authData.session.access_token, expires_at: authData.session.expires_at },
      });
    } catch (err) {
      console.error('[auth/login] unexpected:', err?.message || err, err?.stack);
      return res.status(500).json({ success: false, error: 'Login gagal. Coba lagi nanti.', debug: String(err?.message || err) });
    }
  }

  return res.status(400).json({ success: false, error: `Unknown action: ${action}. Use login, logout, or me.` });
}
