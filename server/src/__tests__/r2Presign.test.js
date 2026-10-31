/**
 * Regresi audit 2026-10-31: presign R2 dulu hanya menandatangani
 * `content-type`. Akibatnya siapa pun yang memegang URL presign (route
 * lampiran publik tanpa sesi!) bisa mengunggah objek jauh di atas batas 20MB
 * tanpa pernah submit — bucket jadi tempat sampah.
 *
 * Kontrak baru: `createPresignedUpload` menerima `maxBytes` + `contentLength`
 * (file.size dari klien). Ukuran yang dideklarasikan ikut DITANDATANGANI
 * (`signableHeaders: content-length`), jadi R2 menolak body dengan panjang
 * berbeda — dan nilai deklarasi wajib ≤ batas route pemanggil.
 *
 * Catatan: presigned PUT tidak punya rentang ukuran (itu fitur POST policy),
 * jadi yang ditandatangani adalah ukuran deklarasi yang tervalidasi, bukan
 * angka batasnya.
 *
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({ putInputs: [], signedOptions: [] }));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class { async send() { return {}; } },
  PutObjectCommand: class {
    constructor(input) {
      this.input = input;
      sdk.putInputs.push(input);
    }
  },
  DeleteObjectCommand: class {},
  HeadObjectCommand: class {},
  GetObjectCommand: class {},
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(async (_client, _command, options) => {
    sdk.signedOptions.push(options);
    return 'https://signed.example/put';
  }),
}));

process.env.R2_ACCOUNT_ID = 'acc';
process.env.R2_ACCESS_KEY_ID = 'key';
process.env.R2_SECRET_ACCESS_KEY = 'secret';
process.env.R2_PUBLIC_URL = 'https://cdn.example';

const { createPresignedUpload } = await import('../r2.js');

const MAX = 20 * 1024 * 1024;

beforeEach(() => {
  sdk.putInputs.length = 0;
  sdk.signedOptions.length = 0;
});

describe('createPresignedUpload — batas ukuran ikut ditandatangani', () => {
  it('menandatangani content-length saat ukuran dideklarasikan', async () => {
    const result = await createPresignedUpload({
      folder: 'tenant-proposals/',
      originalName: 'proposal.pdf',
      contentType: 'application/pdf',
      maxBytes: MAX,
      contentLength: 1024,
    });

    expect(result.ok).toBe(true);
    expect(result.signedContentLength).toBe(1024);
    expect(sdk.putInputs[0].ContentLength).toBe(1024);
    const headers = sdk.signedOptions[0].signableHeaders;
    expect(headers.has('content-length')).toBe(true);
    expect(headers.has('content-type')).toBe(true);
  });

  it('menolak ukuran di atas batas route tanpa memanggil penandatangan', async () => {
    const result = await createPresignedUpload({
      folder: 'tenant-proposals/',
      originalName: 'besar.pdf',
      contentType: 'application/pdf',
      maxBytes: MAX,
      contentLength: MAX + 1,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain('melebihi batas 20 MB');
    expect(sdk.signedOptions).toHaveLength(0);
  });

  it.each([0, -5, 'abc', 1.5])('menolak ukuran tidak valid (%s)', async (contentLength) => {
    const result = await createPresignedUpload({
      folder: 'registrations/',
      originalName: 'x.pdf',
      contentType: 'application/pdf',
      maxBytes: MAX,
      contentLength,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain('Ukuran file tidak valid');
    expect(sdk.putInputs).toHaveLength(0);
  });

  it('tanpa deklarasi ukuran tetap presign (kompatibel klien lama)', async () => {
    const result = await createPresignedUpload({
      folder: 'gallery/',
      originalName: 'foto.png',
      contentType: 'image/png',
      maxBytes: MAX,
    });

    expect(result.ok).toBe(true);
    expect(result.signedContentLength).toBeNull();
    expect(sdk.putInputs[0].ContentLength).toBeUndefined();
    expect(sdk.signedOptions[0].signableHeaders.has('content-length')).toBe(false);
    expect(sdk.signedOptions[0].signableHeaders.has('content-type')).toBe(true);
  });
});
