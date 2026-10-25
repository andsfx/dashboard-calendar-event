/**
 * Fallback origin di `/event-og`: bila `SPA_SHELL_URL` tidak bisa diparse,
 * origin kanonik tidak tersedia dan URL meta kembali memakai host request
 * (perilaku lama). Dijalankan di modul terpisah karena `SPA_ORIGIN` dihitung
 * sekali saat modul dievaluasi.
 *
 * @vitest-environment node
 */
import { describe, expect, it, vi } from 'vitest';

const dbState = vi.hoisted(() => ({
  rows: [{
    id: 'evt_1', acara: 'Bazar', date_str: '2026-05-03', date_end: null,
    jam: '10:00', lokasi: 'Atrium', eo: 'EO Contoh', poster_url: null,
  }],
}));

vi.mock('../../db.js', () => ({
  db: { query: vi.fn(async () => ({ rows: dbState.rows, rowCount: dbState.rows.length })) },
}));

// Env harus disetel SEBELUM modul dievaluasi (SPA_ORIGIN dibaca saat import).
vi.stubEnv('SPA_SHELL_URL', 'not a valid url');
vi.stubGlobal('fetch', vi.fn(async () => ({
  ok: true,
  status: 200,
  text: async () => '<!doctype html><html><head><title>x</title></head><body><div id="root"></div></body></html>',
})));

describe('GET /event-og — origin fallback saat SPA_SHELL_URL tidak valid', () => {
  it('memakai proto://host dari request', async () => {
    const { default: router } = await import('../extra.js');
    const layer = router.stack.find((l) => l.route && l.route.path === '/event-og' && l.route.methods.get);
    expect(layer).toBeTruthy();

    const req = {
      method: 'GET', url: '/event-og', body: undefined,
      headers: { host: 'api.internal:8080', 'x-forwarded-proto': 'https' },
      ip: '127.0.0.1', socket: {}, params: {}, query: { id: 'evt_1' },
    };
    let settle;
    const finished = new Promise((resolve, reject) => { settle = { resolve, reject }; });
    const res = {
      statusCode: 200,
      _body: null,
      _headers: {},
      status(code) { this.statusCode = code; return this; },
      send(payload) { this._body = payload; settle.resolve(); return this; },
      setHeader(n, v) { this._headers[String(n).toLowerCase()] = v; return this; },
      getHeader(n) { return this._headers[String(n).toLowerCase()]; },
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

    expect(res.statusCode).toBe(200);
    expect(res._body).toContain('content="https://api.internal:8080/events/evt_1"');
  });
});
