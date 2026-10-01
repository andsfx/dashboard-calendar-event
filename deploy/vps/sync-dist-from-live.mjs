#!/usr/bin/env node
/**
 * Sinkronkan `dist/` VPS dari artifact deployment Vercel yang live.
 *
 * KENAPA SKRIP INI ADA
 * `vercel.json` me-rewrite `www/events/:id` → VPS, dan shell yang dikembalikan
 * VPS (`readShellHtml()` di server/src/routes/extra.js membaca `dist/index.html`)
 * mereferensikan `/assets/*` secara RELATIF. Karena halaman itu disajikan di
 * origin www, browser memuat aset dari **Vercel**, bukan dari VPS. Akibatnya
 * hash aset `dist/` VPS HARUS identik dengan build Vercel.
 *
 * Hash build lokal tidak sama dengan hash build Vercel untuk sumber yang sama
 * (beda environment/minifier). Insiden 2026-10-01: lokal `index-DxquOWQF.js`
 * vs Vercel `index-VPVS5j21.js` → shell VPS menunjuk aset yang 404 di www →
 * halaman detail blank. Karena itu `dist/` VPS diisi dari artifact live, bukan
 * dari `npm run build`.
 *
 * PEMAKAIAN
 *   node deploy/vps/sync-dist-from-live.mjs                       # unduh + verifikasi ke .deploy/dist-sync
 *   node deploy/vps/sync-dist-from-live.mjs --apply \
 *        --ssh root@100.69.24.32 --remote-dist /opt/metmal/dist    # + kirim & tulis in-place di VPS
 *
 * Opsi:
 *   --base <url>       origin sumber (default https://www.metmalcommunityspace.web.id)
 *   --out <dir>        direktori staging (default .deploy/dist-sync)
 *   --apply            kirim staging ke VPS (butuh --ssh)
 *   --ssh <target>     target ssh, mis. root@100.69.24.32
 *   --remote-dist <p>  path dist di VPS (default /opt/metmal/dist)
 *   --jobs <n>         unduhan paralel (default 6)
 *
 * Keluar dengan kode != 0 bila ada referensi yang tidak bisa diunduh (200) atau
 * tidak konsisten — jadi skrip ini bisa dipakai sebagai gerbang, bukan sekadar
 * pencetak daftar.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ARGS = process.argv.slice(2);
function arg(name, fallback) {
  const i = ARGS.indexOf(name);
  return i >= 0 && ARGS[i + 1] ? ARGS[i + 1] : fallback;
}
const BASE = arg('--base', process.env.SYNC_BASE || 'https://www.metmalcommunityspace.web.id').replace(/\/$/, '');
const OUT = path.resolve(arg('--out', '.deploy/dist-sync'));
const APPLY = ARGS.includes('--apply');
const SSH = arg('--ssh', '');
const REMOTE_DIST = arg('--remote-dist', '/opt/metmal/dist');
const JOBS = Number(arg('--jobs', '6'));

const ASSET_EXT = /\.(?:js|css|woff2?|ttf|otf|eot|png|jpe?g|svg|webp|gif|ico|mp4|webm|json)$/i;

/** Resolve ref seperti browser — kecuali `assets/…`/`fonts/…` yang di Vite
 *  (`__vite__mapDeps`) bersifat root-relative dari `index.html`. */
