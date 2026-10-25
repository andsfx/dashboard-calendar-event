/**
 * `POST /drafts` (pengajuan event publik) dan `GET /settings/:key`.
 *
 * Dua celah yang dikunci di sini:
 *   1. Tanpa validasi, `date_str` non-ISO sampai ke kolom DATE dan Postgres
 *      membalas 500 (22008), sementara teks bisa sepanjang apa pun.
 *   2. `GET /settings/:key` dulu pembaca JSONB generik untuk SELURUH isi
 *      `site_settings` — sekarang hanya key yang dikonsumsi halaman publik.
 *
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbState = { rows: [], queries: [] };

vi.mock('../../db.js', () => ({
  db: {
    query: vi.fn(async (sql, params) => {
      dbState.queries.push({ sql, params: params || [] });
      return { rows: dbState.rows, rowCount: dbState.rows.length };
    }),
  },
}));

/** Dispatch ke chain route Express; `path` + method menentukan layer. */
async function call(method, path, body = undefined, query = {}, params = {}) {
  const { default: router } = await import('../public.js');
  const layer = router.stack.find(
    (l) => l.route && l.route.path === path && l.route.methods[method.toLowerCase()],
  );
  if (!layer) throw new Error(`route ${method} ${path} tidak ditemukan`);

  const req = {
    method,
    url: path,
    body: method === 'POST' ? body : undefined,
    headers: {},
    ip: '127.0.0.1',
    socket: {},
    params,
    query,
  };
  let settle;
  const finished = new Promise((resolve, reject) => { settle = { resolve, reject }; });
  const res = {
    statusCode: 200,
    _body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this._body = payload; settle.resolve(); return this; },
    send(payload) { this._body = payload; settle.resolve(); return this; },
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

const VALID_DRAFT = {
  acara: 'Bazar Ramadan',
  date_str: '2026-05-03',
  lokasi: 'Main Atrium',
  eo: 'EO Contoh',
  pic: 'Budi',
  phone: '081234567890',
  categories: ['Bazar'],
  priority: 'high',
};

beforeEach(() => {
  dbState.rows = [];
  dbState.queries = [];
});

describe('POST /drafts — validasi input publik', () => {
  it('menerima pengajuan valid dan menyimpannya sebagai draft', async () => {
    const { status, body } = await call('POST', '/drafts', VALID_DRAFT);

    expect(status).toBe(201);
    expect(body.success).toBe(true);
    const insert = dbState.queries.find((q) => q.sql.includes('INSERT INTO draft_events'));
    expect(insert).toBeTruthy();
    expect(insert.params).toContain('Bazar Ramadan');
    expect(insert.params).toContain('2026-05-03');
  });

  it('menolak tanggal bukan ISO dengan 400 (bukan 500 dari Postgres)', async () => {
    const { status, body } = await call('POST', '/drafts', { ...VALID_DRAFT, date_str: '12 Juli 2026' });

    expect(status).toBe(400);
    expect(body.details.date_str).toBeTruthy();
    expect(dbState.queries).toHaveLength(0);
  });

  it('menolak tanggal mustahil (2026-02-31) dengan 400', async () => {
    const { status } = await call('POST', '/drafts', { ...VALID_DRAFT, date_str: '2026-02-31' });
    expect(status).toBe(400);
    expect(dbState.queries).toHaveLength(0);
  });

  it('menolak nama acara kosong, too-long text, dan priority asing', async () => {
    const cases = [
      { ...VALID_DRAFT, acara: '' },
      { ...VALID_DRAFT, acara: 'x'.repeat(201) },
      { ...VALID_DRAFT, lokasi: 'x'.repeat(201) },
      { ...VALID_DRAFT, keterangan: 'x'.repeat(2001) },
      { ...VALID_DRAFT, priority: 'urgent' },
      { ...VALID_DRAFT, categories: Array.from({ length: 11 }, (_, i) => `c${i}`) },
    ];
    for (const payload of cases) {
      const { status } = await call('POST', '/drafts', payload);
      expect(status, JSON.stringify(payload).slice(0, 60)).toBe(400);
    }
    expect(dbState.queries).toHaveLength(0);
  });

  it('menyimpan day_time_slots sebagai JSONB', async () => {
    const slots = [{ date: '2026-05-03', jam: '10:00-12:00' }];
    const { status } = await call('POST', '/drafts', { ...VALID_DRAFT, day_time_slots: slots });

    expect(status).toBe(201);
    const insert = dbState.queries.find((q) => q.sql.includes('INSERT INTO draft_events'));
    expect(insert.sql).toContain('day_time_slots');
    expect(insert.params).toContain(JSON.stringify(slots));
  });
});

describe('GET /settings/:key — allowlist key publik', () => {
  const ALLOWED = ['featured_upcoming_event_ids', 'hero_image', 'instagram_cache', 'instagram_posts'];

  it('mengembalikan nilai untuk key yang diizinkan', async () => {
    dbState.rows = [{ value: ['url-1'] }];
    for (const key of ALLOWED) {
      const { status, body } = await call('GET', '/settings/:key', undefined, {}, { key });
      expect(status, key).toBe(200);
      expect(body.data).toEqual(['url-1']);
    }
  });

  it('404 untuk key di luar allowlist tanpa menyentuh DB', async () => {
    const { status } = await call('GET', '/settings/:key', undefined, {}, { key: 'app_config' });
    expect(status).toBe(404);
    expect(dbState.queries).toHaveLength(0);
  });
});
