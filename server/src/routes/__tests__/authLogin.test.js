/**
 * POST /auth/login tidak boleh membocorkan keberadaan akun.
 *
 * Temuan audit 2026-10-04: akun non-aktif membalas **403 "Akun dinonaktifkan"**
 * sementara kegagalan lain membalas 401 "Email atau password salah" — padahal
 * komentar di kode justru mengklaim pesan seragam. Perbedaan status/pesan itu
 * memberi tahu penyerang bahwa email terdaftar (user enumeration).
 *
 * Kontrak yang dikunci:
 *   - email tak dikenal, tanpa password_hash, non-aktif, dan password salah
 *     → SEMUA balas 401 dengan pesan identik;
 *   - bcrypt.compare tetap dijalankan pada kasus "tidak ada user" (hash umpan)
 *     agar waktu respons tidak membocorkan keberadaan akun;
 *   - login yang benar tetap sukses.
 *
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbState = { user: null, updates: [] };
const compareSpy = vi.fn();

vi.mock('../../db.js', () => ({
  db: {
    query: vi.fn(async (sql, params) => {
      if (/FROM users/i.test(sql)) {
        const found = dbState.user && String(params?.[0]).toLowerCase() === dbState.user.email ? { ...dbState.user } : null;
        return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
      }
      if (/UPDATE users/i.test(sql)) {
        dbState.updates.push({ sql, params });
        return { rows: [], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }),
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    // Meniru bcrypt: cocok HANYA bila plaintext benar DAN hash adalah hash
    // asli (bukan hash umpan). Mengabaikan args[0] membuat kasus "password
    // salah" ikut lolos.
    compare: (...args) => {
      compareSpy(...args);
      return Promise.resolve(args[0] === PASSWORD && args[1] === HASH);
    },
    hash: () => Promise.resolve('hashed'),
  },
}));

vi.stubEnv('JWT_SECRET', 'test-secret-untuk-uji-login');

async function login(email, password) {
  const { default: router } = await import('../auth.js');
  const req = {
    method: 'POST', url: '/login',
    body: { email, password },
    headers: {}, ip: '127.0.0.1', socket: {}, params: {}, query: {},
  };
  let settle;
  const finished = new Promise((resolve, reject) => { settle = { resolve, reject }; });
  const res = {
    statusCode: 200, _body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this._body = payload; settle.resolve(); return this; },
    cookie() { return this; }, clearCookie() { return this; },
    setHeader() { return this; }, getHeader() { return undefined; },
  };
  const layer = router.stack.find(l => l.route && l.route.path === '/login' && l.route.methods.post);
  const chain = layer.route.stack.map(s => s.handle);
  let i = 0;
  const step = (err) => {
    if (err) return settle.reject(err);
    const fn = chain[i++];
    if (!fn) return settle.resolve();
    const out = fn(req, res, step);
    if (out && typeof out.then === 'function') out.then(() => {}, settle.reject);
  };
  step();
  await finished;
  return { status: res.statusCode, body: res._body };
}

const PASSWORD = 'rahasia123';
const HASH = 'bcrypt-hash-asli';

describe('POST /auth/login tidak membocorkan keberadaan akun', () => {
  beforeEach(() => {
    compareSpy.mockClear();
    dbState.updates = [];
    dbState.user = {
      id: 'u1', email: 'admin@example.com', display_name: 'Admin',
      role: 'superadmin', is_active: true, password_hash: HASH, token_version: 0,
    };
  });

  it('akun non-aktif membalas 401 seragam, BUKAN 403', async () => {
    dbState.user.is_active = false;
    const { status, body } = await login('admin@example.com', PASSWORD);
    expect(status).toBe(401);
    expect(body.error).toBe('Email atau password salah');
    expect(body.error).not.toContain('dinonaktifkan');
  });

  it('email tak dikenal, tanpa hash, non-aktif, dan password salah semuanya 401 identik', async () => {
    const cases = [
      { label: 'tidak dikenal', user: null, password: PASSWORD },
      { label: 'tanpa hash', user: { ...dbState.user, password_hash: null }, password: PASSWORD },
      { label: 'non-aktif', user: { ...dbState.user, is_active: false }, password: PASSWORD },
      { label: 'password salah', user: { ...dbState.user }, password: 'salah' },
    ];
    const seen = [];
    for (const c of cases) {
      dbState.user = c.user;
      const { status, body } = await login('admin@example.com', c.password);
      seen.push({ label: c.label, status, error: body.error });
    }
    // Status & pesan harus identik untuk keempatnya.
    expect(new Set(seen.map(s => s.status))).toEqual(new Set([401]));
    expect(new Set(seen.map(s => s.error))).toEqual(new Set(['Email atau password salah']));
  });

  it('tetap menjalankan bcrypt.compare saat email tidak dikenal (anti-timing)', async () => {
    dbState.user = null;
    await login('tidak-ada@example.com', PASSWORD);
    // Hash umpan harus dibandingkan supaya waktu respons setara dengan kasus
    // email yang benar-benar terdaftar.
    expect(compareSpy).toHaveBeenCalledTimes(1);
    const hashArg = compareSpy.mock.calls[0][1];
    expect(typeof hashArg).toBe('string');
    expect(hashArg.startsWith('$2')).toBe(true);
  });

  it('login benar tetap sukses dan menerbitkan cookie', async () => {
    const { status, body } = await login('admin@example.com', PASSWORD);
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.user.email).toBe('admin@example.com');
    // last_login_at diperbarui.
    expect(dbState.updates.some(u => /last_login_at/.test(u.sql))).toBe(true);
  });

  it('login setelah bump versi tetap berhasil (versi terbaru dibaca saat login)', async () => {
    // Regresi yang dicegah: kalau login tidak menyertakan token_version di
    // SELECT, ia menerbitkan token versi 0 sementara DB sudah di versi 3 —
    // token itu langsung ditolak authenticate, membuat pengguna tidak bisa
    // login lagi setelah logout.
    dbState.user.token_version = 3;
    const { status } = await login('admin@example.com', PASSWORD);
    expect(status).toBe(200);

    // Query login harus benar-benar mengambil kolom token_version.
    const { db } = await import('../../db.js');
    const selectCall = db.query.mock.calls.find(([sql]) => /FROM users/i.test(sql));
    expect(selectCall?.[0]).toMatch(/token_version/);
  });
});