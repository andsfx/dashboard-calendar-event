/**
 * Regresi audit 2026-10-31 pada router admin (`server/src/routes/admin.js`):
 *
 *   1. `updateDraft`/`createDraft` TIDAK boleh menulis flag lifecycle
 *      (`published`/`published_at`/`deleted`/`deleted_at`). Sebelumnya keempat
 *      kolom ada di `DRAFT_COLUMNS`, sehingga payload passthrough bisa
 *      "menerbitkan" draft tanpa INSERT `events` — draft yatim yang tidak bisa
 *      diperbaiki dari UI (lihat migrasi 2026-10-31-draft-lifecycle-repair.sql).
 *      `progress` tetap boleh: itu status alur, bukan flag visibilitas.
 *
 *   2. SQLSTATE yang berasal dari input klien (22P02/22008/23503) harus 400
 *      dengan pesan Indonesia, bukan 500 generik — dan teks mentah Postgres
 *      tidak boleh ikut ke respons.
 *
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbState = { rows: [], queries: [], error: null };

vi.mock('../../db.js', () => ({
  db: {
    query: vi.fn(async (sql, params) => {
      dbState.queries.push({ sql, params: params || [] });
      if (dbState.error) throw dbState.error;
      return { rows: dbState.rows, rowCount: dbState.rows.length };
    }),
    withTransaction: vi.fn(async (fn) => fn({
      query: async (sql, params) => {
        dbState.queries.push({ sql, params: params || [] });
        if (dbState.error) throw dbState.error;
        return { rows: dbState.rows, rowCount: dbState.rows.length };
      },
    })),
  },
}));

vi.mock('../../auth.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    requireRole: () => (_req, _res, next) => next(),
  };
});

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
    auth: { user: { id: 'u1', email: 'admin@example.com', role: 'admin' } },
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

const LIFECYCLE = ['published', 'published_at', 'deleted', 'deleted_at'];

/** Baris draft nyata: belum terbit, belum dihapus. */
const DRAFT_ROW = {
  published: false,
  published_at: null,
  deleted: false,
  deleted_at: null,
};

/** Payload bernilai BERBEDA untuk tiap kolom lifecycle. */
const LIFECYCLE_CHANGED_VALUES = {
  published: true,
  published_at: '2026-10-31T00:00:00.000Z',
  deleted: true,
  deleted_at: '2026-10-31T00:00:00.000Z',
};

beforeEach(() => {
  dbState.rows = [];
  dbState.queries = [];
  dbState.error = null;
});

describe('updateDraft — flag lifecycle bukan bagian payload', () => {
  beforeEach(() => {
    dbState.rows = [{ ...DRAFT_ROW }];
  });

  it.each(LIFECYCLE)('menolak 400 saat payload mengubah %s', async (column) => {
    const { status, body } = await callAction('updateDraft', {
      id: 'drf_1',
      data: { acara: 'Bazar', [column]: LIFECYCLE_CHANGED_VALUES[column] },
    });

    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toContain(column);
    // Tidak ada UPDATE sama sekali: perubahan lifecycle tidak boleh lolos
    // sambil tetap menulis sisa payload.
    const wrote = dbState.queries.some(({ sql }) => String(sql).startsWith('UPDATE'));
    expect(wrote).toBe(false);
  });

  it('mengabaikan published:false saat baris published=false (SPA lama)', async () => {
    const { status } = await callAction('updateDraft', {
      id: 'drf_1',
      data: { progress: 'confirm', published: false, deleted: false, published_at: null, deleted_at: null },
    });

    expect(status).toBe(200);
    const update = dbState.queries.find(({ sql }) => String(sql).startsWith('UPDATE'));
    expect(update).toBeTruthy();
    // Hanya progress yang masuk SET; empat flag no-op tidak ditulis.
    expect(update.sql).toContain('progress = $1');
    for (const column of LIFECYCLE) {
      expect(update.sql, column).not.toContain(column);
    }
    expect(update.params).toEqual(['confirm', 'drf_1']);
  });

  it('mengabaikan published_at yang sama dengan nilai baris (ISO tanpa ms)', async () => {
    dbState.rows = [{ ...DRAFT_ROW, published_at: new Date('2026-10-30T12:00:00.000Z') }];

    const { status } = await callAction('updateDraft', {
      id: 'drf_1',
      data: { acara: 'Bazar', published_at: '2026-10-30T12:00:00Z' },
    });

    expect(status).toBe(200);
    const update = dbState.queries.find(({ sql }) => String(sql).startsWith('UPDATE'));
    expect(update.sql).not.toContain('published_at');
  });

  it('tetap 200 bila payload hanya flag no-op tanpa kolom lain', async () => {
    const { status, body } = await callAction('updateDraft', {
      id: 'drf_1',
      data: { published: false, deleted: false },
    });

    // Tidak ada perubahan nyata → perilaku lama "Tidak ada perubahan".
    expect(status).toBe(200);
    expect(body.success).toBe(false);
    expect(body.error).toBe('Tidak ada perubahan');
  });

  it('masih menulis kolom biasa, termasuk progress', async () => {
    const { status } = await callAction('updateDraft', {
      id: 'drf_1',
      data: { acara: 'Bazar', progress: 'confirm' },
    });

    expect(status).toBe(200);
    const [update] = dbState.queries;
    expect(update.sql).toContain('UPDATE draft_events SET');
    expect(update.sql).toContain('acara = $1');
    expect(update.sql).toContain('progress = $2');
    expect(update.params).toEqual(['Bazar', 'confirm', 'drf_1']);
  });
});

