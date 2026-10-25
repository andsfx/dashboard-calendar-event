/**
 * Reset password lewat `POST /users-update` wajib MENCABUT token lama.
 *
 * Sebelum perbaikan, `updates.password_hash` hanya mengganti hash — refresh
 * token 30 hari yang sudah beredar (perangkat lain, atau token yang dicuri)
 * tetap melewati `tokenVersionMatches` karena `users.token_version` tidak
 * berubah. Logout sudah memakai mekanisme ini; reset password belum.
 *
 * Kontrak:
 *   - password diubah  → `token_version = token_version + 1` ada di SET (SQL,
 *                        bukan parameter, agar selalu naik dari nilai DB)
 *   - tanpa password   → kolom itu TIDAK boleh tersentuh
 *   - indeks parameter tetap benar setelah penambahan klausa
 *
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbState = { rows: [], queries: [] };

vi.mock('../../db.js', () => ({
  db: {
    query: vi.fn(async (sql, params) => {
      dbState.queries.push({ sql, params: params || [] });
      return { rows: dbState.rows, rowCount: 1 };
    }),
  },
}));

vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn(async () => 'HASHED') },
}));

vi.mock('../../auth.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    requireRole: () => (_req, _res, next) => next(),
    logActivity: async () => {},
  };
});

const USER_ID = '11111111-1111-4111-8111-111111111111';

/** Dispatch ke chain route Express untuk `POST /users-update`. */
async function callUsersUpdate(body) {
  const { default: router } = await import('../extra.js');
  const layer = router.stack.find(
    l => l.route && l.route.path === '/users-update' && l.route.methods.post,
  );
  if (!layer) throw new Error('route /users-update tidak ditemukan');

  const req = {
    method: 'POST',
    url: '/users-update',
    body,
    headers: {},
    ip: '127.0.0.1',
    socket: {},
    params: {},
    query: {},
    auth: { user: { id: 'u_admin', email: 'admin@example.com', role: 'superadmin' } },
  };
  let settle;
  const finished = new Promise((resolve, reject) => { settle = { resolve, reject }; });
  const res = {
    statusCode: 200,
    _body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this._body = payload; settle.resolve(); return this; },
    cookie() { return this; },
    clearCookie() { return this; },
    setHeader() { return this; },
    getHeader() { return undefined; },
  };

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

beforeEach(() => {
  dbState.rows = [];
  dbState.queries = [];
});

describe('POST /users-update — reset password mencabut token', () => {
  it('menambahkan token_version = token_version + 1 saat password diubah', async () => {
    const { status } = await callUsersUpdate({ user_id: USER_ID, password: 'rahasia123' });

    expect(status).toBe(200);
    const update = dbState.queries.find(q => q.sql.includes('UPDATE users SET'));
    expect(update).toBeTruthy();
    expect(update.sql).toContain('token_version = token_version + 1');
    expect(update.sql).toContain('WHERE id = $2');
    expect(update.params).toEqual(['HASHED', USER_ID]);
  });

  it('tidak menyentuh token_version bila password tidak diubah', async () => {
    const { status } = await callUsersUpdate({ user_id: USER_ID, display_name: 'Nama Baru' });

    expect(status).toBe(200);
    const update = dbState.queries.find(q => q.sql.includes('UPDATE users SET'));
    expect(update.sql).not.toContain('token_version');
    expect(update.sql).toContain('WHERE id = $2');
    expect(update.params).toEqual(['Nama Baru', USER_ID]);
  });

  it('indeks parameter tetap benar saat password digabung perubahan lain', async () => {
    const { status } = await callUsersUpdate({
      user_id: USER_ID,
      password: 'rahasia123',
      display_name: 'Nama Baru',
      eo_organization: 'EO Contoh',
    });

    expect(status).toBe(200);
    const update = dbState.queries.find(q => q.sql.includes('UPDATE users SET'));
    expect(update.sql).toContain('token_version = token_version + 1');
    expect(update.sql).toContain('WHERE id = $4');
    expect(update.params).toHaveLength(4);
    expect(update.params[update.params.length - 1]).toBe(USER_ID);
    expect(update.params).toContain('HASHED');
  });
});
