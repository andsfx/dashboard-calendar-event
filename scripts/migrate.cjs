const fs = require('fs');

// Parse .env.local
const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx > 0) {
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    env[key] = val;
  }
});

const SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Project:', SUPABASE_URL);

async function supabaseRPC(fnName, params = {}) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fnName}`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(params)
  });
  const text = await resp.text();
  return { status: resp.status, body: text };
}

async function supabaseQuery(table, params = '') {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${table}${params}`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    }
  });
  return resp.json();
}

async function main() {
  // Step 1: Create a migration helper function via RPC
  // First, check if we can create a function using the service role
  console.log('\n--- Step 1: Create migration function ---');
  
  // Try to create a plpgsql function that runs our DDL
  // We'll use the PostgREST's ability to call functions
  
  // First, let's try if there's already a way to run SQL
  // Check if pg_net or http extension is available
  
  // Actually, the cleanest approach for Supabase without direct DB access:
  // Use the Supabase Management API (requires access token, not service role)
  // OR use the Supabase CLI
  // OR just create the columns via PostgREST INSERT trick
  
  // Let's try a different approach: use PostgREST to INSERT a row with the new columns
  // If the columns don't exist, it'll fail. If they do, we know migration already ran.
  
  // Actually, the BEST approach: use Supabase's built-in SQL execution
  // via the /sql endpoint (available since Supabase v2)
  
  // Try multiple SQL execution endpoints
  const sqlEndpoints = [
    '/rest/v1/rpc/exec_sql',
    '/rest/v1/rpc/run_sql', 
    '/rest/v1/rpc/execute_sql',
  ];
  
  for (const endpoint of sqlEndpoints) {
    const resp = await fetch(`${SUPABASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql: 'SELECT 1' })
    });
    console.log(`${endpoint}: ${resp.status}`);
  }
  
  // If none work, we need to create our own exec_sql function first
  // But we can't create functions via PostgREST either...
  
  // The only remaining option without direct DB access or Management API:
  // Use the Supabase Dashboard API (which is what the SQL Editor uses)
  
  // Supabase Dashboard SQL endpoint
  const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0];
  
  // Try the Supabase platform API for SQL execution
  const platformResp = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: 'SELECT 1 as test' })
  });
  console.log(`Platform API: ${platformResp.status}`);
  const platformBody = await platformResp.text();
  console.log(`Response: ${platformBody.slice(0, 200)}`);
  
  // Check current state via REST
  console.log('\n--- Current table state ---');
  const data = await supabaseQuery('community_registrations', '?select=*&limit=1');
  if (Array.isArray(data) && data.length > 0) {
    const cols = Object.keys(data[0]);
    console.log('Columns:', cols.join(', '));
    const hasAll = cols.includes('organization_type') && cols.includes('type_specific_data') && cols.includes('organization_name');
    if (hasAll) {
      console.log('\n✅ All migration columns already exist!');
    } else {
      console.log('\n❌ Migration needed but cannot run DDL via REST API.');
      console.log('Options:');
      console.log('1. Run SQL manually in Supabase Dashboard → SQL Editor');
      console.log('2. Provide Supabase Management API access token');
      console.log('3. Provide Postgres password for connection pooler');
    }
  } else {
    console.log('Table data:', JSON.stringify(data).slice(0, 200));
  }
}

main().catch(e => console.error('Error:', e.message));
