/**
 * Role `demo` adalah read-only TAPI tetap menerima PII mentah dari dua aksi
 * baca (temuan audit 2026-10-04): `listSponsorLeads` (`sl.*` → contact_name,
 * phone, email) dan `readRegistrations` (`SELECT *` → pic, phone, email).
 *
 * Kontrak yang dikunci di sini:
 *   - demo  → nama/telepon/email DISAMARKAN (struktur terlihat, identitas tidak)
 *   - admin/superadmin → data UTUH (mereka memang berhak mengelola lead)
 *
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbState = { rows: [], sql: '', params: [], queries: [] };

vi.mock('../../db.js', () => ({
  db: {
    query: vi.fn(async (sql, params) => {
      dbState.sql = sql;
      dbState.params = params || [];
      dbState.queries.push({ sql, params: params || [] });
      return { rows: dbState.rows, rowCount: dbState.rows.length };
    }),
  },
}));

const ROLE = { current: 'demo' };

vi.mock('../../auth.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    requireRole: () => (_req, _res, next) => next(),
  };
});

/** Dispatch ke chain route Express; `role` menentukan req.auth.user.role. */
async function callAction(action, body = {}) {
  const { default: router } = await import('../admin.js');
  const req = {
    method: 'POST',
    url: `/${action}`,
    body: { action, ...body },
    headers: {},
    ip: '127.0.0.1',
    socket: {},
    params: { action },
    query: {},
    auth: { user: { id: 'u1', email: 'demo@example.com', role: ROLE.current } },
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
  const layer = router.stack.find(
    l => l.route && l.route.path === '/:action' && l.route.methods.post,
  );
  if (!layer) throw new Error('route /:action tidak ditemukan');
  const chain = layer.route.stack.map(s => s.handle);
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

const SPONSOR_ROW = {
  id: 'sld_1', company_name: 'PT Contoh', contact_name: 'Budi Santoso',
  phone: '081234567890', email: 'budi@example.com', message: 'halo', status: 'pending',
};
const REG_ROW = {
  id: 'crg_1', community_name: 'Komunitas X', pic: 'Sindi Lestari',
  phone: '081298765432', email: 'sindi@example.com', status: 'pending',
};
describe('demo PII masking pada aksi baca admin', () => {
  beforeEach(() => { ROLE.current = 'demo'; });

  it('listSponsorLeads menyamarkan contact_name/phone/email untuk demo', async () => {
    dbState.rows = [{ ...SPONSOR_ROW }];
    const { status, body } = await callAction('listSponsorLeads');

    expect(status).toBe(200);
    const row = body.data[0];
    expect(row.contact_name).not.toBe('Budi Santoso');
    expect(row.phone).not.toBe('081234567890');
    expect(row.email).not.toBe('budi@example.com');
    // Struktur tetap terbaca.
    expect(row.company_name).toBe('PT Contoh');
    expect(row.status).toBe('pending');
    // Bentuk samaran: domain email tetap, digit terakhir telepon tetap.
    expect(row.email).toContain('@example.com');
    expect(row.phone).toMatch(/7890$/);
  });

  it('readRegistrations menyamarkan pic/phone/email untuk demo', async () => {
    dbState.rows = [{ ...REG_ROW }];
    const { status, body } = await callAction('readRegistrations');

    expect(status).toBe(200);
    const row = body.data[0];
    expect(row.pic).not.toBe('Sindi Lestari');
    expect(row.phone).not.toBe('081298765432');
    expect(row.email).not.toBe('sindi@example.com');
    expect(row.community_name).toBe('Komunitas X');
  });

  it('admin tetap menerima data UTUH', async () => {
    ROLE.current = 'admin';
    dbState.rows = [{ ...SPONSOR_ROW }];
    const { body } = await callAction('listSponsorLeads');
    expect(body.data[0].contact_name).toBe('Budi Santoso');
    expect(body.data[0].phone).toBe('081234567890');
    expect(body.data[0].email).toBe('budi@example.com');
  });

  it('superadmin tetap menerima data UTUH pada readRegistrations', async () => {
    ROLE.current = 'superadmin';
    dbState.rows = [{ ...REG_ROW }];
    const { body } = await callAction('readRegistrations');
    expect(body.data[0].pic).toBe('Sindi Lestari');
    expect(body.data[0].phone).toBe('081298765432');
  });

  it('readDrafts menyamarkan pic/phone untuk demo', async () => {
    ROLE.current = 'demo';
    dbState.rows = [{ id: 'drf_1', acara: 'Bazar', pic: 'Sindi Lestari', phone: '081298765432', progress: 'draft' }];
    const { status, body } = await callAction('readDrafts');

    expect(status).toBe(200);
    expect(body.data[0].acara).toBe('Bazar');
    expect(body.data[0].pic).toBe('S***i L***i');
    expect(body.data[0].phone).toBe('********5432');
  });

  it('listLetters menghapus pdf_base64 dan menyamarkan PII surat untuk demo', async () => {
    ROLE.current = 'demo';
    // Bentuk NYATA `LetterRequestItem` di klien: field datar, bukan blok PIC.
    // Kunci inilah yang harus dikenali maskPiiDeep — varian camelCase dipertahankan
    // supaya regresi penamaan (`nama_eo` vs `namaEO`) langsung tertangkap.
    dbState.rows = [{
      id: 'ltr_1',
      pdf_base64: 'JVBERi0xLjQK',
      letter_data: {
        nomor: '001/A/B/2026',
        namaEO: 'PT Kreatif Nusantara',
        penanggungJawab: 'Budi Santoso',
        nomorTelepon: '081234567890',
        alamatEO: 'Jl. Sudirman No. 1',
        items: [{ nama_gerai: 'Cabang A' }],
      },
    }];
    const { body } = await callAction('listLetters');

    const row = body.data[0];
    expect(row.pdf_base64).toBeNull();
    // Bukan PII → utuh.
    expect(row.letter_data.nomor).toBe('001/A/B/2026');
    // PII → tersamar.
    expect(row.letter_data.namaEO).toBe('P***T K***f N***a');
    expect(row.letter_data.penanggungJawab).toBe('B***i S***o');
    expect(row.letter_data.nomorTelepon).toBe('********7890');
    expect(row.letter_data.alamatEO).toBe('***');
    expect(row.letter_data.items[0].nama_gerai).toBe('C***g A');
  });

  it('listLetters menyamarkan varian snake_case dan alamat biasa', async () => {
    ROLE.current = 'demo';
    dbState.rows = [{
      id: 'ltr_2',
      pdf_base64: 'JVBERi0xLjQK',
      letter_data: {
        nama_eo: 'PT Kreatif',
        penanggung_jawab: 'Siti Aminah',
        nomor_telepon: '081298765432',
        alamat: 'Jl. Gatot Subroto 5',
      },
    }];
    const { body } = await callAction('listLetters');

    const row = body.data[0];
    expect(row.letter_data.nama_eo).toBe('P***T K***f');
    expect(row.letter_data.penanggung_jawab).toBe('S***i A***h');
    expect(row.letter_data.nomor_telepon).toBe('********5432');
    expect(row.letter_data.alamat).toBe('***');
  });

  it('listLetters admin tetap menerima letter_data dan pdf UTUH', async () => {
    ROLE.current = 'admin';
    dbState.rows = [{
      id: 'ltr_1',
      pdf_base64: 'JVBERi0xLjQK',
      letter_data: { namaEO: 'PT Kreatif Nusantara', penanggungJawab: 'Budi Santoso', alamatEO: 'Jl. Sudirman No. 1' },
    }];
    const { body } = await callAction('listLetters');

    expect(body.data[0].pdf_base64).toBe('JVBERi0xLjQK');
    expect(body.data[0].letter_data.namaEO).toBe('PT Kreatif Nusantara');
    expect(body.data[0].letter_data.penanggungJawab).toBe('Budi Santoso');
    expect(body.data[0].letter_data.alamatEO).toBe('Jl. Sudirman No. 1');
  });

  it('listExhibitions menyamarkan leasing_pic/marcomm_pic untuk demo', async () => {
    ROLE.current = 'demo';
    dbState.rows = [{
      id: 'exh_1', title: 'Pameran Kopi', leasing_pic: 'Budi Santoso',
      marcomm_pic: 'Siti Aminah', activation_count: 2,
    }];
    const { body } = await callAction('listExhibitions');

    expect(body.data[0].title).toBe('Pameran Kopi');
    expect(body.data[0].activation_count).toBe(2);
    expect(body.data[0].leasing_pic).toBe('B***i S***o');
    expect(body.data[0].marcomm_pic).toBe('S***i A***h');
  });

  it('listExhibitionLeads menyamarkan contact_name/phone/email untuk demo', async () => {
    ROLE.current = 'demo';
    dbState.rows = [{
      id: 'lead_1', company_name: 'PT Kopi', contact_name: 'Budi Santoso',
      phone: '081234567890', email: 'budi@example.com', status: 'pending',
    }];
    const { body } = await callAction('listExhibitionLeads');

    expect(body.data[0].company_name).toBe('PT Kopi');
    expect(body.data[0].contact_name).toBe('B***i S***o');
    expect(body.data[0].phone).toBe('********7890');
    expect(body.data[0].email).toBe('b***i@example.com');
  });
});

describe('createLetter — atribusi dari sesi, bukan body', () => {
  it('mengabaikan createdBy kiriman klien', async () => {
    ROLE.current = 'admin';
    dbState.rows = [{ id: 'ltr_1' }];
    dbState.queries = [];
    const { status } = await callAction('createLetter', {
      createdBy: 'u_penyerang',
      eventId: 'evt_1',
      letterData: { nomor: '001' },
    });

    expect(status).toBe(200);
    const insert = dbState.queries.find(q => q.sql.includes('INSERT INTO generated_letters'));
    expect(insert).toBeTruthy();
    // Param terakhir = created_by; harus id dari sesi (u1), bukan body.
    expect(insert.params[insert.params.length - 1]).toBe('u1');
    expect(insert.params).not.toContain('u_penyerang');
  });
});