/**
 * Supabase client — DILEPAS (Opsi B).
 *
 * Frontend kini memakai `src/lib/rest.ts` (fetch REST ke backend VPS).
 * File ini sengaja dipertahankan sebagai shim tipis agar impor lama:
 *
 * 1. Gagal EKSPLISIT saat runtime (bukan diam / undefined) kalau ada call-site
 *    supabase-js yang belum dimigrasi — daftarnya di src/lib/REST-MIGRATION.md.
 * 2. `ConfigError` tetap diekspor agar modul yang mengimpornya tidak pecah saat
 *    import-time (kegagalan eksplisit yang sama, bukan ReferenceError misterius).
 */

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

function notMigrated(): never {
  throw new Error(
    'supabase-js dilepas (Opsi B) — pakai src/lib/rest.ts (apiGet/apiPost). ' +
      'Lihat src/lib/REST-MIGRATION.md untuk sisa call-site.',
  );
}

/**
 * Shim pemicu error. Semua permukaan supabase-js yang dulu dipakai
 * (from / rpc / auth / storage / channel) memanggil notMigrated().
 */
export const supabase = {
  from: notMigrated,
  rpc: notMigrated,
  auth: { getUser: notMigrated, getSession: notMigrated },
  storage: { from: notMigrated },
  channel: notMigrated,
  removeChannel: notMigrated,
};
