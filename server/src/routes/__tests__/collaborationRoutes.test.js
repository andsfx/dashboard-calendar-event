/**
 * Kontrak modul kolaborasi:
 *   - pengajuan publik tidak bisa menyelundupkan field kurasi/PII administrasi,
 *   - nomor WhatsApp dinormalisasi ke 628...,
 *   - kurasi admin menulis judul publik, toggle agenda, dan catatan internal,
 *   - terbit ke Jadwal Event membuat event baru lalu menyimpan synced_event_id.
 *
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbState = { queries: [], program: null, slot: null, lead: null, created: null };

vi.mock('../../db.js', () => ({
  db: {
    query: vi.fn(async (sql, params) => {
      dbState.queries.push({ sql, params: params || [] });
      if (sql.includes('FROM exhibitions') && sql.includes('publication')) {
        return { rows: dbState.program ? [dbState.program] : [], rowCount: dbState.program ? 1 : 0 };
      }
      if (sql.includes('FROM exhibition_slots') && sql.includes('WHERE id =')) {
        return { rows: dbState.slot ? [dbState.slot] : [], rowCount: dbState.slot ? 1 : 0 };
      }
      if (sql.includes('INSERT INTO exhibition_leads')) {
        return {
          rows: dbState.created ? [dbState.created] : [{ id: 'lead_1', reference_code: 'KOL-2611-A4F2' }],
          rowCount: 1,
        };
      }
      if (sql.includes('FROM exhibition_leads l')) {
        return { rows: dbState.lead ? [dbState.lead] : [], rowCount: dbState.lead ? 1 : 0 };
      }
      if (sql.includes('INSERT INTO events')) {
        return { rows: [{ id: 'ev_new' }], rowCount: 1 };
      }
      if (sql.includes('UPDATE exhibition_leads')) {
        return { rows: [], rowCount: 1 };
      }
      return { rows: [], rowCount: 1 };
    }),
  },
}));

vi.mock('../../auth.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    requireRole: () => (_req, _res, next) => next(),
    logActivity: () => undefined,
  };
});

function makeRes() {
  let settleResolve;
  const finished = new Promise((resolve) => { settleResolve = resolve; });
  const res = {
    statusCode: 200,
    _body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this._body = payload; settleResolve(); return this; },
    cookie() { return this; },
    clearCookie() { return this; },
    setHeader() { return this; },
    getHeader() { return undefined; },
  };
  return { res, finished };
}

async function callRoute(modulePath, method, path, body, auth = null) {
  const { default: router } = await import(modulePath);
  const layer = router.stack.find(
    (l) => l.route && l.route.path === path && l.route.methods[method],
  );
  if (!layer) throw new Error(`route ${method.toUpperCase()} ${path} tidak ditemukan`);
  const req = {
    method: method.toUpperCase(),
    url: path,
    body,
    headers: {},
    ip: '127.0.0.1',
    socket: {},
    params: path.includes(':') ? { [path.split(':')[1]]: body?.__param || '' } : {},
    query: {},
    auth: auth ? { user: auth } : undefined,
  };
  const { res, finished } = makeRes();
  const chain = layer.route.stack.map((s) => s.handle);
  let i = 0;
  const step = (err) => {
    if (err) throw err;
    const fn = chain[i];
    i += 1;
    if (!fn) return;
    const out = fn(req, res, step);
    if (out && typeof out.then === 'function') out.catch((e) => { throw e; });
  };
  step();
  await finished;
  return { status: res.statusCode, body: res._body };
}

const VALID_SUBMISSION = {
  exhibitionId: 'exh_1',
  organizationName: 'Komunitas Senam Bekasi',
  organizationType: 'komunitas',
  contributionType: 'pengisi_aktivasi',
  conceptDescription: 'Senam bersama 45 menit untuk keluarga dan pengunjung mall.',
  preferredSlotId: 'slot_1',
  flexibleDate: false,
  contactName: 'Rani',
  phone: '+62 812-3456-7890',
  email: 'rani@example.com',
  // Field kurasi yang HARUS diabaikan schema publik.
  isPublicAgenda: true,
  status: 'scheduled',
  adminNotes: 'coba selundup',
};

beforeEach(() => {
  dbState.queries = [];
  dbState.program = {
    id: 'exh_1', slug: 'sarapan-di-metmal', title: 'Sarapan di Metmal',
    publication: 'published', status: 'open', accepting_applications: true, date_end: '2026-12-27',
  };
  dbState.slot = { id: 'slot_1', exhibition_id: 'exh_1', slot_status: 'open' };
  dbState.lead = null;
  dbState.created = { id: 'lead_1', reference_code: 'KOL-2611-A4F2' };
});

describe('POST /exhibition-leads', () => {
  it('menormalisasi WhatsApp dan mengembalikan kode referensi', async () => {
    const { status, body } = await callRoute(
      '../exhibitions.js', 'post', '/exhibition-leads', VALID_SUBMISSION,
    );
    expect(status).toBe(201);
    expect(body).toMatchObject({ success: true, referenceCode: 'KOL-2611-A4F2' });

    const insert = dbState.queries.find((q) => q.sql.includes('INSERT INTO exhibition_leads'));
    expect(insert).toBeTruthy();
    expect(insert.sql).not.toContain('is_public_agenda');
    expect(insert.sql).not.toContain('synced_event_id');
    expect(insert.params[8]).toBe('6281234567890');
  });

  it('menolak nomor WhatsApp tidak valid tanpa menyentuh DB', async () => {
    const { status, body } = await callRoute('../exhibitions.js', 'post', '/exhibition-leads', {
      ...VALID_SUBMISSION, phone: '12345',
    });
    expect(status).toBe(400);
    expect(body.error).toMatch(/nomor WhatsApp/i);
    expect(dbState.queries.some((q) => q.sql.includes('INSERT INTO exhibition_leads'))).toBe(false);
  });

  it('menolak slot yang sudah penuh', async () => {
    dbState.slot = { id: 'slot_1', exhibition_id: 'exh_1', slot_status: 'full' };
    const { status, body } = await callRoute('../exhibitions.js', 'post', '/exhibition-leads', VALID_SUBMISSION);
    expect(status).toBe(409);
    expect(body.error).toMatch(/penuh|ditutup/i);
  });

  it('menolak program yang sudah berhenti menerima pengajuan', async () => {
    dbState.program = { ...dbState.program, accepting_applications: false };
    const { status } = await callRoute('../exhibitions.js', 'post', '/exhibition-leads', VALID_SUBMISSION);
    expect(status).toBe(409);
  });
});

describe('admin kurasi kolaborasi', () => {
  const ADMIN = { id: 'u1', email: 'admin@example.com', role: 'admin' };

  it('menyimpan judul publik, toggle agenda, dan catatan internal', async () => {
    const { status } = await callRoute('../admin.js', 'post', '/:action', {
      action: 'updateExhibitionLead',
      id: 'lead_1',
      status: 'scheduled',
      publicActivityTitle: 'Senam Pagi Bersama',
      publicActivitySummary: 'Senam santai untuk semua usia.',
      isPublicAgenda: true,
      internalNotes: 'Kunci slot 1',
      __param: 'updateExhibitionLead',
    }, ADMIN);
    expect(status).toBe(200);
    const update = dbState.queries.find((q) => q.sql.includes('UPDATE exhibition_leads SET'));
    expect(update.sql).toContain('public_activity_title');
    expect(update.sql).toContain('is_public_agenda');
    expect(update.params[2]).toBe('Senam Pagi Bersama');
    expect(update.params[4]).toBe(true);
    expect(update.params[5]).toBe('u1');
  });

  it('terbit ke Jadwal Event membuat event dan menyimpan synced_event_id', async () => {
    dbState.lead = {
      id: 'lead_1', exhibition_id: 'exh_1', organization_name: 'Komunitas Senam',
      contact_name: 'Rani', phone: '6281234567890',
      public_activity_title: 'Senam Pagi Bersama',
      public_activity_summary: 'Senam santai untuk semua usia.',
      proposal: 'Konsep senam.', synced_event_id: null, status: 'approved',
      program_title: 'Sarapan di Metmal', program_location: 'Area Parkir Timur',
      date_start: '2026-11-29', slot_date: '2026-11-29',
      start_time: '06:30:00', end_time: '10:00:00', zone_name: 'Area Parkir Timur',
    };
    const { status, body } = await callRoute('../admin.js', 'post', '/:action', {
      action: 'publishCollaborationToEvent', id: 'lead_1', __param: 'publishCollaborationToEvent',
    }, ADMIN);
    expect(status).toBe(200);
    expect(body).toMatchObject({ success: true, id: 'ev_new' });

    const insert = dbState.queries.find((q) => q.sql.includes('INSERT INTO events'));
    expect(insert.params[0]).toBe('2026-11-29');
    expect(insert.params[3]).toBe('Senam Pagi Bersama');
    const update = dbState.queries.find((q) => q.sql.includes('synced_event_id = $1'));
    expect(update.params).toEqual(['ev_new', 'lead_1']);
  });
});
