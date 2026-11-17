/**
 * Guard bentrok area + aksi link registrasi→event pada router admin.
 *
 * Guard cermin `src/utils/areaConflict.ts` tapi di server: area yang sama
 * dipakai event `published` lain pada rentang tanggal overlap ditolak dengan
 * pesan Indonesia menyebut nama area. `override_conflicts: true` (klien punya
 * checkbox override untuk aktivasi kecil paralel) melewati guard. publishDraft
 * TIDAK di-guard di iterasi ini: tidak ada alur override di UI publish, dan
 * draft sudah di-warn klien saat simpan.
 *
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { validateAction } from '../../lib/schemas.js';

const dbState = {
  rows: [],
  queries: [],
  // Urutan hasil per query: dipakai untuk SELECT baris saat ini lalu SELECT konflik.
  responses: [],
};

vi.mock('../../db.js', () => ({
  db: {
    query: vi.fn(async (sql, params) => {
      dbState.queries.push({ sql: String(sql), params: params || [] });
      const queued = dbState.responses.shift();
      if (queued) return queued;
      return { rows: dbState.rows, rowCount: dbState.rows.length };
    }),
    withTransaction: vi.fn(async (fn) => fn({
      query: async (sql, params) => {
        dbState.queries.push({ sql: String(sql), params: params || [] });
        const queued = dbState.responses.shift();
        if (queued) return queued;
        return { rows: dbState.rows, rowCount: dbState.rows.length };
      },
    })),
  },
}));

vi.mock('../../auth.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, requireRole: () => (_req, _res, next) => next() };
});

async function callAction(action, body = {}) {
  const { default: router } = await import('../admin.js');
  const layer = router.stack.find(
    (l) => l.route && l.route.path === '/:action' && l.route.methods.post,
  );
  if (!layer) throw new Error('route /:action tidak ditemukan');

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

const EVENT = {
  date_str: '2026-07-12',
  date_end: null,
  area_id: 'era_stage',
  acara: 'Bazar',
};

const CONFLICT_RESULT = { rows: [{ total: 1, area_name: 'Panggung Utama' }], rowCount: 1 };

beforeEach(() => {
  dbState.queries = [];
  dbState.rows = [];
  dbState.responses = [];
});

describe('createEvent — guard bentrok area', () => {
  it('menolak 400 saat area bentrok, tanpa INSERT events', async () => {
    dbState.responses.push(CONFLICT_RESULT);
    const { status, body } = await callAction('createEvent', { data: { ...EVENT } });

    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toContain('Bentrok jadwal');
    expect(body.error).toContain('Panggung Utama');
    const inserted = dbState.queries.some(({ sql }) => sql.startsWith('INSERT INTO events'));
    expect(inserted).toBe(false);
  });

  it('lewati guard saat tanpa areaId, INSERT tetap jalan', async () => {
    const { status, body } = await callAction('createEvent', {
      data: { ...EVENT, area_id: null },
    });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    const inserted = dbState.queries.some(({ sql }) => sql.startsWith('INSERT INTO events'));
    expect(inserted).toBe(true);
  });

  it('override_conflicts=true lewati guard, INSERT jalan dan log mencatatnya', async () => {
    dbState.responses.push(CONFLICT_RESULT); // kalau guard jalan, ini menolak
    dbState.rows = [{ id: 'evt_new' }];      // hasil INSERT RETURNING id
    const { status, body } = await callAction('createEvent', {
      data: { ...EVENT, override_conflicts: true },
    });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    const inserted = dbState.queries.some(({ sql }) => sql.startsWith('INSERT INTO events'));
    expect(inserted).toBe(true);
    // Tidak ada query konflik (guard di-skip) — hanya INSERT + activity_logs.
    const conflictQuery = dbState.queries.find(({ sql }) => sql.includes('COUNT(*)::int AS total'));
    expect(conflictQuery).toBeUndefined();
  });
});

describe('updateEvent — guard hanya saat tanggal/area berubah', () => {
  it('menolak saat pindah tanggal ke rentang bentrok', async () => {
    dbState.responses.push(
      { rows: [{ date_str: '2026-07-01', date_end: null, area_id: 'era_stage' }], rowCount: 1 },
      CONFLICT_RESULT,
    );
    const { status, body } = await callAction('updateEvent', {
      id: 'evt_1',
      data: { date_str: '2026-07-12' },
    });

    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toContain('Bentrok jadwal');
    const updated = dbState.queries.some(({ sql }) => sql.startsWith('UPDATE events SET'));
    expect(updated).toBe(false);
  });

  it('field lain (jam) tanpa sentuh tanggal/area tidak di-guard', async () => {
    dbState.rows = [{ id: 'evt_1' }];
    const { status, body } = await callAction('updateEvent', {
      id: 'evt_1',
      data: { jam: '10:00' },
    });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    const conflictQuery = dbState.queries.find(({ sql }) => sql.includes('COUNT(*)::int AS total'));
    expect(conflictQuery).toBeUndefined();
  });

  it('override_conflicts=true lewati guard saat tanggal berubah', async () => {
    dbState.responses.push(
      { rows: [{ date_str: '2026-07-01', date_end: null, area_id: 'era_stage' }], rowCount: 1 },
    );
    dbState.rows = [{ id: 'evt_1' }]; // UPDATE ... RETURNING? tidak; rowCount = 1
    const { status, body } = await callAction('updateEvent', {
      id: 'evt_1',
      data: { date_str: '2026-07-12', override_conflicts: true },
    });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    const updated = dbState.queries.some(({ sql }) => sql.startsWith('UPDATE events SET'));
    expect(updated).toBe(true);
  });

  it('baris hilang saat tanggal berubah → gagal, tanpa UPDATE', async () => {
    dbState.responses.push({ rows: [], rowCount: 0 });
    const { status, body } = await callAction('updateEvent', {
      id: 'evt_gone',
      data: { date_str: '2026-07-12' },
    });

    expect(status).toBe(200);
    expect(body.success).toBe(false);
    expect(body.error).toContain('tidak ada atau sudah dihapus');
    const updated = dbState.queries.some(({ sql }) => sql.startsWith('UPDATE events SET'));
    expect(updated).toBe(false);
  });

  it('baris hilang tanpa ubah tanggal/area → gagal lewat rowCount', async () => {
    dbState.rows = []; // UPDATE 0 baris
    const { status, body } = await callAction('updateEvent', {
      id: 'evt_gone',
      data: { jam: '10:00' },
    });

    expect(status).toBe(200);
    expect(body.success).toBe(false);
    expect(body.error).toContain('tidak ada atau sudah dihapus');
    const logged = dbState.queries.some(({ sql }) => sql.includes('INSERT INTO activity_logs'));
    expect(logged).toBe(false);
  });
});

describe('deleteEvent — baris hilang', () => {
  it('id tidak ada → success:false dan tidak menulis log', async () => {
    dbState.rows = []; // DELETE 0 baris
    const { status, body } = await callAction('deleteEvent', { id: 'evt_gone' });

    expect(status).toBe(200);
    expect(body.success).toBe(false);
    expect(body.error).toContain('tidak ada atau sudah dihapus');
    const logged = dbState.queries.some(({ sql }) => sql.includes('INSERT INTO activity_logs'));
    expect(logged).toBe(false);
  });
});

describe('linkRegistrationToEvent', () => {
  it('link sukses → UPDATE organization_id dengan param benar', async () => {
    dbState.responses.push(
      { rows: [{ id: 'crg_1', status: 'approved' }], rowCount: 1 },
      { rows: [{ id: 'evt_1' }], rowCount: 1 },
    );
    const { status, body } = await callAction('linkRegistrationToEvent', {
      registrationId: 'crg_1',
      eventId: 'evt_1',
    });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    const update = dbState.queries.find(({ sql }) => sql.startsWith('UPDATE events SET organization_id'));
    expect(update).toBeTruthy();
    expect(update.params).toEqual(['crg_1', 'evt_1']);
  });

  it('unlink (eventId null) → UPDATE organization_id = null', async () => {
    dbState.responses.push(
      { rows: [{ id: 'crg_1', status: 'approved' }], rowCount: 1 },
      { rows: [{ id: 'evt_1' }, { id: 'evt_2' }], rowCount: 2 },
    );
    const { status, body } = await callAction('linkRegistrationToEvent', {
      registrationId: 'crg_1',
      eventId: null,
    });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    const update = dbState.queries.find(({ sql }) => sql.startsWith('UPDATE events SET organization_id'));
    expect(update).toBeTruthy();
    expect(update.params).toEqual(['crg_1']);
  });

  it('registrasi tak ada → success:false status 400', async () => {
    dbState.responses.push({ rows: [], rowCount: 0 });
    const { status, body } = await callAction('linkRegistrationToEvent', {
      registrationId: 'crg_x',
      eventId: 'evt_1',
    });

    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toContain('Pendaftaran tidak ditemukan');
  });

  it('eventId tak ada → success:false status 400', async () => {
    dbState.responses.push(
      { rows: [{ id: 'crg_1', status: 'approved' }], rowCount: 1 },
      { rows: [], rowCount: 0 },
    );
    const { status, body } = await callAction('linkRegistrationToEvent', {
      registrationId: 'crg_1',
      eventId: 'evt_x',
    });

    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toContain('Event tidak ditemukan');
  });

  it('registrasi belum approved → 400, tanpa UPDATE events', async () => {
    dbState.responses.push({ rows: [{ id: 'crg_1', status: 'pending' }], rowCount: 1 });
    const { status, body } = await callAction('linkRegistrationToEvent', {
      registrationId: 'crg_1',
      eventId: 'evt_1',
    });

    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toContain('belum disetujui');
    const update = dbState.queries.some(({ sql }) => sql.startsWith('UPDATE events SET organization_id'));
    expect(update).toBe(false);
  });

  it('unlink mencatat unlinkedCount + id event yang dilepas', async () => {
    dbState.responses.push(
      { rows: [{ id: 'crg_1', status: 'approved' }], rowCount: 1 },
      { rows: [{ id: 'evt_1' }, { id: 'evt_2' }], rowCount: 2 },
    );
    await callAction('linkRegistrationToEvent', { registrationId: 'crg_1', eventId: null });

    const log = dbState.queries.find(({ sql }) => sql.includes('INSERT INTO activity_logs'));
    expect(log).toBeTruthy();
    const details = JSON.parse(log.params[5]);
    expect(details.unlinkedCount).toBe(2);
    expect(details.unlinkedEventIds).toEqual(['evt_1', 'evt_2']);
  });

  it('unlinkEventId sukses → UPDATE targeted dengan param benar + log per-event', async () => {
    dbState.responses.push(
      { rows: [{ id: 'crg_1', status: 'approved' }], rowCount: 1 },
      { rows: [{ id: 'evt_1' }], rowCount: 1 },
      { rows: [{ id: 'evt_1' }], rowCount: 1 },
    );
    const { status, body } = await callAction('linkRegistrationToEvent', {
      registrationId: 'crg_1',
      eventId: null,
      unlinkEventId: 'evt_1',
    });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    const update = dbState.queries.find(({ sql }) => sql.startsWith('UPDATE events SET organization_id = NULL WHERE id ='));
    expect(update).toBeTruthy();
    expect(update.params).toEqual(['evt_1', 'crg_1']);
    const log = dbState.queries.find(({ sql }) => sql.includes('INSERT INTO activity_logs'));
    expect(log).toBeTruthy();
    expect(log.params[4]).toBe('evt_1'); // resource_id = event target
    const details = JSON.parse(log.params[5]);
    expect(details.registrationId).toBe('crg_1');
    expect(details.unlinkedEventIds).toEqual(['evt_1']);
  });

  it('unlinkEventId dengan event tak tertaut → success:false status 400', async () => {
    dbState.responses.push(
      { rows: [{ id: 'crg_1', status: 'approved' }], rowCount: 1 },
      { rows: [{ id: 'evt_1' }], rowCount: 1 },
      { rows: [], rowCount: 0 },
    );
    const { status, body } = await callAction('linkRegistrationToEvent', {
      registrationId: 'crg_1',
      eventId: null,
      unlinkEventId: 'evt_1',
    });

    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toContain('tidak tertaut ke registrasi ini');
  });

  it('eventId + unlinkEventId bersamaan → 400', async () => {
    const { status, body } = await callAction('linkRegistrationToEvent', {
      registrationId: 'crg_1',
      eventId: 'evt_1',
      unlinkEventId: 'evt_2',
    });

    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toContain('Kirim salah satu');
  });

  it('schema menerima unlinkEventId opsional', () => {
    const result = validateAction({
      action: 'linkRegistrationToEvent',
      registrationId: 'crg_1',
      eventId: null,
      unlinkEventId: 'evt_1',
    });

    expect(result.ok).toBe(true);
    expect(result.data.unlinkEventId).toBe('evt_1');
  });
});

describe('batchCreateEvents — guard bentrok area per baris', () => {
  it('batch 3 baris, baris ke-2 bentrok → success:false, tanpa INSERT setelah konflik', async () => {
    dbState.responses.push(
      { rows: [{ total: 0, area_name: 'Panggung Utama' }], rowCount: 1 }, // guard baris 1 lolos
      { rows: [{ id: 'evt_r0' }], rowCount: 1 },                            // INSERT baris 1
      CONFLICT_RESULT,                                                       // guard baris 2 → bentrok
    );
    const { status, body } = await callAction('batchCreateEvents', {
      data: [
        { ...EVENT, acara: 'Acara A' },
        { ...EVENT, acara: 'Acara B' },
        { ...EVENT, acara: 'Acara C' },
      ],
    });

    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toContain('baris ke-2');
    expect(body.error).toContain('Panggung Utama');
    // Hanya baris pertama yang sempat di-INSERT; baris ke-2 (konflik) & ke-3
    // tidak. Transaksi nyata me-rollback INSERT baris pertama.
    const inserts = dbState.queries.filter(({ sql }) => sql.startsWith('INSERT INTO events'));
    expect(inserts).toHaveLength(1);
    // Handler gagal sebelum COMMIT → tidak menulis log sukses batch.
    const logged = dbState.queries.some(({ sql }) => sql.includes('INSERT INTO activity_logs'));
    expect(logged).toBe(false);
  });

  it('batch dengan override_conflicts:true pada baris bentrok → sukses, flag tidak masuk kolom INSERT', async () => {
    dbState.responses.push(
      { rows: [{ total: 0, area_name: 'Panggung Utama' }], rowCount: 1 }, // guard baris 1
      { rows: [{ id: 'evt_r0' }], rowCount: 1 },                            // INSERT baris 1
      { rows: [{ id: 'evt_r1' }], rowCount: 1 },                            // INSERT baris 2 (override)
      { rows: [{ total: 0, area_name: 'Panggung Utama' }], rowCount: 1 }, // guard baris 3
      { rows: [{ id: 'evt_r2' }], rowCount: 1 },                            // INSERT baris 3
    );
    const { status, body } = await callAction('batchCreateEvents', {
      data: [
        { ...EVENT, acara: 'Acara A' },
        { ...EVENT, acara: 'Acara B', override_conflicts: true },
        { ...EVENT, acara: 'Acara C' },
      ],
    });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.count).toBe(3);
    const inserts = dbState.queries.filter(({ sql }) => sql.startsWith('INSERT INTO events'));
    expect(inserts).toHaveLength(3);
    // override_conflicts hanya bagian dari payload, bukan kolom INSERT eksplisit.
    expect(inserts[0].sql).not.toContain('override_conflicts');
  });
});

describe('updateRegistrationStatus — baris hilang', () => {
  it('id tidak ada → success:false, tanpa log', async () => {
    dbState.rows = []; // UPDATE 0 baris
    const { status, body } = await callAction('updateRegistrationStatus', {
      id: 'crg_gone',
      status: 'approved',
    });

    expect(status).toBe(200);
    expect(body.success).toBe(false);
    expect(body.error).toContain('Pendaftaran tidak ditemukan');
    const logged = dbState.queries.some(({ sql }) => sql.includes('INSERT INTO activity_logs'));
    expect(logged).toBe(false);
  });

  it('baris ada → success:true dan log tercatat', async () => {
    dbState.rows = [{ id: 'crg_1' }]; // UPDATE 1 baris
    const { status, body } = await callAction('updateRegistrationStatus', {
      id: 'crg_1',
      status: 'approved',
    });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    const logged = dbState.queries.some(({ sql }) => sql.includes('INSERT INTO activity_logs'));
    expect(logged).toBe(true);
  });
});
