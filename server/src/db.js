/**
 * PostgreSQL connection pool (pg) untuk backend VPS.
 *
 * Graceful degradation: bila DATABASE_URL tidak ada / DB tidak terjangkau,
 * server TETAP BOOT (warning saat start), dan setiap permintaan yang butuh DB
 * mendapat 503 bersih dengan pesan Indonesia.
 *
 * `db.query` melempar Error dengan `code = 'DB_UNAVAILABLE'` bila pool belum
 * pernah terverifikasi; `db.ready` = status verifikasi terakhir.
 */
import pg from 'pg';

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || '';
const POOL_MAX = Number(process.env.DB_POOL_MAX || 10);

/** Error bertanda DB tak tersedia — middleware mengubahnya jadi 503. */
export class DbUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DbUnavailableError';
    this.code = 'DB_UNAVAILABLE';
    this.status = 503;
  }
}

function connectionStringMissing() {
  return {
    ready: false,
    lastError: 'DATABASE_URL belum dikonfigurasi',
    async query() {
      throw new DbUnavailableError('Database belum dikonfigurasi (DATABASE_URL kosong)');
    },
    async end() {},
  };
}

function createPool() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    idleTimeoutMillis: 300_000,
    connectionTimeoutMillis: 5_000,
    max: POOL_MAX,
  });

  // pg meng-emit error untuk idle client yang mati — jangan crash server.
  pool.on('error', (err) => {
    console.error('[db] idle client error:', err.message);
  });

  let verified = false;
  let verifying = null;

  async function verify() {
    if (verifying) return verifying;
    verifying = (async () => {
      try {
        await pool.query('SELECT 1');
        verified = true;
        return true;
      } catch (err) {
        verified = false;
        tagged.lastError = err.message;
        return false;
      } finally {
        verifying = null;
      }
    })();
    return verifying;
  }

  const tagged = {
    ready: false,
    lastError: null,
    async query(text, params) {
      if (!verified) {
        const ok = await verify();
        if (!ok) {
          throw new DbUnavailableError(`Database tidak tersedia: ${tagged.lastError || 'unknown'}`);
        }
      }
      try {
        const result = await pool.query(text, params);
        tagged.ready = true;
        return result;
      } catch (err) {
        // Koneksi-level error (08xxx) → pool mungkin mati; verifikasi ulang
        // pada panggilan berikutnya.
        if (String(err?.code || '').startsWith('08')) {
          verified = false;
          tagged.ready = false;
        }
        throw err;
      }
    },
    async end() {
      await pool.end();
    },
  };

  // Sinkronkan `ready` publik dengan hasil verifikasi pertama saat boot.
  void verify().then((ok) => {
    tagged.ready = ok;
    if (!ok) {
      console.warn(`[db] Database belum siap (DATABASE_URL${DATABASE_URL ? '' : ' kosong'}) — server jalan, endpoint DB akan 503.`);
    }
  }).catch(() => {});

  return tagged;
}

export const db = DATABASE_URL ? createPool() : connectionStringMissing();

/** true bila verifikasi terakhir sukses (untuk health endpoint / healthz). */
export function isDbReady() {
  return db.ready;
}