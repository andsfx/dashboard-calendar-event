import { describe, it, expect, vi, afterEach } from 'vitest';
import * as domainApi from './domainApi';

/**
 * Mock global fetch dengan routing per URL REST (VITE_API_URL kosong di test →
 * base '/api/v1'). Envelope mengikuti kontrak REST: { success, data?, error? }.
 */
interface RouteSpec { status?: number; body: unknown; }

function mockFetchRoutes(routes: Record<string, RouteSpec>) {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : String(input);
    const route = routes[url];
    if (!route) {
      return {
        ok: false,
        status: 404,
        json: async () => ({ success: false, error: `No mock for ${url}` }),
        text: async () => `No mock for ${url}`,
      };
    }
    const status = route.status ?? 200;
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => route.body,
      text: async () => JSON.stringify(route.body),
    };
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('domainApi', () => {
  // -------------------------------------------------------
  // fetchEvents — GET /events + /themes + /holidays, detectCategory fallback
  // -------------------------------------------------------
  describe('fetchEvents', () => {
    function makeEvent(overrides: Record<string, any> = {}) {
      return {
        id: 'ev-1', date_str: '2025-06-10', date_end: null,
        day: 'Tuesday', tanggal: '10 Juni 2025',
        jam: '10:00', acara: 'Bazaar Ramadhan', lokasi: 'Hall A',
        eo: 'Panitia', pic: 'Ali', phone: '08123', keterangan: '',
        month: '2025-06', status: 'upcoming', category: '',
        categories: null, priority: 'medium',
        event_model: '', event_nominal: '', event_model_notes: '',
        source_draft_id: '', is_multi_day: false,
        day_time_slots: null, event_type: 'single',
        recurrence_group_id: '', is_recurring: false, poster_url: null,
        ...overrides,
      };
    }

    it('fetches 3 endpoints and maps events', async () => {
      mockFetchRoutes({
        '/api/v1/events': { body: { success: true, data: [makeEvent()] } },
        '/api/v1/themes': { body: { success: true, data: [] } },
        '/api/v1/holidays': { body: { success: true, data: [] } },
      });
      const result = await domainApi.fetchEvents();
      const fetches = vi.mocked(fetch).mock.calls.map((c) => String(c[0]));
      expect(fetches).toEqual(expect.arrayContaining(['/api/v1/events', '/api/v1/themes', '/api/v1/holidays']));
      expect(result.events).toHaveLength(1);
      expect(result.events[0].category).toBe('Bazaar');
    });

    it('throws when events endpoint errors', async () => {
      mockFetchRoutes({
        '/api/v1/events': { status: 500, body: { success: false, error: 'DB down' } },
        '/api/v1/themes': { body: { success: true, data: [] } },
        '/api/v1/holidays': { body: { success: true, data: [] } },
      });
      await expect(domainApi.fetchEvents()).rejects.toThrow(/DB down/);
    });

    it('handles empty results', async () => {
      mockFetchRoutes({
        '/api/v1/events': { body: { success: true, data: [] } },
        '/api/v1/themes': { body: { success: true, data: [] } },
        '/api/v1/holidays': { body: { success: true, data: [] } },
      });
      const result = await domainApi.fetchEvents();
      expect(result.events).toEqual([]);
      expect(result.themes).toEqual([]);
      expect(result.holidays).toEqual([]);
    });

    it('detectCategory fallback when categories empty', async () => {
      const events = [
        makeEvent({ id: 'e1', acara: 'Workshop React', categories: null }),
        makeEvent({ id: 'e2', acara: 'Jualan Pulsa', categories: ['Bazaar'] }),
        makeEvent({ id: 'e3', acara: 'Fun Run 5K', categories: null }),
      ];
      mockFetchRoutes({
        '/api/v1/events': { body: { success: true, data: events } },
        '/api/v1/themes': { body: { success: true, data: [] } },
        '/api/v1/holidays': { body: { success: true, data: [] } },
      });
      const result = await domainApi.fetchEvents();
      expect(result.events[0].category).toBe('Workshop');
      expect(result.events[1].category).toBe('Bazaar');
      expect(result.events[2].category).toBe('Olahraga');
    });

    it('maps themes and holidays', async () => {
      const themes = [{ id: 't1', name: 'Ramadhan', date_start: '2025-03-01', date_end: '2025-03-31', color: '#00ff00' }];
      const holidays = [{ id: 'h1', tanggal: '', date_str: '2025-08-17', day: '', month: '', name: 'Merdeka', type: 'libur_nasional', description: '' }];
      mockFetchRoutes({
        '/api/v1/events': { body: { success: true, data: [makeEvent()] } },
        '/api/v1/themes': { body: { success: true, data: themes } },
        '/api/v1/holidays': { body: { success: true, data: holidays } },
      });
      const result = await domainApi.fetchEvents();
      expect(result.themes).toHaveLength(1);
      expect(result.themes[0].name).toBe('Ramadhan');
      expect(result.holidays).toHaveLength(1);
      expect(result.holidays[0].name).toBe('Merdeka');
    });
  });

  // -------------------------------------------------------
  // createDraftEvent — public submission via POST /drafts (tanpa RETURNING)
  // -------------------------------------------------------
  describe('createDraftEvent (public)', () => {
    const draftData = { acara: 'Pameran Seni', tanggal: '15 Agustus 2025', dateStr: '2025-08-15' };

    it('posts draft row without id and returns empty id', async () => {
      mockFetchRoutes({ '/api/v1/drafts': { body: { success: true } } });
      const result = await domainApi.createDraftEvent(draftData as any, 'public');
      expect(result.id).toBe('');
      const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
      expect(url).toBe('/api/v1/drafts');
      const sent = JSON.parse(String(init.body));
      expect(sent.data.acara).toBe('Pameran Seni');
      // Insert publik tanpa RETURNING — row id tidak dikirim
      expect(sent.data).not.toHaveProperty('id');
    });

    it('throws ApiError on server error', async () => {
      mockFetchRoutes({ '/api/v1/drafts': { status: 400, body: { success: false, error: 'Nama acara wajib diisi' } } });
      await expect(domainApi.createDraftEvent(draftData as any, 'public'))
        .rejects.toThrow(/Nama acara wajib diisi/);
    });
  });

  // -------------------------------------------------------
  // fetchSiteSettings — GET /settings/:key
  // -------------------------------------------------------
  describe('fetchSiteSettings', () => {
    it('returns value when key exists', async () => {
      mockFetchRoutes({ '/api/v1/settings/app_config': { body: { success: true, data: { theme: 'dark' } } } });
      expect(await domainApi.fetchSiteSettings('app_config')).toEqual({ theme: 'dark' });
    });

    it('returns null when key not found', async () => {
      mockFetchRoutes({ '/api/v1/settings/nope': { status: 404, body: { success: false, error: 'Setting tidak ditemukan' } } });
      expect(await domainApi.fetchSiteSettings('nope')).toBeNull();
    });

    it('returns null on query error (catch-all)', async () => {
      mockFetchRoutes({ '/api/v1/settings/x': { status: 500, body: { success: false, error: 'timeout' } } });
      expect(await domainApi.fetchSiteSettings('x')).toBeNull();
    });
  });

  // -------------------------------------------------------
  // deleteDraftEvent — uses adminAction (POST /admin/:action)
  // -------------------------------------------------------
  describe('deleteDraftEvent', () => {
    it('resolves when admin returns success', async () => {
      mockFetchRoutes({ '/api/v1/admin/deleteDraft': { body: { success: true } } });
      await expect(domainApi.deleteDraftEvent('draft-1')).resolves.toBeUndefined();
      const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
      expect(url).toBe('/api/v1/admin/deleteDraft');
      expect(String(init.body)).toContain('"action":"deleteDraft"');
    });
  });
});