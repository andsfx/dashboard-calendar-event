import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Regresi allowlist lampiran pengajuan tenant.
 *
 * `server/` adalah ESM JavaScript: tidak dicek `tsc` dan tidak ada tes yang
 * mengimpor `tenantProposals.js`, jadi allowlist yang salah hanya meledak saat
 * endpoint publik dipanggil di produksi. Dua hal yang dikunci di sini:
 *
 * 1. `ALLOWED_ATTACHMENT_MIME` menerima dokumen DAN gambar (PNG/JPEG) dan tetap
 *    menolak tipe di luarnya. Kalau entri `image/*` hilang, tenant tidak bisa
 *    mengunggah materi gambar; kalau allowlist melebar tak sengaja, presign
 *    publik berubah jadi celah unggah.
 * 2. `ContentType` ikut ditandatangani. Tanpa `signableHeaders` di
 *    `createPresignedUpload`, header `Content-Type` ada di luar signature
 *    sehingga pengunggah bisa menyimpan body HTML di folder kita. Tes ini
 *    membaca `X-Amz-SignedHeaders` dari URL presign yang benar-benar dihasilkan.
 */
vi.mock('../../db.js', () => ({ db: { query: vi.fn() } }));

vi.mock('../../lib/rateLimit.js', () => ({
  clientIp: () => '127.0.0.1',
  enforceRateLimit: () => true,
}));

const ATTACHMENT_PATH = '/tenant-event-proposals/attachment';
const REJECTION = 'Lampiran harus PDF, Word (DOC/DOCX), PNG, atau JPEG.';

/**
 * Dispatch request ke router Express dan kembalikan { status, body }.
 * Seluruh chain `layer.route.stack` dijalankan berurutan, bukan hanya layer
 * pertama, supaya handler async-nya benar-benar dieksekusi.
 */
async function presign(contentType, originalName = 'materi.png') {
  const { default: router } = await import('../tenantProposals.js');
  const req = {
    method: 'POST',
    url: ATTACHMENT_PATH,
    body: { contentType, originalName },
    headers: {},
    ip: '127.0.0.1',
    socket: {},
    params: {},
    query: {},
  };
  let settle;
  const finished = new Promise((resolve, reject) => { settle = { resolve, reject }; });
  const res = {
    statusCode: 200,
    _body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this._body = payload; settle.resolve(); return this; },
    setHeader() {},
    getHeader() {},
  };
  const layer = router.stack.find(
    (l) => l.route && l.route.path === ATTACHMENT_PATH && l.route.methods.post,
  );
  if (!layer) throw new Error(`route not found: POST ${ATTACHMENT_PATH}`);

  const chain = layer.route.stack.map((s) => s.handle);
  const step = (err) => {
    if (err) return settle.reject(err);
    const handle = chain.shift();
    if (!handle) return settle.reject(new Error('handler selesai tanpa respons'));
    handle(req, res, step);
  };
  step();
  await finished;
  return { status: res.statusCode, body: res._body };
}

/** URL presign membawa `X-Amz-SignedHeaders`; di situlah pin tipe terlihat. */
function signedHeaders(uploadUrl) {
  return new URL(uploadUrl).searchParams.get('X-Amz-SignedHeaders') || '';
}

beforeEach(() => {
  // r2Ready dibaca saat modul di-import, jadi env harus terisi lebih dulu.
  process.env.R2_ACCOUNT_ID = 'acctexample';
  process.env.R2_ACCESS_KEY_ID = 'AKIAEXAMPLE';
  process.env.R2_SECRET_ACCESS_KEY = 'secretexample';
  process.env.R2_PUBLIC_URL = 'https://media.example.com';
});

describe('POST /tenant-event-proposals/attachment — allowlist lampiran', () => {
  it('menerima gambar PNG dan menaruhnya di folder tenant-proposals/', async () => {
    const { status, body } = await presign('image/png', 'materi-promo.png');

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.fileName.startsWith('tenant-proposals/')).toBe(true);
    expect(body.fileName.endsWith('.png')).toBe(true);
  });

  it('menerima gambar JPEG dan menyimpan ekstensi .jpg', async () => {
    const { status, body } = await presign('image/jpeg', 'foto-kegiatan.jpg');

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.fileName.startsWith('tenant-proposals/')).toBe(true);
    expect(body.fileName.endsWith('.jpg')).toBe(true);
  });

  it('tetap menerima dokumen PDF seperti sebelumnya', async () => {
    const { status, body } = await presign('application/pdf', 'proposal.pdf');

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.fileName.endsWith('.pdf')).toBe(true);
  });

  it('menolak tipe di luar allowlist dengan pesan yang menyebut format yang diterima', async () => {
    for (const contentType of ['image/gif', 'text/html', 'image/svg+xml']) {
      const { status, body } = await presign(contentType);

      expect(status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.error).toBe(REJECTION);
    }
  });

  it('menormalkan content type yang membawa parameter', async () => {
    const { status } = await presign('image/png; charset=binary');

    expect(status).toBe(200);
  });
});

describe('POST /tenant-event-proposals/attachment — ContentType dipatok', () => {
  it('menandatangani content-type pada URL presign gambar', async () => {
    const { body } = await presign('image/png', 'materi.png');

    expect(signedHeaders(body.uploadUrl)).toBe('content-type;host');
  });

  it('menandatangani content-type juga untuk dokumen (jalur lama ikut dikeraskan)', async () => {
    const { body } = await presign('application/pdf', 'proposal.pdf');

    expect(signedHeaders(body.uploadUrl).split(';')).toContain('content-type');
  });

  it('menolak tipe HTML sehingga tidak ada URL presign untuk body HTML', async () => {
    const { status, body } = await presign('text/html', 'evil.png');

    expect(status).toBe(400);
    expect(body.uploadUrl).toBeUndefined();
  });
});
