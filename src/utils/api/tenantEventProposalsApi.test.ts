import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  fetchTenantEventProposals,
  submitTenantEventProposal,
  uploadTenantProposalAttachment,
  updateTenantEventProposal,
  deleteTenantEventProposal,
} from './tenantEventProposalsApi';

/**
 * Mock global fetch dengan routing per URL REST (VITE_API_URL kosong di test →
 * base '/api/v1'). Mengikuti pola mock exhibitionsApi.test.ts.
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
    id: 'tep-1',
    tenant_name: 'Kopi Kenangan',
    unit_number: 'GF-12',
    tenant_category: 'F&B',
    contact_name: 'Rani Putri',
    phone: '08123456789',
    email: 'rani@example.com',
    event_title: 'Workshop Latte Art',
    event_type: 'workshop',
    event_description: 'Kelas latte art 60 menit untuk 30 peserta.',
    proposed_start: '2026-11-05',
    proposed_end: '2026-11-06',
    preferred_area: 'Main Atrium',
    expected_visitors: '30 orang',
    needs: 'Meja, kursi, listrik',
    proposal_file_url: 'https://cdn.example.com/tenant-proposals/x.pdf',
    proposal_file_name: 'proposal.pdf',
    proposal_mime_type: 'application/pdf',
    proposal_file_size: 102400,
    status: 'pending',
    internal_notes: '',
    created_at: '2026-10-13T02:00:00Z',
    updated_at: '2026-10-13T02:00:00Z',
    ...overrides,
  };
}

const INPUT = {
  tenantName: 'Kopi Kenangan',
  unitNumber: 'GF-12',
  tenantCategory: 'F&B',
  contactName: 'Rani Putri',
  phone: '08123456789',
  email: 'rani@example.com',
  eventTitle: 'Workshop Latte Art',
  eventType: 'workshop' as const,
  eventDescription: 'Kelas latte art 60 menit untuk 30 peserta.',
  proposedStart: '2026-11-05',
  proposedEnd: '',
  preferredArea: 'Main Atrium',
  expectedVisitors: '30 orang',
  needs: 'Meja, kursi, listrik',
  proposalFileUrl: '',
  proposalFileName: '',
  proposalMimeType: '',
};

describe('tenantEventProposalsApi', () => {
  it('memetakan antrean admin snake_case → camelCase', async () => {
    mockFetchRoutes({
      '/api/v1/admin/listTenantEventProposals': {
        body: { success: true, data: [makeRow(), makeRow({ id: 'tep-2', status: 'approved', internal_notes: 'OK' })] },
      },
    });

    const rows = await fetchTenantEventProposals();

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      id: 'tep-1',
      tenantName: 'Kopi Kenangan',
      unitNumber: 'GF-12',
      eventTitle: 'Workshop Latte Art',
      eventType: 'workshop',
      proposedStart: '2026-11-05',
      proposalFileSize: 102400,
      status: 'pending',
      internalNotes: '',
    });
    expect(rows[1]?.status).toBe('approved');
    expect(rows[1]?.internalNotes).toBe('OK');
  });

  it('menormalkan kolom kosong dan status tak dikenal', async () => {
    mockFetchRoutes({
      '/api/v1/admin/listTenantEventProposals': {
        body: { success: true, data: [makeRow({ proposed_end: null, status: null, event_type: null, proposal_file_size: null })] },
      },
    });

    const [row] = await fetchTenantEventProposals();

    expect(row?.proposedEnd).toBe('');
    expect(row?.status).toBe('pending');
    expect(row?.eventType).toBe('other');
    expect(row?.proposalFileSize).toBe(0);
  });

  it('melempar ApiError saat daftar pengajuan gagal dimuat', async () => {
    mockFetchRoutes({
      '/api/v1/admin/listTenantEventProposals': { body: { success: false, error: 'Akses ditolak' } },
    });

    await expect(fetchTenantEventProposals()).rejects.toThrow(/Akses ditolak/);
  });

  it('mengirim submit publik apa adanya dan melempar pesan validasi server', async () => {
    mockFetchRoutes({
      '/api/v1/tenant-event-proposals': { status: 400, body: { success: false, error: 'Tanggal mulai tidak boleh di masa lalu' } },
    });

    await expect(submitTenantEventProposal(INPUT)).rejects.toThrow(/Tanggal mulai tidak boleh di masa lalu/);
  });

  it('menerima submit publik tanpa lampiran', async () => {
    mockFetchRoutes({
      '/api/v1/tenant-event-proposals': { status: 201, body: { success: true, id: 'tep-9' } },
    });

    await expect(submitTenantEventProposal(INPUT)).resolves.toBeUndefined();
  });

  it('presign lampiran lalu PUT berkas ke R2', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : String(input);
      if (url === '/api/v1/tenant-event-proposals/attachment') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, uploadUrl: 'https://r2.example.com/signed', publicUrl: 'https://cdn.example.com/tenant-proposals/new.pdf' }),
          text: async () => '',
        };
      }
      // PUT langsung ke R2 (bukan lewat apiPost).
      expect(init?.method).toBe('PUT');
      return { ok: true, status: 200, json: async () => ({}), text: async () => '' };
    });
    vi.stubGlobal('fetch', fetchMock);

    const file = new File(['x'], 'proposal.pdf', { type: 'application/pdf' });
    const upload = await uploadTenantProposalAttachment(file);

    expect(upload).toEqual({
      fileUrl: 'https://cdn.example.com/tenant-proposals/new.pdf',
      fileName: 'proposal.pdf',
      mimeType: 'application/pdf',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('melempar ApiError saat presign lampiran ditolak (tipe tidak diizinkan)', async () => {
    mockFetchRoutes({
      '/api/v1/tenant-event-proposals/attachment': { status: 400, body: { success: false, error: 'Lampiran harus PDF atau Word (DOC/DOCX).' } },
    });

    const file = new File(['x'], 'gambar.png', { type: 'image/png' });
    await expect(uploadTenantProposalAttachment(file)).rejects.toThrow(/PDF atau Word/);
  });

  it('melempar ApiError saat unggahan ke R2 gagal', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : String(input);
      if (url === '/api/v1/tenant-event-proposals/attachment') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, uploadUrl: 'https://r2.example.com/signed', publicUrl: 'https://cdn.example.com/x.pdf' }),
          text: async () => '',
        };
      }
      return { ok: false, status: 500, json: async () => ({}), text: async () => '' };
    }));

    const file = new File(['x'], 'proposal.pdf', { type: 'application/pdf' });
    await expect(uploadTenantProposalAttachment(file)).rejects.toThrow(/Gagal mengunggah lampiran/);
  });

  it('mengirim ubah status lewat adminAction dengan payload patch', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => ({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
      text: async () => '',
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(updateTenantEventProposal('tep-1', { status: 'approved', internalNotes: 'Disetujui' })).resolves.toBeUndefined();

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body).toEqual({ action: 'updateTenantEventProposal', id: 'tep-1', status: 'approved', internalNotes: 'Disetujui' });
  });

  it('meneruskan penolakan server saat ubah status', async () => {
    mockFetchRoutes({
      '/api/v1/admin/updateTenantEventProposal': { body: { success: false, error: 'Pengajuan tidak ditemukan' } },
    });

    await expect(updateTenantEventProposal('tep-x', { status: 'rejected' })).rejects.toThrow(/tidak ditemukan/);
  });

  it('menghapus pengajuan lewat adminAction', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => ({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
      text: async () => '',
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(deleteTenantEventProposal('tep-1')).resolves.toBeUndefined();

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body).toEqual({ action: 'deleteTenantEventProposal', id: 'tep-1' });
  });
});