function resolveRef(ref, referrerPath) {
  if (!ref || /^(https?:)?\/\//.test(ref) || ref.startsWith('data:')) return null;
  // Fragment in-dokumen (mis. CSS `url(#n)` / `url(%23n)` pada SVG mask)
  // tidak pernah di-fetch oleh browser — bukan aset.
  let decoded = ref;
  try { decoded = decodeURIComponent(ref); } catch { return null; }
  if (decoded.includes('#')) return null;
  const clean = ref.split('?')[0];
  if (!clean) return null;
  const out = clean.startsWith('/')
    ? clean.slice(1)
    : /^(assets|fonts)\//.test(clean)
      ? clean
      : path.posix.normalize(path.posix.join(path.posix.dirname(referrerPath), clean));
  // Hanya berkas aset yang bisa diunduh; `url(/tenants)` dkk. diabaikan.
  return ASSET_EXT.test(out) ? out : null;
}

function extractRefs(text) {
  const out = new Set();
  // String ber-quote/backtick/paren yang berakhir ekstensi aset — termasuk
  // yang berawalan `/` (root-relative) atau `./`/`../` (relatif).
  for (const m of text.matchAll(/["'`(]\s*((?:(?:\.{1,2})?\/)?[A-Za-z0-9_][A-Za-z0-9_.@/-]*\.[A-Za-z0-9]{1,5})["'`)]/g)) {
    if (ASSET_EXT.test(m[1])) out.add(m[1]);
  }
  for (const m of text.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g)) out.add(m[2].trim());
  return out;
}

async function fetchOne(p) {
  const res = await fetch(`${BASE}/${p}`);
  if (!res.ok) return { p, status: res.status, buf: null };
  return { p, status: res.status, buf: Buffer.from(await res.arrayBuffer()) };
}

async function crawl() {
  const seen = new Map(); // path -> { status, bytes }
  const queue = ['index.html'];
  const contents = new Map();

  while (queue.length) {
    const batch = queue.splice(0, JOBS);
    const results = await Promise.all(batch.map(fetchOne));
    for (const r of results) {
      if (seen.has(r.p)) continue;
      seen.set(r.p, { status: r.status, bytes: r.buf ? r.buf.length : 0 });
      if (!r.buf) continue;
      const dest = path.join(OUT, r.p);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, r.buf);
      const isTextSource = /\.(js|css|html|svg|json)$/i.test(r.p);
      if (!isTextSource) continue;
      const text = r.buf.toString('utf8');
      contents.set(r.p, text);
      for (const ref of extractRefs(text)) {
        const rp = resolveRef(ref, r.p);
        if (!rp || seen.has(rp) || queue.includes(rp)) continue;
        queue.push(rp);
      }
    }
  }
  return { seen, contents };
}

function verify(seen, contents, entry) {
  const have = new Set(seen.keys());
  const problems = [];
  for (const [p, v] of seen) if (v.status !== 200) problems.push(`HTTP ${v.status}  ${p}`);
  for (const [p, text] of contents) {
    for (const ref of extractRefs(text)) {
      const rp = resolveRef(ref, p);
      if (!rp) continue;
      if (!have.has(rp)) problems.push(`MISSING ref  ${p} -> ${rp}`);
    }
  }
  // Penjaga anti "false pass": crawl yang gagal mengekstrak referensi tidak
  // boleh lolos hanya karena tidak ada yang hilang dari daftar kosong.
  if (!contents.has('index.html')) problems.push('index.html tidak terunduh');
  if (!entry) problems.push('index.html tidak mereferensikan bundle entry /assets/index-*.js');
  if (!have.has(`assets/${entry}`)) problems.push(`entry bundle tidak terunduh: assets/${entry}`);
  if (seen.size < 3) problems.push(`crawl terlalu kecil (${seen.size} berkas) — regex/resolusi referensi kemungkinan rusak`);
  return problems;
}

function applyToVps() {
  if (!SSH) throw new Error('--apply butuh --ssh <target>');
  const tgz = path.join(OUT, '..', 'dist-sync.tgz');
  execFileSync('tar', ['czf', tgz, '-C', OUT, '.'], { stdio: 'inherit' });
  const remoteTgz = '/tmp/dist-sync.tgz';
  execFileSync('scp', ['-o', 'BatchMode=yes', tgz, `${SSH}:${remoteTgz}`], { stdio: 'inherit' });
  const script = `
set -e
ts=$(date +%Y%m%d-%H%M%S)
mkdir -p /opt/metmal/backups
backup="/opt/metmal/backups/dist-vps-before-sync-$ts.tgz"
# Backup WAJIB sukses sebelum apa pun dihapus (jangan abaikan kegagalan).
tar czf "$backup" -C "${REMOTE_DIST}" .
tar tzf "$backup" > /dev/null
echo "backup: $backup ($(stat -c%s "$backup") byte)"
tmp=$(mktemp -d)
tar xzf ${remoteTgz} -C "$tmp"
# tulis KE DALAM direktori yang di-mount; jangan ganti inode-nya (nginx menahan mount lama)
find "${REMOTE_DIST}" -mindepth 1 -delete
cp -r "$tmp"/. "${REMOTE_DIST}/"
rm -rf "$tmp" ${remoteTgz}
echo "VPS dist refs:"
grep -oE '/assets/[A-Za-z0-9_.-]+' "${REMOTE_DIST}/index.html" | sort -u
`;
  execFileSync('ssh', ['-o', 'BatchMode=yes', SSH, script], { stdio: 'inherit' });
}

let crawled;
try {
  crawled = await crawl();
} catch (err) {
  console.error(`✗ gagal mengambil artifact dari ${BASE}: ${err?.message ?? err}`);
  process.exit(1);
}
const { seen, contents } = crawled;

const entry = (contents.get('index.html')?.match(/assets\/(index-[A-Za-z0-9_-]+\.js)/) || [])[1] || '';
const problems = verify(seen, contents, entry);

console.log(`sumber       : ${BASE}`);
console.log(`staging      : ${OUT}`);
console.log(`entry bundle : ${entry || '(tidak terdeteksi)'}`);
console.log(`berkas       : ${seen.size}`);
console.log(`total        : ${([...seen.values()].reduce((a, v) => a + v.bytes, 0) / 1048576).toFixed(2)} MB`);

if (problems.length) {
  console.error(`\n✗ ${problems.length} masalah:`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
console.log('✓ semua referensi terunduh (200) dan konsisten');

if (APPLY) {
  applyToVps();
  console.log('✓ diterapkan ke VPS');
} else if (!SSH) {
  console.log('\n(langkah berikutnya) node deploy/vps/sync-dist-from-live.mjs --apply --ssh root@<host>');
}
