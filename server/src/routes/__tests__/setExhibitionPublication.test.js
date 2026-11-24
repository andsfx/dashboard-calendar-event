/**
 * Test untuk setExhibitionPublication — mengevaluasi penolakan bila program
 * sudah selesai/arsip atau tanggal berakhir, serta sukses bila data valid.
 *
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbState = { rows: [], queries: [], existing: [] };

vi.mock('../../db.js', () => ({
  db: {
    query: vi.fn(async (sql, params) => {
      dbState.queries.push({ sql, params: params || [] });
      if (sql.includes('SELECT exhibition_id FROM exhibition_activations')) {
        return { rows: dbState.existing, rowCount: dbState.existing.length };
      }
      return { rows: dbState.rows, rowCount: dbState.rows.length };
    }),
  },
}));

vi.mock('../../auth.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, requireRole: () => (_req, _res, next) => next() };
});

async function callAction(action, body = {}) {
  const { default: router } = await import('../admin.js');
  const layer = router.stack.find(
    (l) => l.route && l.route.path === '/:action' && l.route.methods.post,
  );
  if (!layer) throw new Error('route /:action tidak ditemukan');

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

  const chain = layer.route.stack.map((s) => s.handle);
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
  dbState.queries = [];
  dbState.rows = [];
  dbState.existing = [];
  vi.resetModules();
});

describe('setExhibitionPublication', () => {
  it('sukses menerbitkan exhibition open dengan tanggal berlaku', async () => {
    dbState.rows = [{ status: 'open', date_active: true }];

    const { status, body } = await callAction('setExhibitionPublication', {
      id: 'exh_1',
      published: true,
    });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    const update = dbState.queries.find((q) => q.sql.includes('UPDATE exhibitions SET publication'));
    expect(update.params).toEqual(['published', 'open', 'exh_1']);
  });

  it('mempromosikan draft ke open saat diterbitkan', async () => {
    dbState.rows = [{ status: 'draft', date_active: true }];

    const { status, body } = await callAction('setExhibitionPublication', {
      id: 'exh_1',
      published: true,
    });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    const update = dbState.queries.find((q) => q.sql.includes('UPDATE exhibitions SET publication'));
    expect(update.params).toEqual(['published', 'open', 'exh_1']);
  });

  it('menolak 400 bila exhibition completed', async () => {
    dbState.rows = [{ status: 'completed', date_active: true }];

    const { status, body } = await callAction('setExhibitionPublication', {
      id: 'exh_1',
      published: true,
    });

    expect(status).toBe(400);
    expect(body.error).toBe('Program yang sudah selesai atau diarsipkan tidak bisa ditayangkan lagi.');
    expect(dbState.queries.some((q) => q.sql.includes('UPDATE exhibitions SET publication'))).toBe(false);
  });

  it('menolak 400 bila exhibition archived', async () => {
    dbState.rows = [{ status: 'archived', date_active: true }];

    const { status, body } = await callAction('setExhibitionPublication', {
      id: 'exh_1',
      published: true,
    });

    expect(status).toBe(400);
    expect(body.error).toBe('Program yang sudah selesai atau diarsipkan tidak bisa ditayangkan lagi.');
  });

  it('menolak 400 bila tanggal berakhir sudah lewat', async () => {
    dbState.rows = [{ status: 'open', date_active: false }];

    const { status, body } = await callAction('setExhibitionPublication', {
      id: 'exh_1',
      published: true,
    });

    expect(status).toBe(400);
    expect(body.error).toBe('Tanggal program sudah lewat. Perpanjang tanggal selesai dulu, lalu tayangkan kembali.');
    expect(dbState.queries.some((q) => q.sql.includes('UPDATE exhibitions SET publication'))).toBe(false);
  });

  it('sukses menurunkan ke draft meski tanggal lewat', async () => {
    dbState.rows = [{ status: 'open', date_active: false }];

    const { status, body } = await callAction('setExhibitionPublication', {
      id: 'exh_1',
      published: false,
    });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    const update = dbState.queries.find((q) => q.sql.includes('UPDATE exhibitions SET publication'));
    expect(update.params).toEqual(['draft', 'open', 'exh_1']);
  });
});
