/**
 * Buat / reset akun admin di VPS — jalankan manual via
 *   node server/scripts/create-admin.mjs <email> <password> [display_name] [--reset]
 *
 * Prod users TIDAK punya password_hash (auth via Supabase Auth). Di VPS,
 * login memakai bcrypt compare users.password_hash. Script ini:
 *   1. baca env (DATABASE_URL wajib; .env / .env.supabase / deploy/vps/.env)
 *   2. bcrypt hash password (min 8 karakter)
 *   3. INSERT users (role superadmin, is_active true) — atau, dengan --reset,
 *      UPDATE password_hash user lama (mis. 4 akun legacy pasca-seed yang
 *      hash-nya NULL sehingga belum bisa login) + aktifkan kembali.
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';

// dotenv/config sudah baca .env dari cwd; tambahan fallback env lain.
function loadEnvIfMissing(path) {
  try {
    const content = readFileSync(path, 'utf8');
    for (const line of content.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i < 0) continue;
      const k = t.slice(0, i).trim();
      const v = t.slice(i + 1).trim().replace(/^"|"$/g, '');
      if (!process.env[k]) process.env[k] = v;
    }
  } catch { /* tidak ada file — acuh */ }
}
loadEnvIfMissing(resolve(process.cwd(), '.env.supabase'));
loadEnvIfMissing(resolve(process.cwd(), 'deploy/vps/.env'));

const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL belum diset (lihat deploy/vps/.env.example).');
  process.exit(1);
}
if (!JWT_SECRET) {
  console.warn('PERINGATAN: JWT_SECRET belum diset — login akan 503 sampai dikonfigurasi.');
}

const email = String(process.argv[2] || process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = process.argv[3] || process.env.ADMIN_PASSWORD || '';
const displayName = process.argv[4] || process.env.ADMIN_NAME || 'Super Administrator';

if (!email || !password) {
  console.error('Pemakaian: node server/scripts/create-admin.mjs <email> <password> [display_name]');
  console.error('           (atau env ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME)');
  process.exit(1);
}
if (password.length < 8) {
  console.error('ERROR: password minimal 8 karakter.');
  process.exit(1);
}

const { Pool } = pg;
const pool = new Pool({ connectionString: DATABASE_URL, connectionTimeoutMillis: 8000 });

async function main() {
  const reset = process.argv.includes('--reset');
  const hash = await bcrypt.hash(password, 12);

  if (reset) {
    const result = await pool.query(
      `UPDATE users SET password_hash = $2, is_active = true, updated_at = NOW()
       WHERE lower(email) = $1
       RETURNING id, role`,
      [email, hash],
    );
    if (!result.rows[0]) {
      console.error(`ERROR: email ${email} tidak ditemukan. Tanpa --reset untuk buat baru.`);
      await pool.end();
      process.exit(2);
    }
    console.log(`OK: password di-reset — ${email} (id ${result.rows[0].id}, role ${result.rows[0].role})`);
    await pool.end();
    return;
  }

  const result = await pool.query(
    `INSERT INTO users (email, display_name, role, is_active, password_hash, created_at, updated_at)
     VALUES ($1, $2, 'superadmin', true, $3, NOW(), NOW())
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    [email, displayName, hash],
  );

  if (!result.rows[0]) {
    console.error(`ERROR: email ${email} sudah terdaftar. Tambahkan --reset untuk set password-nya.`);
    await pool.end();
    process.exit(2);
  }

  console.log(`OK: superadmin dibuat — ${email} (id ${result.rows[0].id})`);
  console.log(`    password ${password.length} karakter, bcrypt cost 12, role superadmin`);
  await pool.end();
}

main().catch(async (err) => {
  console.error('GAGAL:', err.message);
  try { await pool.end(); } catch {}
  process.exit(1);
});