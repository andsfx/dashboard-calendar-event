import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  fetchTenantParticipationEvents,
  fetchEventTenantParticipations,
  submitTenantParticipation,
  fetchTenantParticipationStatus,
  fetchTenantParticipations,
  updateTenantParticipation,
  deleteTenantParticipation,
} from './tenantParticipationsApi';
import type { TenantParticipationInput } from '../../types';

/**
 * Mock global fetch dengan routing per URL REST (VITE_API_URL kosong di test →
 * base '/api/v1'). Mengikuti pola tenantEventProposalsApi.test.ts.
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

function makeInput(overrides: Partial<TenantParticipationInput> = {}): TenantParticipationInput {
  return {
    tenantId: '180102223',
    tenantName: 'Kopi Kenangan',
    unitNumber: 'GF-12',
    tenantCategory: 'F&B',
    tenantLogo: 'https://cdn.example.com/logo.png',
    contactName: 'Rani Putri',
    phone: '08123456789',
    email: 'rani@example.com',
    eventId: 'evt-9',
    kind: 'both',
    boothArea: 'Atrium Utama',
    boothStart: '2026-11-05',
    boothEnd: '2026-11-06',
    boothSize: '2×2 m',
    boothProducts: 'Kopi kemasan 200gr',
    boothScheme: 'solo',
    boothNeeds: 'Listrik 1 titik',
    voucherType: 'discount_percent',
    voucherTerms: 'Diskon 20% semua menu, min. belanja Rp50.000',
    voucherQuota: 100,
    voucherFormat: 'both',
    ...overrides,
  };
}

describe('tenantParticipationsApi — publik', () => {
  it('memetakan event eligible snake_case → camelCase', async () => {
    mockFetchRoutes({
      '/api/v1/tenant-participations/events': {
        body: {
          success: true,
          data: [{
            id: 'evt-9', acara: 'Bazar Kopi', tanggal: '5 November 2026',
            date_str: '2026-11-05', date_end: '2026-11-06', lokasi: 'Main Atrium', categories: ['Bazaar'],
          }],
        },
      },
    });

    const events = await fetchTenantParticipationEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      id: 'evt-9', acara: 'Bazar Kopi', tanggal: '5 November 2026',
      dateStr: '2026-11-05', dateEnd: '2026-11-06', lokasi: 'Main Atrium', categories: ['Bazaar'],
    });
  });

  it('memetakan daftar approved dan mempertahankan kuota null', async () => {
    mockFetchRoutes({
      '/api/v1/tenant-participations?event_id=evt-9': {
        body: {
          success: true,
          data: [{
            tenant_name: 'Kopi Kenangan', unit_number: 'GF-12', tenant_category: 'F&B',
            tenant_logo: 'https://cdn.example.com/logo.png', kind: 'voucher',
            booth_area: '', booth_start: null, booth_end: null, booth_size: '', booth_products: '',
            voucher_type: 'buy1get1', voucher_terms: 'Beli 1 gratis 1 menu pilihan',
            voucher_quota: null, voucher_format: 'digital',
          }],
        },
      },
    });

    const items = await fetchEventTenantParticipations('evt-9');
    expect(items[0]?.tenantName).toBe('Kopi Kenangan');
    expect(items[0]?.kind).toBe('voucher');
    expect(items[0]?.voucherQuota).toBeNull();
    expect(items[0]?.voucherFormat).toBe('digital');
  });

  it('submit mengembalikan kode pengajuan tanpa mengecho PII', async () => {
    mockFetchRoutes({
      '/api/v1/tenant-participations': { status: 201, body: { success: true, code: 'TPR-7KQ2MZ' } },
    });
    await expect(submitTenantParticipation(makeInput())).resolves.toBe('TPR-7KQ2MZ');
  });

  it('submit gagal → melempar pesan dari server', async () => {
    mockFetchRoutes({
      '/api/v1/tenant-participations': {
        status: 400,
        body: { success: false, error: 'Pengajuan untuk event ini sudah ditutup (paling lambat H-1 sebelum event mulai).' },
      },
    });
    await expect(submitTenantParticipation(makeInput()))
      .rejects.toThrow('Pengajuan untuk event ini sudah ditutup (paling lambat H-1 sebelum event mulai).');
  });

  it('cek status: kode+telepon tidak cocok → null, bukan lempar', async () => {
    mockFetchRoutes({
      '/api/v1/tenant-participations/status': {
        status: 404,
        body: { success: false, error: 'Pengajuan tidak ditemukan. Periksa kode dan nomor telepon.' },
      },
    });
    await expect(fetchTenantParticipationStatus('TPR-AAAAAA', '08123456789')).resolves.toBeNull();
  });

  it('cek status: cocok → status dan ringkasan aman saja', async () => {
    mockFetchRoutes({
      '/api/v1/tenant-participations/status': {
        body: {
          success: true,
          data: {
            code: 'TPR-7KQ2MZ', tenant_name: 'Kopi Kenangan', event_title: 'Bazar Kopi',
            event_date: '2026-11-05', kind: 'both', status: 'approved',
            booth_area: 'Atrium Utama', booth_start: '2026-11-05', booth_end: '2026-11-06',
            voucher_type: 'discount_percent', voucher_terms: 'Diskon 20%', voucher_format: 'both',
            created_at: '2026-10-15T01:00:00Z', updated_at: '2026-10-15T02:00:00Z',
          },
        },
      },
    });

    const result = await fetchTenantParticipationStatus('tpr-7kq2mz', '08123456789');
    expect(result?.status).toBe('approved');
    expect(result?.boothArea).toBe('Atrium Utama');
    // Endpoint tidak pernah mengirim PII kontak — tidak ada field itu di tipe hasil.
    expect(result).not.toHaveProperty('phone');
  });
});

describe('tenantParticipationsApi — admin', () => {
  it('memetakan antrean snake_case → camelCase', async () => {
    mockFetchRoutes({
      '/api/v1/admin/listTenantParticipations': {
        body: {
          success: true,
          data: [{
            id: 'tpr-1', code: 'TPR-7KQ2MZ', tenant_id: '180102223', tenant_name: 'Kopi Kenangan',
            unit_number: 'GF-12', tenant_category: 'F&B', tenant_logo: '',
            contact_name: 'Rani Putri', phone: '08123456789', email: 'rani@example.com',
            event_id: 'evt-9', event_title: 'Bazar Kopi', event_date: '2026-11-05', kind: 'booth',
            booth_area: 'Atrium Utama', booth_start: '2026-11-05', booth_end: null, booth_size: '2×2 m',
            booth_products: 'Kopi kemasan', booth_scheme: 'solo', booth_needs: 'Listrik',
            voucher_type: 'other', voucher_terms: '', voucher_quota: null, voucher_format: 'both',
            status: 'pending', internal_notes: '', created_at: '2026-10-15T01:00:00Z', updated_at: '2026-10-15T01:00:00Z',
          }],
        },
      },
    });

    const rows = await fetchTenantParticipations();
    expect(rows[0]?.code).toBe('TPR-7KQ2MZ');
    expect(rows[0]?.eventTitle).toBe('Bazar Kopi');
    expect(rows[0]?.voucherQuota).toBeNull();
    expect(rows[0]?.status).toBe('pending');
  });

  it('koreksi isian mengirim patch apa adanya ke server', async () => {
    mockFetchRoutes({
      '/api/v1/admin/updateTenantParticipation': { body: { success: true } },
    });
    await expect(updateTenantParticipation('tpr-1', { boothArea: 'Pintu Utara 2', voucherQuota: '' }))
      .resolves.toBeUndefined();

    const fetchMock = vi.mocked(globalThis.fetch);
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(init.body))).toEqual({
      action: 'updateTenantParticipation', id: 'tpr-1', boothArea: 'Pintu Utara 2', voucherQuota: '',
    });
  });

  it('update gagal → melempar pesan server', async () => {
    mockFetchRoutes({
      '/api/v1/admin/updateTenantParticipation': { body: { success: false, error: 'Pengajuan tidak ditemukan' } },
    });
    await expect(updateTenantParticipation('tpr-x', { status: 'approved' })).rejects.toThrow('Pengajuan tidak ditemukan');
  });

  it('hapus gagal → melempar pesan server', async () => {
    mockFetchRoutes({
      '/api/v1/admin/deleteTenantParticipation': { body: { success: false, error: 'Pengajuan tidak ditemukan' } },
    });
    await expect(deleteTenantParticipation('tpr-x')).rejects.toThrow('Pengajuan tidak ditemukan');
  });
});
