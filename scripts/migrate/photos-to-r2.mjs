/**
 * photos-to-r2.mjs — Pindahkan media legacy dari Supabase Storage ke R2 Cloudflare.
 *
 * ⚠️  SEKALI-PAKAI — SUDAH DIJALANKAN (2026-09-08; 4 URL legacy ter-rewrite via
 *     seed/photo-url-map.json). Jangan jalankan lagi kecuali ada media baru yang
 *     masih menunjuk *.supabase.co.
 *
 * Alur (WAJIB dump-prod dulu):
 *   1. Baca seed/*.json (hasil dump-prod --run).
 *   2. Kumpulkan URL media lama per kolom (MEDIA_COLUMNS di _shared.mjs):
 *        - grup `albums`  → key prefix `albums/`   (event_photos.url, cover_photo_url, area_photos.url)
 *        - grup `site`    → key prefix `site/`     (events.poster_url, news cover, site_settings.value / hero)
 *   3. Filter yang MASIH *.supabase.co (belum di R2 / belum cdn.andotherstori.my.id).
 *   4. Download → PUT ke R2 (S3 SDK) dengan key DETERMINISTIK (hash URL lama) —
 *      idempoten: run ulang tidak menggandakan object.
 *   5. Tulis mapping url-lama → url-baru ke seed/photo-url-map.json.
 *      TIDAK menyentuh DB prod (tanpa update apa pun).
 *
 * Tanpa `--apply` → DRY-RUN: hanya mendaftar URL yang akan dipindah + target key,
 * tanpa download/PUT/tulis file.
 *
 * Usage:
 *   node scripts/migrate/photos-to-r2.mjs                 # dry-run
 *   node scripts/migrate/photos-to-r2.mjs --apply         # eksekusi sungguhan
 *
 * Env (dari .env / .env.local, gitignored):
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import {
  loadEnv, parseCli, TABLES, MEDIA_COLUMNS,
  SEED_DIR, PHOTO_URL_MAP_PATH, log, warn, fail,
} from './_shared.mjs';

loadEnv();
const cli = parseCli(process.argv.slice(2));
const apply = cli.run; // --apply == --run

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET = process.env.R2_BUCKET_NAME || 'metmal-gallery';
const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || '').replace(/\/+$/, '');
const SUPABASE_HOSTS = ['supabase.co', 'supabase.in'];
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB per file (foto galeri, aman)

const EXT_BY_MIME = {
  'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'image/gif': 'gif', 'image/svg+xml': 'svg', 'image/avif': 'avif', 'image/bmp': 'bmp',
  'application/pdf': 'pdf',
};

log('=== photos-to-r2.mjs — Supabase Storage → R2 ===\n');
log(`Mode        : ${apply ? 'APPLY — download + PUT ke R2 + tulis mapping' : 'DRY-RUN (default)'}`);
log(`R2 bucket   : ${R2_BUCKET}  (${R2_PUBLIC_URL || 'R2_PUBLIC_URL kosong!'})`);
log(`R2 account  : ${R2_ACCOUNT_ID ? 'ok' : 'KOSONG — butuh R2_ACCOUNT_ID'}`);
log(`R2 access   : ${R2_ACCESS_KEY_ID ? 'ok' : 'KOSONG — butuh R2_ACCESS_KEY_ID'}`);
log(`R2 secret   : ${R2_SECRET_ACCESS_KEY ? 'ok' : 'KOSONG — butuh R2_SECRET_ACCESS_KEY'}\n`);

// ─── 1. Baca seed/*.json ─────────────────────────────────────────────────────
const dataByTable = {};
for (const t of TABLES) {
  const p = join(SEED_DIR, `${t}.json`);
  if (!existsSync(p)) continue;
  try {
    const rows = JSON.parse(readFileSync(p, 'utf8'));
    if (Array.isArray(rows)) dataByTable[t] = rows;
  } catch (err) {
    warn(`  ! ${t}.json tidak valid: ${err.message} (dilewati)`);
  }
}
if (Object.keys(dataByTable).length === 0) {
  log('Belum ada seed/*.json. Jalankan dulu:  node scripts/migrate/dump-prod.mjs --run');
  process.exit(apply ? 1 : 0);
}

function isLegacySupabaseUrl(value) {
  if (typeof value !== 'string' || !value) return false;
  if (!/^https?:\/\//i.test(value)) return false;
  if (R2_PUBLIC_URL && value.startsWith(`${R2_PUBLIC_URL}/`)) return false;
  try {
    const host = new URL(value).hostname.toLowerCase();
    return SUPABASE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

/** Ambil semua string dari struktur JSON (string/scalar di dalam object/array). */
function collectStrings(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) for (const v of value) collectStrings(v, out);
  else if (value && typeof value === 'object') for (const v of Object.values(value)) collectStrings(v, out);
  return out;
}

