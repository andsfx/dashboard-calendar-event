/**
 * Role matrix & PII pada routes survey (audit 2026-10-24).
 *
 * Sebelum perbaikan gate `/responses`, `/config`, `/stats`, dan `/export`
 * memakai `DEMO_READ_ROLES` (staff + demo), sehingga viewer & eo_tenant — role
 * yang justru butuh data survey untuk pekerjaannya — menerima 403, sementara
 * demo bisa mengunduh CSV berisi PII mentah.
 *
 * Kontrak yang dikunci:
 *   - viewer & eo_tenant boleh MEMBACA (responses/config/stats)
 *   - `eo_tenant` HANYA event di `assigned_events` (403 untuk event lain) dan
 *     `/stats` terkurung pada event itu (tanpa penugasan = nol)
 *   - demo boleh membaca, tetapi PII responden + metadata perangkat disamarkan
 *   - demo & eo_tenant TIDAK boleh export CSV; staff/viewer boleh
 *   - submit untuk event yang tidak ada → 404 (bukan 201 hantu)
 *
 * `auth.js` asli (JWT sungguhan) dipakai; hanya DB yang di-mock.
 *
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-survey-routes-0123456789';

const users = new Map();
const dbState = { events: [], responses: [], config: null, queries: [] };

vi.mock('../../db.js', () => ({
  db: {
    query: vi.fn(async (sql, params) => {
      dbState.queries.push({ sql, params: params || [] });
      if (/FROM users/i.test(sql)) {
        return { rows: [users.get(params?.[0])].filter(Boolean) };
      }
      if (/FROM events/i.test(sql)) {
        return { rows: dbState.events, rowCount: dbState.events.length };
      }
      if (/FROM survey_config/i.test(sql)) {
        return { rows: dbState.config ? [dbState.config] : [], rowCount: dbState.config ? 1 : 0 };
      }
      // Agregat /stats: CEK DULU sebelum cabang COUNT, karena query agregat juga
      // memuat `COUNT(*)::int AS total_responses`.
      if (/FROM survey_responses/i.test(sql) && /AVG\(/i.test(sql)) {
        const base = {
          total_responses: 1, organizer_responses: 0, public_responses: 1, unique_events: 1,
          mall_cleanliness: 9, mall_staff_service: 9, mall_coordination: 9, mall_security: 9,
          eo_event_quality: 9, eo_organization: 9, eo_committee_service: 9,
          eo_promotion_accuracy: 9, eo_recommendation: 9,
          nps_promoters: 1, nps_detractors: 0, nps_base: 1,
        };
        // Terkurung pada event yang tidak ditugaskan → tidak ada data.
        const scoped = Array.isArray(params?.[0]) && params[0].length > 0 && !params[0].includes('evt_1');
        if (scoped) {
          return {
            rows: [{
              ...base,
              total_responses: 0, public_responses: 0, unique_events: 0,
              mall_cleanliness: null, mall_staff_service: null, mall_coordination: null, mall_security: null,
              eo_event_quality: null, eo_organization: null, eo_committee_service: null,
              eo_promotion_accuracy: null, eo_recommendation: null,
              nps_promoters: 0, nps_detractors: 0, nps_base: 0,
            }],
          };
        }
        return { rows: [base] };
      }
      if (/COUNT\(\*\)::int AS total\b(?!_)/i.test(sql)) {
        return { rows: [{ total: dbState.responses.length }] };
      }
      if (/INSERT INTO survey_responses/i.test(sql)) {
        return { rows: [{ id: 'sr_new', created_at: '2026-10-24T00:00:00Z' }] };
      }
      if (/FROM survey_responses/i.test(sql)) {
        return { rows: dbState.responses, rowCount: dbState.responses.length };
      }
      return { rows: [], rowCount: 0 };
    }),
  },
}));

async function callAs(role, method, path, { queryParams = {}, body = {}, userExtras = {} } = {}) {
  const auth = await import('../../auth.js');
  const { default: router } = await import('../survey.js');

  const user = {
    id: `u_${role}`, email: `${role}@example.com`, display_name: role, role,
    is_active: true, token_version: 0, assigned_events: [],
    ...userExtras,
  };
  users.set(user.id, user);
  const token = await auth.signAccess(user);

  const layer = router.stack.find(
    (l) => l.route && l.route.path === path && l.route.methods[method.toLowerCase()],
  );
  if (!layer) throw new Error(`route ${method} ${path} tidak ditemukan`);

  const req = {
    method,
    url: path,
    body,
    headers: { cookie: `sb-access-token=${token}` },
    cookies: { 'sb-access-token': token },
    ip: '127.0.0.1',
    socket: {},
    params: {},
    query: queryParams,
  };
  let settle;
  const finished = new Promise((resolve, reject) => { settle = { resolve, reject }; });
  const res = {
    statusCode: 200,
    _body: null,
    _headers: {},
    status(code) { this.statusCode = code; return this; },
    json(payload) { this._body = payload; settle.resolve(); return this; },
    send(payload) { this._body = payload; settle.resolve(); return this; },
    setHeader(name, value) { this._headers[name.toLowerCase()] = value; return this; },
    getHeader(name) { return this._headers[String(name).toLowerCase()]; },
    cookie() { return this; },
    clearCookie() { return this; },
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
  return { status: res.statusCode, body: res._body, headers: res._headers };
}

const RESPONSE_ROW = {
  id: 'sr1', event_id: 'evt_1', survey_type: 'public',
  respondent_name: 'Budi Santoso', respondent_email: 'budi@example.com',
  respondent_phone: '081234567890', respondent_organization: 'Komunitas Test',
  mall_cleanliness: 9, mall_comment: 'bagus', created_at: '2026-10-01T00:00:00Z',
  ip_address: '203.0.113.9', user_agent: 'Mozilla/5.0 Test', device_fingerprint: 'fp-abc123',
};

beforeEach(() => {
  users.clear();
  dbState.queries = [];
  dbState.events = [{ id: 'evt_1' }];
  dbState.responses = [{ ...RESPONSE_ROW }];
  dbState.config = { event_id: 'evt_1', is_active: false };
});

describe('survey — role baca', () => {
  it('viewer boleh membaca config yang dulu 403', async () => {
    const { status } = await callAs('viewer', 'GET', '/config', { queryParams: { event_id: 'evt_1' } });
    expect(status).toBe(200);
  });

  it('eo_tenant boleh membaca stats yang dulu 403 (dibatasi event tugasnya)', async () => {
    const { status, body } = await callAs('eo_tenant', 'GET', '/stats', {
      userExtras: { assigned_events: ['evt_1'] },
    });

    expect(status).toBe(200);
    expect(body.data.total_responses).toBe(1);
    // Query agregat WAJIB terkurung pada event yang ditugaskan.
    const aggregate = dbState.queries.find((q) => q.sql.includes('AS total_responses'));
    expect(aggregate.sql).toContain('event_id = ANY($1::text[])');
    expect(aggregate.params).toEqual([['evt_1']]);
  });

  it('demo boleh membaca responses, PII responden disamarkan', async () => {
    const { status, body } = await callAs('demo', 'GET', '/responses', { queryParams: { event_id: 'evt_1' } });

    expect(status).toBe(200);
    const row = body.data[0];
    expect(row.respondent_name).toBe('B***i S***o');
    expect(row.respondent_email).toBe('b***i@example.com');
    expect(row.respondent_phone).toBe('********7890');
    expect(row.respondent_organization).toBe('K***s T***t');
    // Metadata perangkat tidak ikut keluar ke akun peragaan.
    expect(row.ip_address).toBeNull();
    expect(row.user_agent).toBeNull();
    expect(row.device_fingerprint).toBeNull();
    // Data rating tetap utuh — itu yang didemokan.
    expect(row.mall_cleanliness).toBe(9);
    expect(row.mall_comment).toBe('bagus');
  });

  it('staff tetap menerima PII utuh pada responses', async () => {
    const { body } = await callAs('admin', 'GET', '/responses', { queryParams: { event_id: 'evt_1' } });
    expect(body.data[0].respondent_name).toBe('Budi Santoso');
    expect(body.data[0].respondent_phone).toBe('081234567890');
    expect(body.data[0].device_fingerprint).toBe('fp-abc123');
  });

  it('demo: recent pada stats disamarkan', async () => {
    const { status, body } = await callAs('demo', 'GET', '/stats');

    expect(status).toBe(200);
    expect(body.data.recent[0].respondent_name).toBe('B***i S***o');
    expect(body.data.recent[0].respondent_email).toBe('b***i@example.com');
  });
});

describe('survey — export CSV', () => {
  it('menolak demo (PII mentah tidak bisa disamarkan setelah diunduh)', async () => {
    const { status } = await callAs('demo', 'GET', '/export', { queryParams: { event_id: 'evt_1' } });
    expect(status).toBe(403);
  });

  it('mengizinkan staff dan mengirim CSV', async () => {
    const { status, body, headers } = await callAs('admin', 'GET', '/export', { queryParams: { event_id: 'evt_1' } });

    expect(status).toBe(200);
    expect(String(headers['content-type'])).toContain('text/csv');
    expect(body).toContain('Budi Santoso');
  });

  it('mengizinkan viewer', async () => {
    const { status } = await callAs('viewer', 'GET', '/export', { queryParams: { event_id: 'evt_1' } });
    expect(status).toBe(200);
  });

  it('menolak eo_tenant walaupun event-nya ditugaskan (CSV satu event penuh, tanpa masking)', async () => {
    const { status } = await callAs('eo_tenant', 'GET', '/export', {
      queryParams: { event_id: 'evt_1' },
      userExtras: { assigned_events: ['evt_1'] },
    });
    expect(status).toBe(403);
  });
});

describe('survey — eo_tenant hanya event yang ditugaskan', () => {
  it('403 untuk /responses event yang bukan tugasnya', async () => {
    const { status, body } = await callAs('eo_tenant', 'GET', '/responses', {
      queryParams: { event_id: 'evt_lain' },
      userExtras: { assigned_events: ['evt_1'] },
    });

    expect(status).toBe(403);
    expect(body.error).toMatch(/Tidak berhak/);
    // Tidak boleh ada query data sebelum penolakan.
    expect(dbState.queries.some((q) => q.sql.includes('FROM survey_responses'))).toBe(false);
  });

  it('200 untuk /responses event yang ditugaskan', async () => {
    const { status } = await callAs('eo_tenant', 'GET', '/responses', {
      queryParams: { event_id: 'evt_1' },
      userExtras: { assigned_events: ['evt_1', 'evt_2'] },
    });
    expect(status).toBe(200);
  });

  it('403 untuk /config event yang bukan tugasnya', async () => {
    const { status } = await callAs('eo_tenant', 'GET', '/config', {
      queryParams: { event_id: 'evt_lain' },
      userExtras: { assigned_events: ['evt_1'] },
    });
    expect(status).toBe(403);
  });

  it('200 untuk /config event yang ditugaskan', async () => {
    const { status } = await callAs('eo_tenant', 'GET', '/config', {
      queryParams: { event_id: 'evt_1' },
      userExtras: { assigned_events: ['evt_1'] },
    });
    expect(status).toBe(200);
  });

  it('stats tanpa penugasan = nol, tanpa menyentuh tabel', async () => {
    const { status, body } = await callAs('eo_tenant', 'GET', '/stats', {
      userExtras: { assigned_events: [] },
    });

    expect(status).toBe(200);
    expect(body.data).toEqual({
      total_responses: 0,
      organizer_responses: 0,
      public_responses: 0,
      unique_events: 0,
      mall_avg: null,
      eo_avg: null,
      nps_score: null,
      recent: [],
    });
    // Tidak ada query ke tabel survey sama sekali (hanya lookup user oleh auth).
    expect(dbState.queries.filter((q) => q.sql.includes('survey_responses'))).toHaveLength(0);
  });

  it('stats dengan penugasan event lain = nol (lingkup benar-benar diterapkan)', async () => {
    const { status, body } = await callAs('eo_tenant', 'GET', '/stats', {
      userExtras: { assigned_events: ['evt_lain'] },
    });

    expect(status).toBe(200);
    expect(body.data.total_responses).toBe(0);
    expect(body.data.mall_avg).toBeNull();
    expect(body.data.eo_avg).toBeNull();
    expect(body.data.nps_score).toBeNull();
    const aggregate = dbState.queries.find((q) => q.sql.includes('AS total_responses'));
    expect(aggregate.params).toEqual([['evt_lain']]);
  });

  it('staff & viewer tetap melihat statistik global (tanpa parameter event)', async () => {
    for (const role of ['admin', 'viewer']) {
      dbState.queries = [];
      const { status, body } = await callAs(role, 'GET', '/stats');

      expect(status, role).toBe(200);
      expect(body.data.total_responses, role).toBe(1);
      const aggregate = dbState.queries.find((q) => q.sql.includes('AS total_responses'));
      expect(aggregate.sql, role).not.toContain('ANY(');
      expect(aggregate.params, role).toEqual([]);
    }
  });
});

describe('POST /submit — event harus ada', () => {
  const VALID_SUBMISSION = {
    event_id: 'evt_1',
    survey_type: 'public',
    mall_cleanliness: 9, mall_staff_service: 9, mall_coordination: 9, mall_security: 9,
    eo_event_quality: 9, eo_organization: 9, eo_committee_service: 9,
    eo_promotion_accuracy: 9, eo_recommendation: 9,
  };

  it('404 bila event tidak ada dan tidak menyentuh INSERT', async () => {
    dbState.events = [];
    const { status } = await callAs('admin', 'POST', '/submit', { body: { ...VALID_SUBMISSION } });

    expect(status).toBe(404);
    expect(dbState.queries.some((q) => q.sql.includes('INSERT INTO survey_responses'))).toBe(false);
  });

  it('201 bila event ada — tidak mensyaratkan survey_config aktif', async () => {
    dbState.config = null;
    const { status, body } = await callAs('admin', 'POST', '/submit', { body: { ...VALID_SUBMISSION } });

    expect(status).toBe(201);
    expect(body.success).toBe(true);
    expect(dbState.queries.some((q) => q.sql.includes('INSERT INTO survey_responses'))).toBe(true);
  });
});
