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

vi.mock('../../db.js', () => ({ db: { query: vi.fn(async () => ({ rows: [] })) } }));

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
