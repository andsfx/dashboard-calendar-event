/**
 * Guard tanggal pameran — `events.date_str` bertipe TEXT (drift produksi) dan
 * bisa berisi nilai non-tanggal (impor legacy, mis. "12 Juli 2026").
 * `e.date_str::date` pada baris seperti itu melempar 22008 dan membunuh seluruh
 * query (500), bukan hanya melewati baris itu.
 *
 * Kontrak yang dikunci:
 *   - SQL memakai `safeDate` (pola CASE) — tidak ada lagi `date_str::date`
 *   - `linkExhibitionActivation` menolak event bertanggal rusak dengan 400
 *     ("Tanggal event tidak valid"), bukan membandingkan null (yang dulu berarti
 *     lolos guard periode).
 *
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbState = { rows: [], queries: [], existing: [] };

vi.mock('../../db.js', () => ({
  db: {
    query: vi.fn(async (sql, params) => {
      dbState.queries.push({ sql, params: params || [] });
      // Cek aktivasi yang sudah ada: default "belum ada" agar jalur taut sukses
      // bisa diuji; test bisa mengisinya lewat dbState.existing.
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

const EXHIBITION_DATA = {
  title: 'Pameran Kopi',
  dateStart: '2026-05-01',
  dateEnd: '2026-05-31',
};

beforeEach(() => {
  dbState.queries = [];
  dbState.rows = [];
  dbState.existing = [];
});

describe('updateExhibition — cast tanggal aman', () => {
  it('memakai safeDate, bukan e.date_str::date', async () => {
    // COUNT di luar periode = 0, lalu UPDATE berhasil.
    dbState.rows = [{ total: 0 }];
    const { status } = await callAction('updateExhibition', { id: 'exh_1', data: EXHIBITION_DATA });

    expect(status).toBe(200);
    const guard = dbState.queries.find((q) => q.sql.includes('exhibition_activations'));
    expect(guard).toBeTruthy();
    expect(guard.sql).toContain("CASE WHEN e.date_str ~");
    expect(guard.sql).toContain("CASE WHEN e.date_end::text ~");
    expect(guard.sql).not.toContain('e.date_str::date');
  });
});

describe('linkExhibitionActivation — tanggal event tidak valid', () => {
  it('membalas 400 bila event_start null (tanggal tak bisa di-cast)', async () => {
    dbState.rows = [{
      date_start: '2026-05-01',
      date_end: '2026-05-31',
      event_id: 'evt_1',
      acara: 'Bazar',
      event_start: null,
      event_end: null,
    }];

    const { status, body } = await callAction('linkExhibitionActivation', {
      exhibitionId: 'exh_1',
      eventId: 'evt_1',
    });

    expect(status).toBe(400);
    expect(body.error).toBe('Tanggal event tidak valid');
    // Tidak boleh ada INSERT aktivasi setelah penolakan.
    expect(dbState.queries.some((q) => q.sql.includes('INSERT INTO exhibition_activations'))).toBe(false);
  });

  it('menautkan aktivasi bila tanggal valid dan di dalam periode', async () => {
    dbState.rows = [{
      date_start: '2026-05-01',
      date_end: '2026-05-31',
      event_id: 'evt_1',
      acara: 'Bazar',
      event_start: '2026-05-10',
      event_end: '2026-05-10',
    }];

    const { status, body } = await callAction('linkExhibitionActivation', {
      exhibitionId: 'exh_1',
      eventId: 'evt_1',
    });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(dbState.queries.some((q) => q.sql.includes('INSERT INTO exhibition_activations'))).toBe(true);
  });
});