describe('createDraft — flag lifecycle hanya boleh bernilai default', () => {
  beforeEach(() => {
    dbState.rows = [{ id: 'drf_1' }];
  });

  it('menolak payload yang mencoba menerbitkan draft saat dibuat', async () => {
    const { status, body } = await callAction('createDraft', {
      data: { acara: 'Bazar', published: true },
    });

    expect(status).toBe(400);
    expect(body.error).toContain('published');
    expect(dbState.queries).toHaveLength(0);
  });

  it('menolak deleted:true dan timestamp terisi', async () => {
    for (const data of [{ acara: 'Bazar', deleted: true }, { acara: 'Bazar', published_at: '2026-10-31T00:00:00.000Z' }]) {
      const { status } = await callAction('createDraft', { data });
      expect(status, JSON.stringify(data)).toBe(400);
    }
    expect(dbState.queries).toHaveLength(0);
  });

  it('mengabaikan nilai default (false/null) dari mapper klien', async () => {
    const { status } = await callAction('createDraft', {
      data: {
        acara: 'Bazar',
        published: false,
        published_at: null,
        deleted: false,
        deleted_at: null,
      },
    });

    expect(status).toBe(200);
    const [insert] = dbState.queries;
    expect(insert.sql).toContain('INSERT INTO draft_events');
    expect(insert.sql).toContain('acara');
    for (const column of LIFECYCLE) {
      expect(insert.sql, column).not.toContain(column);
    }
  });
});

describe('pemetaan SQLSTATE input klien', () => {
  it.each([
    ['22P02', 'Format nilai tidak valid'],
    ['22007', 'Format tanggal tidak valid'],
    ['22008', 'Tanggal atau waktu di luar jangkauan'],
    ['23503', 'Data terkait tidak ditemukan'],
  ])('%s → 400, bukan 500', async (code, expectedMessage) => {
    dbState.error = Object.assign(new Error('invalid input syntax for type json — baris rahasia'), { code });

    const { status, body } = await callAction('listEvents');

    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toContain(expectedMessage);
    // Teks mentah Postgres tidak boleh bocor.
    expect(body.error).not.toContain('invalid input syntax');
  });

  it('23505 tetap 409 (duplikat)', async () => {
    dbState.error = Object.assign(new Error('duplicate key value'), { code: '23505' });
    const { status } = await callAction('listEvents');
    expect(status).toBe(409);
  });

  it('kode tak dikenal tetap 500 generik tanpa teks Postgres', async () => {
    dbState.error = Object.assign(new Error('relation "rahasia" does not exist'), { code: '42P01' });
    const { status, body } = await callAction('listEvents');
    expect(status).toBe(500);
    expect(body.error).toContain('Terjadi kesalahan server');
    expect(body.error).not.toContain('rahasia');
  });
});
