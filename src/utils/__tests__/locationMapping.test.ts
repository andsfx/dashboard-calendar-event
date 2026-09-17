import { describe, expect, it, vi, afterEach } from 'vitest';
import { applyLocationMapping, fetchLocationMapping } from '../api/albumsApi';

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

describe('Pemetaan Lokasi — applyLocationMapping', () => {
  it('mengirim areaId saja (backfill area tanpa mengubah teks)', async () => {
    mockFetchRoutes({
      '/api/v1/admin/applyLocationMapping': { body: { success: true, updated: 117, renamed: 0 } },
    });

    const res = await applyLocationMapping([{ lokasi: 'Panggung Lt. 3', areaId: 'era_x' }]);

    expect(res).toEqual({ updated: 117, renamed: 0 });
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/v1/admin/applyLocationMapping');
    const body = JSON.parse(String(init.body));
    expect(body.action).toBe('applyLocationMapping');
    expect(body.mappings).toEqual([{ lokasi: 'Panggung Lt. 3', areaId: 'era_x' }]);
    // targetLokasi tidak dikirim bila tidak ada — server hanya mengisi area_id
    expect(body.mappings[0]).not.toHaveProperty('targetLokasi');
  });

  it('mengirim targetLokasi saat teks lokasi diseragamkan', async () => {
    mockFetchRoutes({
      '/api/v1/admin/applyLocationMapping': { body: { success: true, updated: 117, renamed: 117 } },
    });

    const res = await applyLocationMapping([
      { lokasi: 'Panggung Lt. 3', areaId: 'era_x', targetLokasi: 'Panggung Funworld Lt. 3' },
    ]);

    expect(res).toEqual({ updated: 117, renamed: 117 });
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(body.mappings[0].targetLokasi).toBe('Panggung Funworld Lt. 3');
  });

  it('mengembalikan {updated:0, renamed:0} bila server tidak mengirim hitungan', async () => {
    mockFetchRoutes({ '/api/v1/admin/applyLocationMapping': { body: { success: true } } });

    const res = await applyLocationMapping([{ lokasi: 'Lantai 3', areaId: 'era_x' }]);

    expect(res).toEqual({ updated: 0, renamed: 0 });
  });

  it('melempar ApiError saat server menolak', async () => {
    mockFetchRoutes({
      '/api/v1/admin/applyLocationMapping': { body: { success: false, error: 'Data pemetaan tidak valid' } },
    });

    await expect(applyLocationMapping([{ lokasi: 'X', areaId: 'era_x' }]))
      .rejects.toThrow(/Data pemetaan tidak valid/);
  });
});

describe('Pemetaan Lokasi — fetchLocationMapping', () => {
  it('menormalkan tipe baris (number + null area)', async () => {
    mockFetchRoutes({
      '/api/v1/admin/getLocationMapping': {
        body: {
          success: true,
          data: [
            { lokasi: 'Panggung Lt. 3', eventCount: 117, draftCount: 26, currentAreaId: null },
            { lokasi: 'Panggung Funworld Lt. 3', eventCount: 2, draftCount: 0, currentAreaId: 'era_x' },
          ],
        },
      },
    });

    const rows = await fetchLocationMapping();

    expect(rows).toEqual([
      { lokasi: 'Panggung Lt. 3', eventCount: 117, draftCount: 26, currentAreaId: null },
      { lokasi: 'Panggung Funworld Lt. 3', eventCount: 2, draftCount: 0, currentAreaId: 'era_x' },
    ]);
  });
});
