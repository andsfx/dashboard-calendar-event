/**
 * Execute SQL schema on Supabase
 * Usage: node migrate/run-schema.mjs
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env
function loadEnv() {
  try {
    const envPath = resolve(__dirname, '..', '.env');
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch (e) {
    console.warn('Could not load .env:', e.message);
  }
}

loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PROJECT_REF = SUPABASE_URL ? new URL(SUPABASE_URL).hostname.split('.')[0] : '';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sql = readFileSync(resolve(__dirname, 'supabase-schema.sql'), 'utf-8');

async function runSQL() {
  console.log('=== Running SQL Schema on Supabase ===\n');
  console.log(`Project: ${PROJECT_REF}`);
  console.log(`SQL length: ${sql.length} chars\n`);

  // Use Supabase Management API to run SQL
  // POST https://{project_ref}.supabase.co/pg/query
  // This endpoint is available with service_role key
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
    console.error(text.slice(0, 1000));
    
    // Fallback: try executing statements one by one via individual table creation
    console.log('\nFallback: Trying individual statements...\n');
    await runStatementsIndividually();
  }
}

async function runStatementsIndividually() {
  // Split by semicolons but be careful with function bodies ($$)
  const parts = [];
  let current = '';
  let inDollarQuote = false;
  
  for (const line of sql.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('--')) continue;
    
    if (trimmed.includes('$$')) {
      inDollarQuote = !inDollarQuote;
    }
    
    current += line + '\n';
    
    if (!inDollarQuote && trimmed.endsWith(';')) {
      const stmt = current.trim();
      if (stmt && stmt.length > 5) {
        parts.push(stmt);
      }
      current = '';
    }
  }
  
  if (current.trim()) parts.push(current.trim());
  
  console.log(`Found ${parts.length} SQL statements\n`);
  
  let success = 0;
  let failed = 0;
  
  for (let i = 0; i < parts.length; i++) {
    const stmt = parts[i];
    const preview = stmt.replace(/\s+/g, ' ').slice(0, 80);
    
    const res = await fetch(`${SUPABASE_URL}/pg/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ query: stmt }),
    });
    
    if (res.ok) {
      console.log(`  [${i + 1}/${parts.length}] OK: ${preview}...`);
      success++;
    } else {
      const errText = await res.text();
      console.error(`  [${i + 1}/${parts.length}] FAIL: ${preview}...`);
      console.error(`    Error: ${errText.slice(0, 200)}`);
      failed++;
    }
  }
  
  console.log(`\nDone: ${success} succeeded, ${failed} failed`);
}

runSQL().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
