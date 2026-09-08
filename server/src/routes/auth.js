/**
 * Routes auth — POST /api/v1/auth/*
 *
 *   POST /auth/login        — login email+password (bcrypt compare users.password_hash)
 *   POST /auth/logout       — hapus cookie
 *   GET  /auth/me           — sesi aktif ({ success, user } | { success, user: null })
 *
 * Respons mengikuti bentuk legacy api/auth.js (useAuth membaca
 * `data.user`, `data.role`, `data.error`):
 *   login → { success: true, user: {...} }
 *   me    → { success: true, user: {...} } | { success: true, user: null }
 *   logout→ { success: true }
 *
 * Auth env: JWT_SECRET (tanpa ini → 503 bersih), users.password_hash
 * (bcrypt). Role CHECK users.role: superadmin/admin/viewer/eo_tenant/tenant_relation.
 */
import { Router } from 'express';
import bcrypt from 'bcryptjs';

import { db } from '../db.js';
import {
  setAuthCookies,
  clearAuthCookies,
  authenticate,
  publicUser,
  logActivity,
  signAccess,
  signRefresh,
} from '../auth.js';
import { enforceRateLimit } from '../lib/rateLimit.js';

const router = Router();

// ─── POST /auth/login ────────────────────────────────────────────
router.post('/login', async (req, res, next) => {
  if (!process.env.JWT_SECRET) {
    return res.status(503).json({ success: false, error: 'Autentikasi belum dikonfigurasi (JWT_SECRET)' });
  }
  // 20 attempts / 15 min per IP (mirror api/auth.js).
  if (!enforceRateLimit(req, res, 'auth-login', 20, 15 * 60 * 1000)) return;

  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email dan password harus diisi' });
  }

  try {
    const { rows } = await db.query(
      'SELECT id, email, display_name, role, is_active, password_hash FROM users WHERE lower(email) = $1 LIMIT 1',
      [email],
    );
    const userRow = rows[0] || null;

    if (!userRow || !userRow.password_hash) {
      // Jangan bocorkan apakah email terdaftar — pesan seragam.
      return res.status(401).json({ success: false, error: 'Email atau password salah' });
    }
    if (!userRow.is_active) {
      return res.status(403).json({ success: false, error: 'Akun dinonaktifkan. Hubungi superadmin.' });
    }

    const match = await bcrypt.compare(password, userRow.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, error: 'Email atau password salah' });
    }

    // Update last_login_at + cookie (rotasi access/refresh pasangan).
    await db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [userRow.id]).catch(() => {});
    const [accessToken, refreshToken] = await Promise.all([
      signAccess(userRow),
      signRefresh(userRow.id),
    ]);
    setAuthCookies(res, accessToken, refreshToken);

    logActivity(publicUser(userRow), 'login', 'user', userRow.id, { email: userRow.email }, req);

    return res.json({ success: true, user: publicUser(userRow) });
  } catch (err) {
    if (err?.code === 'DB_UNAVAILABLE') return next(err);
    console.error('[auth/login]', err);
    return res.status(500).json({ success: false, error: 'Login gagal. Coba lagi nanti.' });
  }
});

// ─── POST /auth/logout ───────────────────────────────────────────
router.post('/logout', async (req, res) => {
  try {
    const auth = await authenticate(req, res).catch(() => null);
    if (auth) {
      logActivity(auth.user, 'logout', 'user', auth.user.id, null, req);
    }
  } catch { /* fire-and-forget */ }
  clearAuthCookies(res);
  return res.json({ success: true });
});

// ─── GET /auth/me ────────────────────────────────────────────────
router.get('/me', async (req, res, next) => {
  try {
    const auth = await authenticate(req, res);
    if (!auth) return res.json({ success: true, user: null });
    return res.json({ success: true, user: publicUser(auth.user) });
  } catch (err) {
    if (err?.code === 'DB_UNAVAILABLE') return next(err);
    return res.status(500).json({ success: false, error: 'Gagal memeriksa sesi' });
  }
});

export default router;