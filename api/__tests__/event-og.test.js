/**
 * Test api/event-og.js — OG meta injection server-side untuk /events/:id.
 *
 * Kontrak yang dijaga:
 * - GET only (405 untuk method lain).
 * - Event publik → meta og + twitter + JSON-LD Event ter-inject ke <head>, status 200.
 * - Event draft / tidak ketemu → status 404 + X-Robots-Tag noindex (dead link keluar dari crawler).
 * - Supabase gagal (transient) → fail-open: shell polos 200 TANPA noindex, cache no-store.
 * - Nilai meta di-escape (XSS via nama event).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { state } = vi.hoisted(() => ({
  state: {
    indexHtml: '<!doctype html><html lang="id"><head><title>Base</title></head><body><div id="root"></div></body></html>',
    eventRows: [],
    supabaseFails: false,
    selfFetchFails: false,
  },
}));

vi.stubGlobal('fetch', vi.fn(async (url) => {
  // Ambil index.html dari deployment sendiri (self fetch)
  if (String(url).endsWith('/index.html')) {
    if (state.selfFetchFails) throw new Error('self fetch down');
    return { ok: true, text: async () => state.indexHtml };
  }
  // REST Supabase
  if (state.supabaseFails) throw new Error('supabase down');
  return { ok: true, json: async () => state.eventRows };
}));

import handler from '../event-og.js';

function mockReq(method = 'GET', query = {}) {
  return {
    method,
    query,
    headers: { host: 'metmal-community-hub.vercel.app', 'x-forwarded-proto': 'https' },
    socket: { remoteAddress: '127.0.0.1' },
  };
}

function mockRes() {
  return {
    statusCode: 200,
    _html: null,
    _json: null,
    _headers: {},
    status(code) { this.statusCode = code; return this; },
    json(payload) { this._json = payload; return this; },
    setHeader(k, v) { this._headers[k.toLowerCase()] = v; return this; },
    send(html) { this._html = html; return this; },
    end() { return this; },
  };
}

const PUBLIC_EVENT = {
  id: 'evt_1',
  acara: 'Festival Minang "Edisi 2026"',
  date_str: '2026-09-10',
  date_end: null,
  jam: '10:00 - 21:00',
  lokasi: 'Atrium Utama',
  eo: 'Komunitas Minang',
  status: 'upcoming',
  poster_url: null,
};

describe('GET /api/event-og', () => {
  beforeEach(() => {
    state.eventRows = [];
    state.supabaseFails = false;
    state.selfFetchFails = false;
  });

  it('405 untuk method non-GET', async () => {
    const res = mockRes();
    await handler(mockReq('POST', { id: 'evt_1' }), res);
    expect(res.statusCode).toBe(405);
    expect(res._json).toEqual({ success: false, error: 'Method not allowed' });
  });

  it('event publik → meta og/twitter + JSON-LD ter-inject, status 200', async () => {
    state.eventRows = [PUBLIC_EVENT];
    const res = mockRes();
    await handler(mockReq('GET', { id: 'evt_1' }), res);
    expect(res.statusCode).toBe(200);
    expect(res._html).toContain('<title>Festival Minang &quot;Edisi 2026&quot; — Jadwal Event Metropolitan Mall Bekasi</title>');
    expect(res._html).toContain('property="og:title"');
    expect(res._html).toContain('property="og:url" content="https://metmal-community-hub.vercel.app/events/evt_1"');
    expect(res._html).toContain('property="og:image" content="https://metmal-community-hub.vercel.app/og-image.jpg"');
    expect(res._html).toContain('name="twitter:card" content="summary_large_image"');
    expect(res._html).toContain('"@type":"Event"');
    expect(res._html).toContain('"startDate":"2026-09-10"');
    expect(res._headers['x-robots-tag']).toBeUndefined();
    expect(res._headers['cache-control']).toContain('s-maxage=300');
  });

  it('nilai event di-escape — tidak menutup attribute HTML', async () => {
    state.eventRows = [{ ...PUBLIC_EVENT, acara: 'Event <b>XSS</b"> Attack' }];
    const res = mockRes();
    await handler(mockReq('GET', { id: 'evt_1' }), res);
    expect(res.statusCode).toBe(200);
    expect(res._html).toContain('Event &lt;b&gt;XSS&lt;/b&quot;&gt; Attack');
    expect(res._html).not.toContain('<b>XSS</b');
  });

  it('event tidak ketemu / draft → 404 + noindex', async () => {
    state.eventRows = [];
    const res = mockRes();
    await handler(mockReq('GET', { id: 'evt_draft' }), res);
    expect(res.statusCode).toBe(404);
    expect(res._headers['x-robots-tag']).toBe('noindex');
    expect(res._headers['cache-control']).toContain('s-maxage=60');
  });

  it('Supabase gagal (transient) → fail-open 200 tanpa noindex, no-store', async () => {
    state.supabaseFails = true;
    const res = mockRes();
    await handler(mockReq('GET', { id: 'evt_1' }), res);
    expect(res.statusCode).toBe(200);
    expect(res._html).toBe(state.indexHtml);
    expect(res._headers['x-robots-tag']).toBeUndefined();
    expect(res._headers['cache-control']).toBe('private, no-store');
  });

  it('tanpa id → shell polos 200', async () => {
    const res = mockRes();
    await handler(mockReq('GET', {}), res);
    expect(res.statusCode).toBe(200);
    expect(res._html).toBe(state.indexHtml);
    expect(res._headers['x-robots-tag']).toBeUndefined();
  });
  it('poster_url dipakai sebagai og:image bila ada', async () => {
    state.eventRows = [{ ...PUBLIC_EVENT, poster_url: 'https://cdn.example.com/poster.jpg' }];
    const res = mockRes();
    await handler(mockReq('GET', { id: 'evt_1' }), res);
    expect(res._html).toContain('property="og:image" content="https://cdn.example.com/poster.jpg"');
  });

  it('multi-day: description memuat rentang tanggal Indonesia + JSON-LD endDate ISO', async () => {
    state.eventRows = [{ ...PUBLIC_EVENT, date_end: '2026-09-12' }];
    const res = mockRes();
    await handler(mockReq('GET', { id: 'evt_1' }), res);
    expect(res._html).toContain('Kamis, 10 September 2026 s.d. Sabtu, 12 September 2026');
    expect(res._html).toContain('"endDate":"2026-09-12"');
  });
});