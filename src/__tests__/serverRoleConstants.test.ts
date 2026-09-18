import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';

/**
 * Regresi kelas bug: konstanta role di-rename di blok import tapi satu
 * pemakaian di body tertinggal menunjuk nama lama.
 *
 * `server/` adalah ESM JavaScript: tidak dicek `tsc` (bukan TS) dan
 * di-exclude dari vitest (lihat vitest.config.ts) — jadi `import` yang
 * menggantung TIDAK terdeteksi tooling apa pun. Ia baru meledak sebagai
 * `ReferenceError` saat endpoint dipanggil, di runtime produksi.
 *
 * Nyata terjadi: `tenant.js` memakai `ANALYTICS_READ_ROLES` di body setelah
 * import-nya diganti ke `ANALYTICS_READ_ROLES_WITH_DEMO` → GET
 * /tenant/analytics 502 di produksi.
 */
// Vitest (jsdom) tidak menjamin __dirname menunjuk folder file ini, jadi
// pakai cwd — vitest selalu dijalankan dari root repo (lihat package.json).
const ROOT = resolve(process.cwd(), 'server/src');

const ROLE_CONSTANTS = [
  'STAFF_ROLES',
  'ANALYTICS_READ_ROLES',
  'ANALYTICS_READ_ROLES_WITH_DEMO',
  'LIST_READ_ROLES',
  'LIST_READ_ROLES_WITH_DEMO',
  'DEMO_ROLE',
  'DEMO_READ_ROLES',
  'DEMO_READ_ACTIONS',
  'canPerformAdminAction',
  'maskEmail',
];

function serverFiles(): string[] {
  const routes = readdirSync(join(ROOT, 'routes'))
    .filter(f => f.endsWith('.js'))
    .map(f => join(ROOT, 'routes', f));
  return [join(ROOT, 'auth.js'), ...routes];
}

/** Nama yang diimpor ATAU didefinisikan (export const/function) di file. */
function declaredNames(src: string): Set<string> {
  const declared = new Set<string>();
  // import { A, B } from '...'
  for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from/g)) {
    for (const raw of m[1].split(',')) {
      const name = raw.trim().split(/\s+as\s+/).pop()?.trim();
      if (name) declared.add(name);
    }
  }
  // export const X / export function X / const X =
  for (const m of src.matchAll(/(?:export\s+)?(?:const|function|let)\s+([A-Za-z_$][\w$]*)/g)) {
    declared.add(m[1]);
  }
  return declared;
}

describe('server/ — konstanta role tidak boleh menggantung', () => {
  it('setiap pemakaian konstanta role ter-import atau terdefinisi', () => {
    const problems: string[] = [];

    for (const file of serverFiles()) {
      const src = readFileSync(file, 'utf8');
      const declared = declaredNames(src);
      const rel = file.slice(ROOT.length + 1).replace(/\\/g, '/');

      for (const name of ROLE_CONSTANTS) {
        const used = new RegExp(`\\b${name}\\b`).test(src);
        if (used && !declared.has(name)) {
          problems.push(`${rel} memakai '${name}' tanpa import/definisi`);
        }
      }
    }

    expect(problems).toEqual([]);
  });

  it('modul route bisa di-parse Node tanpa syntax error', async () => {
    // Import nyata menangkap syntax error yang lolos dari pembacaan teks.
    // Modul tidak menjalankan query DB saat import (pool lazy di db.js).
    // Timeout longgar: 10 modul ESM + pg Pool, dan suite penuh (69 file)
    // membuat import ini jauh lebih lambat daripada saat dijalankan sendiri.
    for (const file of serverFiles()) {
      const spec = 'file://' + file.replace(/\\/g, '/');
      await expect(import(/* @vite-ignore */ spec)).resolves.toBeDefined();
    }
  }, 30000);
});
