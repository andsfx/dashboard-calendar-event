import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAT = process.env.SUPABASE_PAT || 'sbp_a73696cb33cf515b0b38dead0efc91f3dd091ec7';

const migrationFile = process.argv[2];
let sql;

if (migrationFile) {
  sql = readFileSync(resolve(__dirname, '..', migrationFile), 'utf8');
  console.log(`Running: ${migrationFile}`);
} else {
  sql = `SELECT json_build_object(
    'role_constraint', (SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid='public.users'::regclass AND conname='users_role_check'),
    'new_columns', (SELECT json_agg(column_name) FROM information_schema.columns WHERE table_name='users' AND column_name IN ('eo_organization','assigned_events','avatar_url')),
    'activity_indexes', (SELECT json_agg(indexname) FROM pg_indexes WHERE tablename='activity_logs'),
    'policies_count', (SELECT count(*) FROM pg_policies WHERE tablename IN ('users','activity_logs'))
  ) as info`;
  console.log('Verifying schema...');
}

const res = await fetch('https://api.supabase.com/v1/projects/xddqinydbuargyfseycw/database/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PAT}` },
  body: JSON.stringify({ query: sql }),
});
const text = await res.text();
if (!res.ok) {
  console.error('FAILED:', text);
  process.exit(1);
}
console.log('SUCCESS');
try { const j = JSON.parse(text); if (j.length > 0) console.log(JSON.stringify(j, null, 2)); } catch {}
