import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Regresi audit 2026-11-27 pada aksi `readDrafts`:
 *
 *   `readDrafts` HARUS mengembalikan draft TERHAPUS juga (tanpa filter
 *   `deleted = false`). UI memilahnya ke draftHistory dengan tombol restore —
 *   tanpa baris terhapus dari server, tombol restore mati setelah reload.
 *
 *   Demo masking tetap berlaku untuk SEMUA baris (aktif maupun terhapus).
 *
 * @vitest-environment node
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-draft-history-0123456789';

const dbState = { rows: [], queries: [], error: null };

vi.mock('../../db.js', () => ({
  db: {
    query: vi.fn(async (sql, params) => {
      dbState.queries.push({ sql, params: params || [] });
      if (dbState.error) throw dbState.error;
      return { rows: dbState.rows, rowCount: dbState.rows.length };
    }),
  },
}));

vi.mock('../../lib/rateLimit.js', () => ({
  clientIp: () => '127.0.0.1',
  enforceRateLimit: () => true,
}));

vi.mock('../../auth.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    requireRole: () => (_req, _res, next) => next(),
  };
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

beforeEach(() => {
  dbState.rows = [];
  dbState.queries = [];
  dbState.error = null;
});

describe('readDrafts — draft terhapus ikut dikembalikan (regresi restore mati)', () => {
  it('query TIDAK memfilter deleted = false', async () => {
    dbState.rows = [];
    await callAction('readDrafts');
    const sql = dbState.queries.map(q => q.sql).join(' ');
    expect(sql).toContain('draft_events');
    expect(sql).not.toContain('deleted = false');
  });

  it('draft terhapus ikut dikembalikan untuk admin', async () => {
    dbState.rows = [
      { id: 'drf_1', acara: 'Aktif', deleted: false, progress: 'draft', pic: 'Budi', phone: '0812' },
      { id: 'drf_2', acara: 'Terhapus', deleted: true, progress: 'cancel', pic: 'Sari', phone: '0813' },
    ];
    const { status, body } = await callAction('readDrafts');
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.data.find(d => d.id === 'drf_2').deleted).toBe(true);
  });

  it('draft terhapus tetap disamarkan PII-nya untuk demo', async () => {
    const auth = await import('../../auth.js');
    const originalRole = auth.DEMO_ROLE;
    dbState.rows = [
      { id: 'drf_2', acara: 'Terhapus', deleted: true, progress: 'cancel', pic: 'Sari Lestari', phone: '081298765432' },
    ];
    // Demo masking dikenali dari role di req.auth — pakai role demo asli.
    const { default: router } = await import('../admin.js');
    const req = {
      method: 'POST',
      url: '/readDrafts',
      body: { action: 'readDrafts' },
      headers: {},
      ip: '127.0.0.1',
      socket: {},
      params: { action: 'readDrafts' },
      query: {},
      auth: { user: { id: 'u_demo', email: 'demo@example.com', role: originalRole } },
    };
    let settle;
    const finished = new Promise((resolve, reject) => { settle = { resolve, reject }; });
    const res = {
      statusCode: 200, _body: null,
      status(code) { this.statusCode = code; return this; },
      json(payload) { this._body = payload; settle.resolve(); return this; },
      cookie() {}, clearCookie() {}, setHeader() {}, getHeader() { return undefined; },
    };
    const layer = router.stack.find(l => l.route && l.route.path === '/:action' && l.route.methods.post);
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
    expect(res.statusCode).toBe(200);
    expect(res._body.data[0].pic).toBe('S***i L***i');
    expect(res._body.data[0].phone).toBe('********5432');
  });
});
