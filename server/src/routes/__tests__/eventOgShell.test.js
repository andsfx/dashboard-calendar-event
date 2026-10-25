/**
 * `/event-og` harus memakai shell SPA yang SEDANG LIVE (Vercel), bukan
 * `dist/index.html` lokal yang hanya disegarkan saat deploy API.
 *
 * Bug produksi: shell lokal menunjuk `/assets/index-<hash>.css` dari build lama;
 * setelah build baru naik, stylesheet itu dipangkas Vercel → `/events/:id` 404
 * pada CSS. Perbaikan: ambil shell live (cache 60 detik) + validasi bentuk, dan
 * fail-open ke dist lokal bila pengambilan gagal.
 *
 * `getShellHtml` diekspor supaya kontrak ini bisa diuji tanpa HTTP/DB.
 *
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbState = vi.hoisted(() => ({ rows: [] }));

vi.mock('../../db.js', () => ({
  db: { query: vi.fn(async () => ({ rows: dbState.rows, rowCount: dbState.rows.length })) },
}));

const LIVE_MARKER = 'LIVE-SHELL-MARKER';
const LIVE_HTML = `<!doctype html><html><head><title>live</title></head><body><div id="root"></div><script src="/assets/index-live1.js"></script></body></html><!--${LIVE_MARKER}-->`;
const INVALID_HTML = '<!doctype html><html><head><title>x</title></head><body><div id="root"></div></body></html>'.replace('</head>', '');

const { getShellHtml, resetShellCacheForTests } = await import('../extra.js');

beforeEach(() => {
  resetShellCacheForTests();
  vi.unstubAllGlobals();
});

describe('getShellHtml — shell live dengan fallback lokal', () => {
  it('memakai HTML live bila berbentuk shell SPA yang valid', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, text: async () => LIVE_HTML }));
    vi.stubGlobal('fetch', fetchMock);

    const html = await getShellHtml();

    expect(html).toBe(LIVE_HTML);
    expect(html).toContain(LIVE_MARKER);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // Hanya HTML (bukan API) dan dengan Accept text/html.
    const [url, opts] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/^https?:\/\//);
    expect(opts?.headers?.Accept).toBe('text/html');
  });

  it('meng-cache selama TTL (tidak memanggil fetch tiap request)', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, text: async () => LIVE_HTML }));
    vi.stubGlobal('fetch', fetchMock);

    await getShellHtml();
    await getShellHtml();
    await getShellHtml();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('fallback ke shell lokal bila fetch gagal (tidak melempar, tidak cache)', async () => {
    const fetchMock = vi.fn(async () => { throw new Error('network down'); });
    vi.stubGlobal('fetch', fetchMock);

    const html = await getShellHtml();

    expect(html).not.toContain(LIVE_MARKER);
    expect(html).toContain('id="root"');
    // Kegagalan tidak di-cache: panggilan berikutnya mencoba fetch lagi.
    await getShellHtml();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('fallback bila respons tidak ok', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503, text: async () => 'down' })));

    const html = await getShellHtml();

    expect(html).not.toContain(LIVE_MARKER);
    expect(html).toContain('id="root"');
  });

  it('fallback bila HTML live tidak punya id="root" / </head>', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, text: async () => INVALID_HTML })));

    const html = await getShellHtml();

    expect(html).not.toBe(INVALID_HTML);
    expect(html).toContain('id="root"');
    expect(html).toContain('</head>');
  });
});

describe('GET /event-og — jendela cache shell', () => {
  const EVENT = {
    id: 'evt_1', acara: 'Bazar', date_str: '2026-05-03', date_end: null,
    jam: '10:00', lokasi: 'Atrium', eo: 'EO Contoh', poster_url: null,
  };

  async function callEventOg(id) {
    const { default: router } = await import('../extra.js');
    const layer = router.stack.find((l) => l.route && l.route.path === '/event-og' && l.route.methods.get);
    if (!layer) throw new Error('route /event-og tidak ditemukan');

    const req = {
      method: 'GET', url: '/event-og', body: undefined,
      headers: { host: 'metmal.example', 'x-forwarded-proto': 'https' },
      ip: '127.0.0.1', socket: {}, params: {}, query: { id },
    };
    let settle;
    const finished = new Promise((resolve, reject) => { settle = { resolve, reject }; });
    const res = {
      statusCode: 200,
      _body: null,
      _headers: {},
      status(code) { this.statusCode = code; return this; },
      send(payload) { this._body = payload; settle.resolve(); return this; },
      json(payload) { this._body = payload; settle.resolve(); return this; },
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
    return { status: res.statusCode, headers: res._headers, body: res._body };
  }

  beforeEach(() => {
    dbState.rows = [{ ...EVENT }];
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, text: async () => LIVE_HTML })));
  });

  it('event valid: 60 detik (bukan 300) agar shell basi cepat hilang', async () => {
    const { status, headers, body } = await callEventOg('evt_1');

    expect(status).toBe(200);
    expect(headers['cache-control']).toBe('public, s-maxage=60, stale-while-revalidate=120');
    // Meta per-event tetap disuntik dan shell live dipakai.
    expect(body).toContain('og:title');
    expect(body).toContain(LIVE_MARKER);
  });

  it('404 (event tidak ada) memakai jendela yang sama', async () => {
    dbState.rows = [];
    const { status, headers } = await callEventOg('evt_missing');

    expect(status).toBe(404);
    expect(headers['cache-control']).toBe('public, s-maxage=60, stale-while-revalidate=120');
    expect(headers['x-robots-tag']).toBe('noindex');
  });
});
