/**
 * Execute SQL schema on Supabase
 * Usage: node migrate/run-schema.mjs
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Load env khusus migrasi Supabase (.env.supabase) — isinya hanya creds
 * Supabase (VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, opsional
 * SUPABASE_ACCESS_TOKEN), file gitignored. Fallback ke .env biasa bila
 * .env.supabase tidak ada.
 */
function loadSupabaseEnv() {
  const candidates = ['.env.supabase', '.env'];
  for (const name of candidates) {
    try {
      const envPath = resolve(__dirname, '..', name);
      const content = readFileSync(envPath, 'utf-8');
      let loaded = 0;
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx < 0) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
          loaded++;
        }
      }
      console.log(`Loaded env: ${name} (${loaded} keys)`);
      return;
    } catch (e) {
      console.warn(`Could not load ${name}:`, e.message);
    }
  }
}

loadSupabaseEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
// PAT (sbp_...) opsional — untuk jalur Management API (satu-satunya DDL tanpa CLI:
// endpoint /pg/query legacy sudah ditutup Supabase utk project ini).
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || '';
const PROJECT_REF = SUPABASE_URL ? new URL(SUPABASE_URL).hostname.split('.')[0] : '';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// File SQL target: argumen CLI pertama, default supabase-schema.sql
// Usage: node migrate/run-schema.mjs [file.sql]
const sqlArg = process.argv[2] || 'supabase-schema.sql';
const sqlPath = resolve(__dirname, sqlArg);
const sql = readFileSync(sqlPath, 'utf-8');
console.log(`SQL file: ${sqlPath}`);

async function runSQL() {
  console.log('=== Running SQL Schema on Supabase ===\n');
  console.log(`Project: ${PROJECT_REF}`);
  console.log(`SQL length: ${sql.length} chars\n`);

  // JALUR 1 — Management API (butuh SUPABASE_ACCESS_TOKEN / PAT sbp_):
  // satu-satunya cara DDL tanpa Supabase CLI. Endpoint /pg/query legacy
  // sudah ditutup Supabase untuk project ini (404 "requested path is invalid").
  if (ACCESS_TOKEN) {
    const mgmtUrl = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
    const res = await fetch(mgmtUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ query: sql }),
    });
    const text = await res.text();

    if (res.ok) {
      console.log('✅ SQL executed via Management API!');
      try {
        const data = JSON.parse(text);
        if (data && typeof data === 'object' && !Array.isArray(data)) console.log('Response:', JSON.stringify(data, null, 2).slice(0, 500));
      } catch { /* empty ok body */ }
      return;
    }

    console.error(`Management API failed (${res.status}):`);
    console.error(text.slice(0, 1000));
    console.error('\n→ Cek SUPABASE_ACCESS_TOKEN di .env.supabase (harus sbp_...).');
    process.exit(1);
  }

  // JALUR 2 — legacy /pg/query (service role; kemungkinan besar 404 pd project baru)
  console.log('SUPABASE_ACCESS_TOKEN kosong — coba legacy /pg/query (kemungkinan 404)...\n');
  const url = `${SUPABASE_URL}/pg/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  const text = await res.text();

  if (res.ok) {
    console.log('SQL executed successfully!');
    try {
      const data = JSON.parse(text);
      console.log('Response:', JSON.stringify(data, null, 2).slice(0, 500));
    } catch {
      console.log('Response:', text.slice(0, 500));
    }
  } else {
    console.error(`SQL execution failed (${res.status}):`);
    console.error(text.slice(0, 500));
    console.error('\n→ Supabase menutup /pg/query utk project ini. Tambahkan SUPABASE_ACCESS_TOKEN (PAT sbp_) ke .env.supabase, lalu jalankan ulang.');
    process.exit(1);
  }
}

runSQL().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
