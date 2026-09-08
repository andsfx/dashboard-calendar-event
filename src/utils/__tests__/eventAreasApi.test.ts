import { describe, expect, it, vi, afterEach } from 'vitest';
import { dbEventAreaToEventArea, fetchEventAreas, updateAreaPhotoOrder } from '../api/albumsApi';

/**
 * Mock global fetch routing per REST URL (VITE_API_URL kosong di test →
 * base '/api/v1'). Envelope: { success, data?, error? }.
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

describe('Foto Area Event — albumsApi', () => {
  // -------------------------------------------------------
  // dbEventAreaToEventArea — snake_case → camelCase boundary
  // -------------------------------------------------------
  describe('dbEventAreaToEventArea', () => {
    it('maps all fields with defaults', () => {
      const area = dbEventAreaToEventArea({
        id: 'era_1',
        name: 'Panggung Lt. 3',
        description: 'Panggung utama',
        cover_photo_url: 'https://cdn.example.com/areas/a.jpg',
        sort_order: 2,
        is_active: false,
      }, 7);
      expect(area).toEqual({
        id: 'era_1',
        name: 'Panggung Lt. 3',
        description: 'Panggung utama',
        coverPhotoUrl: 'https://cdn.example.com/areas/a.jpg',
        sortOrder: 2,
        isActive: false,
        photoCount: 7,
      });
    });

    it('defaults empty description/cover and photoCount 0', () => {
      const area = dbEventAreaToEventArea({
        id: 'era_2',
        name: 'Atrium 2',
        description: '',
        cover_photo_url: '',
        sort_order: 0,
        is_active: true,
      });
      expect(area.description).toBe('');
      expect(area.coverPhotoUrl).toBe('');
      expect(area.sortOrder).toBe(0);
      expect(area.isActive).toBe(true);
      expect(area.photoCount).toBe(0);
    });
  });

  // -------------------------------------------------------
  // fetchEventAreas — GET /areas (server filter is_active) + hitung foto client
  // -------------------------------------------------------
  describe('fetchEventAreas', () => {
    it('maps rows and counts photos per area', async () => {
      mockFetchRoutes({
        '/api/v1/areas': {
          body: {
            success: true,
            data: {
              areas: [
                { id: 'era_1', name: 'A', description: '', cover_photo_url: '', sort_order: 0, is_active: true },
                { id: 'era_2', name: 'B', description: '', cover_photo_url: '', sort_order: 1, is_active: true },
              ],
              photos: [
                { id: 'aph_1', area_id: 'era_1', url: '', caption: '', sort_order: 0 },
                { id: 'aph_2', area_id: 'era_1', url: '', caption: '', sort_order: 1 },
                { id: 'aph_3', area_id: 'era_2', url: '', caption: '', sort_order: 0 },
              ],
            },
          },
        },
      });

      const areas = await fetchEventAreas();

      expect(areas).toHaveLength(2);
      expect(areas[0]?.photoCount).toBe(2);
      expect(areas[1]?.photoCount).toBe(1);
    });

    it('handles empty tables', async () => {
      mockFetchRoutes({
        '/api/v1/areas': { body: { success: true, data: { areas: [], photos: [] } } },
      });
      expect(await fetchEventAreas()).toEqual([]);
    });

    it('throws on server error', async () => {
      mockFetchRoutes({
        '/api/v1/areas': { status: 503, body: { success: false, error: 'Database tidak tersedia' } },
      });
      await expect(fetchEventAreas()).rejects.toThrow(/Database tidak tersedia/);
    });
  });

  // -------------------------------------------------------
  // updateAreaPhotoOrder — reorder via adminAction (POST /admin/:action)
  // -------------------------------------------------------
  describe('updateAreaPhotoOrder', () => {
    it('posts ordered photos and resolves', async () => {
      mockFetchRoutes({ '/api/v1/admin/updateAreaPhotoOrder': { body: { success: true } } });

      await updateAreaPhotoOrder([
        { id: 'aph_2', sortOrder: 0 },
        { id: 'aph_1', sortOrder: 1 },
      ]);

      expect(fetch).toHaveBeenCalledTimes(1);
      const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
      expect(url).toBe('/api/v1/admin/updateAreaPhotoOrder');
      const body = JSON.parse(String(init.body));
      expect(body.action).toBe('updateAreaPhotoOrder');
      expect(body.data).toEqual([
        { id: 'aph_2', sortOrder: 0 },
        { id: 'aph_1', sortOrder: 1 },
      ]);
    });
  });
});