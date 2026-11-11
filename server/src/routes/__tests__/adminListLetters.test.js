/**
 * Kontrak `listLetters` (admin.js): daftar surat TIDAK menarik `pdf_base64`
 * (payload list membengkak — temuan T12 update-fitur-generator-surat), dan
 * hanya mengembalikan surat `active` secara default. `includeArchived: true`
 * menambah surat `archived`; `deleted` tidak pernah muncul.
 *
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbState = { rows: [], sql: '', params: [], queries: [] };

vi.mock('../../db.js', () => ({
  db: {
    query: vi.fn(async (sql, params) => {
      dbState.sql = sql;
      dbState.params = params || [];
      dbState.queries.push({ sql, params: params || [] });
      return { rows: dbState.rows, rowCount: dbState.rows.length };
    }),
  },
}));

const ROLE = { current: 'admin' };

vi.mock('../../auth.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    requireRole: () => (_req, _res, next) => next(),
  };
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
    auth: { user: { id: 'u1', email: 'admin@example.com', role: ROLE.current } },
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

const listQuery = () => dbState.queries.find(q => /FROM generated_letters/i.test(q.sql));

describe('listLetters — kolom eksplisit tanpa pdf_base64', () => {
  beforeEach(() => {
    ROLE.current = 'admin';
    dbState.rows = [];
    dbState.queries = [];
  });

  it('default: kolom eksplisit + status = active, tanpa pdf_base64', async () => {
    const { status } = await callAction('listLetters');
    expect(status).toBe(200);

    const q = listQuery();
    expect(q).toBeTruthy();
    expect(q.sql).toContain('SELECT id, event_id, draft_event_id, letter_data, pdf_url, created_at, created_by, status');
    expect(q.sql).not.toContain('pdf_base64');
    expect(q.sql).not.toMatch(/SELECT\s+\*/);
    expect(q.sql).toContain(`status = 'active'`);
    expect(q.sql).not.toContain('archived');
  });

  it('includeArchived:true memakai status IN (active, archived)', async () => {
    const { status } = await callAction('listLetters', { includeArchived: true });
    expect(status).toBe(200);

    const q = listQuery();
    expect(q).toBeTruthy();
    expect(q.sql).toContain(`status IN ('active','archived')`);
    expect(q.sql).toContain('SELECT id, event_id, draft_event_id, letter_data, pdf_url, created_at, created_by, status');
    expect(q.sql).not.toContain('pdf_base64');
  });

  it('filter eventId/draftEventId tetap dinamis dan urut created_at DESC', async () => {
    const { status } = await callAction('listLetters', { eventId: 'evt_1', draftEventId: 'drf_9' });
    expect(status).toBe(200);

    const q = listQuery();
    expect(q).toBeTruthy();
    expect(q.sql).toContain('ORDER BY created_at DESC');
    expect(q.sql).toContain('event_id = $1');
    expect(q.sql).toContain('draft_event_id = $2');
    expect(q.params).toEqual(['evt_1', 'drf_9']);
  });

  it('filter docType memakai operator JSONB ->> dan COALESCE untuk baris lama', async () => {
    const { status } = await callAction('listLetters', { docType: 'sik' });
    expect(status).toBe(200);

    const q = listQuery();
    expect(q.sql).toContain(`COALESCE(letter_data->>'docType', 'ske') = $1`);
    expect(q.params).toEqual(['sik']);
  });

  it('tanpa docType tidak ada filter JSONB (semua dokumen tampil di riwayat)', async () => {
    await callAction('listLetters');
    expect(listQuery().sql).not.toContain('docType');
  });

  it('docType selain ske/sik ditolak zod sebelum masuk switch', async () => {
    const { status } = await callAction('listLetters', { docType: 'lain' });
    expect(status).toBe(400);
  });
});