/**
 * Role `demo` adalah read-only TAPI tetap menerima PII mentah dari dua aksi
 * baca (temuan audit 2026-10-04): `listSponsorLeads` (`sl.*` → contact_name,
 * phone, email) dan `readRegistrations` (`SELECT *` → pic, phone, email).
 *
 * Kontrak yang dikunci di sini:
 *   - demo  → nama/telepon/email DISAMARKAN (struktur terlihat, identitas tidak)
 *   - admin/superadmin → data UTUH (mereka memang berhak mengelola lead)
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

const SPONSOR_ROW = {
  id: 'sld_1', company_name: 'PT Contoh', contact_name: 'Budi Santoso',
  phone: '081234567890', email: 'budi@example.com', message: 'halo', status: 'pending',
};
const REG_ROW = {
  id: 'crg_1', community_name: 'Komunitas X', pic: 'Sindi Lestari',
  phone: '081298765432', email: 'sindi@example.com', status: 'pending',
};
describe('demo PII masking pada aksi baca admin', () => {
  beforeEach(() => { ROLE.current = 'demo'; });

  it('listSponsorLeads menyamarkan contact_name/phone/email untuk demo', async () => {
    dbState.rows = [{ ...SPONSOR_ROW }];
    const { status, body } = await callAction('listSponsorLeads');

    expect(status).toBe(200);
    const row = body.data[0];
    expect(row.contact_name).not.toBe('Budi Santoso');
    expect(row.phone).not.toBe('081234567890');
    expect(row.email).not.toBe('budi@example.com');
    // Struktur tetap terbaca.
    expect(row.company_name).toBe('PT Contoh');
    expect(row.status).toBe('pending');
    // Bentuk samaran: domain email tetap, digit terakhir telepon tetap.
    expect(row.email).toContain('@example.com');
    expect(row.phone).toMatch(/7890$/);
  });

  it('readRegistrations menyamarkan pic/phone/email untuk demo', async () => {
    dbState.rows = [{ ...REG_ROW }];
    const { status, body } = await callAction('readRegistrations');

    expect(status).toBe(200);
    const row = body.data[0];
    expect(row.pic).not.toBe('Sindi Lestari');
    expect(row.phone).not.toBe('081298765432');
    expect(row.email).not.toBe('sindi@example.com');
    expect(row.community_name).toBe('Komunitas X');
  });

  it('admin tetap menerima data UTUH', async () => {
    ROLE.current = 'admin';
    dbState.rows = [{ ...SPONSOR_ROW }];
    const { body } = await callAction('listSponsorLeads');
    expect(body.data[0].contact_name).toBe('Budi Santoso');
    expect(body.data[0].phone).toBe('081234567890');
    expect(body.data[0].email).toBe('budi@example.com');
  });

  it('superadmin tetap menerima data UTUH pada readRegistrations', async () => {
    ROLE.current = 'superadmin';
    dbState.rows = [{ ...REG_ROW }];
    const { body } = await callAction('readRegistrations');
    expect(body.data[0].pic).toBe('Sindi Lestari');
    expect(body.data[0].phone).toBe('081298765432');
  });
});