# Audit Keamanan & UX — Fitur Sponsorship

- **Tanggal:** 2026-08-26
- **Scope:** Fitur akuisisi sponsor — `event_proposals` + `sponsor_leads` (skema `migrate/sponsorship.sql`), API proxy admin (`api/supabase-admin.js` case sponsorship), upload R2 (`api/r2-upload.js`, `api/r2-delete.js`, `api/_lib/r2Key.js`), UI admin (`src/components/SponsorManagerModal.tsx`), halaman publik (`src/components/SponsorLandingPage.tsx`), client API (`src/utils/api/sponsorshipApi.ts`).
- **Metode:** review statis (file:line di bawah) + probe RLS live terhadap proyek Supabase `xddqinydbuargyfseycw` memakai kunci dari `.env` (anon key + service role key; nilai tidak dicetak/diekspos). Tidak ada perubahan kode/skema yang dilakukan auditor; hanya satu file yang ditulis: dokumen ini.
- **Di luar scope:** isu filter tanggal halaman `/sponsor` (sedang diperbaiki paralel oleh workstream lain).

## Ringkasan Eksekutif

| Kategori | Jumlah |
|---|---|
| Kritis | 0 |
| Major | 4 |
| Minor | 5 |
| Nit | 6 |


**3 temuan teratas:**

1. **[Major] Submit minat support publik tanpa validasi server-side, tanpa rate limit, dan kolom tanpa batas** — klien meng-INSERT langsung ke `sponsor_leads` dengan kunci anon; seluruh validasi hanya ada di client (bisa dilewati). Bandingkan dengan endpoint publik lain di repo yang semuanya lewat proxy + `enforceRateLimit`.
2. **[Major] Policy INSERT `WITH CHECK (true)` — anon bisa memalsukan `status`, `internal_notes`, custom `id`, dan mengirim pesan 60 KB+** — terverifikasi live: baris `status='agreed'` + `internal_notes` + payload HTML masuk ke DB dari koneksi anon.
3. **[Major] Cap 20 MB hanya client-side; presign R2 tanpa batas ukuran di server** — siapa pun dengan akses admin (atau pemegang presigned URL selama 5 menit) bisa mengunggah objek sebesar apa pun ke bucket.

## Status Perbaikan (2026-08-26)

| Temuan | Status | Bukti |
|---|---|---|
| M-1 Submit publik tanpa validasi server + rate limit | ✅ Diperbaiki | `api/sponsor-lead.js` (zod + `enforceRateLimit` 10/15mnt + sanitize); `submitSponsorLead` kini POST ke proxy |
| M-2 RLS INSERT `WITH CHECK (true)` permisif | ✅ Diperbaiki | `migrate/fix-sponsor-lead-rls.sql` (DROP policy; live-verified anon INSERT → 401 RLS); zod men-strip status/internal_notes/id |
| M-3 Cap 20MB hanya client-side | ✅ Diperbaiki | `setEventProposal` HEAD object R2 sebelum upsert, >20MB → hapus + tolak (ContentLength TIDAK ditandatangani saat presign) |
| M-4 Gating nav viewer vs API 403 | ✅ Diperbaiki | `usePermission.canManageSponsorship = isAdmin`; nav sponsorship memakai permission baru |
| m-1 Orphan file saat ganti proposal | ⏸ Belum | Perlu hapus file lama sebelum upsert |
| m-2 Delete R2 fire-and-forget ganda | ⏸ Belum | — |
| m-3 MIME allowlist tanpa magic bytes | ⏸ Belum | — |
| m-4 Upload file tidak tercatat activity_logs | ⏸ Belum | — |
| m-5 internalNotes tanpa batas panjang | ⏸ Belum | — |

## Hasil Probe RLS Live

Probe memakai kunci dari `.env` (anon + service role) terhadap DB produksi. Baris uji dibersihkan setelah probe (count akhir `sponsor_leads` = 0).

