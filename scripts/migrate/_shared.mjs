/**
 * Shared helpers for Opsi B migration scripts (scripts/migrate/*).
 * - Env loader: .env.supabase (PAT Supabase) + .env + .env.local (R2/VPS),
 *   first non-empty definition wins — never commit creds.
 * - Canonical order of the 20 core tables (FK-safe for seeding).
 * - Media URL column registry used by photos-to-r2.mjs.
 *
 * Usage: node scripts/migrate/dump-prod.mjs [--run] [--table=<name>]
 *        node scripts/migrate/photos-to-r2.mjs [--apply]
 *        node scripts/migrate/seed-vps.mjs [--apply]
 * All scripts default to DRY-RUN (no network, no DB write, no file write).
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(HERE, '..', '..');
export const SEED_DIR = join(HERE, 'seed');
export const PHOTO_URL_MAP_PATH = join(SEED_DIR, 'photo-url-map.json');

/** Canonical FK-safe order for seeding into VPS Postgres. */
export const TABLES = [
  'site_settings',
  'event_areas',
  'annual_themes',
  'holidays',
  'community_registrations',
  'users',
  'events',
  'draft_events',
  'photo_albums',
  'event_photos',
  'area_photos',
  'news_articles',
  'event_proposals',
  'sponsor_leads',
  'generated_letters',
  'survey_config',
  'survey_responses',
  'tenant_survey_config',
  'tenant_event_surveys',
  'activity_logs',
];

/**
 * Media URL columns per table (legacy Supabase storage URLs to migrate to R2).
 * - `site`  → single display/promo images (hero, poster, news cover) → key prefix `site/`
 * - `albums`→ gallery photos (event photos, album/area covers)        → key prefix `albums/`
 * event_proposals.file_url / generated_letters.pdf_url are documents, not gallery
 * images — deliberately excluded (kept as-is; log-only).
 */
export const MEDIA_COLUMNS = {
  events: { columns: ['poster_url'], prefix: 'site' },
  photo_albums: { columns: ['cover_photo_url'], prefix: 'albums' },
  event_photos: { columns: ['url'], prefix: 'albums' },
  event_areas: { columns: ['cover_photo_url'], prefix: 'albums' },
  area_photos: { columns: ['url'], prefix: 'albums' },
  news_articles: { columns: ['cover_image_url'], prefix: 'site' },
  site_settings: { columns: ['value'], prefix: 'site' }, // JSONB; deep-scanned below
};

export function parseDotEnv(text) {
  const out = {};
  for (const rawLine of String(text || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key) out[key] = val;
  }
  return out;
}

/**
 * Load .env.supabase lalu .env, .env.local (repo root), lalu deploy/vps/.env (VPS).
 * First non-empty definition of a key wins, sehingga:
 * - SUPABASE_ACCESS_TOKEN dari .env.supabase tetap prioritas;
 * - R2_* / DATABASE_URL terisi dari .env / deploy/vps/.env;
 * - nilai yang sudah ada di process.env (mis. di-export saat menjalankan script)
 *   TIDAK ditimpa — export DATABASE_URL varian 127.0.0.1 menang untuk seed dari host.
 */
export function loadEnv() {
  const merged = {};
  for (const name of ['.env.supabase', '.env', '.env.local', 'deploy/vps/.env']) {
    const p = join(ROOT, name);
    if (!existsSync(p)) continue;
    const parsed = parseDotEnv(readFileSync(p, 'utf8'));
    for (const [k, v] of Object.entries(parsed)) {
      if (!(k in merged) && String(v).trim() !== '') merged[k] = String(v).trim();
    }
  }
  for (const [k, v] of Object.entries(merged)) {
    if (!(k in process.env)) process.env[k] = v;
  }
  return merged;
}

export function projectRefFromUrl(url) {
  try {
    return new URL(url).hostname.split('.')[0];
  } catch {
    return '';
  }
}

export function parseCli(argv) {
  const out = { run: false, help: false, table: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--run' || a === '--apply') out.run = true;
    else if (a === '--help' || a === '-h') out.help = true;
    else if (a.startsWith('--table=')) out.table = a.slice('--table='.length).trim();
    else if (a === '--table') out.table = String(argv[++i] || '').trim();
  }
  return out;
}

export function log(...args) {
  console.log(...args);
}

export function warn(...args) {
  console.warn(...args);
}

export function fail(message, code = 1) {
  console.error(`\nError: ${message}`);
  process.exit(code);
}
