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
      'SELECT id, email, display_name, role, is_active, password_hash, token_version, assigned_events FROM users WHERE lower(email) = $1 LIMIT 1',
      [email],
    );
    const userRow = rows[0] || null;

    // Hash umpan untuk menyamakan waktu respons saat email tidak ada /
    // non-aktif / tanpa password. Tanpa ini, "akun ada tapi dinonaktifkan"
    // terasa lebih lambat (atau lebih cepat) daripada "email tidak dikenal",
    // sehingga keberadaan akun bocor lewat timing meski pesannya seragam.
    // Dipakai hanya untuk membuang waktu; hasilnya tidak pernah dipakai.
    const DUMMY_HASH = '$2a$12$C6UzMDM.H6dfI/f/IKcEeO7ZBpQ0eBdY0k8oYyFq7Z3QeQz5vS1Zu';
    const hash = userRow?.password_hash || DUMMY_HASH;
    const match = await bcrypt.compare(password, hash).catch(() => false);

    // Pesan & status SERAGAM untuk semua kegagalan kredensial. Sebelumnya
    // akun non-aktif membalas 403 "Akun dinonaktifkan" — itu memberi tahu
    // penyerang bahwa email terdaftar, bertentangan dengan komentar di atas.
    const invalid = () =>
      res.status(401).json({ success: false, error: 'Email atau password salah' });

    if (!userRow || !userRow.password_hash || !userRow.is_active || !match) {
      return invalid();
    }

    // Update last_login_at + cookie (rotasi access/refresh pasangan).
    await db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [userRow.id]).catch(() => {});
    const [accessToken, refreshToken] = await Promise.all([
      signAccess(userRow),
      signRefresh(userRow.id, userRow.token_version),
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
//
// Menaikkan `users.token_version` SEBELUM menghapus cookie. Tanpa itu, salinan
// refresh token yang sudah terlanjur dicuri tetap bisa menukar access token
// baru selama 30 hari meskipun pengguna sudah logout (temuan audit 2026-10-04).
//
// Kegagalan pencabutan TIDAK boleh dilaporkan sebagai sukses: kalau bump gagal,
// token lama masih sah, dan balasan `success: true` akan menyesatkan pemanggil
// (dan menyembunyikan insiden). Cookie tetap dibersihkan di semua jalur supaya
// klien tidak terjebak memegang cookie basi, tetapi statusnya jujur: 5xx saat
// pencabutan gagal, 200 hanya saat benar-benar tidak ada sesi atau berhasil.
router.post('/logout', async (req, res, next) => {
  let auth;
  try {
    auth = await authenticate(req, res);
  } catch (err) {
    // Gagal memverifikasi sesi (mis. DB tidak tersedia) — bukan "tanpa sesi".
    clearAuthCookies(res);
    if (err?.code === 'DB_UNAVAILABLE') return next(err);
    console.error('[auth/logout] verifikasi sesi gagal:', err?.message);
    return res.status(500).json({ success: false, error: 'Logout gagal. Coba lagi nanti.' });
  }

  // Tidak ada sesi valid: tidak ada yang bisa dicabut, cukup bersihkan cookie.
  if (!auth?.user?.id) {
    clearAuthCookies(res);
    return res.json({ success: true });
  }

  try {
    await db.query(
      'UPDATE users SET token_version = token_version + 1 WHERE id = $1',
      [auth.user.id],
    );
  } catch (err) {
    clearAuthCookies(res);
    console.error('[auth/logout] gagal mencabut token:', err?.message);
    if (err?.code === 'DB_UNAVAILABLE') return next(err);
    return res.status(500).json({ success: false, error: 'Logout gagal mencabut sesi. Coba lagi.' });
  }

  clearAuthCookies(res);
  logActivity(auth.user, 'logout', 'user', auth.user.id, null, req);
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