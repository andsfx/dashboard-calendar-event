import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Kontrak: `events.status` adalah FLAG LIFECYCLE ('draft' | 'published'),
 * bukan sumber kebenaran waktu (ADR 002).
 *
 * Kenyataan yang cause audit 2026-10-04: kolomnya ada di DB dan ditulis dari
 * client, tapi `publishDraft` tidak pernah mengisinya — jadi DEFAULT 'upcoming'
 * berlaku selamanya (258/258 event produksi). SQL yang memercayai kolom itu
 * salah: GET /api/v1/tenant/events mengembalikan 1 dari 5 event aktif dan 12
 * submission tenant survey terkunci.
 *
 * Tes ini mengunci INVARIANT di tingkat sumber, karenaekspresi SQL-nya berada
 * di file .js yang tidak dicek tsc dan tidak diimpor tes route mana pun.
 * Yang diuji: tidak ada writer yang boleh menulis nilai temporal, dan tidak
 * ada filter SQL publik yang boleh memercayai kolom untuk menentukan waktu.
 */
const ROOT = resolve(process.cwd());

function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf8');
}

const admin = read('server/src/routes/admin.js');
const publicRoutes = read('server/src/routes/public.js');
const extra = read('server/src/routes/extra.js');
const tenant = read('server/src/routes/tenant.js');
const mapper = read('src/utils/api/_shared.ts');
const schema = read('server/schema.sql');
const migration = read('server/migrations/2026-10-04-normalize-event-status.sql');

/** Bagian SQL dari satu `case '<name>':` di admin.js. */
function caseBlock(src: string, name: string): string {
  const start = src.indexOf(`case '${name}'`);
  expect(start, `case '${name}' harus ada`).toBeGreaterThan(-1);
  const rest = src.slice(start + 1);
  const next = rest.search(/\n {4}case '/);
  return next === -1 ? rest : rest.slice(0, next);
}

/**
 * Isi klausa `VALUES (...)` dari sebuah blok SQL. Dipakai untuk membuktikan
 * status dikirim sebagai LITERAL di tuple, bukan sebagai placeholder `$n` yang
 * nilainya berasal dari client. Menguji jarak `status` → `'published'` rapuh:
 * panjang daftar kolom berbeda di tiap writer (createEvent/batch/publishDraft).
 */
function valuesTuple(block: string): string {
  const m = block.match(/VALUES\s*\(([^)]*)\)/);
  expect(m, 'blok harus punya klausa VALUES (...)').not.toBeNull();
  return m?.[1] ?? '';
}

/**
 * Daftar kolom dari `INSERT INTO events (…)`. Wajib dipakai bersama
 * {@link valuesTuple}: `'published'` bisa muncul di tuple VALUES sementara
 * kolom `status` justru DIHAPUS dari daftar kolom — itu persis regresi asli
 * (`publishDraft` tidak menyebut status sama sekali, sehingga DEFAULT yang
 * berlaku). Tanpa cek daftar kolom, tes ini buta terhadap regresi tersebut.
 */
function insertColumns(block: string): string[] {
  const at = block.indexOf('INSERT INTO events');
  expect(at, 'blok harus punya INSERT INTO events').toBeGreaterThan(-1);
  const open = block.indexOf('(', at);
  const valsAt = block.indexOf('VALUES', open);
  return block
    .slice(open + 1, valsAt)
    .split('\n')
    .filter(l => !l.trim().startsWith('--'))
    .join('\n')
    .replace(/[()]/g, ' ')
    .split(',')
    .map(c => c.trim())
    .filter(Boolean);
}

