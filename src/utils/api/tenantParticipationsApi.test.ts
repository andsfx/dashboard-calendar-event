import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  fetchTenantParticipationEvents,
  fetchEventTenantParticipations,
  submitTenantParticipation,
  fetchTenantParticipationStatus,
  fetchTenantParticipations,
  updateTenantParticipation,
  deleteTenantParticipation,
  fetchTenantParticipationOptions,
  fetchAllTenantParticipationOptions,
  createTenantParticipationOption,
  updateTenantParticipationOption,
  deleteTenantParticipationOption,
  tenantParticipationOptionLabel,
  TENANT_PARTICIPATION_FALLBACK_OPTIONS,
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

describe('tenantParticipationsApi — opsi form (dikelola admin)', () => {
  it('memetakan opsi publik snake_case → camelCase', async () => {
    mockFetchRoutes({
      '/api/v1/tenant-participations/options': {
        body: {
          success: true,
          data: [
            { group: 'booth_scheme', value: 'solo', label: 'Booth sendiri', sort_order: 10 },
            { group: 'voucher_type', value: 'outdoor', label: 'Outdoor', sort_order: 70 },
          ],
        },
      },
    });

    const options = await fetchTenantParticipationOptions();
    expect(options).toEqual([
      { group: 'booth_scheme', value: 'solo', label: 'Booth sendiri', sortOrder: 10 },
      { group: 'voucher_type', value: 'outdoor', label: 'Outdoor', sortOrder: 70 },
    ]);
  });

  it('GET /options gagal → fallback opsi bawaan (form tetap terisi)', async () => {
    mockFetchRoutes({
      '/api/v1/tenant-participations/options': { status: 500, body: { success: false, error: 'DB down' } },
    });

    const options = await fetchTenantParticipationOptions();
    expect(options.length).toBe(TENANT_PARTICIPATION_FALLBACK_OPTIONS.length);
    expect(options.some((option) => option.group === 'booth_scheme' && option.value === 'solo')).toBe(true);
  });

  it('memetakan daftar opsi admin lengkap dengan is_active', async () => {
    mockFetchRoutes({
      '/api/v1/admin/listTenantParticipationOptions': {
        body: {
          success: true,
          data: [{
            id: 'tpo-1', group: 'booth_scheme', value: 'solo', label: 'Booth sendiri',
            sort_order: 10, is_active: false, created_at: '2026-10-15T01:00:00Z', updated_at: '2026-10-15T01:00:00Z',
          }],
        },
      },
    });

    const rows = await fetchAllTenantParticipationOptions();
    expect(rows[0]?.id).toBe('tpo-1');
    expect(rows[0]?.isActive).toBe(false);
    expect(rows[0]?.sortOrder).toBe(10);
  });

  it('create/update/delete opsi mengirim payload yang benar', async () => {
    mockFetchRoutes({
      '/api/v1/admin/createTenantParticipationOption': { body: { success: true, data: { id: 'tpo-9' } } },
      '/api/v1/admin/updateTenantParticipationOption': { body: { success: true } },
      '/api/v1/admin/deleteTenantParticipationOption': { body: { success: true } },
    });

    await createTenantParticipationOption('booth_size', 'outdoor', 'Outdoor / halaman', 50);
    await updateTenantParticipationOption('tpo-1', { label: 'Booth mandiri', isActive: false });
    await deleteTenantParticipationOption('tpo-1');

    const fetchMock = vi.mocked(globalThis.fetch);
    const bodies = fetchMock.mock.calls.map((call) => JSON.parse(String((call[1] as RequestInit).body)));
    expect(bodies[0]).toEqual({ action: 'createTenantParticipationOption', group: 'booth_size', value: 'outdoor', label: 'Outdoor / halaman', sortOrder: 50 });
    expect(bodies[1]).toEqual({ action: 'updateTenantParticipationOption', id: 'tpo-1', label: 'Booth mandiri', isActive: false });
    expect(bodies[2]).toEqual({ action: 'deleteTenantParticipationOption', id: 'tpo-1' });
  });

  it('create gagal (value duplikat) → melempar pesan server', async () => {
    mockFetchRoutes({
      '/api/v1/admin/createTenantParticipationOption': { body: { success: false, error: 'Opsi dengan value itu sudah ada' } },
    });
    await expect(createTenantParticipationOption('booth_scheme', 'solo', 'Duplikat')).rejects.toThrow('Opsi dengan value itu sudah ada');
  });
});

describe('tenantParticipationOptionLabel — satu sumber label nilai opsi', () => {
  const dynamic = [
    { group: 'voucher_type' as const, value: 'paket_hemat', label: 'Paket hemat', sortOrder: 70 },
  ];

  it('opsi dinamis pemanggil menang (label custom admin)', () => {
    expect(tenantParticipationOptionLabel('voucher_type', 'paket_hemat', dynamic)).toBe('Paket hemat');
  });

  it('nilai bawaan memakai fallback statis (seed DB)', () => {
    expect(tenantParticipationOptionLabel('voucher_type', 'min_spend', dynamic)).toBe('Diskon minimum belanja');
    expect(tenantParticipationOptionLabel('voucher_format', 'both')).toBe('Digital dan fisik');
    expect(tenantParticipationOptionLabel('booth_scheme', 'solo')).toBe('Booth sendiri');
  });

  it('nilai tak dikenal di-humanize — tidak pernah undefined atau slug kasar', () => {
    expect(tenantParticipationOptionLabel('voucher_type', 'paket_hemat')).toBe('Paket Hemat');
    expect(tenantParticipationOptionLabel('voucher_type', 'min_spend_extra')).toBe('Min Spend Extra');
    expect(tenantParticipationOptionLabel('booth_size', '')).toBe('');
  });
});
