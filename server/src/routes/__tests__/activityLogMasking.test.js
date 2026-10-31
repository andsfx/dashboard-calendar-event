/**
 * Regresi audit 2026-10-31: `GET /activity-log` mengirim `SELECT *` mentah
 * untuk SEMUA role termasuk `demo`. Padahal log memuat `user_email` (PII),
 * `details` (JSONB berisi blok PIC/kontak bersarang), dan `ip_address`.
 * Role demo = akun peragaan: struktur boleh dilihat, identitas tidak.
 *
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbState = { rows: [] };

vi.mock('../../db.js', () => ({
  db: {
    query: vi.fn(async (sql) => {
      if (String(sql).includes('COUNT(*)')) return { rows: [{ total: dbState.rows.length }], rowCount: 1 };
      return { rows: dbState.rows, rowCount: dbState.rows.length };
    }),
  },
}));

vi.mock('../../auth.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    // Gate role tidak diuji di sini; masking memakai helper produksi.
    requireRole: () => (_req, _res, next) => next(),
  };
});

const LOG_ROW = {
  id: 'log_1',
  user_id: 'u1',
  user_email: 'sindi@example.com',
  action: 'create_tenant_survey',
  resource_type: 'tenant_survey',
  resource_id: 'tsv_1',
  details: {
    pic: 'Budi Santoso',
    phone: '081234567890',
    nested: { email: 'budi@mail.com' },
    count: 2,
  },
  ip_address: '203.0.113.9',
  created_at: '2026-10-31T00:00:00.000Z',
};

async function callActivityLog(role) {
  const { default: router } = await import('../extra.js');
  const req = {
    method: 'GET',
    url: '/activity-log',
    body: {},
    headers: {},
    ip: '127.0.0.1',
    socket: {},
    params: {},
    query: {},
    auth: { user: { id: 'u1', email: 'demo@example.com', role } },
  };
  let settle;
  const finished = new Promise((resolve, reject) => { settle = { resolve, reject }; });
  const res = {
    statusCode: 200,
    _body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this._body = payload; settle.resolve(); return this; },
    setHeader() { return this; },
    getHeader() { return undefined; },
  };
  const layer = router.stack.find(
    (l) => l.route && l.route.path === '/activity-log' && l.route.methods.get,
  );
  if (!layer) throw new Error('route GET /activity-log tidak ditemukan');

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
  dbState.rows = [structuredClone(LOG_ROW)];
});

describe('GET /activity-log — masking PII untuk role demo', () => {
  it('menyamarkan user_email, details rekursif, dan mengosongkan ip_address', async () => {
    const { status, body } = await callActivityLog('demo');

    expect(status).toBe(200);
    const row = body.data.logs[0];
    expect(row.user_email).not.toBe('sindi@example.com');
    expect(row.user_email).toContain('@example.com');
    expect(row.details.pic).not.toBe('Budi Santoso');
    expect(row.details.phone).not.toBe('081234567890');
    expect(row.details.nested.email).not.toBe('budi@mail.com');
    // Struktur & nilai non-PII tetap terbaca.
    expect(row.details.count).toBe(2);
    expect(row.action).toBe('create_tenant_survey');
    expect(row.ip_address).toBe('');
    expect(body.data.total).toBe(1);
  });

  it('staff tetap menerima log utuh (jejak audit lengkap)', async () => {
    const { body } = await callActivityLog('admin');

    const row = body.data.logs[0];
    expect(row.user_email).toBe('sindi@example.com');
    expect(row.details.pic).toBe('Budi Santoso');
    expect(row.ip_address).toBe('203.0.113.9');
  });
});
