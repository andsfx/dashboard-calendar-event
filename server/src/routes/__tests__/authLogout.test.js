/**
 * POST /auth/logout harus benar-benar MENCABUT token, bukan sekadar menghapus
 * cookie (temuan audit 2026-10-04).
 *
 * Sebelumnya handler hanya memanggil `clearAuthCookies`: salinan refresh token
 * yang dicuri tetap bisa menukar access token baru selama 30 hari meski
 * pengguna sudah logout. Tes ini menjalankan route sungguhan dengan signer
 * `jose` asli + `db` di-mock, lalu membuktikan dua hal:
 *   1. statement `UPDATE users SET token_version = token_version + 1` benar-benar
 *      dikirim untuk user yang terautentikasi;
 *   2. setelah itu, refresh token lama TIDAK lagi bisa diautentikasi.
 *
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const USER_ID = '22222222-2222-4222-8222-222222222222';

const dbState = {
  user: null,
  queries: [],
  failBump: false,
};

vi.mock('../../db.js', () => ({
  db: {
    query: vi.fn(async (sql, params) => {
      dbState.queries.push({ sql, params });
      if (/FROM users/i.test(sql)) {
        const found = dbState.user && params?.[0] === dbState.user.id ? { ...dbState.user } : null;
        return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
      }
      if (/token_version = token_version \+ 1/i.test(sql)) {
        if (dbState.failBump) {
          // Error generik (bukan DB_UNAVAILABLE) supaya route membalas 500
          // langsung, bukan meneruskan ke error-handler Express.
          throw new Error('simulasi gagal bump');
        }
        if (params?.[0] === dbState.user?.id) dbState.user.token_version += 1;
        return { rows: [], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }),
  },
}));

vi.stubEnv('JWT_SECRET', 'test-secret-untuk-uji-logout');

/** Dispatch ke chain route Express lengkap (middleware → handler). */
async function callRoute(method, path, { cookies = {} } = {}) {
  const { default: router } = await import('../auth.js');
  const req = {
    method,
    url: path,
    body: {},
    headers: { cookie: Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ') },
    ip: '127.0.0.1',
    socket: {},
    params: {},
    query: {},
  };
  let settle;
  const finished = new Promise((resolve, reject) => { settle = { resolve, reject }; });
  const res = {
    statusCode: 200,
    _body: null,
    _cleared: [],
    status(code) { this.statusCode = code; return this; },
    json(payload) { this._body = payload; settle.resolve(); return this; },
    cookie() { return this; },
    clearCookie(name) { this._cleared.push(name); return this; },
    setHeader() { return this; },
    getHeader() { return undefined; },
  };
  const layer = router.stack.find(
    l => l.route && l.route.path === path && l.route.methods[method.toLowerCase()],
  );
  if (!layer) throw new Error(`route not found: ${method} ${path}`);
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
  return { status: res.statusCode, body: res._body, res };
}

describe('POST /auth/logout mencabut token', () => {
  beforeEach(() => {
    dbState.failBump = false;
    dbState.user = {
      id: USER_ID,
      email: 'admin@example.com',
      display_name: 'Admin',
      role: 'superadmin',
      is_active: true,
      token_version: 0,
    };
    dbState.queries = [];
  });

  it('mengirim UPDATE token_version + 1 untuk user yang terautentikasi', async () => {
    const { signRefresh } = await import('../../auth.js');
    const refresh = await signRefresh(USER_ID, 0);

    const { status, body } = await callRoute('POST', '/logout', {
      cookies: { 'sb-refresh-token': refresh },
    });

    expect(status).toBe(200);
    expect(body).toEqual({ success: true });

    const bump = dbState.queries.find(q => /token_version = token_version \+ 1/.test(q.sql));
    expect(bump, 'logout harus mengirim UPDATE token_version').toBeDefined();
    expect(bump?.params).toEqual([USER_ID]);
    expect(dbState.user.token_version).toBe(1);
  });

  it('refresh token lama tidak bisa dipakai lagi setelah logout', async () => {
    const { signRefresh, authenticate } = await import('../../auth.js');
    const refresh = await signRefresh(USER_ID, 0);

    // Sebelum logout: refresh token sah.
    const before = await authenticate(
      { headers: { cookie: `sb-refresh-token=${refresh}` }, ip: '127.0.0.1', socket: {} },
      { cookie() {}, clearCookie() {} },
    );
    expect(before?.user?.id).toBe(USER_ID);

    // Logout lewat route sungguhan.
    await callRoute('POST', '/logout', { cookies: { 'sb-refresh-token': refresh } });

    // Sesudah logout: refresh token yang sama harus mati.
    const after = await authenticate(
      { headers: { cookie: `sb-refresh-token=${refresh}` }, ip: '127.0.0.1', socket: {} },
      { cookie() {}, clearCookie() {} },
    );
    expect(after).toBeNull();
  });

  it('tetap sukses dan membersihkan cookie saat tidak ada sesi', async () => {
    const { status, body, res } = await callRoute('POST', '/logout');
    expect(status).toBe(200);
    expect(body).toEqual({ success: true });
    // Tidak ada bump untuk sesi yang tidak ada.
    expect(dbState.queries.some(q => /token_version = token_version \+ 1/.test(q.sql))).toBe(false);
    expect(res._cleared).toContain('sb-access-token');
    expect(res._cleared).toContain('sb-refresh-token');
  });

  it('membalas 5xx saat pencabutan gagal — bukan sukses palsu', async () => {
    const { signRefresh } = await import('../../auth.js');
    const refresh = await signRefresh(USER_ID, 0);

    // Simulasi DB menolak UPDATE: token lama masih sah, jadi endpoint tidak
    // boleh mengaku berhasil.
    dbState.failBump = true;
    const { status, body, res } = await callRoute('POST', '/logout', {
      cookies: { 'sb-refresh-token': refresh },
    });

    expect(status).toBe(500);
    expect(body.success).toBe(false);
    // Cookie tetap dibersihkan supaya klien tidak memegang cookie basi.
    expect(res._cleared).toContain('sb-access-token');
    expect(res._cleared).toContain('sb-refresh-token');
    // Versi TIDAK berubah → refresh token lama tetap valid (konsekuensi jujur).
    expect(dbState.user.token_version).toBe(0);
  });
});