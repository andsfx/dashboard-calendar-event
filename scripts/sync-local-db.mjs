#!/usr/bin/env node
/**
 * Sinkronisasi SATU ARAH: snapshot database produksi (VPS) -> Postgres lokal.
 *
 * Kenapa satu arah: aplikasi lokal tidak pernah menulis ke produksi. Membaca
 * produksi aman (pg_dump hanya SELECT); semua tulis tetap di container lokal.
 *
 * Pakai:
 *   node scripts/sync-local-db.mjs
 *
 * Prasyarat (lihat docs/agents/vps-db-access.md):
 *   - alias SSH `medprom` aktif, stack `metmal` jalan di VPS
 *   - container lokal `metmal-local-postgres` (port 55432) sudah dibuat
 *   - `.env.development.local` berisi DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD
 *
 * Hasil: schema + data lokal identik dengan produksi saat dump dibuat, lalu
 * akun development (`ADMIN_EMAIL`) dipastikan ada dengan password lokal.
 */
import 'dotenv/config';
import { spawn } from 'node:child_process';
import { createReadStream, createWriteStream, existsSync, mkdirSync, statSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Kredensial lokal dibaca langsung dari file ini, bukan dari presedensi env
// proses: `.env` root juga punya ADMIN_PASSWORD (legacy) dan nilainya bisa
// menang tergantung lingkungan shell. File ini adalah sumber kebenaran.
const LOCAL_ENV = resolve(process.cwd(), '.env.development.local');
const localEnv = parseEnvFile(LOCAL_ENV);

const DATABASE_URL = localEnv.DATABASE_URL || process.env.DATABASE_URL || '';
const ADMIN_EMAIL = localEnv.ADMIN_EMAIL || process.env.ADMIN_EMAIL || '';
const ADMIN_PASSWORD = localEnv.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || '';
const ADMIN_NAME = localEnv.ADMIN_NAME || process.env.ADMIN_NAME || 'MetmalLocalDev';
const CONTAINER = process.env.LOCAL_PG_CONTAINER || 'metmal-local-postgres';
const SSH_HOST = process.env.PROD_SSH_HOST || 'medprom';
const REMOTE_DIR = process.env.PROD_DIR || '/opt/metmal/deploy/vps';
const DUMP_PATH = resolve(process.cwd(), '.deploy/prod-snapshot.dump');

function parseEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const text = line.trim();
    if (!text || text.startsWith('#')) continue;
    const eq = text.indexOf('=');
    if (eq < 0) continue;
    out[text.slice(0, eq).trim()] = text.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

/** Tolak apa pun yang bukan database lokal — mencegah restore ke produksi. */
function assertLocalDatabase(url) {
  if (!url) fail('DATABASE_URL kosong. Isi .env.development.local lebih dulu.');
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    fail('DATABASE_URL tidak bisa dibaca sebagai URL.');
  }
  const host = parsed.hostname;
  if (!['127.0.0.1', 'localhost', '::1'].includes(host)) {
    fail(`DATABASE_URL menunjuk "${host}", bukan database lokal. Sync dibatalkan.`);
  }
  return {
    host,
    port: parsed.port || '5432',
    database: decodeURIComponent(parsed.pathname.replace(/^\//, '')),
    user: decodeURIComponent(parsed.username),
  };
}

/**
 * Restore berjalan lewat `docker exec` ke CONTAINER, bukan lewat DATABASE_URL.
 * Tanpa pemeriksaan ini, guard URL hanya menjamin niat, bukan target tulis.
 * Cocokkan label, binding port, dan database/user container dengan URL lokal.
 */
async function assertLocalContainer(container, target) {
  const raw = await new Promise((resolvePromise, reject) => {
    const child = spawn('docker', ['inspect', '--format', '{{json .}}', container]);
    let out = '';
    let err = '';
    child.stdout.on('data', (chunk) => { out += chunk.toString(); });
    child.stderr.on('data', (chunk) => { err += chunk.toString(); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) return resolvePromise(out);
      reject(new Error(`container "${container}" tidak bisa diperiksa${err ? `: ${err.trim()}` : ''}`));
    });
  });

  const info = JSON.parse(raw);
  const labels = info.Config?.Labels ?? {};
  if (labels.app !== 'metmal-local') {
    fail(`container "${container}" bukan objek lokal (label app=metmal-local tidak ada). Sync dibatalkan.`);
  }

  const bindings = info.NetworkSettings?.Ports?.['5432/tcp'] ?? [];
  const localBinding = bindings.find(
    (b) => ['127.0.0.1', '::1', '0.0.0.0', '::'].includes(b.HostIp || '') && String(b.HostPort) === target.port,
  );
  if (!localBinding) {
    fail(`container "${container}" tidak memetakan port ${target.port} ke host loopback. Sync dibatalkan.`);
  }

  const env = Object.fromEntries((info.Config?.Env ?? []).map((line) => {
    const i = line.indexOf('=');
    return i < 0 ? [line, ''] : [line.slice(0, i), line.slice(i + 1)];
  }));
  if (env.POSTGRES_DB !== target.database || env.POSTGRES_USER !== target.user) {
    fail(
      `container "${container}" memakai database/user "${env.POSTGRES_DB}/${env.POSTGRES_USER}", `
      + `bukan "${target.database}/${target.user}" dari DATABASE_URL. Sync dibatalkan.`,
    );
  }
}

function fail(message) {
  console.error(`GAGAL: ${message}`);
  process.exit(1);
}

function run(command, args, { pipeTo = null, label }) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args);
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', reject);
    const finished = pipeTo
      ? new Promise((done) => {
          child.stdout.pipe(pipeTo);
          pipeTo.on('finish', done);
          pipeTo.on('error', reject);
        })
      : Promise.resolve();
    child.stdout.on('data', () => {}); // keep the pipe flowing even if unused
    child.on('close', async (code) => {
      await finished;
      if (code === 0) return resolvePromise();
      reject(new Error(`${label} keluar dengan kode ${code}${stderr ? `: ${stderr.trim()}` : ''}`));
    });
  });
}

