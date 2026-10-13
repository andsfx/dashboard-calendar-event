import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Regresi dua bug di `server/src/routes/tenant.js` yang tidak bisa ditangkap
 * tooling: `server/` adalah ESM JavaScript — tidak dicek `tsc`, dan tidak ada
 * tes yang mengimpor modul ini, jadi keduanya hanya meledak saat endpoint
 * dipanggil di produksi.
 *
 * 1. `LABELS` pernah hidup di dalam `pushTextLimitErrors` padahal dipakai juga
 *    oleh `validateDraftSubmission` → `ReferenceError: LABELS is not defined`
 *    → HTTP 500 pada `POST /tenant/create` dengan enum di luar daftar.
 * 2. INSERT `/tenant/create` membuang 4 kolom yang dikirim client dan bisa
 *    ditulis lewat `/update` → draft kehilangan isian, tetap balas 201.
 *
 * Pendekatan: muat modul nyata dengan `../db.js` di-mock, lalu panggil route
 * lewat dispatch Express sungguhan. Yang diuji adalah perilaku yang dilihat
 * user (status HTTP + isi respons), bukan bahwa mock dipanggil.
 */
const query = vi.fn();
const requireRole = vi.fn(() => (_req, _res, next) => next());

vi.mock('../../db.js', () => ({
  db: { query: (...args) => query(...args) },
}));

vi.mock('../../auth.js', () => ({
  requireRole: (...args) => requireRole(...args),
  logActivity: vi.fn(),
  STAFF_ROLES: ['superadmin', 'admin'],
  ANALYTICS_READ_ROLES_WITH_DEMO: ['superadmin', 'admin', 'tenant_relation', 'demo'],
  LIST_READ_ROLES_WITH_DEMO: ['superadmin', 'admin', 'eo_tenant', 'demo'],
  DEMO_READ_ROLES: ['superadmin', 'admin', 'demo'],
}));

/**
 * Dispatch request ke router Express dan kembalikan { status, body }.
 *
 * PENTING: seluruh chain di `layer.route.stack` harus dijalankan berurutan
 * (middleware → handler), bukan hanya `stack[0]`. Kalau hanya layer pertama
 * yang dipanggil, yang dieksekusi adalah `requireRole` saja — handler async
 * `/create` tidak pernah jalan, tidak ada query ke DB, dan test terlihat
 * "hijau" tanpa menguji apa pun.
 */
async function call(method, path, { body = {}, user = { id: 'u1' }, headers = {} } = {}) {
  const { default: router } = await import('../tenant.js');
  const req = {
    method,
    url: path,
    body,
    headers,
    ip: '127.0.0.1',
    socket: {},
    params: {},
    query: {},
    auth: { user },
  };
  let settle;
  const finished = new Promise((resolve, reject) => { settle = { resolve, reject }; });
  const res = {
    statusCode: 200,
    _body: null,
    // Handler async selesai lewat res.json(), bukan next() — di sinilah
    // request dianggap selesai.
    status(code) { this.statusCode = code; return this; },
    json(payload) { this._body = payload; settle.resolve(); return this; },
  };
  const layer = router.stack.find(
    l => l.route && l.route.path === path && l.route.methods[method.toLowerCase()],
  );
  if (!layer) throw new Error(`route not found: ${method} ${path}`);

  const chain = layer.route.stack.map(s => s.handle);
  let i = 0;
  const step = (err) => {
    if (err) return settle.reject(err);
    const fn = chain[i++];
    if (!fn) return settle.resolve();
    try {
      const out = fn(req, res, step);
      // Handler async: tunggu promise-nya, error-nya jadi reject.
      if (out && typeof out.then === 'function') out.then(() => {}, settle.reject);
    } catch (e) {
      settle.reject(e);
    }
  };
  step();
  await finished;
  return { status: res.statusCode, body: res._body };
}

/**
 * Memetakan setiap kolom INSERT ke nilai yang benar-benar dikirim pada
 * placeholder-nya. Kegagalan nyata: daftar kolom menaruh `business_*`/lift
 * SEBELUM `pic_name`, tapi array parameter menaruh `pic_name` lebih dulu →
 * nomor PJ tersimpan ke kolom enum dan gagal sebagai 22P02, atau lebih buruk
 * tersimpan tanpa error ke kolom yang salah.
 */
function columnBindings(sql) {
  const seg = sql.slice(sql.indexOf(INSERTED), sql.indexOf('RETURNING'));
  // Strip tanda kurung: kolom terakhir masih membawa ')' penutup daftar.
  const colBlock = seg.slice(seg.indexOf('(') + 1, seg.indexOf('VALUES')).replace(/[()]/g, ' ');
  const cols = colBlock
    .split(',')
    .map(c => c.trim())
    .filter(Boolean);
  const vals = seg.match(/VALUES \(([^)]*)\)/)[1].split(',').map(v => v.trim());
  return { cols, vals };
}

/** Bind placeholder $n → nilai array params pada indeks n-1. */
function boundRow(sql, params) {
  const { cols, vals } = columnBindings(sql);
  const row = {};
  cols.forEach((col, i) => {
    const v = vals[i];
    row[col] = v === "'draft'" ? 'draft' : params[Number(String(v).replace('$', '')) - 1];
  });
  return row;
}

const INSERTED = 'INSERT INTO tenant_event_surveys';

