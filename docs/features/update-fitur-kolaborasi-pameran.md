# Update Fitur: Kolaborasi (Pameran & Aktivasi Marcomm)

Tanggal: 2026-11-23
Status: live di produksi 2026-11-24. Migrasi sudah dijalankan di Postgres VPS
(backup `pre-kolaborasi-20261124-000314.sql.gz`), API `metmal-api` sudah di-recreate,
SPA Vercel `metmal-community-hub` sudah deploy production, dan halaman
`https://www.metmalcommunityspace.web.id/kolaborasi` sudah diverifikasi.

## Ringkasan

Halaman publik `Pameran` dinaikkan menjadi modul **Kolaborasi** yang menampung dua jenis
program: `pameran` dan `aktivasi_marcomm`. Fitur lama tetap hidup:

- `/kolaborasi` dan `/kolaborasi/:slug` adalah rute baru.
- `/pameran` dialihkan permanen ke `/kolaborasi`.
- `/pameran/:id` tetap merender halaman detail Kolaborasi, tetapi program yang
  sudah selesai atau tidak tayang berakhir di keadaan “program tidak ditemukan”.
- Tabel `exhibitions`, `exhibition_leads`, dan `exhibition_activations` dipertahankan dan
  diperluas dengan `ALTER TABLE`, bukan diganti tabel paralel.
- Program yang tampil di publik hanya yang berstatus `open`, `full`, atau `ongoing`
  dan `date_end` belum lewat menurut tanggal Asia/Jakarta. Program `completed`,
  `archived`, dan program yang tanggalnya sudah lewat disembunyikan otomatis dari
  daftar dan detail publik, tetapi datanya tetap ada di dashboard admin.

## Pemetaan istilah brief ke skema nyata

| Brief | Skema repo |
| --- | --- |
| `collaboration_programs` | `exhibitions` (+ `slug`, `program_type`, `status`, `form_config`, dll.) |
| `program_activation_slots` | `exhibition_slots` |
| `program_collaborations` | `exhibition_leads` (+ `reference_code`, `slot_id`, kurasi publik) |
| `public_program_agenda` | view `public_program_agenda` |

Supabase sudah tidak dipakai (Opsi B). Karena itu RLS pada brief diterjemahkan menjadi
proteksi di API:

- proyeksi kolom publik eksplisit di `server/src/routes/exhibitions.js`,
- schema zod publik tidak memuat field kurasi (`is_public_agenda`, `synced_event_id`, `admin_notes`),
- rate limit pada endpoint tulis publik,
- guard peran `requireRole` + allowlist aksi baca di `server/src/auth.js`.

## Perilaku utama

- Kode pengajuan otomatis `KOL-YYMM-XXXX` lewat trigger `generate_collaboration_reference_code`.
- Kapasitas slot dihitung ulang lewat trigger `recalculate_exhibition_slot_status`:
  `approved`/`scheduled` dibandingkan dengan `capacity`; slot `closed` tidak ditimpa.
- Pengajuan publik selalu masuk sebagai `submitted` dan tidak bisa menulis data kurasi.
- Admin dapat mengubah status sampai `scheduled`, mengisi judul/ringkasan publik,
  menyalakan agenda publik, dan menerbitkan kegiatan ke tabel `events`
  (`synced_event_id`).
- Tombol WhatsApp memakai template berbeda untuk `need_info`, `approved`/`scheduled`,
  `rejected`/`cancelled`, dan status lain.

## File utama

- Migrasi: `server/migrations/2026-11-23-kolaborasi-pameran-aktivasi.sql`
- Skema baru DB: `server/schema.sql`
- API publik: `server/src/routes/exhibitions.js`
- API admin: `server/src/routes/admin.js` + `server/src/lib/exhibitionSchemas.js`
- Tipe & mapper: `src/types/index.ts`, `src/utils/api/exhibitionsApi.ts`
- Hook admin: `src/hooks/useExhibitions.ts`
- Halaman publik: `src/pages/ExhibitionsLandingPage.tsx`
- Formulir: `src/components/collaboration/CollaborationForm.tsx`
- Panel admin: `src/components/admin/ExhibitionManager.tsx`
- Navigasi: `src/App.tsx`, `src/components/nav/publicNav.ts`

## Urutan deploy

1. Backup database produksi.
2. Jalankan migrasi sebelum kode baru:
   `docker compose exec -T postgres psql -U metmal -d metmal < server/migrations/2026-11-23-kolaborasi-pameran-aktivasi.sql`
3. Deploy SPA (Vercel).
4. Deploy API VPS lalu recreate service `api`.

API baru membutuhkan kolom dan trigger dari migrasi. Menjalankan API lebih dulu akan
membuat query kolom baru gagal.

## Verifikasi manual

- `/kolaborasi` menampilkan tab `Semua`, `Aktivasi Marcomm`, `Pameran`.
- `/pameran` mengarah ke `/kolaborasi`; `/pameran/<id>` tetap membuka detail.
- Detail menampilkan slot, agenda terkonfirmasi, dan tombol `Pilih tanggal ini`
  yang mengisi formulir.
- Submit pengajuan menampilkan kode `KOL-...`; nomor WhatsApp `08...`, `628...`,
  atau `+628...` (boleh berspasi/strip) tersimpan sebagai `628...`.
- Dashboard `/dashboard/exhibitions`: kelola slot, generate slot hari Minggu,
  kurasi pengajuan, WhatsApp, dan terbit ke Jadwal Event.