function queryLocal(sql) {
  const child = spawn('docker', ['exec', '-i', CONTAINER, 'psql', '-U', 'metmal_local', '-d', 'metmal_local', '-Atc', sql]);
  let out = '';
  child.stdout.on('data', (chunk) => { out += chunk.toString(); });
  return new Promise((resolvePromise, reject) => {
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolvePromise(out.trim()) : reject(new Error(`psql lokal keluar ${code}`))));
  });
}

async function main() {
  const target = assertLocalDatabase(DATABASE_URL);
  await assertLocalContainer(CONTAINER, target);
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    fail('ADMIN_EMAIL / ADMIN_PASSWORD belum ada di .env.development.local.');
  }

  mkdirSync(resolve(process.cwd(), '.deploy'), { recursive: true });

  console.log('[1/4] Mengambil snapshot produksi (read-only)...');
  const dumpStream = createWriteStream(DUMP_PATH);
  const remote = `cd ${REMOTE_DIR} && docker compose exec -T postgres pg_dump -U metmal -d metmal -Fc --no-owner --no-privileges`;
  await run('ssh', ['-o', 'BatchMode=yes', SSH_HOST, remote], { pipeTo: dumpStream, label: 'pg_dump produksi' });
  const size = statSync(DUMP_PATH).size;
  if (size === 0) fail('dump kosong.');
  console.log(`      ${(size / 1024).toFixed(0)} KB -> .deploy/prod-snapshot.dump`);

  console.log('[2/4] Memutus koneksi aplikasi lokal (jika ada)...');
  await queryLocal("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'metmal_local' AND pid <> pg_backend_pid()").catch(() => {});

  console.log('[3/4] Restore ke Postgres lokal (--clean --if-exists)...');
  const log = [];
  const restore = spawn('docker', ['exec', '-i', CONTAINER, 'pg_restore', '--clean', '--if-exists', '--no-owner', '--no-privileges', '-U', 'metmal_local', '-d', 'metmal_local'], { stdio: ['pipe', 'pipe', 'pipe'] });
  createReadStream(DUMP_PATH).pipe(restore.stdin);
  restore.stdout.on('data', (chunk) => log.push(chunk.toString()));
  restore.stderr.on('data', (chunk) => log.push(chunk.toString()));
  const code = await new Promise((r) => restore.on('close', r));
  const notices = log.join('').trim();
  // pg_restore membalas 0; peringatan "does not exist, skipping" normal untuk restore bersih.
  if (code !== 0) fail(`pg_restore keluar ${code}\n${notices}`);
  console.log('      selesai');

  console.log('[4/4] Memastikan akun development punya password lokal...');
  // Snapshot produksi tidak punya akun dev → buat; kalau sudah ada → reset.
  const createAdmin = (extraArgs) => new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, ['server/scripts/create-admin.mjs', ADMIN_EMAIL, '', ADMIN_NAME, ...extraArgs], {
      stdio: ['ignore', 'ignore', 'ignore'],
      env: { ...process.env, DOTENV_CONFIG_PATH: LOCAL_ENV, DOTENV_CONFIG_OVERRIDE: 'true', ADMIN_PASSWORD },
    });
    child.on('error', reject);
    child.on('close', (c) => resolvePromise(c === 0));
  });
  if (!(await createAdmin([])) && !(await createAdmin(['--reset']))) {
    fail(`create-admin gagal untuk ${ADMIN_EMAIL}`);
  }

  const counts = await queryLocal(
    "SELECT 'events=' || (SELECT count(*) FROM events) || ' users=' || (SELECT count(*) FROM users) || ' surveys=' || (SELECT count(*) FROM tenant_event_surveys) || ' registrations=' || (SELECT count(*) FROM community_registrations)",
  );
  console.log(`OK: database lokal sinkron dengan snapshot produksi — ${counts}`);
}

main().catch((err) => {
  console.error(`GAGAL: ${err.message}`);
  process.exit(1);
});
