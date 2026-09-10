/**
 * dump-prod.mjs — Dump 20 tabel inti dari Supabase prod ke scripts/migrate/seed/*.json.
 *
 * ⚠️  SEKALI-PAKAI — SUDAH DIJALANKAN (2026-09-08, 811 baris ter-seed ke VPS).
 *     Migrasi selesai + audit parity 20/20 (2026-09-10). Jangan jalankan lagi.
 *     Prasyaratnya (`SUPABASE_ACCESS_TOKEN` PAT di `.env.supabase`) sudah DIHAPUS
 *     dari repo lokal sebagai bagian dari penutupan Supabase; skrip akan gagal
 *     preflight bila dijalankan tanpa mengisi ulang token itu.
 *
 * Sumber: Management API  POST https://api.supabase.com/v1/projects/<ref>/database/query
 * (butuh SUPABASE_ACCESS_TOKEN PAT `sbp_...` di .env.supabase — gitignored).
 * SELECT * read-only terhadap PROD. TIDAK ada --run → DRY-RUN (hanya validasi env,
 * tanpa request, tanpa tulis file). Data aman (public read via RLS; dipakai service/PAT).
 *
 * Usage:
 *   node scripts/migrate/dump-prod.mjs                 # dry-run: cek env + daftar tabel
 *   node scripts/migrate/dump-prod.mjs --run           # dump semua tabel → seed/*.json
 *   node scripts/migrate/dump-prod.mjs --run --table=events   # satu tabel saja
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  loadEnv, parseCli, projectRefFromUrl, TABLES,
  SEED_DIR, log, warn, fail,
} from './_shared.mjs';

loadEnv();

const cli = parseCli(process.argv.slice(2));

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || '';
const PROJECT_REF = projectRefFromUrl(SUPABASE_URL);

log('=== dump-prod.mjs — Supabase prod → seed/*.json ===\n');
log(`Project ref : ${PROJECT_REF || '(tidak diketahui — VITE_SUPABASE_URL kosong)'}`);
log(`PAT         : ${ACCESS_TOKEN ? ACCESS_TOKEN.slice(0, 4) + '…' + ACCESS_TOKEN.slice(-4) + ' (ok)' : 'KOSONG — butuh SUPABASE_ACCESS_TOKEN di .env.supabase'}`);
log(`Mode        : ${cli.run ? 'RUN — akan SELECT * dari prod dan tulis seed/*.json' : 'DRY-RUN (default) — tidak ada request / tidak menulis file'}\n`);

if (!cli.run) {
  log('Tabel target (20, urutan seed):');
  for (const t of TABLES) log(`  - ${t}`);
  log('\nJalankan dengan `--run` untuk dump sungguhan.');
  process.exit(0);
}

if (!SUPABASE_URL || !ACCESS_TOKEN) {
  fail('VITE_SUPABASE_URL dan SUPABASE_ACCESS_TOKEN wajib diisi (file .env.supabase, gitignored).');
}

const tables = cli.table ? [cli.table] : TABLES;

async function queryOne(sql, label) {
  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ACCESS_TOKEN}` },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${label} gagal (HTTP ${res.status}): ${text.slice(0, 800)}`);
  }
  const text = await res.text();
  return text.trim() ? JSON.parse(text) : [];
}

async function dumpTable(table) {
  const rows = await queryOne(`SELECT * FROM public.${table};`, `SELECT ${table}`);
  const file = join(SEED_DIR, `${table}.json`);
  mkdirSync(SEED_DIR, { recursive: true });
  writeFileSync(file, JSON.stringify(rows, null, 2), 'utf8');
  log(`  ✓ ${table.padEnd(26)} ${String(rows.length).padStart(5)} baris → ${file}`);
  return rows.length;
}

log(`Mulai dump ${tables.length} tabel dari prod (Management API)...\n`);
const summary = [];
for (const t of tables) {
  try {
    summary.push([t, await dumpTable(t)]);
  } catch (err) {
    warn(`  ✗ ${t}: ${err.message}`);
  }
}

log('\n=== Ringkasan ===');
for (const [t, n] of summary) log(`  ${t.padEnd(26)} ${n} baris`);
const total = summary.reduce((a, [, n]) => a + n, 0);
log(`\nTotal ${total} baris → ${SEED_DIR}`);
log('Langkah berikut: node scripts/migrate/photos-to-r2.mjs --apply  (pindahkan media ke R2)');
log('               : node scripts/migrate/seed-vps.mjs            (seed ke VPS; --apply untuk eksekusi)');
