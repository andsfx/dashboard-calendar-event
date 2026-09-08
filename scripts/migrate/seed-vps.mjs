/**
 * seed-vps.mjs — Seed dump prod (seed/*.json) ke Postgres VPS (backend Opsi B).
 *
 * Urutan FK-safe (lihat TABLES di _shared.mjs):
 *   site_settings → event_areas → annual_themes → holidays → community_registrations
 *   → users → events → draft_events → photo_albums → event_photos → area_photos
 *   → news_articles → event_proposals → sponsor_leads → generated_letters
 *   → survey_config → survey_responses → tenant_survey_config → tenant_event_surveys
 *   → activity_logs
 *
 * Catatan penting:
 * - Kolom target di-introspeksi saat koneksi (information_schema): INSERT hanya kolom
 *   yang ADA di VPS (dump prod bisa lebih maju/mundur dari schema VPS) dan literal
 *   dipilih per data_type (json/jsonb/array → literal JSON; text/date/numeric → string).
 * - ON CONFLICT DO NOTHING per baris → idempoten; id unik prod dipertahankan.
 * - URL media di-rewrite ke R2 (seed/photo-url-map.json) hanya untuk kolom media
 *   (MEDIA_COLUMNS di _shared.mjs); event_proposals.file_url & generated_letters
 *   pdf/letter_data TIDAK di-rewrite (bukan media galeri, dipertahankan asli).
 * - Tanpa `--apply` → DRY-RUN: TIDAK konek DB, hanya baca seed + lapor rencana.
 *
 * Usage:
 *   node scripts/migrate/seed-vps.mjs                 # dry-run (tanpa koneksi DB)
 *   node scripts/migrate/seed-vps.mjs --apply         # INSERT (butuh DATABASE_URL)
 *
 * VPS (deploy/vps): Postgres TIDAK mengekspos port host (hanya network Docker
 * metmal). Jalankan seed dari dalam container api yang sudah punya DATABASE_URL
 * (`postgres` hostname) + node_modules lengkap (pg):
 *   docker compose -f deploy/vps/docker-compose.yml exec api \
 *     node scripts/migrate/seed-vps.mjs --apply
 * Repo root ter-bind-mount read-only di /srv/app — seed/*.json ikut terlihat.
 * Alternatif lain (tanpa node): docker compose exec postgres psql (dump manual).
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  loadEnv, parseCli, TABLES, MEDIA_COLUMNS,
  SEED_DIR, PHOTO_URL_MAP_PATH, log, warn, fail,
} from './_shared.mjs';

loadEnv();
const cli = parseCli(process.argv.slice(2));
const apply = cli.run; // --apply == --run

const DATABASE_URL = process.env.DATABASE_URL || '';

// ─── 1. Baca seed ─────────────────────────────────────────────────────────────
const dataByTable = {};
const missing = [];
for (const t of TABLES) {
  const p = join(SEED_DIR, `${t}.json`);
  if (!existsSync(p)) { missing.push(t); continue; }
  try {
    const rows = JSON.parse(readFileSync(p, 'utf8'));
    if (!Array.isArray(rows)) throw new Error('bukan array');
    dataByTable[t] = rows;
  } catch (err) {
    warn(`  ! ${t}.json tidak valid: ${err.message} (dilewati)`);
    missing.push(t);
  }
}

let urlMap = {};
if (existsSync(PHOTO_URL_MAP_PATH)) {
  try {
    const parsed = JSON.parse(readFileSync(PHOTO_URL_MAP_PATH, 'utf8'));
    urlMap = parsed.map || parsed || {};
  } catch { urlMap = {}; }
}
const rewriteCount = Object.keys(urlMap).length;

log('=== seed-vps.mjs — seed/*.json → Postgres VPS ===\n');
log(`Mode        : ${apply ? 'APPLY — INSERT ke VPS' : 'DRY-RUN (default) — tanpa koneksi DB / tanpa tulis'}`);
log(`Mapping R2  : ${rewriteCount} URL lama → R2 (${PHOTO_URL_MAP_PATH})`);
log(`DATABASE_URL: ${DATABASE_URL ? '(tersedia)' : 'KOSONG — di set via deploy/vps/.env (compose exec api) atau export manual'}\n`);

for (const t of TABLES) {
  const n = dataByTable[t]?.length ?? 0;
  log(`  ${t.padEnd(26)} ${String(n).padStart(5)} baris${missing.includes(t) ? '   (TIDAK ADA FILE — dilewati)' : ''}`);
}
const available = Object.entries(dataByTable).filter(([, r]) => r.length > 0);
if (available.length === 0) {
  log('\nTidak ada seed data. Jalankan: node scripts/migrate/dump-prod.mjs --run');
  process.exit(0);
}

if (!apply) {
  log('\nDRY-RUN selesai — jalankan `--apply` untuk INSERT (butuh DATABASE_URL).');
  process.exit(0);
}

if (!DATABASE_URL) fail('--apply butuh DATABASE_URL — set via deploy/vps/.env, export manual, atau jalankan dari dalam container: docker compose -f deploy/vps/docker-compose.yml exec api node scripts/migrate/seed-vps.mjs --apply');

// ─── 2. Konek + intropeksi skema target ───────────────────────────────────────
const { default: pg } = await import('pg');
const client = new pg.Client({ connectionString: DATABASE_URL });
log('\nKoneksi ke VPS...');
await client.connect();

/** data_type/udt_name → cara menulis literal. */
function categoryOf(dataType, udtName) {
  const t = String(dataType || '').toLowerCase();
  const u = String(udtName || '');
  if (u.startsWith('_')) return 'array'; // ARRAY (text[], jsonb[], int[], dst)
  if (t === 'json' || t === 'jsonb') return 'json';
  if (t.startsWith('timestamp')) return 'timestamp';
  if (t === 'boolean') return 'bool';
  if (t === 'date') return 'date';
  const numeric = ['numeric', 'decimal', 'integer', 'bigint', 'smallint', 'real', 'double precision'];
  if (numeric.includes(t)) return 'numeric';
  return 'text'; // text/varchar/uuid/bytea dll — tulis sebagai string
}

