/**
 * Express entrypoint — backend REST VPS (Opsi B: Supabase dilepas total).
 *
 * Booting TANPA database tetap jalan (graceful): setiap endpoint yang butuh
 * DB merespons 503 bersih. Envelope respons mengikuti api/*.js legacy:
 *   { success: boolean, error?: string, data?: unknown }
 *
 * Routes:
 *   GET  /api/v1/events          — daftar event (public, tanpa PII)
 *   GET  /api/v1/events/:id      — detail event (public, tanpa PII)
 *   GET  /api/v1/themes          — annual themes
 *   GET  /api/v1/holidays        — hari libur
 *   GET  /api/v1/news            — artikel published
 *   GET  /api/v1/news/:slug      — detail artikel by slug
 *   GET  /api/v1/albums          — photo albums + photos
 *   GET  /api/v1/albums/:slug    — detail album by slug
 *   GET  /api/v1/areas           — event areas (+ photos)
 *   GET  /api/v1/settings/:key   — site setting by key (JSON value)
 *   POST /api/v1/auth/login      — login (bcrypt + JWT cookie)
 *   POST /api/v1/auth/logout     — logout (clear cookie)
 *   GET  /api/v1/auth/me         — sesi aktif
 *   POST /api/v1/admin/:action   — aksi admin (mirror ACTION_SCHEMAS, staff roles)
 *   GET  /healthz                — health check (tanpa DB)
 *
 * Env:
 *   PORT           default 3001
 *   DATABASE_URL   pg connection string (wajib utk data; boot tanpa ini aman)
 *   JWT_SECRET     tanda tangan JWT (wajib utk auth; boot tanpa ini aman,
 *                  /auth/login + /auth/me akan 503/500 bersih)
 *   CORS_ORIGIN    daftar origin dipisah koma; default '*' (produksi set ini)
 *   COOKIE_DOMAIN  opsional; Scope Domain cookie
 */
import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import { db, isDbReady } from './db.js';
import publicRouter from './routes/public.js';
import authRouter from './routes/auth.js';
import adminRouter from './routes/admin.js';
import r2Router from './r2.js';
import surveyRouter from './routes/survey.js';
import tenantRouter from './routes/tenant.js';
import extraRouter from './routes/extra.js';

const app = express();
app.disable('x-powered-by');

// Trust proxy wajib supaya req.ip / x-forwarded-for benar di belakang nginx.
app.set('trust proxy', true);

app.use(cors({
  origin(origin, cb) {
    const allowed = String(process.env.CORS_ORIGIN || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    // Tanpa konfigurasi → izinkan semua (dev); dengan konfigurasi → whitelist.
    if (allowed.length === 0 || !origin || allowed.includes(origin)) return cb(null, true);
    return cb(new Error('Origin tidak diizinkan'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

// Middleware: semua request yang menyentuh DB mendapat status DB terkini.
app.use((req, _res, next) => {
  req.db = db;
  req.dbReady = isDbReady();
  next();
});

app.use('/api/v1', publicRouter);
app.use('/api/v1', extraRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/r2', r2Router);
app.use('/api/v1/survey', surveyRouter);
app.use('/api/v1/tenant', tenantRouter);

// Health check tanpa DB (untuk docker healthcheck / uptime probe).
app.get('/healthz', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', db: isDbReady() } });
});

// 404 JSON (bukan HTML) — konsisten dengan envelope.
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint tidak ditemukan' });
});

// Error handler terakhir — selalu envelope JSON.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err?.status || err?.statusCode || 500;
  const message = err?.code === 'DB_UNAVAILABLE'
    ? (err.message || 'Database tidak tersedia')
    : (err?.message || 'Terjadi kesalahan server');
  if (status >= 500) console.error('[api] error:', err?.stack || err);
  res.status(status).json({ success: false, error: message });
});

const PORT = Number(process.env.PORT || 3001);

// Boot aman: listen dulu, verifikasi DB di latar belakang (warning saja).
const server = app.listen(PORT, () => {
  console.log(`[api] REST server jalan di http://localhost:${PORT} (db: ${isDbReady() ? 'siap' : 'belum-siap'})`);
});

// Shutdown bersih (SIGTERM dari docker stop).
function shutdown() {
  console.log('[api] shutdown ...');
  server.close(() => {
    db.end().catch(() => {}).finally(() => process.exit(0));
  });
  // Paksa keluar bila ada koneksi bandel.
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default app;