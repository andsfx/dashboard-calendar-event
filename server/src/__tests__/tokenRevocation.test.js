/**
 * Uji pencabutan token server-side (temuan audit 2026-10-04).
 *
 * Lingkungan `node`, bukan jsdom: `auth.js` menandatangani JWT lewat
 * `secretKey()` (TextEncoder Node) dan `jose` menolak encoder milik jsdom
 * ("payload must be an instance of Uint8Array"). Tes ini menguji kriptografi
 * nyata, jadi harus berjalan di realm yang sama dengan server produksi.
 *
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Pencabutan token server-side (temuan audit 2026-10-04).
 *
 * Sebelum ini: refresh token berumur 30 hari tidak bisa dicabut. `signRefresh`
 * tidak membawa `jti`/versi, `verifyToken` hanya memeriksa tanda tangan + `typ`,
 * dan `POST /auth/logout` hanya menghapus cookie. Salinan refresh token yang
 * dicuri tetap bisa menukar access token baru sampai kedaluwarsa penuh.
 *
 * Tes ini memakai signer `jose` SUNGGUHAN (bukan mock) dan hanya memalsukan
 * baris DB, sehingga yang diuji adalah logika verifikasi nyata: token yang
 * ditandatangani dengan benar tetap ditolak bila versinya tidak cocok.
 */
const USER_ID = '11111111-1111-4111-8111-111111111111';

const dbState = {
  user: null,
  queries: [],
  /** Bump token_version seperti yang dilakukan logout/reset. */
  bumpVersion() {
    if (this.user) this.user.token_version += 1;
  },
};