describe('POST /tenant/create — validasi enum tidak melempar 500', () => {
  beforeEach(() => {
    query.mockReset();
    query.mockResolvedValue({ rows: [{ id: 'sv1' }], rowCount: 1 });
  });

  it('menolak enum tak dikenal dengan 400 + pesan Bahasa Indonesia', async () => {
    const { status, body } = await call('POST', '/create', {
      body: { event_id: 'evt_1', kategori: 'Kategori Karangan' },
    });

    // Regresi: ReferenceError → 500 dengan pesan "LABELS is not defined".
    expect(status).toBe(400);
    expect(query).not.toHaveBeenCalled();
    expect(body.errors.join(' ')).toContain('Kategori');
    expect(body.errors.join(' ')).not.toContain('LABELS');
  });

  it('menolak enum tak dikenal pada tiap field enum', async () => {
    for (const [field, label] of [
      ['lokasi_zona', 'Lokasi/zona'],
      ['kategori', 'Kategori'],
      ['kenaikan_traffic', 'Kenaikan traffic'],
      ['kenaikan_sales', 'Kenaikan sales'],
    ]) {
      const { status, body } = await call('POST', '/create', {
        body: { event_id: 'evt_1', [field]: 'nilai-ngawur' },
      });
      expect(status, field).toBe(400);
      expect(body.errors.join(' '), field).toContain(label);
    }
  });

  it('tetap menerima draft setengah jadi (enum kosong tidak ditolak)', async () => {
    const { status } = await call('POST', '/create', { body: { event_id: 'evt_1' } });
    expect(status).toBe(201);
  });
});

describe('POST /tenant/create — kolom yang sebelumnya dibuang', () => {
  beforeEach(() => {
    query.mockReset();
    query.mockResolvedValue({ rows: [{ id: 'sv1' }], rowCount: 1 });
  });

  it('menyimpan business_category, subcategory, dan kedua lift pct', async () => {
    const { status } = await call('POST', '/create', {
      body: {
        event_id: 'evt_1',
        business_category: 'fnb',
        business_subcategory: 'Kafe',
        sales_lift_pct: 12.5,
        traffic_lift_pct: 30,
      },
    });

    expect(status).toBe(201);
    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain(INSERTED);
    for (const col of ['business_category', 'business_subcategory', 'sales_lift_pct', 'traffic_lift_pct']) {
      expect(sql, col).toContain(col);
    }
    // Nilai benar-benar terkirim, bukan hardcoded null.
    expect(params).toContain('fnb');
    expect(params).toContain('Kafe');
    expect(params).toContain(12.5);
    expect(params).toContain(30);
  });

  it('mengikat tiap nilai ke kolom yang benar, bukan hanya "ada di params"', async () => {
    const { status } = await call('POST', '/create', {
      body: {
        event_id: 'evt_1',
        tenant_id: 'T-42',
        pic_name: 'Budi Santoso',
        pic_phone: '081234567890',
        business_category: 'fnb',
        business_subcategory: 'Kafe',
        sales_lift_pct: 12.5,
        traffic_lift_pct: 30,
      },
    });

    expect(status).toBe(201);
    const [sql, params] = query.mock.calls[0];
    const row = boundRow(sql, params);

    // Regresi: pic_* pernah menduduki slot business_* (dan sebaliknya).
    expect(row).toMatchObject({
      event_id: 'evt_1',
      tenant_id: 'T-42',
      pic_name: 'Budi Santoso',
      pic_phone: '081234567890',
      business_category: 'fnb',
      business_subcategory: 'Kafe',
      sales_lift_pct: 12.5,
      traffic_lift_pct: 30,
      status: 'draft',
    });
  });

  it('memetakan business_category di luar enum ke null, bukan 500', async () => {
    const { status } = await call('POST', '/create', {
      body: { event_id: 'evt_1', business_category: 'fnb-blah' },
    });

    expect(status).toBe(201);
    const [, params] = query.mock.calls[0];
    expect(params).not.toContain('fnb-blah');
    expect(params).toContain(null);
  });

  it('mengubah lift pct non-numerik menjadi null, bukan menggagalkan insert', async () => {
    const { status } = await call('POST', '/create', {
      body: { event_id: 'evt_1', sales_lift_pct: 'NaN-sekali' },
    });

    expect(status).toBe(201);
    const [sql, params] = query.mock.calls[0];
    expect(params).not.toContain('NaN-sekali');
    expect(params).toContain(null);
    // Sanitasi panjang subcategory sesuai CHECK (1..50).
    expect(sql).toContain('business_subcategory');
  });

  it('jumlah placeholder VALUES sama dengan jumlah kolom INSERT', async () => {
    await call('POST', '/create', { body: { event_id: 'evt_1' } });
    const [sql] = query.mock.calls[0];
    const seg = sql.slice(sql.indexOf(INSERTED), sql.indexOf('RETURNING'));
    const cols = seg.slice(0, seg.indexOf('VALUES'))
      .replace(/[()]/g, ' ')
      .split(',')
      .map(c => c.trim())
      .filter(Boolean);
    const vals = seg.match(/VALUES \(([^)]*)\)/)[1].split(',').map(v => v.trim());
    // status di-sisipkan sebagai literal 'draft', sisanya placeholder.
    expect(cols.length).toBe(vals.length);
    expect(vals[vals.length - 1]).toBe("'draft'");
  });
});