import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Gate role router aksi admin: siapa yang boleh MEMBACA dan siapa yang boleh
 * MENULIS.
 *
 * Sebelum perbaikan, gate router memakai `DEMO_READ_ROLES` = staff + demo,
 * sehingga `viewer` ditolak 403 di gate untuk SEMUA aksi — padahal klien
 * menampilkan halaman itu kepadanya (`canViewTenantProposals` /
 * `canViewRegistrations` = isViewer) dan SPEC.md §2 memberinya hak "view" pada
 * registrasi. Akibatnya akun viewer melihat banner 403 permanen tanpa retry.
 *
 * Kontrak yang dikunci di sini:
 *   - viewer  → aksi BACA 200, aksi TULIS 403 (pesan baca-saja)
 *   - demo    → perilaku lama tidak berubah (baca 200, tulis 403)
 *   - eo_tenant / tenant_relation → tetap 403 (SPEC tidak memberi mereka akses)
 *   - staff   → lolos gate (400 dari zod = sudah masuk handler, bukan ditolak)
 *
 * `auth.js` sengaja TIDAK di-mock: gate yang diuji adalah `requireRole` asli
 * dengan daftar role asli. Hanya lapisan DB dan rate limit yang di-mock.
 *
 * @vitest-environment node
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-role-gate-0123456789';

const users = new Map();

vi.mock('../../db.js', () => ({
  db: { query: vi.fn(async (sql, params) => (/FROM users/i.test(sql) ? { rows: [users.get(params?.[0])].filter(Boolean) } : { rows: [] })) },
}));

vi.mock('../../lib/rateLimit.js', () => ({
  clientIp: () => '127.0.0.1',
  enforceRateLimit: () => true,
}));

const ACTION_PATH = '/:action';

async function callAs(role, action) {
  const auth = await import('../../auth.js');
  const { default: router } = await import('../admin.js');
  const layer = router.stack.find((l) => l.route && l.route.path === ACTION_PATH && l.route.methods.post);

  const user = { id: `u_${role}`, email: `${role}@example.com`, display_name: role, role, is_active: true, token_version: 0 };
  users.set(user.id, user);
  const token = await auth.signAccess(user);

  const req = {
    method: 'POST',
    url: `/${action}`,
    body: { action },
    headers: { cookie: `sb-access-token=${token}` },
    cookies: { 'sb-access-token': token },
    ip: '127.0.0.1',
    socket: {},
    params: { action },
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
  const step = (err) => {
    if (err) return settle.reject(err);
    const handle = chain.shift();
    if (!handle) return settle.reject(new Error('handler selesai tanpa respons'));
    handle(req, res, step);
  };
  step();
  await finished;
  return { status: res.statusCode, error: res._body?.error };
}

const READ_ACTIONS = ['readRegistrations', 'listTenantEventProposals', 'listEvents', 'readDrafts'];
const WRITE_ACTIONS = ['updateTenantEventProposal', 'deleteTenantEventProposal', 'updateRegistrationStatus'];
const READ_ONLY_MESSAGE = 'Akun baca-saja hanya dapat melihat data (read-only).';

beforeEach(() => {
  users.clear();
});

describe('daftar role gate router admin', () => {
  it('memberi viewer akses baca lewat ADMIN_READ_ROLES', async () => {
    const auth = await import('../../auth.js');

    expect(auth.ADMIN_READ_ROLES).toContain('viewer');
    expect(auth.READ_ONLY_ROLES).toContain('viewer');
  });

  it('tidak membuka permukaan yang SPEC tutup untuk viewer', async () => {
    const auth = await import('../../auth.js');

    // Activity log, manage users, dan export Evaluasi Tenant tetap staff + demo.
    expect(auth.DEMO_READ_ROLES).not.toContain('viewer');
  });
});

describe('viewer — baca boleh, tulis ditolak', () => {
  it('bisa membaca seluruh aksi baca yang dibutuhkan halamannya', async () => {
    for (const action of READ_ACTIONS) {
      const { status } = await callAs('viewer', action);
      expect(status, `viewer ${action}`).toBe(200);
    }
  });

  it('ditolak 403 pada setiap aksi tulis dengan pesan baca-saja', async () => {
    for (const action of WRITE_ACTIONS) {
      const { status, error } = await callAs('viewer', action);
      expect(status, `viewer ${action}`).toBe(403);
      expect(error, `viewer ${action}`).toBe(READ_ONLY_MESSAGE);
    }
  });
});

describe('demo — perilaku lama tidak berubah', () => {
  it('masih bisa membaca dan masih ditolak saat menulis', async () => {
    for (const action of READ_ACTIONS) {
      expect((await callAs('demo', action)).status, `demo ${action}`).toBe(200);
    }
    for (const action of WRITE_ACTIONS) {
      const { status, error } = await callAs('demo', action);
      expect(status, `demo ${action}`).toBe(403);
      expect(error, `demo ${action}`).toBe(READ_ONLY_MESSAGE);
    }
  });
});

describe('role di luar daftar tetap ditolak di gate', () => {
  it('eo_tenant dan tenant_relation tidak mendapat akses baca admin', async () => {
    for (const role of ['eo_tenant', 'tenant_relation']) {
      for (const action of READ_ACTIONS) {
        expect((await callAs(role, action)).status, `${role} ${action}`).toBe(403);
      }
    }
  });

  it('staff lolos gate, bukan ditolak role', async () => {
    for (const role of ['superadmin', 'admin']) {
      for (const action of READ_ACTIONS) {
        // 400 = zod menolak body kosong setelah gate dilewati; yang penting bukan 403.
        const { status } = await callAs(role, action);
        expect(status, `${role} ${action}`).not.toBe(403);
      }
    }
  });
});