vi.mock('../db.js', () => ({
  db: {
    query: vi.fn(async (sql, params) => {
      dbState.queries.push({ sql, params });
      if (/FROM users/i.test(sql)) {
        const found = dbState.user && params?.[0] === dbState.user.id ? dbState.user : null;
        return { rows: found ? [{ ...found }] : [], rowCount: found ? 1 : 0 };
      }
      if (/token_version = token_version \+ 1/i.test(sql)) {
        dbState.bumpVersion();
        return { rows: [], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }),
  },
}));

vi.stubEnv('JWT_SECRET', 'test-secret-untuk-uji-pencabutan-token');

/** Mock tipis req/res agar `authenticate` bisa dipanggil tanpa Express. */
function makeReqRes({ cookies = {} } = {}) {
  const req = { headers: { cookie: Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ') }, cookies, ip: '127.0.0.1', socket: {} };
  const setCookies = [];
  const res = { cookie: (n, v) => setCookies.push([n, v]), clearCookie: () => {}, setHeader: () => {}, getHeader: () => undefined, _setCookies: setCookies };
  return { req, res };
}

async function freshAuth() {
  vi.resetModules();
  return import('../auth.js');
}

function activeUser(tokenVersion = 0) {
  return {
    id: USER_ID,
    email: 'admin@example.com',
    display_name: 'Admin',
    role: 'superadmin',
    is_active: true,
    token_version: tokenVersion,
  };
}

describe('pencabutan token lewat token_version', () => {
  beforeEach(() => {
    dbState.user = activeUser(0);
    dbState.queries = [];
  });

  it('pasangan token yang baru diterbitkan lolos autentikasi', async () => {
    const { signAccess, signRefresh, authenticate } = await freshAuth();
    const access = await signAccess(dbState.user);
    const refresh = await signRefresh(dbState.user.id, dbState.user.token_version);

    const viaAccess = await authenticate(makeReqRes({ cookies: { 'sb-access-token': access } }).req, makeReqRes().res);
    expect(viaAccess?.user?.id).toBe(USER_ID);

    const viaRefresh = await authenticate(makeReqRes({ cookies: { 'sb-refresh-token': refresh } }).req, makeReqRes().res);
    expect(viaRefresh?.user?.id).toBe(USER_ID);
  });

  it('setelah bump, refresh token LAMA ditolak dan tidak bisa ditukar', async () => {
    const { signRefresh, authenticate } = await freshAuth();
    const staleRefresh = await signRefresh(dbState.user.id, dbState.user.token_version);

    dbState.bumpVersion(); // simulasi logout / reset password

    const { req, res } = makeReqRes({ cookies: { 'sb-refresh-token': staleRefresh } });
    const result = await authenticate(req, res);

    expect(result).toBeNull();
    // Tidak boleh ada cookie baru yang di-set (rotasi tidak terjadi).
    expect(res._setCookies).toHaveLength(0);
  });

  it('setelah bump, access token LAMA ditolak', async () => {
    const { signAccess, authenticate } = await freshAuth();
    const staleAccess = await signAccess(dbState.user);

    dbState.bumpVersion();

    const result = await authenticate(makeReqRes({ cookies: { 'sb-access-token': staleAccess } }).req, makeReqRes().res);
    expect(result).toBeNull();
  });

  it('token dengan versi yang tidak cocok ditolak (bukan hanya yang lebih tua)', async () => {
    const { signAccess, authenticate } = await freshAuth();
    // Versi di token lebih BARU daripada DB — tetap harus ditolak.
    const futureToken = await signAccess({ ...dbState.user, token_version: 7 });

    const result = await authenticate(makeReqRes({ cookies: { 'sb-access-token': futureToken } }).req, makeReqRes().res);
    expect(result).toBeNull();
  });

  it('login SETELAH bump menerbitkan token dengan versi baru (tidak langsung mati)', async () => {
    const { signAccess, signRefresh, authenticate } = await freshAuth();
    dbState.bumpVersion(); // mis. logout lalu login lagi

    // Simulasi login: token ditandatangani dari baris user yang sudah di-bump.
    const access = await signAccess(dbState.user);
    const refresh = await signRefresh(dbState.user.id, dbState.user.token_version);

    expect(await authenticate(makeReqRes({ cookies: { 'sb-access-token': access } }).req, makeReqRes().res)).not.toBeNull();
    expect(await authenticate(makeReqRes({ cookies: { 'sb-refresh-token': refresh } }).req, makeReqRes().res)).not.toBeNull();
  });

  it('token pra-migrasi tanpa claim `ver` dianggap versi 0', async () => {
    const { authenticate } = await freshAuth();
    // Token lama: ditandatangani tanpa claim ver (seperti sebelum kolom ada).
    // Secret dibangun sebagai Uint8Array eksplisit — TextEncoder global di
    // jsdom menghasilkan tipe yang ditolak jose ("must be an instance of
    // Uint8Array"), sama seperti secretKey() di produksi (yang memakai
    // TextEncoder Node, bukan jsdom).
    const { SignJWT } = await import('jose');
    const secret = Uint8Array.from(Buffer.from('test-secret-untuk-uji-pencabutan-token', 'utf8'));
    const legacy = await new SignJWT({ typ: 'access', role: 'superadmin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(USER_ID)
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(secret);

    // Versi stored 0 → legacy (ver absen = 0) masih sah: deploy tidak
    // memaksa semua orang login ulang.
    expect(await authenticate(makeReqRes({ cookies: { 'sb-access-token': legacy } }).req, makeReqRes().res)).not.toBeNull();

    // Tapi begitu versi dinaikkan, token legacy itu mati seperti yang lain.
    dbState.bumpVersion();
    expect(await authenticate(makeReqRes({ cookies: { 'sb-access-token': legacy } }).req, makeReqRes().res)).toBeNull();
  });

  it('normalizeTokenVersion memetakan nilai tak sah ke 0', async () => {
    const { normalizeTokenVersion } = await freshAuth();
    expect(normalizeTokenVersion(undefined)).toBe(0);
    expect(normalizeTokenVersion(null)).toBe(0);
    expect(normalizeTokenVersion('3')).toBe(3);
    expect(normalizeTokenVersion(-1)).toBe(0);
    expect(normalizeTokenVersion(1.5)).toBe(0);
    expect(normalizeTokenVersion(NaN)).toBe(0);
  });
});