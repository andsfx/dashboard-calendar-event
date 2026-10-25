/**
 * `db.withTransaction` — semua pernyataan dalam satu koneksi, commit/rollback.
 *
 * Latar: batch INSERT dan update berantai sebelumnya dijalankan sebagai
 * pernyataan lepas (pool = koneksi berbeda per query), sehingga kegagalan di
 * tengah meninggalkan data setengah jadi. Helper ini harus: verifikasi DB,
 * ambil SATU client, BEGIN → fn(client) → COMMIT, rollback saat melempar, dan
 * selalu melepas client.
 *
 * `pg` di-mock: yang diuji adalah urutan perintah dan pelepasan client, bukan
 * driver-nya.
 *
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const clientCalls = [];
const released = [];

const fakeClient = {
  query: vi.fn(async (sql) => {
    clientCalls.push(sql);
    return { rows: [], rowCount: 0 };
  }),
  release: vi.fn((err) => {
    released.push(err);
  }),
};

const fakePool = {
  query: vi.fn(async () => ({ rows: [{ '?column?': 1 }] })),
  connect: vi.fn(async () => fakeClient),
  on: vi.fn(),
  end: vi.fn(async () => {}),
};

vi.mock('pg', () => ({
  default: {
    Pool: class {
      constructor() {
        return fakePool;
      }
    },
    types: { setTypeParser: vi.fn() },
  },
}));

vi.stubEnv('DATABASE_URL', 'postgres://test/test');

const { db } = await import('../db.js');

beforeEach(() => {
  clientCalls.length = 0;
  released.length = 0;
  fakeClient.query.mockClear();
  fakeClient.release.mockClear();
  fakePool.connect.mockClear();
});

describe('db.withTransaction', () => {
  it('BEGIN → fn(client) → COMMIT lalu melepas client', async () => {
    const result = await db.withTransaction(async (client) => {
      await client.query('INSERT INTO events (id) VALUES ($1)', ['evt_1']);
      return 'selesai';
    });

    expect(result).toBe('selesai');
    expect(fakePool.connect).toHaveBeenCalledTimes(1);
    expect(clientCalls[0]).toBe('BEGIN');
    expect(clientCalls[1]).toBe('INSERT INTO events (id) VALUES ($1)');
    expect(clientCalls[2]).toBe('COMMIT');
    expect(fakeClient.release).toHaveBeenCalledTimes(1);
    // Tanpa error → client kembali ke pool (release(null)).
    expect(released[0]).toBeNull();
  });

  it('ROLLBACK dan melempar ulang saat callback gagal', async () => {
    const boom = Object.assign(new Error('check violation'), { code: '23514' });

    await expect(db.withTransaction(async () => {
      throw boom;
    })).rejects.toBe(boom);

    expect(clientCalls).toContain('BEGIN');
    expect(clientCalls).toContain('ROLLBACK');
    expect(clientCalls).not.toContain('COMMIT');
    expect(fakeClient.release).toHaveBeenCalledTimes(1);
  });

  it('menandai client rusak (release dengan error) saat koneksi putus', async () => {
    const connErr = Object.assign(new Error('connection terminated'), { code: '08006' });

    await expect(db.withTransaction(async () => {
      throw connErr;
    })).rejects.toBe(connErr);

    expect(released[0]).toBe(connErr);
  });
});
