import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Regresi audit 2026-11-27 pada scope baca survey tenant:
 *
 *   `eo_tenant` HANYA boleh membaca survey miliknya DAN pada event yang
 *   ditugaskan padanya (`users.assigned_events`) — selaras dengan `/create`
 *   dan `/update`. Sebelumnya `GET /get` dan `GET /list` hanya membandingkan
 *   `tenant_user_id`, jadi EO yang penugasannya dicabut admin tetap bisa
 *   membaca survey (termasuk PII tenant) dari event yang sudah dicabut.
 *
 * @vitest-environment node
 */
process.env.MID_API_KEY = process.env.MID_API_KEY || 'test-mid-key';

const query = vi.fn();
const requireRole = vi.fn(() => (_req, _res, next) => next());

vi.mock('../../db.js', () => ({
  db: { query: (...args) => query(...args) },
}));

vi.mock('../../auth.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    // canAccessSurveyEvent versi ASLI — semantik assigned_events produksi.
    requireRole: (...args) => requireRole(...args),
    logActivity: vi.fn(),
  };
});

async function call(method, path, { user = { id: 'u_eo', role: 'eo_tenant', email: 'eo@example.com' }, queryParams = {} } = {}) {
  const { default: router } = await import('../tenant.js');
  const req = {
    method,
    url: path,
    body: {},
    headers: {},
    ip: '127.0.0.1',
    socket: {},
    params: {},
    query: queryParams,
    auth: { user },
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
  return { status: res.statusCode, body: res._body };
}

const SURVEY_ROW = {
  id: 'sv1',
  event_id: 'evt_1',
  tenant_user_id: 'u_eo',
  tenant_name: 'Budi Santoso',
  tenant_email: 'budi@eo.example.com',
  status: 'submitted',
};

beforeEach(() => {
  query.mockReset();
  query.mockResolvedValue({ rows: [{ ...SURVEY_ROW }], rowCount: 1 });
});

describe('GET /tenant/get — eo_tenant hanya event yang ditugaskan', () => {
  it('403 bila event tidak ada di assigned_events (EO yang dicabut penugasannya)', async () => {
    const { status, body } = await call('GET', '/get', {
      user: { id: 'u_eo', role: 'eo_tenant', email: 'eo@example.com', assigned_events: ['evt_lain'] },
      queryParams: { id: 'sv1' },
    });
    expect(status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.error).toContain('ditugaskan');
  });

  it('200 bila event ada di assigned_events', async () => {
    const { status } = await call('GET', '/get', {
      user: { id: 'u_eo', role: 'eo_tenant', email: 'eo@example.com', assigned_events: ['evt_1'] },
      queryParams: { id: 'sv1' },
    });
    expect(status).toBe(200);
    expect(query).toHaveBeenCalled();
  });

  it('tetap menolak survey milik EO lain (guard tenant_user_id tetap ada)', async () => {
    query.mockResolvedValue({ rows: [{ ...SURVEY_ROW, tenant_user_id: 'u_orang_lain' }], rowCount: 1 });
    const { status } = await call('GET', '/get', {
      user: { id: 'u_eo', role: 'eo_tenant', email: 'eo@example.com', assigned_events: ['evt_1'] },
      queryParams: { id: 'sv1' },
    });
    expect(status).toBe(403);
  });
});

describe('GET /tenant/list — eo_tenant hanya event yang ditugaskan', () => {
  it('menambahkan filter event_id IN (...) dari assigned_events', async () => {
    query.mockResolvedValue({ rows: [], rowCount: 0 });
    await call('GET', '/list', {
      user: { id: 'u_eo', role: 'eo_tenant', email: 'eo@example.com', assigned_events: ['evt_1', 'evt_2'] },
    });
    const sql = query.mock.calls.map(c => c[0]).join(' ');
    expect(sql).toContain('event_id IN ($');
    const params = query.mock.calls.flatMap(c => c[1] || []);
    expect(params).toContain('evt_1');
    expect(params).toContain('evt_2');
  });

  it('assigned_events kosong → filter FALSE (tidak ada baris yang bocor)', async () => {
    query.mockResolvedValue({ rows: [], rowCount: 0 });
    await call('GET', '/list', {
      user: { id: 'u_eo', role: 'eo_tenant', email: 'eo@example.com', assigned_events: [] },
    });
    const sql = query.mock.calls.map(c => c[0]).join(' ');
    expect(sql).toContain('FALSE');
  });
});
