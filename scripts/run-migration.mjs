/**
 * run-migration.mjs
 * Runs a SQL migration file against Supabase using the Management API.
 * Usage: node scripts/run-migration.mjs <migration-file>
 *
 * Reads credentials from .env in project root.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// --- Load .env manually (no dotenv dependency needed) ---
function loadEnv() {
  const envPath = resolve(ROOT, '.env');
  const lines = readFileSync(envPath, 'utf8').split('\n');
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    env[key] = val;
  }
  return env;
}

// --- Run SQL via Supabase REST (pg endpoint) ---
async function runSQL(supabaseUrl, serviceRoleKey, sql) {
  // Extract project ref from URL: https://<ref>.supabase.co
  const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!match) throw new Error(`Cannot parse project ref from URL: ${supabaseUrl}`);
  const projectRef = match[1];

  const url = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

// --- Main ---
async function main() {
  const migrationFile = process.argv[2];
  if (!migrationFile) {
    console.error('Usage: node scripts/run-migration.mjs <migration-file>');
    process.exit(1);
  }

  const env = loadEnv();
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  const sqlPath = resolve(ROOT, migrationFile);
  const sql = readFileSync(sqlPath, 'utf8');

  console.log(`Running migration: ${migrationFile}`);
  console.log(`Project: ${supabaseUrl}`);
  console.log('---');

  try {
    const result = await runSQL(supabaseUrl, serviceRoleKey, sql);
    console.log('✅ Migration succeeded');
    if (Array.isArray(result) && result.length > 0) {
      console.log('Result:', JSON.stringify(result, null, 2));
    }
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

main();
