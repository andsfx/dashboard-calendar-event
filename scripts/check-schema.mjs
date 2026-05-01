import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAT = process.env.SUPABASE_PAT || 'sbp_e3c5fe50ab23c9805dee15a5bb4bd767a84c47d6';

const migrationFile = process.argv[2];
let sql;

if (migrationFile) {
  sql = readFileSync(resolve(__dirname, '..', migrationFile), 'utf8');
  console.log(`Running: ${migrationFile}`);
} else {
  sql = `SELECT json_build_object(
    'event_photos_cols', (SELECT json_agg(column_name ORDER BY ordinal_position) FROM information_schema.columns WHERE table_name='event_photos'),
    'photo_albums_cols', (SELECT json_agg(column_name ORDER BY ordinal_position) FROM information_schema.columns WHERE table_name='photo_albums'),
    'event_photos_count', (SELECT count(*) FROM event_photos),
    'photo_albums_count', (SELECT count(*) FROM photo_albums)
  ) as info`;
  console.log('Checking photo tables...');
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