async function loadTargetSchema() {
  const schema = {};
  const { rows } = await client.query(
    `SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default,
            is_identity, identity_generation
       FROM information_schema.columns
      WHERE table_schema = 'public'`
  );
  for (const c of rows) {
    if (!schema[c.table_name]) schema[c.table_name] = new Map();
    schema[c.table_name].set(c.column_name, {
      category: categoryOf(c.data_type, c.udt_name),
      notNull: c.is_nullable === 'NO',
      default: c.column_default,
      identityAlways: c.is_identity === 'YES' && c.identity_generation === 'ALWAYS',
    });
  }
  return schema;
}

const schema = await loadTargetSchema();
log('Skema target dibaca (information_schema).');

/** Kolom mana saja yang TIDAK ada di VPS (dari dump) — lapor sekali per tabel. */
for (const table of Object.keys(dataByTable)) {
  const cols = schema[table];
  if (!cols) { warn(`  ! tabel ${table} TIDAK ADA di VPS — dilewati`); continue; }
  const seedRow = dataByTable[table][0];
  if (!seedRow) continue;
  const unknown = Object.keys(seedRow).filter((c) => !cols.has(c));
  if (unknown.length) warn(`  ! ${table}: kolom dump tidak ada di VPS (dilewati saat INSERT): ${unknown.join(', ')}`);
}

// ─── 3. Utilitas nilai ────────────────────────────────────────────────────────
const esc = (s) => `'${String(s).replace(/'/g, "''")}'`;
const jsonLit = (v) => `'${JSON.stringify(v).replace(/'/g, "''")}'`;

/** Rewrite string URL (atau semua string di dalam JSON) lewat mapping R2. */
function rewriteValue(value) {
  if (typeof value === 'string') return urlMap[value] || value;
  if (Array.isArray(value)) return value.map((v) => rewriteValue(v));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = rewriteValue(v);
    return out;
  }
  return value;
}

/**
 * Buat literal per tipe kolom target:
 * - json/jsonb & array → literal JSON (perlu jsonParse untuk jaga string jsonb)
 * - boolean → TRUE/FALSE; numeric → angka; timestamp/date/text → string escape
 * Nilai dari dump Postgres sudah JSON-typed, jadi aman.
 */
function literalFor(columnInfo, raw) {
  if (raw === null || raw === undefined) return 'NULL';
  switch (columnInfo.category) {
    case 'array': {
      // dump pg ARRAY (text[], jsonb[]) tiba sebagai JS array → literal Postgres
      const arr = Array.isArray(raw) ? raw : [raw];
      if (arr.length === 0) return "'{}'"; // ARRAY[] kosong error — pakai '{}'
      const elems = arr.map((v) => {
        if (v === null || v === undefined) return 'NULL';
        // Elemen string ARRAY[] HARUS single-quote — double-quote dibaca Postgres
        // sebagai identifier (bug: column "Kompetisi" does not exist).
        if (typeof v === 'string') return esc(v);
        return String(v); // angka/boolean
      });
      return `ARRAY[${elems.join(', ')}]`;
    }
    case 'json': {
      // dump pg jsonb sudah berupa objek/array/string; parse ulang bila string JSON
      let v = raw;
      if (typeof v === 'string') { try { v = JSON.parse(v); } catch { /* bukan JSON */ } }
      return jsonLit(v);
    }
    case 'bool': return raw ? 'TRUE' : 'FALSE';
    case 'numeric': return Number.isFinite(Number(raw)) ? String(Number(raw)) : 'NULL';
    default: return esc(raw instanceof Date ? raw.toISOString() : raw);
  }
}