// ─── 2. Kumpulkan URL legacy + prefix target ─────────────────────────────────
const candidates = []; // { table, rowIndex, column, url, prefix }
for (const [table, rows] of Object.entries(dataByTable)) {
  const spec = MEDIA_COLUMNS[table];
  if (!spec) continue;
  rows.forEach((row, rowIndex) => {
    if (table === 'site_settings') {
      // value JSONB: string hero, object, atau array (instagram posts, dll.)
      for (const s of collectStrings(row.value ?? null)) {
        if (isLegacySupabaseUrl(s)) candidates.push({ table, rowIndex, column: 'value', url: s, prefix: spec.prefix });
      }
      return;
    }
    for (const col of spec.columns) {
      const v = row[col];
      if (isLegacySupabaseUrl(v)) candidates.push({ table, rowIndex, column: col, url: v, prefix: spec.prefix });
    }
  });
}

// Dedupe per URL lama — satu file lama = satu object R2.
const unique = new Map();
for (const c of candidates) {
  if (!unique.has(c.url)) unique.set(c.url, { url: c.url, prefix: c.prefix, refs: [] });
  unique.get(c.url).refs.push(`${c.table}[${c.rowIndex}].${c.column}`);
}

log(`Ditemukan ${unique.size} URL legacy *.supabase.co (dari ${candidates.length} referensi kolom):\n`);
for (const c of unique.values()) log(`  [${c.prefix}] ${c.url}`);

if (unique.size === 0) {
  log('\nTidak ada media yang perlu dipindah. Mapping tidak dibuat.');
  process.exit(0);
}

function safeBase(url) {
  try {
    const pathname = decodeURIComponent(new URL(url).pathname);
    const base = pathname.split('/').pop() || '';
    const clean = base.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
    const idx = base.lastIndexOf('.');
    return { base: clean, extFromUrl: idx > 0 ? base.slice(idx + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : '' };
  } catch {
    return { base: 'image', extFromUrl: '' };
  }
}

function buildKey(oldUrl, prefix) {
  const hash = createHash('sha256').update(oldUrl).digest('hex').slice(0, 12);
  const { base, extFromUrl } = safeBase(oldUrl);
  // Ekstensi ditentukan saat runtime dari Content-Type; fallback ekstensi URL.
  // Key memakai hash dulu → deterministik + unik + aman (tanpa path traversal).
  const name = base && base !== 'image' ? `${hash}-${base}` : hash;
  return { keyPrefix: `${prefix}/${name}.`, hash, extFromUrl };
}

const plan = [...unique.values()].map((c) => ({ ...c, ...buildKey(c.url, c.prefix) }));

// ─── 3. Mode ─────────────────────────────────────────────────────────────────
if (!apply) {
  log('\nDRY-RUN — rencana (jalankan `--apply` untuk eksekusi):');
  for (const p of plan) log(`  ${p.url}\n    → ${R2_PUBLIC_URL || '<R2_PUBLIC_URL>'}/${p.prefix}/${p.hash}-<nama>.<ext>`);
  log('\nTidak ada download/PUT/tulis file. Selesai.');
  process.exit(0);
}

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_PUBLIC_URL) {
  fail('--apply butuh R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_URL (lihat .env/.env.local).');
}

// ─── 4. Download + PUT ke R2 ─────────────────────────────────────────────────
const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
const R2 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

async function download(url) {
  const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`download HTTP ${res.status}`);
  const length = Number(res.headers.get('content-length') || 0);
  if (length > MAX_BYTES) throw new Error(`terlalu besar (${length} bytes > 50MB)`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length === 0) throw new Error('file kosong');
  return { buf, contentType: (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase() };
}

function extFor(contentType, planItem) {
  if (EXT_BY_MIME[contentType]) return EXT_BY_MIME[contentType];
  if (planItem.extFromUrl) return planItem.extFromUrl;
  return 'bin';
}

/** Jalankan fn dengan konkurensi terbatas; kumpulkan hasil & error per item. */
async function mapConcurrent(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      try { results[i] = { ok: true, value: await fn(items[i], i) }; }
      catch (err) { results[i] = { ok: false, error: err }; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

log('\nMulai migrasi media ke R2...');
const results = await mapConcurrent(plan, 6, async (item) => {
  log(`  ↓ ${item.url}`);
  const { buf, contentType } = await download(item.url);
  const key = `${item.keyPrefix}${extFor(contentType, item)}`;
  await R2.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: buf,
    ContentType: contentType || 'application/octet-stream',
    CacheControl: 'public, max-age=31536000, immutable',
  }));
  const newUrl = `${R2_PUBLIC_URL}/${key}`;
  log(`  ✓ ${newUrl}`);
  return { old: item.url, new: newUrl };
});

const ok = results.filter((r) => r.ok).map((r) => r.value);
const failed = results.filter((r) => !r.ok);
for (const f of failed) warn(`  ✗ ${f.error.message}`);

// ─── 5. Tulis mapping ────────────────────────────────────────────────────────
mkdirSync(SEED_DIR, { recursive: true });
const map = Object.fromEntries(ok.map((m) => [m.old, m.new]));
const payload = { updatedAt: new Date().toISOString(), count: ok.length, map };
writeFileSync(PHOTO_URL_MAP_PATH, JSON.stringify(payload, null, 2), 'utf8');
log(`\nMapping ${ok.length} URL → ${PHOTO_URL_MAP_PATH}`);
if (failed.length) log(`Gagal: ${failed.length} file (lihat error di atas). Jalankan ulang untuk retry (idempoten).`);
log('\nLangkah berikut: node scripts/migrate/seed-vps.mjs --apply  (seed ke VPS)');
process.exit(failed.length ? 1 : 0);
