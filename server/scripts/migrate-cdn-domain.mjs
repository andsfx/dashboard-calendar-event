/**
 * migrate-cdn-domain.mjs — ganti domain media lama → domain kanonik.
 *
 *   node server/scripts/migrate-cdn-domain.mjs             # DRY-RUN (bawaan)
 *   node server/scripts/migrate-cdn-domain.mjs --apply     # baru menulis
 *
 * Sengaja dibalik dari konvensi umum: tanpa flag script HANYA MELAPOR. Ini
 * karena script pernah dijalankan tanpa sengaja terhadap produksi ketika
 * flag `--dry-run` tidak sampai ke proses (tertelan pembungkus shell),
 * sehingga perubahan langsung diterapkan. Dengan bawaan aman, kegagalan
 * meneruskan flag berakibat "tidak terjadi apa-apa", bukan kerusakan data.
 *
 * Latar: bucket R2 yang sama (`metmal-gallery`) kini disajikan lewat
 * `cdn.metmalcommunityspace.web.id`, menggantikan `cdn.andotherstori.my.id`.
 * Objeknya TIDAK dipindah — hanya hostname di URL yang berubah, jadi
 * penggantian string sudah cukup dan tidak ada berkas yang perlu diunduh.
 *
 * Idempotent: menjalankan ulang tidak mengubah apa pun (pola lama sudah tidak
 * ada). Aman dijalankan sebelum domain baru aktif — URL baru baru dipakai
 * setelah DNS/R2 custom domain siap.
 *
 * Env: DATABASE_URL.
 */
import pg from 'pg';

// `dotenv` hanya untuk kenyamanan lokal (membaca .env). Di container/produksi
// DATABASE_URL sudah ada di environment, dan modul ini belum tentu terpasang —
// jadi kegagalan impor diabaikan, bukan fatal.
try {
  await import('dotenv/config');
} catch {
  /* DATABASE_URL diambil dari environment apa adanya */
}

const LAMA = 'cdn.andotherstori.my.id';
const BARU = 'cdn.metmalcommunityspace.web.id';

// Bawaan = lapor saja. Menulis wajib meminta dengan eksplisit.
const APPLY = process.argv.includes('--apply');

/**
 * Kolom yang menyimpan URL media, beserta tipe cast untuk UPDATE.
 * Daftar eksplisit — sengaja bukan pemindaian seluruh kolom, supaya migrasi
 * ini tidak pernah menyentuh kolom yang kebetulan memuat pola sama
 * (mis. catatan internal).
 */
const KOLOM = [
  ['events', 'poster_url', 'text'],
  ['event_areas', 'cover_photo_url', 'text'],
  ['photo_albums', 'cover_photo_url', 'text'],
  ['event_photos', 'url', 'text'],
  ['area_photos', 'url', 'text'],
  ['event_proposals', 'file_url', 'text'],
  ['news_articles', 'cover_image_url', 'text'],
  ['generated_letters', 'pdf_url', 'text'],
  ['community_registrations', 'proposal_file_url', 'text'],
  ['users', 'avatar_url', 'text'],
  // Nilai JSONB (mis. `hero_image` menyimpan URL sebagai string di dalam JSON).
  ['site_settings', 'value', 'jsonb'],
];

const DATABASE_URL = process.env.DATABASE_URL || '';
if (!DATABASE_URL) {
  console.error('✗ DATABASE_URL belum dikonfigurasi.');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 1 });

/** Hitung baris yang cocok; `null` bila tabel/kolom tidak ada di instance ini. */
async function hitung(table, kolom) {
  try {
    const { rows } = await pool.query(
      `SELECT count(*)::int AS n FROM "${table}" WHERE "${kolom}"::text LIKE $1`,
      [`%${LAMA}%`],
    );
    return rows[0].n;
  } catch (err) {
    if (err.code === '42P01' || err.code === '42703') return null; // tabel/kolom absen
    throw err;
  }
}

const rencana = [];
for (const [table, kolom] of KOLOM) {
  const n = await hitung(table, kolom);
  if (n) rencana.push({ table, kolom, n });
}
const total = rencana.reduce((s, r) => s + r.n, 0);

if (total === 0) {
  console.log(`✓ tidak ada baris memakai ${LAMA} — tidak ada yang diubah.`);
  await pool.end();
  process.exit(0);
}

console.log(`${APPLY ? '' : '[DRY-RUN] '}baris memakai ${LAMA}:`);
for (const r of rencana) console.log(`  ${r.table}.${r.kolom} = ${r.n}`);
console.log(`  total = ${total}`);

if (!APPLY) {
  console.log('\nIni hanya laporan. Jalankan ulang dengan --apply untuk menerapkan.');
  await pool.end();
  process.exit(0);
}

try {
  await pool.query('BEGIN');
  for (const [table, kolom, tipe] of KOLOM) {
    const { rowCount } = await pool.query(
      `UPDATE "${table}"
          SET "${kolom}" = replace("${kolom}"::text, $1, $2)::${tipe}
        WHERE "${kolom}"::text LIKE $3`,
      [LAMA, BARU, `%${LAMA}%`],
    );
    if (rowCount) console.log(`  ✓ ${table}.${kolom}: ${rowCount} baris`);
  }
  await pool.query('COMMIT');
  console.log(`\n✓ selesai. ${LAMA} → ${BARU}`);
} catch (err) {
  await pool.query('ROLLBACK').catch(() => {});
  console.error('✗ gagal, sudah di-rollback:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
