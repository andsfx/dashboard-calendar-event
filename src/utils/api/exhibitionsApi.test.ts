import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  fetchPublicExhibitions,
  fetchPublicExhibition,
  submitExhibitionLead,
  fetchExhibitions,
  fetchExhibitionActivations,
  linkExhibitionActivation,
  unlinkExhibitionActivation,
} from './exhibitionsApi';

/**
 * Mock global fetch dengan routing per URL REST (VITE_API_URL kosong di test →
 * base '/api/v1'). Mengikuti pola mock domainApi.test.ts.
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

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'exh-1',
    title: 'Beauty Fair',
    theme: 'Kecantikan',
    description: 'Pameran kecantikan',
    location: 'Atrium',
    date_start: '2026-10-01',
    date_end: '2026-10-05',
    collaboration_brief: 'Butuh brand',
    leasing_pic: 'Casual',
    marcomm_pic: 'Marcomm',
    publication: 'published',
    accepting_applications: true,
    created_at: '2026-09-01T00:00:00Z',
    ...overrides,
  };
}

describe('exhibitionsApi', () => {
  it('memetakan daftar pameran publik snake_case → camelCase', async () => {
    mockFetchRoutes({ '/api/v1/exhibitions': { body: { success: true, data: [makeRow()] } } });
    const result = await fetchPublicExhibitions();
    expect(result).toHaveLength(1);
    expect(result[0]?.dateStart).toBe('2026-10-01');
    expect(result[0]?.collaborationBrief).toBe('Butuh brand');
    expect(result[0]?.acceptingApplications).toBe(true);
  });

  it('memetakan detail pameran beserta aktivasi', async () => {
    mockFetchRoutes({
      '/api/v1/exhibitions/exh-1': {
        body: {
          success: true,
          data: {
            exhibition: makeRow(),
            activations: [{
              event_id: 'ev-1', exhibition_id: 'exh-1', acara: 'Beauty Class',
              date_str: '2026-10-02', date_end: '2026-10-02', jam: '14:00', lokasi: 'Atrium', eo: 'Brand A',
            }],
          },
        },
      },
    });
    const result = await fetchPublicExhibition('exh-1');
    expect(result.exhibition.title).toBe('Beauty Fair');
    expect(result.activations).toHaveLength(1);
    expect(result.activations[0]?.title).toBe('Beauty Class');
    expect(result.activations[0]?.dateStart).toBe('2026-10-02');
  });

  it('melempar ApiError saat submit lead ditolak server', async () => {
    mockFetchRoutes({
      '/api/v1/exhibition-leads': { status: 409, body: { success: false, error: 'Pengajuan sudah ditutup' } },
    });
    await expect(submitExhibitionLead({
      exhibitionId: 'exh-1', organizationName: 'Brand A', organizationType: 'brand', participation: 'booth',
      contactName: 'Rani', phone: '08123456789', email: '', proposal: '',
    })).rejects.toThrow(/Pengajuan sudah ditutup/);
  });

  it('memetakan daftar admin termasuk jumlah aktivasi', async () => {
    mockFetchRoutes({
      '/api/v1/admin/listExhibitions': { body: { success: true, data: [{ ...makeRow(), activation_count: 2 }] } },
    });
    const result = await fetchExhibitions();
    expect(result[0]?.activationCount).toBe(2);
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(String(init.body)).toContain('"action":"listExhibitions"');
  });

  it('memetakan aktivasi admin dari join event', async () => {
    mockFetchRoutes({
      '/api/v1/admin/listExhibitionActivations': {
        body: {
          success: true,
          data: [{
            event_id: 'ev-1', exhibition_id: 'exh-1', acara: 'Talkshow',
            date_str: '2026-10-03', date_end: null, jam: '', lokasi: 'Atrium', eo: '',
          }],
        },
      },
    });
    const result = await fetchExhibitionActivations();
    expect(result[0]?.dateEnd).toBe('2026-10-03');
  });

  it('mengirim link/unlink aktivasi lewat adminAction', async () => {
    mockFetchRoutes({
      '/api/v1/admin/linkExhibitionActivation': { body: { success: true } },
      '/api/v1/admin/unlinkExhibitionActivation': { body: { success: true } },
    });
    await expect(linkExhibitionActivation('exh-1', 'ev-1')).resolves.toBeUndefined();
    await expect(unlinkExhibitionActivation('ev-1')).resolves.toBeUndefined();
  });

  it('meneruskan pesan validasi periode dari server', async () => {
    mockFetchRoutes({
      '/api/v1/admin/linkExhibitionActivation': {
        status: 200,
        body: { success: false, error: 'Tanggal event berada di luar periode pameran' },
      },
    });
    await expect(linkExhibitionActivation('exh-1', 'ev-2'))
      .rejects.toThrow(/di luar periode pameran/);
  });
});
