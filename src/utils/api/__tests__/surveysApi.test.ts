import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet, apiPost, ApiError } from '../../../lib/rest';

vi.mock('../../../lib/rest', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/rest')>();
  return {
    ...actual,
    apiGet: vi.fn(),
    apiPost: vi.fn(),
  };
});

// Import setelah mock agar binding-nya memakai versi mock.
import {
  fetchActiveTenants,
  fetchGeneratedLetters,
  fetchTenantDetail,
  fetchTenantRoster,
  submitCommunityRegistration,
  uploadRegistrationAttachment,
} from '../surveysApi';

const post = vi.mocked(apiPost);
const get = vi.mocked(apiGet);

describe('surveysApi — registrasi komunitas', () => {
  beforeEach(() => {
    post.mockReset();
    get.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uploadRegistrationAttachment memakai endpoint publik lalu PUT file dengan Content-Type', async () => {
    post.mockResolvedValueOnce({
      success: true,
      uploadUrl: 'https://r2.example.com/presigned',
      publicUrl: 'https://cdn.example.com/registrations/proposal.pdf',
      fileName: 'proposal.pdf',
    });
    const put = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', put);

    const file = new File(['%PDF-1.4'], 'proposal.pdf', { type: 'application/pdf' });
    const result = await uploadRegistrationAttachment(file);

    expect(post).toHaveBeenCalledWith('/registrations/attachment', {
      originalName: 'proposal.pdf',
      contentType: 'application/pdf',
      proposalMimeType: 'application/pdf',
    });
    expect(put).toHaveBeenCalledWith('https://r2.example.com/presigned', expect.objectContaining({
      method: 'PUT',
      headers: { 'Content-Type': 'application/pdf' },
      body: file,
    }));
    expect(result).toEqual({
      fileUrl: 'https://cdn.example.com/registrations/proposal.pdf',
      fileName: 'proposal.pdf',
      fileSize: file.size,
      mimeType: 'application/pdf',
    });
  });

  it('uploadRegistrationAttachment melempar pesan Indonesia saat PUT gagal', async () => {
    post.mockResolvedValueOnce({
      success: true,
      uploadUrl: 'https://r2.example.com/presigned',
      publicUrl: 'https://cdn.example.com/registrations/proposal.pdf',
    });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));

    const file = new File(['x'], 'proposal.pdf', { type: 'application/pdf' });
    await expect(uploadRegistrationAttachment(file)).rejects.toThrow(/Gagal mengunggah berkas/);
  });

  it('submitCommunityRegistration mengirim proposal_mime_type opsional', async () => {
    post.mockResolvedValueOnce({ success: true, id: 'reg-1' });

    await submitCommunityRegistration({
      communityName: 'Kopi Komunitas',
      communityType: 'komunitas',
      pic: 'Ani',
      phone: '0812',
      proposalFileUrl: 'https://cdn.example.com/p.pdf',
      proposalFileName: 'p.pdf',
      proposalFileSize: 10,
      proposalMimeType: 'application/pdf',
    });

    const [, payload] = post.mock.calls[0] as unknown as [string, Record<string, unknown>];
    expect(payload.proposal_mime_type).toBe('application/pdf');
    expect(payload.proposal_file_name).toBe('p.pdf');
  });

  it('submitCommunityRegistration tetap kompatibel tanpa file (mime kosong)', async () => {
    post.mockResolvedValueOnce({ success: true, id: 'reg-2' });

    await submitCommunityRegistration({
      communityName: 'Tanpa Berkas',
      communityType: 'komunitas',
      pic: 'Budi',
      phone: '0813',
    });

    const [, payload] = post.mock.calls[0] as unknown as [string, Record<string, unknown>];
    expect(payload.proposal_mime_type).toBe('');
    expect(payload.proposal_file_url).toBe('');
  });
});

describe('surveysApi — error tidak lagi ditelan', () => {
  beforeEach(() => {
    post.mockReset();
    get.mockReset();
  });

  it('fetchGeneratedLetters melempar saat success=false', async () => {
    post.mockResolvedValueOnce({ success: false, error: 'Surat tidak tersedia' });

    await expect(fetchGeneratedLetters()).rejects.toThrow('Surat tidak tersedia');
  });

  it('fetchGeneratedLetters meneruskan error jaringan', async () => {
    post.mockRejectedValueOnce(new ApiError('Tidak dapat terhubung ke server'));

    await expect(fetchGeneratedLetters()).rejects.toThrow('Tidak dapat terhubung ke server');
  });

  it('fetchTenantDetail hanya null untuk 404', async () => {
    get.mockRejectedValueOnce(new ApiError('Tidak ditemukan', '404'));
    await expect(fetchTenantDetail('t1')).resolves.toBeNull();

    get.mockRejectedValueOnce(new ApiError('Terlalu banyak permintaan', '429'));
    await expect(fetchTenantDetail('t1')).rejects.toThrow('Terlalu banyak permintaan');
  });

  it('fetchTenantDetail mengembalikan {id,name} tanpa PIC', async () => {
    get.mockResolvedValueOnce({ id: 't1', name: 'Kopi A' });

    const detail = await fetchTenantDetail('t1');
    expect(detail).toEqual({ id: 't1', name: 'Kopi A' });
    expect(detail && 'pic' in detail).toBe(false);
  });

  it('fetchActiveTenants meneruskan error (bukan array kosong)', async () => {
    get.mockRejectedValueOnce(new ApiError('Gagal memuat', '500'));

    await expect(fetchActiveTenants('kopi')).rejects.toThrow('Gagal memuat');
  });

  it('fetchTenantRoster meneruskan error (bukan array kosong)', async () => {
    get.mockRejectedValueOnce(new ApiError('Gagal memuat roster', '500'));

    await expect(fetchTenantRoster()).rejects.toThrow('Gagal memuat roster');
  });
});
