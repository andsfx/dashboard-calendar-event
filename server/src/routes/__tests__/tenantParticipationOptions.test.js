/**
 * Regresi P1: validasi opsi dinamis hanya boleh memeriksa grup yang DIPAKAI
 * `kind`.
 *
 * Sebelum perbaikan, `optionRefs` selalu memuat keempat grup. Karena field
 * kelompok yang tidak dipakai tetap membawa nilai default form
 * ('solo'/'other'/'both'), mematikan satu opsi di grup booth ikut menutup
 * SEMUA pengajuan voucher-only — dan sebaliknya.
 *
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbState = {
  /** (group, value) yang aktif di tenant_participation_options. */
  activeOptions: [],
  inserted: null,
  queries: [],
};

vi.mock('../../db.js', () => ({
  db: {
    query: vi.fn(async (sql, params = []) => {
      dbState.queries.push({ sql, params });
      if (/FROM events/i.test(sql)) {
        return { rows: [{ id: 'evt_1', acara: 'Bazaar Uji', date_str: '2026-12-01', date_end: null }], rowCount: 1 };
      }
      if (/FROM tenant_participation_options/i.test(sql)) {
        // Nilai yang diminta ada di params sebagai pasangan (group, value).
        const asked = [];
        for (let i = 0; i < params.length; i += 2) asked.push(`${params[i]}:${params[i + 1]}`);
        const rows = dbState.activeOptions
          .filter((key) => asked.includes(key))
          .map((key) => {
            const [group, value] = key.split(':');
            return { group, value };
          });
        return { rows, rowCount: rows.length };
      }
      if (/INSERT INTO tenant_participations/i.test(sql)) {
        dbState.inserted = params;
        return { rows: [{ id: 'tpr_1', code: 'TPR-AAAAAA' }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }),
  },
}));

const RATE = { blocked: false };
vi.mock('../../lib/rateLimit.js', () => ({
  enforceRateLimit: () => !RATE.blocked,
}));

const BASE = {
  tenantName: 'Kopi Uji',
  contactName: 'Budi',
  phone: '081234567890',
  eventId: 'evt_1',
};

async function submit(body) {
  const { default: router } = await import('../tenantParticipations.js');
  const req = {
    method: 'POST',
    url: '/tenant-participations',
    body: { ...BASE, ...body },
    headers: {},
    ip: '127.0.0.1',
    socket: {},
    query: {},
  };
  let settle;
  const finished = new Promise((resolve, reject) => { settle = { resolve, reject }; });
  const res = {
    statusCode: 200,
    _body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this._body = payload; settle.resolve(); return this; },
    setHeader() { return this; },
  };
  const layer = router.stack.find(
    (l) => l.route && l.route.path === '/tenant-participations' && l.route.methods.post,
  );
  if (!layer) throw new Error('route POST /tenant-participations tidak ditemukan');
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

const VOUCHER_ONLY = {
  kind: 'voucher',
  voucherType: 'other',
  voucherTerms: 'Diskon 20% untuk semua menu.',
  voucherFormat: 'both',
};

describe('submit publik — validasi opsi mengikuti kind', () => {
  beforeEach(() => {
    dbState.inserted = null;
    dbState.queries = [];
    RATE.blocked = false;
  });

  it('pengajuan voucher-only tetap diterima walau skema booth dimatikan admin', async () => {
    // booth_scheme 'solo' (default form) TIDAK aktif; voucher tidak butuh itu.
    dbState.activeOptions = ['voucher_type:other', 'voucher_format:both'];

    const { status, body } = await submit(VOUCHER_ONLY);

    expect(body?.error).toBeUndefined();
    expect(status).toBe(201);
    expect(body?.code).toBe('TPR-AAAAAA');
    expect(dbState.inserted).not.toBeNull();
  });

  it('pengajuan booth-only tetap diterima walau jenis voucher dimatikan admin', async () => {
    dbState.activeOptions = ['booth_scheme:solo', 'booth_size:2x2'];

    const { status } = await submit({
      kind: 'booth',
      boothArea: 'Atrium',
      boothStart: '2026-12-01',
      boothProducts: 'Kopi kemasan',
      boothSize: '2x2',
      boothScheme: 'solo',
    });

    expect(status).toBe(201);
  });

  it('opsi yang dipakai tetap ditolak bila sudah dimatikan', async () => {
    dbState.activeOptions = ['voucher_format:both']; // voucher_type:other mati

    const { status, body } = await submit(VOUCHER_ONLY);

    expect(status).toBe(400);
    expect(body?.error).toContain('Jenis voucher tidak lagi tersedia');
    expect(dbState.inserted).toBeNull();
  });

  it('pengajuan campuran (both) memeriksa kedua kelompok', async () => {
    dbState.activeOptions = ['voucher_type:other', 'voucher_format:both']; // booth_scheme mati

    const { status, body } = await submit({
      ...VOUCHER_ONLY,
      kind: 'both',
      boothArea: 'Atrium',
      boothStart: '2026-12-01',
      boothProducts: 'Kopi kemasan',
      boothScheme: 'solo',
    });

    expect(status).toBe(400);
    expect(body?.error).toContain('Skema booth tidak lagi tersedia');
  });
});
