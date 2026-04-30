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

  // ── users (list all) ──────────────────────────────────────────────
  if (action === 'users') {
    if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });
    const auth = await requireSuperadmin(req, res);
    if (!auth) return;

    const sb = getServiceSupabase();
    const { data, error: dbErr } = await sb
      .from('users')
      .select('id, email, display_name, role, is_active, eo_organization, assigned_events, last_login_at, created_at')
      .order('created_at', { ascending: true });

    if (dbErr) return res.status(500).json({ success: false, error: 'Gagal mengambil data user' });
    return res.json({ success: true, users: data || [] });
  }

  // ── invite (send invite email) ──────────────────────────────────
  if (action === 'invite') {
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
    const auth = await requireSuperadmin(req, res);
    if (!auth) return;

    const { email, role, display_name, eo_organization } = req.body || {};
    if (!email || !role) return res.status(400).json({ success: false, error: 'email dan role wajib diisi' });
    if (!['admin', 'viewer', 'eo_tenant'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Role tidak valid' });
    }

    const sb = getServiceSupabase();

    // Check if email already exists
    const { data: existing } = await sb.from('users').select('id').eq('email', email.toLowerCase().trim()).single();
    if (existing) return res.status(409).json({ success: false, error: 'Email sudah terdaftar' });

    // Invite via Supabase Auth
    const { data: inviteData, error: inviteErr } = await sb.auth.admin.inviteUserByEmail(email.toLowerCase().trim(), {
      data: { display_name: display_name || email.split('@')[0], role },
      redirectTo: `${req.headers.origin || 'https://metmal-community-hub.vercel.app'}/dashboard`,
    });

    if (inviteErr) {
      console.error('[auth/invite] error:', inviteErr.message);
      return res.status(500).json({ success: false, error: `Gagal mengirim undangan: ${inviteErr.message}` });
    }

    // Create user record in public.users
    const { error: insertErr } = await sb.from('users').insert({
      id: inviteData.user.id,
      email: email.toLowerCase().trim(),
      display_name: display_name || email.split('@')[0],
      role,
      is_active: true,
      eo_organization: eo_organization || '',
      created_by: auth.user?.id || null,
    });

    if (insertErr) console.error('[auth/invite] insert user error:', insertErr.message);

    await logActivity(auth, 'invite', 'user', inviteData.user.id, { email, role }, req);
    return res.json({ success: true, user_id: inviteData.user.id });
  }

  // ── create-user (manual create with password) ───────────────────
  if (action === 'create-user') {
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
    const auth = await requireSuperadmin(req, res);
    if (!auth) return;

    const { email, password, role, display_name, eo_organization } = req.body || {};
    if (!email || !password || !role) {
      return res.status(400).json({ success: false, error: 'email, password, dan role wajib diisi' });
    }
    if (!['admin', 'viewer', 'eo_tenant'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Role tidak valid' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password minimal 6 karakter' });
    }

    const sb = getServiceSupabase();

    // Check if email already exists
    const { data: existing } = await sb.from('users').select('id').eq('email', email.toLowerCase().trim()).single();
    if (existing) return res.status(409).json({ success: false, error: 'Email sudah terdaftar' });

    // Create auth user
    const { data: createData, error: createErr } = await sb.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true,
      user_metadata: { display_name: display_name || email.split('@')[0], role },
    });

    if (createErr) {
      console.error('[auth/create-user] error:', createErr.message);
      return res.status(500).json({ success: false, error: `Gagal membuat user: ${createErr.message}` });
    }

    // Create user record in public.users
    const { error: insertErr } = await sb.from('users').insert({
      id: createData.user.id,
      email: email.toLowerCase().trim(),
      display_name: display_name || email.split('@')[0],
      role,
      is_active: true,
      eo_organization: eo_organization || '',
      created_by: auth.user?.id || null,
    });

    if (insertErr) console.error('[auth/create-user] insert user error:', insertErr.message);

    await logActivity(auth, 'create', 'user', createData.user.id, { email, role }, req);
    return res.json({ success: true, user_id: createData.user.id });
  }

  // ── update-user (change role, status, org) ──────────────────────
  if (action === 'update-user') {
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
    const auth = await requireSuperadmin(req, res);
    if (!auth) return;

    const { user_id, role, is_active, display_name, eo_organization, assigned_events } = req.body || {};
    if (!user_id) return res.status(400).json({ success: false, error: 'user_id wajib diisi' });

    // Prevent self-demotion from superadmin
    if (user_id === auth.user?.id && role && role !== 'superadmin') {
      return res.status(400).json({ success: false, error: 'Tidak bisa mengubah role sendiri' });
    }

    const updates = {};
    if (role !== undefined && ['superadmin', 'admin', 'viewer', 'eo_tenant'].includes(role)) updates.role = role;
    if (is_active !== undefined) updates.is_active = !!is_active;
    if (display_name !== undefined) updates.display_name = String(display_name).trim().slice(0, 100);
    if (eo_organization !== undefined) updates.eo_organization = String(eo_organization).trim().slice(0, 200);
    if (assigned_events !== undefined && Array.isArray(assigned_events)) updates.assigned_events = assigned_events;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: 'Tidak ada perubahan' });
    }

    updates.updated_at = new Date().toISOString();

    const sb = getServiceSupabase();
    const { error: updateErr } = await sb.from('users').update(updates).eq('id', user_id);

    if (updateErr) {
      console.error('[auth/update-user] error:', updateErr.message);
      return res.status(500).json({ success: false, error: 'Gagal mengupdate user' });
    }

    await logActivity(auth, 'update', 'user', user_id, { changes: updates }, req);
    return res.json({ success: true });
  }

  // ── delete-user (deactivate) ────────────────────────────────────
  if (action === 'delete-user') {
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
    const auth = await requireSuperadmin(req, res);
    if (!auth) return;

    const { user_id } = req.body || {};
    if (!user_id) return res.status(400).json({ success: false, error: 'user_id wajib diisi' });

    // Prevent self-deletion
    if (user_id === auth.user?.id) {
      return res.status(400).json({ success: false, error: 'Tidak bisa menghapus akun sendiri' });
    }

    const sb = getServiceSupabase();

    // Deactivate (soft delete) — don't actually delete from auth
    const { error: updateErr } = await sb
      .from('users')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', user_id);

    if (updateErr) {
      console.error('[auth/delete-user] error:', updateErr.message);
      return res.status(500).json({ success: false, error: 'Gagal menonaktifkan user' });
    }

    await logActivity(auth, 'delete', 'user', user_id, { deactivated: true }, req);
    return res.json({ success: true });
  }

  // ── activity-log ────────────────────────────────────────────────
  if (action === 'activity-log') {
    if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

    const supabaseAuth = await verifySupabaseAuth(req);
    if (!supabaseAuth || !['superadmin', 'admin'].includes(supabaseAuth.dbUser.role)) {
      return res.status(403).json({ success: false, error: 'Akses ditolak' });
    }

    const page = Math.max(1, parseInt(req.query?.page || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query?.limit || '30', 10) || 30));
    const offset = (page - 1) * limit;

    const sb = getServiceSupabase();
    let query = sb.from('activity_logs').select('*', { count: 'exact' });

    // Optional filters
    if (req.query?.user_id) query = query.eq('user_id', req.query.user_id);
    if (req.query?.action_type) query = query.eq('action', req.query.action_type);
    if (req.query?.resource_type) query = query.eq('resource_type', req.query.resource_type);
    if (req.query?.from) query = query.gte('created_at', req.query.from);
    if (req.query?.to) query = query.lte('created_at', req.query.to);

    const { data, count, error: logErr } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (logErr) return res.status(500).json({ success: false, error: 'Gagal mengambil activity log' });

    return res.json({ success: true, data: data || [], total: count || 0, page, limit });
  }

  return res.status(400).json({ success: false, error: `Unknown action: ${action}. Use login, logout, me, users, invite, create-user, update-user, delete-user, or activity-log.` });
}

// ─── Helper: require superadmin role ──────────────────────────────
async function requireSuperadmin(req, res) {
  const supabaseAuth = await verifySupabaseAuth(req);
  if (!supabaseAuth) {
    res.status(401).json({ success: false, error: 'Unauthorized — silakan login' });
    return null;
  }
  if (supabaseAuth.dbUser.role !== 'superadmin') {
    res.status(403).json({ success: false, error: 'Hanya superadmin yang bisa melakukan aksi ini' });
    return null;
  }
  return { user: supabaseAuth.dbUser, role: 'superadmin', legacy: false };
}