| Operasi (anon) | Hasil | Keterangan |
|---|---|---|
| `SELECT sponsor_leads` | ✅ Ditolak | 0 baris, tanpa error (RLS filter). Bahkan SELECT by id baris yang ada → `null`. |
| `UPDATE sponsor_leads` | ✅ Ditolak | Silent no-op pada baris yang ada (status tidak berubah, tidak error). |
| `DELETE sponsor_leads` | ✅ Ditolak | Silent no-op. |
| `INSERT sponsor_leads` (minimal valid) | ⚠️ DIBOLEHKAN | By design, tapi policy permisif (lihat Major #2). |
| `INSERT sponsor_leads` (forged: `status='agreed'`, `internal_notes`, custom id, message 60 KB, phone/email sampah) | ⚠️ DIBOLEHKAN | Terverifikasi tersimpan di DB (dibaca via service role). |
| `INSERT sponsor_leads` (event_id tidak ada) | ✅ Ditolak | Foreign key `sponsor_leads_event_id_fkey` bekerja. |
| `SELECT event_proposals` | ✅ DIBOLEHKAN (by design) | Policy "Public can read event proposals" aktif (terverifikasi dengan baris nyata). |
| `INSERT/UPDATE/DELETE event_proposals` | ✅ Ditolak | Tanpa policy → hanya service-role proxy admin yang bisa mutasi. |
| `SELECT events` + embed `event_proposals` | ✅ DIBOLEHKAN (by design) | Query landing `/sponsor` bekerja (events punya policy public read). |

Catatan metodologi: `insert().select()` pada tabel **tanpa** policy SELECT (kasus `sponsor_leads`) menghasilkan error menyesatkan `new row violates row-level security policy` meski INSERT-nya berhasil — artefak `RETURNING` PostgREST yang kena RLS SELECT, bukan penolakan INSERT. Karena itu probe INSERT di sini selalu tanpa `.select()`, dan verifikasi keberadaan baris dilakukan via service role.

---

## Kritis

Tidak ada temuan Kritis. Tidak ditemukan jalur kebocoran data, eksekusi kode, atau bypass autentikasi pada fitur sponsorship. RLS `sponsor_leads` untuk SELECT/UPDATE/DELETE tertutup (berbeda dengan `community_registrations` yang pernah bocor dan sudah diperbaiki di `migrate/fix-community-registration-rls.sql:21-37`), dan mutasi `event_proposals` hanya bisa lewat proxy admin service-role.

---

## Major

### M-1. Submit publik tanpa validasi server-side + tanpa rate limit + field tak berbatas
- **Bukti:** `src/utils/api/sponsorshipApi.ts:82-85` — `submitSponsorLead` melakukan `supabase.from('sponsor_leads').insert(...)` langsung dari browser dengan kunci anon; `migrate/sponsorship.sql:43` — policy INSERT; satu-satunya validasi ada di `src/components/SponsorLandingPage.tsx:75-95` (client). Tidak ada `enforceRateLimit` pada jalur ini, padahal pola sudah ada: `api/community-registration.js:312` (10/15 mnt per IP), `api/survey.js:96` (20/15 mnt), `api/tenant-survey.js:599` (15/15 mnt), dengan util `api/_lib/rateLimit.js:21`. Tidak ada cap panjang field di server (message tak terbatas, `company_name` tak terbatas).
- **Dampak:** form publik bisa di-spam massal (bot langsung ke Supabase, bukan lewat Vercel), menyebabkan: banjir lead di inbox admin, pertumbuhan storage DB tak terkendali (kolom `message` tanpa batas), dan potensi biaya/kuota Supabase. Validasi client yang dilewati berarti data sampah (phone/email tidak valid) ikut masuk.
- **Saran:** pindahkan submit ke endpoint proxy (`/api/sponsor-lead`) yang memakai `sanitizeString`/zod + `enforceRateLimit` (ikuti pola `api/community-registration.js:59-69,312`), atau pertahankan INSERT langsung tapi dengan RLS yang mengunci kolom (lihat M-2) + constraint `CHECK` panjang kolom di skema.

### M-2. Policy INSERT `WITH CHECK (true)` — anon bisa forge `status`, `internal_notes`, id, dan payload besar
- **Bukti:** `migrate/sponsorship.sql:43` — `CREATE POLICY ... FOR INSERT WITH CHECK (true)`; **terverifikasi live**: baris dengan `status='agreed'`, `internal_notes='PWNED internal notes'`, custom `id`, `message` 60 KB, `phone='!!!not-a-phone!!!'`, `email='not-an-email@'`, dan `contact_name` berisi HTML diterima oleh RLS dan tersimpan di DB.
- **Dampak:** siapa pun bisa membuat lead berstatus `agreed` (integridas data workflow sponsor rusak — admin bisa bertindak berdasarkan lead palsu), mencemari `internal_notes` (ruang kerja admin), dan mengisi kolom raksasa. Payload HTML tersimpan di DB; saat ini **tidak tereksekusi** di UI admin karena React men-escape semua teks (tidak ada `dangerouslySetInnerHTML` di `src/`), tapi menjadi risiko jika data kelak dirender mentah (e.g., email blas, ekspor).
- **Saran:** persempit policy, mis. `WITH CHECK (status = 'pending' AND internal_notes = '' AND length(message) <= 5000 AND ...)`; atau pindahkan insert ke RPC `SECURITY DEFINER`/edge function yang memvalidasi input dan hanya menulis kolom yang diizinkan.

### M-3. Cap 20 MB hanya client-side; presign R2 tanpa batas ukuran di server
- **Bukti:** `src/components/SponsorManagerModal.tsx:20,73` — `MAX_FILE_SIZE = 20MB` hanya dicek di browser; `api/r2-upload.js:45-51` — `PutObjectCommand` di-presign tanpa `ContentLength`/kondisi ukuran apa pun. Tidak ada pengecekan ukuran di server (`api/r2-upload.js` seluruh file) maupun verifikasi ulang setelah PUT.
- **Dampak:** admin (atau pemegang presigned URL dalam masa berlaku 300 detik) bisa mengunggah objek sebesar apa pun (batas R2 ~5 GB) ke bucket publik → pemborosan storage/biaya, dan halaman publik `/sponsor` menautkan file raksasa. Situs memakai pola sama untuk foto album (10 MB) dan news (10 MB) — masalah lintas fitur.
- **Saran:** sertakan `ContentLength` pada `PutObjectCommand` saat presign (R2 menolak PUT yang lebih besar), tambah validasi server setelah upload (HEAD object), dan lakukan check `file.size` yang sudah ada (pertahankan).

### M-4. Gating nav "Sponsorship" tidak konsisten dengan otorisasi API → viewer dapat 403 di UI
- **Bukti:** `src/components/dashboard/dashboardNavigation.tsx:100` — item nav Sponsorship dimunculkan saat `permissions.canViewRegistrations`; `src/hooks/usePermission.ts:90` — `canViewRegistrations: isAdmin || isViewer`; tapi API menolak viewer: `api/supabase-admin.js:33` `requireAuth(req, res, ['superadmin','admin'])` dan `api/_lib/auth.js:148-154` mengirim 403 untuk role di luar daftar.
- **Dampak:** akun `viewer` melihat menu Sponsorship, membuka modal, lalu semua pemanggilan (`fetchAllSponsorLeads` dkk.) gagal 403 → UI error di setiap load. Kebingungan + inkonsistensi model permission. (Pola yang sama mengenai Registrations sudah ada sebelumnya, tapi sponsorship mewarisinya.)
- **Saran:** gate nav dengan permission spesifik sponsorship bernilai `isAdmin` (atau tambah `canManageSponsorship` di `usePermission`), selaras dengan daftar role di `requireAuth`.

---

## Minor

### m-1. Mengganti proposal meninggalkan file lama di R2 (orphan)
- **Bukti:** `api/supabase-admin.js:343-352` — `setEventProposal` melakukan upsert `file_url` baru tanpa menghapus `file_url` lama; kunci R2 selalu unik per upload (`api/_lib/r2Key.js:67-68`), jadi file lama tak pernah tertimpa.
- **Dampak:** setiap klik "Ganti" menyisakan objek publik di bucket selamanya → kebocoran storage berulang. Bukan masalah keamanan (kunci acak), tapi biaya/akumulasi.
- **Saran:** sebelum upsert, baca `file_url` lama (pola `deleteNewsArticle` di `api/supabase-admin.js:331-336`) lalu hapus dari R2.

### m-2. Penghapusan R2 pada delete proposal berlapis & fire-and-forget → risiko orphan / UX ganda
- **Bukti:** server: `api/supabase-admin.js:354-362` — hapus baris DB lalu `deleteR2File()` fire-and-forget (hanya `console.warn`, `:17-29`); client juga memanggil `deleteFromR2` terpisah: `src/utils/api/sponsorshipApi.ts:115-118`. Jika keduanya gagal, objek tersisa tanpa referensi DB; jika delete client gagal setelah baris DB hilang, UI menampilkan error padahal data sudah terhapus.
- **Dampak:** orphan file saat kegagalan jaringan/R2; pesan error menyesatkan pada retry.
- **Saran:** hapus file R2 lebih dulu (atau pakai satu jalur hapus saja), dan hanya laporkan error jika benar-benar tidak terhapus; pertimbangkan antrean retry.

### m-3. MIME allowlist tanpa verifikasi isi (magic bytes) — spoofing Content-Type
- **Bukti:** `api/_lib/r2Key.js:6-24` — allowlist MIME hanya memvalidasi string `Content-Type` yang dikirim client; `api/r2-upload.js:45-51` — presign mengunci `Content-Type` ke nilai allowlist, tapi **isi** file tidak pernah diperiksa. Client bisa mengklaim `image/png` untuk payload arbitrer (HTML/JS/zip).
- **Dampak:** rendah — browser tidak mengeksekusi konten di bawah MIME gambar, dan SigV4 presign menolak header Content-Type berbeda saat PUT; namun objek "gambar" bisa berisi konten tak terduga (stored XSS di sisi konsumen file, dokumen berbahaya dengan ekstensi pdf).
- **Saran:** sniff magic bytes (mis. `file-type`) di server sebelum presign atau validasi ulang setelah upload; setidaknya untuk tipe yang dirender publik.

### m-4. Upload file (presign R2) tidak tercatat di activity_logs
- **Bukti:** `api/r2-upload.js` seluruhnya — tidak ada `logActivity`; bandingkan `api/supabase-admin.js:351,361,379,387` yang mencatat 4 aksi mutasi sponsorship. Hanya write DB yang tercatat, momen upload file tidak.
- **Dampak:** audit trail tidak lengkap (kapan/oleh siapa file proposal diunggah tidak terlacak).
- **Saran:** tambahkan `logActivity` di `r2-upload.js` (mis. `upload_proposal_file` saat folder `proposals/`).

### m-5. `updateSponsorLeadStatus` menerima `internalNotes` tanpa batas panjang
- **Bukti:** `api/_lib/schemas.js:99-104` — `internalNotes: z.string().optional()` tanpa `.max()`; diikuti langsung ke kolom `internal_notes` (`api/supabase-admin.js:372-376`). `company_name`/`message` pada insert publik juga tanpa batas (M-1), tapi jalur ini admin.
- **Dampak:** data admin bisa membengkak; konsistensi dengan batas client (200 karakter untuk nama) hilang.
- **Saran:** tambahkan `.max(...)` di skema zod (dan batas client yang sesuai).

---

## Nit

### n-1. Artefak `insert().select()` pada tabel tanpa policy SELECT
- **Bukti:** terverifikasi live — `insert(...).select(...)` ke `sponsor_leads` (tanpa policy SELECT) error `new row violates row-level security policy` padahal INSERT sukses; tanpa `.select()` sukses. `submitSponsorLead` (`sponsorshipApi.ts:83`) sudah benar (tanpa `.select()`), tapi pengembang berikutnya mudah salah baca.
- **Saran:** dokumentasikan di komentar `sponsorshipApi.ts`/migrasi; jangan tambahkan `.select()` pada insert anon ke tabel RLS-select-denied.

### n-2. `fetchSponsorEventsWithProposals` memakai `.limit(100)` tanpa pagination
- **Bukti:** `src/utils/api/sponsorshipApi.ts:76`.
- **Dampak:** jika event upcoming > 100, daftar proposal publik terpotong diam-diam. Saat ini aman (84 upcoming + 16 masa depan), tapi rapuh.
- **Saran:** tambahkan pagination atau naikkan limit dengan sadar.

### n-3. Tidak ada atribut `maxLength` pada input form publik
- **Bukti:** `src/components/SponsorLandingPage.tsx:296-374` — input phone/company/message tanpa `maxLength` (validasi JS menangani, tapi keyboard/user tidak dibatasi; pola `maxLength` dipakai di tempat lain: `TenantSurveyPublicPage.tsx:646`, `SurveyPage.tsx:320`).
- **Saran:** tambahkan `maxLength` (200 company, 100 contact, 20 phone, ~2000 message) konsisten dengan batas validasi.

### n-4. State error vs konten kosong di modal admin kurang dibedakan saat load gagal
- **Bukti:** `src/components/SponsorManagerModal.tsx:47-60` — saat `loadData` gagal, hanya banner error muncul; tab menampilkan daftar lama/kosong tanpa indikator bahwa data basi.
- **Saran:** tampilkan state error menggantikan konten (pola `SponsorLandingPage.tsx:171-185` dengan tombol "Coba lagi").

### n-5. Phone/email lead di admin tampil sebagai teks polos
- **Bukti:** `src/components/SponsorManagerModal.tsx:321-325` — `lead.phone` / `lead.email` tanpa `href` tel:/mailto:, padahal ini data kontak untuk follow-up.
- **Saran:** jadikan tautan `tel:`/`mailto:` (dengan `target`/`rel` aman).

### n-6. `deleteR2File` server hanya `console.warn` tanpa observability
- **Bukti:** `api/supabase-admin.js:26-28`.
- **Saran:** catat metrik/struktur error (mis. `console.error` dengan konteks resource + aktivitas) agar orphan R2 terpantau.

---

## Hal yang Sudah Baik (Positif)

- **RLS `sponsor_leads` untuk baca/mutasi tertutup** — anon SELECT/UPDATE/DELETE ditolak (live-verified); hanya proxy admin service-role yang membaca. Lebih ketat daripada `community_registrations` yang sempat bocor PII (`migrate/fix-community-registration-rls.sql`).
- **Mutasi `event_proposals` hanya via proxy admin** — anon INSERT/UPDATE/DELETE ditolak (live-verified); SELECT publik by design (file R2 memang publik, `migrate/sponsorship.sql:37`).
- **Tidak ada `dangerouslySetInnerHTML`** di seluruh `src/` — payload HTML di kolom lead tersimpan aman (tidak tereksekusi) karena React escaping.
- **Sanitasi kunci R2 kuat** — path traversal & null-byte ditolak, prefix allowlist, fallback `gallery/`, kunci acak `timestamp + random` (`api/_lib/r2Key.js:45-71,78-87`); presign expiry 300 detik (`api/r2-upload.js:51`); delete divalidasi `validateExistingKey`.
- **Auth proxy berlapis** — `requireAuth` dual-mode (Supabase Auth + legacy cookie) dengan role check (`api/_lib/auth.js:141-213`); cookie `HttpOnly; Secure; SameSite=Lax`; validasi zod per action di `api/_lib/schemas.js:90-105`.
- **Cakupan activity_logs** — 4 dari 5 aksi mutasi sponsorship tercatat: `set_event_proposal` (`supabase-admin.js:351`), `delete_event_proposal` (:361), `update_sponsor_lead` (:379), `delete_sponsor_lead` (:387); aksi baca (`listSponsorLeads`) tidak dicatat — konsisten dengan aksi list lain.
- **UX publik lengkap** — loading skeleton, state error + retry, empty state, success state, validasi per field dengan `role="alert"`/`aria-invalid`, tombol submit disabled saat mengirim (`SponsorLandingPage.tsx:156-397`).
- **UX admin lengkap** — loading/error/success/empty state di kedua tab, konfirmasi sebelum hapus (`SponsorManagerModal.tsx:185-302`).
- **Foreign key** `sponsor_leads.event_id → events(id)` ON DELETE CASCADE — insert dengan event_id fiktif ditolak (live-verified).
