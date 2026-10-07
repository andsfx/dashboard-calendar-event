/**
 * Gerbang visibilitas publik di level route (`updateEvent`).
 *
 * Kontrak yang dikunci (ADR 008 + ADR 002):
 *   - 'draft'/'published' dari klien DITULIS apa adanya ke kolom `status`
 *     (jalur hide/unhide; `published` adalah satu-satunya cara menampilkan
 *     kembali event yang disembunyikan).
 *   - Nilai temporal ('upcoming'/'ongoing'/'past') dari klien DIBUANG —
 *     status temporal diturunkan dari tanggal, bukan disimpan.
 *
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbState = { rows: [], statements: [] };

vi.mock('../../db.js', () => ({
  db: {
    query: vi.fn(async (sql, params) => {
      // logActivity menulis SETELAH UPDATE — simpan semua statement agar
      // assertion tidak tertipu oleh INSERT activity_logs.
      dbState.statements.push({ sql, params: params ?? [] });
      return { rows: dbState.rows, rowCount: dbState.rows.length };
    }),
  },
}));

/** Statement pertama yang bukan penulisan activity log. */
function mutation() {
  return dbState.statements.find(s => !/activity_logs/.test(s.sql)) ?? { sql: '', params: [] };
}

vi.mock('../../auth.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, requireRole: () => (_req, _res, next) => next() };
});

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
    auth: { user: { id: 'u1', email: 'admin@example.com', role: 'admin' } },
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

describe('updateEvent — gerbang visibilitas lifecycle', () => {
  beforeEach(() => {
    dbState.statements = [];
    dbState.rows = [];
  });

  it('status "published" ditulis (tampilkan kembali event)', async () => {
    const { status, body } = await callAction('updateEvent', { id: 'evt_1', data: { status: 'published' } });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(mutation().sql).toMatch(/status = \$1/);
    expect(mutation().params).toContain('published');
  });

  it('status "draft" ditulis (sembunyikan dari halaman publik)', async () => {
    await callAction('updateEvent', { id: 'evt_1', data: { status: 'draft' } });
    expect(mutation().sql).toMatch(/status = \$1/);
    expect(mutation().params).toContain('draft');
  });

  it('status temporal dari klien dibuang (tidak pernah masuk kolom)', async () => {
    const { body } = await callAction('updateEvent', { id: 'evt_1', data: { status: 'upcoming' } });
    // Satu-satunya key adalah status temporal → tidak ada perubahan yang sah.
    expect(body.success).toBe(false);
    expect(dbState.statements).toHaveLength(0);
  });

  it('edit biasa (tanpa status) tidak menyentuh kolom status', async () => {
    await callAction('updateEvent', { id: 'evt_1', data: { acara: 'Nama Baru' } });
    expect(mutation().sql).toMatch(/acara = \$1/);
    expect(mutation().sql).not.toMatch(/status =/);
  });
});