function insertSql(table, row, tableSchema, opts = {}) {
  const parts = [];
  for (const [column, raw] of Object.entries(row)) {
    const colInfo = tableSchema.get(column);
    if (!colInfo) continue; // kolom tidak ada di VPS → skip
    // kolom media (string URL / JSON berisi URL) → rewrite mapping
    const value = table in MEDIA_COLUMNS && MEDIA_COLUMNS[table].columns.includes(column)
      ? rewriteValue(raw)
      : raw;
    parts.push({ column, literal: literalFor(colInfo, value) });
  }
  if (parts.length === 0) return null;
  const cols = parts.map((p) => p.column).join(', ');
  const vals = parts.map((p) => p.literal).join(', ');
  const overriding = opts.overridingSystemValue ? ' OVERRIDING SYSTEM VALUE' : '';
  const onConflict = tableSchema.has('id') ? ' (id)' : '';
  return `INSERT INTO public.${table}${overriding} (${cols}) VALUES (${vals}) ON CONFLICT${onConflict} DO NOTHING;`;
}

/**
 * Setelah tabel di-seed dengan id eksplisit, sinkronkan sequence (serial ATAU identity)
 * ke MAX(id) agar INSERT aplikasi berikutnya tidak bentrok PK. Aman dipanggil selalu:
 * tabel tanpa sequence → pg_get_serial_sequence NULL → skip.
 */
async function syncSequence(table) {
  try {
    const seqRes = await client.query(
      `SELECT pg_get_serial_sequence('public.${table}', 'id') AS seq`
    );
    const seq = seqRes.rows[0]?.seq;
    if (!seq) return;
    await client.query(`SELECT setval($1, (SELECT MAX(id) FROM public.${table}))`, [seq]);
  } catch (err) {
    warn(`  ! ${table}: sinkronisasi sequence gagal — ${err.message}`);
  }
}

// ─── 4. Eksekusi ──────────────────────────────────────────────────────────────
const stats = { ok: 0, skipped: 0, errors: 0, errorSamples: [] };

for (const table of TABLES) {
  const rows = dataByTable[table];
  if (!rows || rows.length === 0) continue;
  const tableSchema = schema[table];
  if (!tableSchema) { stats.skipped += rows.length; continue; }

  let ok = 0;
  let conflict = 0;
  const idCol = tableSchema.get('id');
  const identityAlways = Boolean(idCol?.identityAlways); // OVERRIDING SYSTEM VALUE
  for (const row of rows) {
    try {
      const sql = insertSql(table, row, tableSchema, { overridingSystemValue: identityAlways });
      if (!sql) { conflict++; continue; }
      const res = await client.query(sql);
      if (res.rowCount === 0) conflict++;
      else ok++;
    } catch (err) {
      if (err.code === '23505') { conflict++; continue; } // unique non-PK (slug, email, dll)
      stats.errors++;
      if (stats.errorSamples.length < 8) {
        stats.errorSamples.push(`[${table}] ${err.message} — ${row?.id ?? row?.key ?? '?'}`);
      }
    }
  }
  if (ok > 0) await syncSequence(table); // jaga sequence serial/identity
  stats.ok += ok;
  stats.conflicts = (stats.conflicts || 0) + conflict;
  log(`  ${table.padEnd(26)} +${ok} ok  (${conflict} sudah ada/konflik)`);
  if (ok === 0 && conflict === 0) log(`    ↑ 0 baris diproses — cek skema VPS vs dump`);
}

await client.end();
log('\n=== Ringkasan ===');
log(`  INSERT ok      : ${stats.ok}`);
log(`  Konflik/dupe   : ${stats.conflicts}`);
log(`  Error (lain)   : ${stats.errors}`);
for (const s of stats.errorSamples) log(`    ✗ ${s}`);
if (stats.errors) warn('\nSebagian baris gagal — lihat contoh error di atas (kemungkinan beda skema kolom VPS).');
log('\nSelesai. Verifikasi: psql $DATABASE_URL -c "SELECT count(*) FROM events;"');
