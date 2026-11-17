/**
 * `GET /api/v1/calendar.ics`: URL langganan Google/Apple/Outlook.
 *
 * Kontrak yang dikunci:
 * - Hanya event `status <> 'draft'` dan yang belum selesai (ongoing + akan datang).
 * - Content-Type `text/calendar`, bukan envelope JSON.
 * - Kolom PII (pic/phone/email) tidak pernah ikut di-SELECT.
 * - `date_str` TEXT dibandingkan lewat `safeDate` (CASE + regex), bukan cast
 *   langsung yang bisa melempar 22007/22008 untuk nilai legacy.
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

async function callFeed() {
  const { default: router } = await import('../public.js');
  const layer = router.stack.find(
    (entry) => entry.route && entry.route.path === '/calendar.ics' && entry.route.methods.get,
  );
  if (!layer) throw new Error('route GET /calendar.ics tidak ditemukan');

  const headers = {};
  const req = {
    method: 'GET',
    url: '/calendar.ics',
    headers: {},
    ip: '127.0.0.1',
    socket: {},
    params: {},
    query: {},
  };
  let settle;
  const finished = new Promise((resolve, reject) => { settle = { resolve, reject }; });
  const res = {
    statusCode: 200,
    _body: null,
    status(code) { this.statusCode = code; return this; },
    setHeader(name, value) { headers[name.toLowerCase()] = value; return this; },
    getHeader(name) { return headers[name.toLowerCase()]; },
    send(payload) { this._body = payload; settle.resolve(); return this; },
    json(payload) { this._body = payload; settle.resolve(); return this; },
  };

  const chain = layer.route.stack.map((entry) => entry.handle);
  let index = 0;
  const step = (err) => {
    if (err) return settle.reject(err);
    const handler = chain[index++];
    if (!handler) return settle.resolve();
    const result = handler(req, res, step);
    if (result && typeof result.then === 'function') result.then(() => {}, settle.reject);
  };
  step();
  await finished;
  return { status: res.statusCode, body: res._body, headers };
}

beforeEach(() => {
  dbState.rows = [];
  dbState.queries = [];
});

describe('GET /calendar.ics', () => {
  it('mengirim text/calendar dengan VEVENT yang belum selesai', async () => {
    dbState.rows = [
      {
        id: 'evt_1',
        date_str: '2026-11-20',
        date_end: null,
        jam: '10:00 - 12:00',
        acara: 'Bazar Komunitas',
        lokasi: 'Atrium',
        keterangan: '',
        day_time_slots: null,
      },
    ];

    const { status, body, headers } = await callFeed();

    expect(status).toBe(200);
    expect(headers['content-type']).toContain('text/calendar');
    expect(headers['cache-control']).toContain('max-age=300');
    expect(body).toContain('BEGIN:VCALENDAR');
    expect(body).toContain('UID:evt_1@metmalcommunityspace.web.id');
    expect(body).toContain('SUMMARY:Bazar Komunitas');
    expect(body).toContain('END:VCALENDAR');
  });

  it('query menutup draft, membatasi masa lalu, dan tidak membawa PII', async () => {
    await callFeed();

    const query = dbState.queries[0];
    expect(query).toBeTruthy();
    expect(query.sql).toContain("status <> 'draft'");
    expect(query.sql).toContain('GREATEST');
    expect(query.sql).toMatch(/date_str ~ '\^\[0-9\]\{4\}/);
    expect(query.sql).not.toMatch(/\bpic\b|\bphone\b|\bemail\b/);
    expect(query.params).toHaveLength(1);
  });

  it('feed tetap sah saat tidak ada event', async () => {
    const { status, body } = await callFeed();
    expect(status).toBe(200);
    expect(body).toContain('BEGIN:VCALENDAR');
    expect(body).toContain('END:VCALENDAR');
    expect(body).not.toContain('BEGIN:VEVENT');
  });
});