describe('events.status adalah lifecycle-only', () => {
  it('createEvent menulis status literal, bukan nilai dari client', () => {
    const block = caseBlock(admin, 'createEvent');
    // Kolom status HARUS ada di daftar kolom…
    expect(insertColumns(block)).toContain('status');
    // …dan terisi literal 'published', bukan placeholder dari client.
    expect(valuesTuple(block)).toContain("'published'");
    expect(block).not.toMatch(/data\.status/);
  });

  it('batchCreateEvents menulis status literal, bukan nilai dari client', () => {
    const block = caseBlock(admin, 'batchCreateEvents');
    expect(insertColumns(block)).toContain('status');
    expect(valuesTuple(block)).toContain("'published'");
    expect(block).not.toMatch(/data\.status/);
  });

  it('publishDraft menandai event terbit sebagai non-draft secara eksplisit', () => {
    const block = caseBlock(admin, 'publishDraft');
    // Regresi asli: kolom status tidak disebut sama sekali sehingga DEFAULT
    // 'upcoming' berlaku selamanya untuk 258/258 event produksi.
    expect(insertColumns(block)).toContain('status');
    expect(valuesTuple(block)).toContain("'published'");
    expect(block).not.toMatch(/draft\.status/);
  });

  it('updateEvent hanya menerima dua nilai lifecycle dan mengabaikan nilai lain', () => {
    const block = caseBlock(admin, 'updateEvent');
    expect(block).toMatch(/LIFECYCLE_STATES\s*=\s*\{\s*draft:\s*true,\s*published:\s*true\s*\}/);
    // Nilai temporal/unknown harus di-SKIP (continue), bukan dipetakan ke
    // 'published': memetakan apa pun ke published berarti mengubah draft jadi
    // live diam-diam ketika FE mengirim status turunan seperti 'past'.
    // `=== true` (bukan truthy) mencegah key bawaan Object lolos.
    expect(block).toMatch(/if \(LIFECYCLE_STATES\[data\.status\] !== true\) continue;/);
    // Dan status harus di-push apa adanya, bukan hasil koersi.
    expect(block).toMatch(/values\.push\(data\.status\);/);
  });

  it('whitelist updateEvent tidak lagi memuat status sebagai kolom bebas', () => {
    const block = caseBlock(admin, 'updateEvent');
    const allowed = block.match(/const ALLOWED = new Set\(\[([\s\S]*?)\]\)/);
    expect(allowed, 'whitelist ALLOWED harus ada').not.toBeNull();
    const columns = (allowed?.[1] ?? '').split(',').map(c => c.trim());
    expect(columns).not.toContain('status');
  });

  it('mapper client hanya mengirim status saat nilainya draft', () => {
    expect(mapper).toMatch(/if \(ev\.status === 'draft'\) row\.status = 'draft'/);
    expect(mapper).not.toMatch(/if \(ev\.status !== undefined\) row\.status = ev\.status/);
  });
});

describe('tidak ada filter temporal yang memercayai kolom status', () => {
  it('public.js hanya menyingkirkan draft, bukan memfilter waktu', () => {
    // Izinkan 'draft' sebagai satu-satunya-satunya nilai yang dibaca.
    expect(publicRoutes).not.toMatch(/status\s+(=|IN)\s*\(\s*'upcoming'/);
    expect(publicRoutes).not.toMatch(/status\s*=\s*'past'/);
  });

  it('extra.js tidak menyaring event sponsor dengan status temporal', () => {
    expect(extra).not.toMatch(/e\.status\s*=\s*'upcoming'/);
    // Gate visibilitas draft tetap ada.
    expect(extra).toMatch(/e\.status\s*<>\s*'draft'/);
  });

  it('tenant.js menyaring dengan tanggal, bukan status temporal', () => {
    expect(tenant).not.toMatch(/status IN \('past', 'ongoing'\)/);
    // Gate draft tetap dipertahankan.
    expect(tenant).toMatch(/e\.status <> 'draft'/);
  });
});

describe('DDL dan migrasi konsisten', () => {
  it('schema.sql mendeklarasikan default published dan indeks parsial draft', () => {
    expect(schema).toMatch(/status TEXT DEFAULT 'published'/);
    expect(schema).toContain('idx_events_draft');
    // Baseline TIDAK boleh memasang constraint lewat ADD CONSTRAINT terpisah:
    // itu dievaluasi ulang pada DB existing dan gagal selama baris temporal
    // legacy masih ada. Jalur aman hanya migrasi terurut (backfill → constraint).
    expect(schema).not.toMatch(/ADD CONSTRAINT chk_events_status_lifecycle/);
  });

  it('migrasi menormalkan nilai temporal sebelum memasang constraint', () => {
    const updateAt = migration.indexOf("SET status = 'published'");
    const constraintAt = migration.indexOf('ADD CONSTRAINT chk_events_status_lifecycle');
    expect(updateAt).toBeGreaterThan(-1);
    expect(constraintAt).toBeGreaterThan(-1);
    // Urutan wajib: data dibersihkan dulu, baru gerbang write dipasang.
    expect(updateAt, 'backfill harus sebelum constraint').toBeLessThan(constraintAt);
    // Gerbangnya sendiri harus benar-benar membatasi ke dua nilai lifecycle —
    // constraint yang lebih longgar (mis. IS NOT NULL) tidak menjaga apa pun.
    expect(migration).toMatch(/CHECK \(status IN \('draft', 'published'\)\)/);
    expect(migration).toMatch(/DROP INDEX IF EXISTS idx_events_status/);
    expect(migration).not.toMatch(/\bDELETE FROM\b/);
    expect(migration).not.toMatch(/\bDROP TABLE\b/);
  });
});