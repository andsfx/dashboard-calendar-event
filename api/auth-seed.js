import { requireAuth, getServiceSupabase, logActivity } from './_lib/auth.js';

/**
 * POST /api/auth-seed
 * 
 * Create the first superadmin account. Only works if no superadmin exists yet.
 * After first use, this endpoint is locked.
 * 
 * Body: { email, password, display_name }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const sb = getServiceSupabase();

    // Check if any superadmin already exists
    const { data: existingSuperadmins, error: checkError } = await sb
      .from('users')
      .select('id')
      .eq('role', 'superadmin')
      .limit(1);

    if (checkError) throw checkError;

    if (existingSuperadmins && existingSuperadmins.length > 0) {
      return res.status(403).json({
        success: false,
        error: 'Superadmin sudah ada. Endpoint ini hanya untuk setup awal.',
      });
    }

    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '').trim();
    const displayName = String(req.body?.display_name || '').trim();

    if (!email || !password || !displayName) {
      return res.status(400).json({
        success: false,
        error: 'email, password, dan display_name harus diisi',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password minimal 8 karakter',
      });
    }

    // 1. Create Supabase Auth user
    const { data: authData, error: authError } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email verification for seed
    });

    if (authError) {
      return res.status(400).json({
        success: false,
        error: `Gagal membuat auth user: ${authError.message}`,
      });
    }

    // 2. Insert into users table
    const { data: dbUser, error: dbError } = await sb
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        display_name: displayName,
        role: 'superadmin',
        is_active: true,
      })
      .select()
      .single();

    if (dbError) {
      // Rollback: delete auth user
      await sb.auth.admin.deleteUser(authData.user.id).catch(() => {});
      return res.status(500).json({
        success: false,
        error: `Gagal membuat user record: ${dbError.message}`,
      });
    }

    // 3. Log activity
    await logActivity(
      { user: dbUser, legacy: false },
      'seed_superadmin',
      'user',
      dbUser.id,
      { email, display_name: displayName },
      req
    );

    return res.status(201).json({
      success: true,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        display_name: dbUser.display_name,
        role: dbUser.role,
      },
      message: 'Superadmin berhasil dibuat! Silakan login dengan email dan password.',
    });
  } catch (error) {
    console.error('auth-seed error:', error);
    return res.status(500).json({
      success: false,
      error: 'Gagal membuat superadmin',
    });
  }
}
