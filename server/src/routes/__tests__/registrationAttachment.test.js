/**
 * Lampiran pendaftaran komunitas — presign publik terbatas + verifikasi saat submit.
 *
 * Sebelum perbaikan tidak ada jalur unggah untuk lampiran pendaftaran, dan
 * `proposal_file_url` diterima apa adanya: siapa pun bisa menempelkan URL objek
 * sembarang (termasuk aset situs lain di bucket) tanpa batas ukuran/tipe.
 *
 * Kontrak yang dikunci:
 *   - presign hanya untuk PDF/DOC/DOCX/PNG/JPEG, folder dipaku `registrations/`
 *   - submit: objek harus di folder kita, ≤20MB, dan isi cocok tipe (magic bytes)
 *   - verifikasi gagal → 400 + objek dibuang; objek folder LAIN tidak dihapus
 *   - submit tanpa lampiran tetap 200 (backward compatible)
 *
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbState = { rows: [{ id: 'crg_1' }], queries: [] };
const r2State = {
  head: { ok: true, contentLength: 1024 },
  magic: { ok: true },
  create: { ok: true },
};

vi.mock('../../db.js', () => ({
  db: {
    query: vi.fn(async (sql, params) => {
      dbState.queries.push({ sql, params: params || [] });
      return { rows: dbState.rows, rowCount: dbState.rows.length };
    }),
  },
}));

vi.mock('../../auth.js', () => ({
  requireRole: () => (_req, _res, next) => next(),
  logActivity: async () => {},
  STAFF_ROLES: ['superadmin', 'admin'],
  DEMO_ROLE: 'demo',
  DEMO_READ_ROLES: ['superadmin', 'admin', 'demo'],
  maskEmail: (v) => v,
}));

vi.mock('../../r2.js', () => ({
  R2_PUBLIC_URL: 'https://cdn.test',
  MAX_PROPOSAL_BYTES: 20 * 1024 * 1024,
  r2Ready: true,
  createPresignedUpload: vi.fn(async ({ folder, contentType }) => (
    r2State.create.ok
      ? { ok: true, uploadUrl: 'https://upload.test', publicUrl: `https://cdn.test/${folder}file.pdf`, key: `${folder}file.pdf`, contentType }
      : r2State.create
  )),
  headR2File: vi.fn(async () => r2State.head),
  verifyMimeMagicBytes: vi.fn(async () => r2State.magic),
  deleteR2File: vi.fn(async () => {}),
}));

async function call(path, body) {
  const { default: router } = await import('../extra.js');
  const layer = router.stack.find(
    (l) => l.route && l.route.path === path && l.route.methods.post,
  );
  if (!layer) throw new Error(`route POST ${path} tidak ditemukan`);

  const req = {
    method: 'POST',
    url: path,
    body,
    headers: { 'user-agent': 'vitest' },
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
    cookie() { return this; },
    clearCookie() { return this; },
    setHeader() { return this; },
    getHeader() { return undefined; },
  };

  const chain = layer.route.stack.map((s) => s.handle);
  let i = 0;
  const step = (err) => {
    if (err) return settle.reject(err);
    const fn = chain[i++];
    if (!fn) return settle.resolve();
    const out = fn(req, res, step);
    if (out && typeof out.then === 'function') out.then(() => {}, settle.reject);
  };
  step();
  await finished;
  return { status: res.statusCode, body: res._body };
}

const VALID_REGISTRATION = {
  organization_type: 'community',
  organization_name: 'Komunitas Test',
  pic: 'Budi Santoso',
  phone: '081234567890',
  email: 'budi@example.com',
  instagram: '@budi',
};

const IN_FOLDER_URL = 'https://cdn.test/registrations/proposal.pdf';
const OTHER_FOLDER_URL = 'https://cdn.test/events/poster.pdf';

beforeEach(() => {
  vi.clearAllMocks();
  dbState.queries = [];
  dbState.rows = [{ id: 'crg_1' }];
  r2State.head = { ok: true, contentLength: 1024 };
  r2State.magic = { ok: true };
  r2State.create = { ok: true };
});

describe('POST /registrations/attachment — presign publik terbatas', () => {
  it('memberi presign untuk PDF dengan folder registrations/', async () => {
    const { createPresignedUpload } = await import('../../r2.js');
    const { status, body } = await call('/registrations/attachment', {
      contentType: 'application/pdf',
      originalName: 'proposal.pdf',
    });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.uploadUrl).toBe('https://upload.test');
    expect(body.fileName).toContain('registrations/');
    expect(createPresignedUpload).toHaveBeenCalledWith(
      expect.objectContaining({ folder: 'registrations/', contentType: 'application/pdf' }),
    );
  });

  it('menolak tipe di luar allowlist', async () => {
    const { status } = await call('/registrations/attachment', {
      contentType: 'text/html',
      originalName: 'x.html',
    });
    expect(status).toBe(400);
  });
});

describe('POST /registrations — verifikasi lampiran', () => {
  it('menerima lampiran valid dan menyimpan ukuran hasil HEAD', async () => {
    r2State.head = { ok: true, contentLength: 4096 };
    const { status } = await call('/registrations', {
      ...VALID_REGISTRATION,
      proposal_file_url: IN_FOLDER_URL,
      proposal_file_name: 'proposal.pdf',
      proposal_mime_type: 'application/pdf',
      proposal_file_size: 999,
    });

    expect(status).toBe(200);
    const insert = dbState.queries.find((q) => q.sql.includes('INSERT INTO community_registrations'));
    expect(insert).toBeTruthy();
    // Ukuran otoritatif = ContentLength HEAD, bukan angka kiriman klien.
    expect(insert.params).toContain(4096);
    expect(insert.params).not.toContain(999);
  });

  it('memakai proposal_mime_type, bukan ekstensi, untuk verifikasi', async () => {
    const { verifyMimeMagicBytes } = await import('../../r2.js');
    await call('/registrations', {
      ...VALID_REGISTRATION,
      proposal_file_url: IN_FOLDER_URL,
      proposal_file_name: 'dokumen.bin',
      proposal_mime_type: 'application/pdf',
    });
    expect(verifyMimeMagicBytes).toHaveBeenCalledWith(IN_FOLDER_URL, 'application/pdf');
  });

  it('fallback ke ekstensi nama file bila mime tidak dikirim', async () => {
    const { verifyMimeMagicBytes } = await import('../../r2.js');
    await call('/registrations', {
      ...VALID_REGISTRATION,
      proposal_file_url: IN_FOLDER_URL,
      proposal_file_name: 'proposal.pdf',
    });
    expect(verifyMimeMagicBytes).toHaveBeenCalledWith(IN_FOLDER_URL, 'application/pdf');
  });

  it('menolak lampiran >20MB dan membuang objeknya', async () => {
    const { deleteR2File } = await import('../../r2.js');
    r2State.head = { ok: true, contentLength: 21 * 1024 * 1024 };

    const { status, body } = await call('/registrations', {
      ...VALID_REGISTRATION,
      proposal_file_url: IN_FOLDER_URL,
      proposal_file_name: 'proposal.pdf',
      proposal_mime_type: 'application/pdf',
    });

    expect(status).toBe(400);
    expect(body.error).toMatch(/20MB/);
    expect(deleteR2File).toHaveBeenCalledWith(IN_FOLDER_URL);
    expect(dbState.queries.some((q) => q.sql.includes('INSERT INTO community_registrations'))).toBe(false);
  });

  it('menolak isi yang tidak cocok tipe (magic bytes) dan membuang objeknya', async () => {
    const { deleteR2File } = await import('../../r2.js');
    r2State.magic = { ok: false, error: 'Isi file tidak sesuai dengan tipe yang dipilih.' };

    const { status } = await call('/registrations', {
      ...VALID_REGISTRATION,
      proposal_file_url: IN_FOLDER_URL,
      proposal_file_name: 'proposal.pdf',
      proposal_mime_type: 'application/pdf',
    });

    expect(status).toBe(400);
    expect(deleteR2File).toHaveBeenCalledWith(IN_FOLDER_URL);
  });

  it('menolak URL di luar folder registrations/ TANPA menghapus objeknya', async () => {
    const { deleteR2File } = await import('../../r2.js');
    const { status } = await call('/registrations', {
      ...VALID_REGISTRATION,
      proposal_file_url: OTHER_FOLDER_URL,
      proposal_file_name: 'poster.pdf',
      proposal_mime_type: 'application/pdf',
    });

    expect(status).toBe(400);
    expect(deleteR2File).not.toHaveBeenCalled();
  });

  it('menolak lampiran tanpa tipe yang bisa ditentukan', async () => {
    const { status } = await call('/registrations', {
      ...VALID_REGISTRATION,
      proposal_file_url: IN_FOLDER_URL,
      proposal_file_name: 'proposal.bin',
    });
    expect(status).toBe(400);
  });

  it('tetap menerima pendaftaran tanpa lampiran', async () => {
    const { headR2File, verifyMimeMagicBytes } = await import('../../r2.js');
    const { status, body } = await call('/registrations', { ...VALID_REGISTRATION });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(headR2File).not.toHaveBeenCalled();
    expect(verifyMimeMagicBytes).not.toHaveBeenCalled();
  });
});
