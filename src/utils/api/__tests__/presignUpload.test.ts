/**
 * Kontrak presign upload: klien WAJIB mengirim `size` (file.size).
 *
 * Regresi yang dijaga:
 * - `server/src/r2.js` menandatangani `content-length` hanya bila `size`
 *   dikirim; tanpa field ini batas 20 MB tidak berlaku saat upload.
 *   Field yang dibaca server: `body.size` di `/r2/presign` (r2.js),
 *   `/registrations/attachment` (extra.js), `/tenant-event-proposals/attachment`
 *   (tenantProposals.js) — semuanya `maxBytes = MAX_PROPOSAL_BYTES` (20 MB).
 * - Penolakan 400 ("Ukuran file melebihi batas …") harus sampai ke pengguna
 *   apa adanya, dengan `code` utuh — bukan diganti "Gagal menyiapkan upload".
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../lib/rest';
import { uploadToR2 } from '../albumsApi';
import { uploadRegistrationAttachment } from '../surveysApi';
import { uploadTenantProposalAttachment } from '../tenantEventProposalsApi';

interface MockResponse {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}

function jsonResponse(body: unknown, status = 200): MockResponse {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

const fetchMock = vi.fn();

function jsonBodyOf(callIndex: number): Record<string, unknown> {
  const raw: unknown = fetchMock.mock.calls[callIndex]?.[1]?.body;
  if (typeof raw !== 'string') throw new Error('body request bukan JSON string');
  return JSON.parse(raw) as Record<string, unknown>;
}

const PRESIGN_OK = {
  success: true,
  uploadUrl: 'https://r2.example.com/presigned-put',
  publicUrl: 'https://cdn.example.com/uploads/file.png',
  fileName: 'uploads/file.png',
};

describe('presign upload mengirim ukuran file', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uploadToR2 → POST /r2/presign membawa size = file.size', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(PRESIGN_OK))
      .mockResolvedValueOnce(jsonResponse({}, 200));

    const file = new File(['abcdef'], 'poster.png', { type: 'image/png' });
    await uploadToR2(file);

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/r2/presign');
    expect(jsonBodyOf(0)).toMatchObject({
      folder: 'gallery/',
      originalName: 'poster.png',
      contentType: 'image/png',
      size: 6,
    });
  });

  it('uploadRegistrationAttachment → POST /registrations/attachment membawa size', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ ...PRESIGN_OK, fileName: 'registrations/proposal.pdf' }))
      .mockResolvedValueOnce(jsonResponse({}, 200));

    const file = new File(['%PDF-1.4'], 'proposal.pdf', { type: 'application/pdf' });
    await uploadRegistrationAttachment(file);

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/registrations/attachment');
    expect(jsonBodyOf(0)).toMatchObject({
      originalName: 'proposal.pdf',
      contentType: 'application/pdf',
      size: 8,
    });
  });

  it('uploadTenantProposalAttachment → POST /tenant-event-proposals/attachment membawa size', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ ...PRESIGN_OK, fileName: 'tenant-proposals/proposal.pdf' }))
      .mockResolvedValueOnce(jsonResponse({}, 200));

    const file = new File(['%PDF'], 'proposal.pdf', { type: 'application/pdf' });
    await uploadTenantProposalAttachment(file);

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/tenant-event-proposals/attachment');
    expect(jsonBodyOf(0)).toMatchObject({
      originalName: 'proposal.pdf',
      contentType: 'application/pdf',
      size: 4,
    });
  });
});

describe('presign upload — penolakan batas ukuran diteruskan apa adanya', () => {
  const limitMessage = 'Ukuran file melebihi batas 20 MB.';

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue(
      jsonResponse({ success: false, error: limitMessage }, 400),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uploadToR2 memunculkan pesan batas ukuran + code 400, bukan pesan generik', async () => {
    const file = new File(['x'], 'poster.png', { type: 'image/png' });

    const err = await uploadToR2(file).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    if (!(err instanceof ApiError)) throw new Error('harus ApiError');
    expect(err.message).toBe(limitMessage);
    expect(err.code).toBe('400');
  });

  it('uploadRegistrationAttachment memunculkan pesan batas ukuran + code 400', async () => {
    const file = new File(['x'], 'proposal.pdf', { type: 'application/pdf' });

    const err = await uploadRegistrationAttachment(file).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    if (!(err instanceof ApiError)) throw new Error('harus ApiError');
    expect(err.message).toBe(limitMessage);
    expect(err.code).toBe('400');
  });

  it('uploadTenantProposalAttachment memunculkan pesan batas ukuran + code 400', async () => {
    const file = new File(['x'], 'proposal.pdf', { type: 'application/pdf' });

    const err = await uploadTenantProposalAttachment(file).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    if (!(err instanceof ApiError)) throw new Error('harus ApiError');
    expect(err.message).toBe(limitMessage);
    expect(err.code).toBe('400');
  });
});
