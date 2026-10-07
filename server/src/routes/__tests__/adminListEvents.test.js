/**
 * Aksi admin `listEvents` — daftar event LENGKAP untuk dashboard.
 *
 * Kontrak yang dikunci:
 *   - TIDAK memfilter draft (kebalikan gerbang publik di public.js). Dashboard
 *     butuh event tersembunyi supaya bisa ditampilkan kembali; kalau filter itu
 *     bocor ke sini, event yang disembunyikan jadi mustahil di-unhide.
 *   - role `demo` (read-only) tetap menerima struktur, tapi PII (pic/phone)
 *     disamarkan — pola `readRegistrations`.
 *   - admin/superadmin menerima data utuh.
 *
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbState = { rows: [], sql: '' };

vi.mock('../../db.js', () => ({
  db: {
    query: vi.fn(async (sql) => {
      dbState.sql = sql;
      return { rows: dbState.rows, rowCount: dbState.rows.length };
    }),
  },
}));

const ROLE = { current: 'demo' };

vi.mock('../../auth.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, requireRole: () => (_req, _res, next) => next() };
});

/** Dispatch ke chain route Express; `role` menentukan req.auth.user.role. */
async function callAction(action, body = {}) {
  const { default: router } = await import('../admin.js');
  const req = {
    method: 'POST',
    url: `/${action}`,
    body: { action, ...body },
    headers: {},
    ip: '127.0.0.1',
    socket: {},
    params: { action },
    query: {},
    auth: { user: { id: 'u1', email: 'demo@example.com', role: ROLE.current } },
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
  const layer = router.stack.find(
    l => l.route && l.route.path === '/:action' && l.route.methods.post,
  );
  if (!layer) throw new Error('route /:action tidak ditemukan');
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

const EVENT_ROW = {
  id: 'evt_1', acara: 'Festival Minang', date_str: '2026-09-10', jam: '10:00 - 21:00',
  lokasi: 'Atrium Utama', eo: 'Komunitas Minang', pic: 'Rina Amelia',
  phone: '081200001111', status: 'draft', categories: ['Festival'], priority: 'medium',
};

describe('listEvents — daftar admin termasuk event tersembunyi', () => {
  beforeEach(() => {
    ROLE.current = 'demo';
    dbState.sql = '';
    dbState.rows = [];
  });

  it('menyamarkan pic/phone untuk role demo', async () => {
    dbState.rows = [{ ...EVENT_ROW }];
    const { status, body } = await callAction('listEvents');

    expect(status).toBe(200);
    const row = body.data[0];
    expect(row.pic).not.toBe('Rina Amelia');
    expect(row.phone).not.toBe('081200001111');
    // Struktur tetap terbaca, termasuk flag visibilitas lifecycle.
    expect(row.acara).toBe('Festival Minang');
    expect(row.status).toBe('draft');
  });

  it('mengembalikan data utuh untuk admin', async () => {
    ROLE.current = 'admin';
    dbState.rows = [{ ...EVENT_ROW }];
    const { body } = await callAction('listEvents');
    expect(body.data[0].pic).toBe('Rina Amelia');
    expect(body.data[0].phone).toBe('081200001111');
  });

  it('TIDAK memfilter draft (gerbang itu hanya milik channel publik)', async () => {
    ROLE.current = 'admin';
    dbState.rows = [{ ...EVENT_ROW }];
    const { body } = await callAction('listEvents');

    expect(body.data).toHaveLength(1);
    expect(dbState.sql).not.toMatch(/status\s*<>\s*'draft'/);
  });
});
