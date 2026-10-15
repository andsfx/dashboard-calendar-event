# Update Fitur: Partisipasi Tenant — Open Booth & Voucher per Event

Status: **BRIEF** (disetujui lewat interview 2026-10-15) · Repo: schedule-event-v2 · Stack: Opsi B (Express/Postgres VPS, ADR 005) · 2026-10-15

Preseden: `update-fitur-kolaborasi-tenant.md` (halaman publik + form + antrean review), `docs/features/draft-voucher-tenant.md` (konsep program voucher, open item #5/#6 diputuskan di sini), `update-fitur-sponsorship.md` (tata letak antrean lead).

## 1. Ringkasan

Tenant Metropolitan Mall Bekasi dapat **mengajukan partisipasi pada event** dalam dua bentuk: **open booth** (berjualan/promosi di area event) dan/atau **voucher** (diskon/penawaran khusus untuk pengunjung event). Pengajuan masuk antrean review Marcomm di dashboard; yang disetujui **tampil di halaman detail event publik**.

Hasil interview (2026-10-15):

| # | Keputusan |
|---|---|
| K1 | Lingkup: pengajuan + review + publikasi daftar approved di halaman detail event. Tanpa pencatatan penukaran voucher (verifikasi tetap oleh tenant di kasir, keputusan draf #8). |
| K2 | Form publik tanpa login; tenant dipilih dari master MID (pola `/kolaborasi-tenant`), jalur isi manual tetap ada. |
| K3 | Satu form, dua jenis partisipasi: booth / voucher / keduanya. Satu antrean review. |
| K4 | Event tujuan: hanya event published yang **belum mulai** (cutoff otomatis H-1 sebelum tanggal mulai). Event yang sudah mulai/lewat tidak bisa dipilih. |
| K5 | Tanpa lampiran file. |
| K6 | Status pengajuan dicek lewat **kode pengajuan + nomor telepon** (verifikasi ringan, tanpa login). |
| K7 | Modul dashboard terpisah "Partisipasi Tenant" di grup Interaksi. |
| K8 | Voucher: enum jenis (5 jenis draf + other) + teks ketentuan + kuota angka opsional + format fisik/digital/keduanya. Tanpa field masa berlaku terstruktur (ditulis di ketentuan bila perlu). |
| K9 | Tampilan publik: logo + nama + unit tenant, detail booth (area, periode, produk, dimensi) & voucher (jenis, ketentuan, kuota), plus CTA "ikutserta" menuju form. Kebutuhan fasilitas & skema booth = internal, tidak tampil publik. |
| K10 | Marcomm boleh mengoreksi isian tenant (edit field) selain status + catatan internal. |

Non-goal: membuat Event/Draft otomatis dari pengajuan (ADR 003); kode voucher unik sekali pakai; pencatatan penukaran; notifikasi otomatis (follow-up manual via WA); login portal tenant.

## 2. Keputusan desain

| # | Keputusan |
|---|---|
| D1 | Tabel baru `tenant_participations`, id `tpr_<uuid>` (pola `tep_`/`crg_`/`sld_`). Tidak menumpang `tenant_event_proposals`: relasinya ke **event spesifik** (bukan pengajuan event baru), punya cutoff, kode cek status, dan dua kelompok field (booth/voucher). |
| D2 | `kind`: `booth` \| `voucher` \| `both`. Field booth diisi bila kind ∈ {booth, both}; field voucher bila ∈ {voucher, both}. |
| D3 | Status review: `pending → contacted → approved / rejected` (vocab sama dengan `tenant_event_proposals`/`sponsor_leads`), default `pending`; `internal_notes` untuk staff. |
| D4 | Cutoff H-1 ditegakkan di server saat submit **dan** di query daftar event form: `status <> 'draft'` + `notStartedOn(date_str)` dari `server/src/lib/eventWindow.js` (memakai hari WIB). Event multi-day yang belum mulai tetap bisa dipilih; event yang sudah mulai (termasuk ongoing) ditolak dengan pesan jelas. |
| D5 | `code` unik `TPR-XXXXXX` (alfabet tanpa I/O/0/1, 6 karakter, crypto random, retry saat tabrakan UNIQUE). Verifikasi cek status: kode + nomor telepon (digit-normalized) harus cocok. |
| D6 | `event_id` FK `events(id) ON DELETE SET NULL`; `event_title`/`event_date` didenormalisasi saat submit supaya antrean admin tetap terbaca bila event dihapus/diubah. |
| D7 | Submit publik: zod penuh (`server/src/lib/tenantParticipationSchemas.js`), rate limit 10/15 mnt, respons `{success:true, code}` (kode ditampilkan sekali; tanpa echo PII lain). |
| D8 | `GET /tenant-participations?event_id=` publik: hanya `status='approved'`, **tanpa PII** (contact/phone/email/needs/scheme tidak diseleksi); rate limit 40/mnt. Dipakai section "Tenant di event ini" pada halaman detail event. |
| D9 | `GET /tenant-participations/events` publik: daftar event eligible untuk dropdown form (published + belum mulai, ORDER BY date_str ASC, LIMIT 100); rate limit 30/mnt. |
| D10 | `POST /tenant-participations/status` publik: cek status via `{code, phone}`; rate limit 10/15 mnt; respons hanya status + ringkasan aman (tanpa `internal_notes`). |
| D11 | Admin via `adminAction`: `listTenantParticipations` (ORDER BY created_at DESC), `updateTenantParticipation` (status dan/atau internalNotes dan/atau koreksi field isian; minimal satu perubahan), `deleteTenantParticipation`. Kolom ditulis lewat SET tetap — whitelist manual, bukan spread body. |
| D12 | Role demo: `listTenantParticipations` masuk `READ_ONLY_ACTIONS`; PII disamarkan untuk demo (pola `listTenantEventProposals`); update/delete ditolak 403 oleh allowlist. |
| D13 | Dashboard: modul **Partisipasi Tenant** (`/dashboard/tenant-participations`) di grup Interaksi, izin `canViewTenantParticipations = isAdmin \|\| isViewer \|\| isDemo`; kartu antrean di Pusat Komando + insight bila ada pending. |
| D14 | Halaman publik `/partisipasi-tenant` berisi dua panel: form pengajuan (dengan `?event=` preselect dari CTA) + panel cek status (kode + telepon). Setelah submit sukses, tampilkan kode pengajuan dengan tombol salin. |
| D15 | Copy Indonesia; halaman publik mengikuti struktur `TenantCollaborationPage` (header logo + dark toggle, `usePageMeta`, token `var(--brand-*)`, kelas `ui-*`); dashboard memakai komponen MD3 (`src/components/md`) seperti `TenantProposalManager`. |

## 3. Database — `server/migrations/2026-10-15-tenant-participations.sql` (+ blok sama di `server/schema.sql`)

```sql
CREATE TABLE IF NOT EXISTS tenant_participations (
  id TEXT PRIMARY KEY DEFAULT ('tpr_' || replace(gen_random_uuid()::text, '-', '')),
  code TEXT NOT NULL UNIQUE,                 -- TPR-XXXXXX, dibuat server
  tenant_id TEXT NOT NULL DEFAULT '',        -- TENANT_ID master MID; '' = isi manual
  tenant_name TEXT NOT NULL,
  unit_number TEXT NOT NULL DEFAULT '',
  tenant_category TEXT NOT NULL DEFAULT '',
  tenant_logo TEXT NOT NULL DEFAULT '',      -- TENANT_LOGO MID disalin saat submit (hindari panggil MID dari halaman publik)
  contact_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  event_id TEXT REFERENCES events(id) ON DELETE SET NULL,
  event_title TEXT NOT NULL,                 -- denormalisasi utk antrean/laporan
  event_date DATE,                           -- denormalisasi date_str event saat submit
  kind TEXT NOT NULL DEFAULT 'both'
    CONSTRAINT chk_tenant_participations_kind CHECK (kind IN ('booth','voucher','both')),
  -- Booth
  booth_area TEXT NOT NULL DEFAULT '',
  booth_start DATE,
  booth_end DATE,
  booth_size TEXT NOT NULL DEFAULT '',
  booth_products TEXT NOT NULL DEFAULT '',
  booth_scheme TEXT NOT NULL DEFAULT 'solo'
    CONSTRAINT chk_tenant_participations_scheme CHECK (booth_scheme IN ('solo','joint','mall_support')),
  booth_needs TEXT NOT NULL DEFAULT '',
  -- Voucher
  voucher_type TEXT NOT NULL DEFAULT 'other'
    CONSTRAINT chk_tenant_participations_voucher_type
    CHECK (voucher_type IN ('discount_percent','discount_amount','buy1get1','free_item','min_spend','other')),
  voucher_terms TEXT NOT NULL DEFAULT '',
  voucher_quota INTEGER CHECK (voucher_quota IS NULL OR voucher_quota >= 0),
  voucher_format TEXT NOT NULL DEFAULT 'both'
    CONSTRAINT chk_tenant_participations_voucher_format CHECK (voucher_format IN ('digital','fisik','both')),
  -- Review
  status TEXT NOT NULL DEFAULT 'pending'
    CONSTRAINT chk_tenant_participations_status CHECK (status IN ('pending','contacted','approved','rejected')),
  internal_notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_participations_event ON tenant_participations (event_id, status);
CREATE INDEX IF NOT EXISTS idx_tenant_participations_status ON tenant_participations (status);
CREATE INDEX IF NOT EXISTS idx_tenant_participations_created_at ON tenant_participations (created_at DESC);
-- + trigger tenant_participations_updated_at (pola update_updated_at di schema.sql)
```

Kolom non-skalar: **tidak ada** → tidak butuh `pgValues`. Migrasi dijalankan manual di VPS **sebelum** deploy kode api.

## 4. Server API

- **`server/src/routes/tenantParticipations.js`** (baru; mount `app.use('/api/v1', tenantParticipationsRouter)` di `server/src/index.js`):
  - `GET /tenant-participations/events` — event eligible (published + belum mulai) untuk dropdown form.
  - `GET /tenant-participations?event_id=` — daftar approved per event, kolom aman saja.
  - `POST /tenant-participations` — submit publik (zod + cutoff + rate limit), balas `{success, code}`.
  - `POST /tenant-participations/status` — cek status `{code, phone}`.
- **`server/src/lib/tenantParticipationSchemas.js`** (baru) — `tenantParticipationSchema` (submit) + `TENANT_PARTICIPATION_ACTION_SCHEMAS` (list/update/delete); di-spread di `ACTION_SCHEMAS` (`server/src/lib/schemas.js`).
- **`server/src/routes/admin.js`** — case `listTenantParticipations` / `updateTenantParticipation` / `deleteTenantParticipation` + `logActivity`; demo PII masking.
- **`server/src/auth.js`** — `READ_ONLY_ACTIONS` += `listTenantParticipations`.

## 5. Client

- `src/types/index.ts` — `TenantParticipationKind`, `TenantParticipationStatus`, `TenantParticipationVoucherType`, `TenantParticipationVoucherFormat`, `TenantParticipationBoothScheme`, `TenantParticipationInput`, `TenantParticipation`, `TenantParticipationPublicItem`, `TenantParticipationEligibleEvent`, `TenantParticipationStatusResult`.
- `src/utils/api/tenantParticipationsApi.ts` (baru) + re-export di `src/utils/domainApi.ts`; mapper snake_case↔camelCase berhenti di module ini.
- `src/pages/TenantParticipationPage.tsx` (baru) + route lazy `/partisipasi-tenant` (`src/App.tsx`) + entri nav Jelajahi di `src/pages/CommunityLandingPage.tsx` + entri katalog fitur `src/data/featureDocs.ts`.
- `src/components/events/EventTenantParticipationSection.tsx` (baru) — section "Tenant di event ini" pada `src/pages/EventPublicDetailPage.tsx` (booth + voucher approved + CTA ke form dengan `?event=`).
- Admin: `src/hooks/useTenantParticipations.ts`, `src/components/admin/TenantParticipationManager.tsx` (review + koreksi isian + hapus), wiring di `DashboardPage`/`dashboardNavigation` (`/dashboard/tenant-participations`, grup Interaksi), `usePermission.ts`, kartu Pusat Komando + insight (`getCommandCenterCards`, `eventInsights.ts`, `useInsightContext`).

## 6. Verifikasi (hasil 2026-10-15)

1. `npx tsc --noEmit` → 0 error; `npm run build` sukses (penjaga `assert-lazy-entry-chunks` lolos; chunk `TenantParticipationPage` terpisah 32 kB).
2. Tes baru: `src/utils/api/tenantParticipationsApi.test.ts` (10 tes — mapper publik/admin, submit, 404 cek status jadi `null` bukan throw, patch koreksi) dan `src/components/admin/__tests__/TenantParticipationManager.test.tsx` (11 tes — kartu ringkas, blok booth/voucher mengikuti `kind`, konfirmasi approve, patch koreksi per-field, read-only, gagal muat). Keduanya hijau.
   - Regresi yang tertangkap tes: `fetchTenantParticipationStatus` awalnya membiarkan HTTP 404 melempar `ApiError`, sehingga panel cek status menampilkan error sistem alih-alih "tidak ditemukan". Diperbaiki di API module.
3. Smoke end-to-end di **Postgres asli (PGlite/WASM)** + Express nyata (23/23 lulus): migrasi idempoten dijalankan 2x; `GET /tenant-participations/events` hanya memuat event published yang belum mulai (event hari ini dan draft tersaring oleh `notStartedOn`); submit valid → `201` + kode format `TPR-XXXXXX` tanpa echo PII; submit ke event yang sedang berjalan → `400` + pesan H-1; baris `pending` tidak tampil di daftar publik, `approved` tampil **tanpa** kolom kontak/kebutuhan/catatan; cek status cocok → `approved`, normalisasi `+62` cocok, nomor salah dan kode salah → `404`; `kind: 'booth'` menyimpan `voucher_terms = ''` dan `voucher_quota = NULL`; rate limit submit menolak setelah kuota; semua kode unik.
4. Smoke UI browser (Chromium, REST diarahkan ke backend smoke): `/partisipasi-tenant` render dengan dropdown event terisi ("Bazar Kopi Nusantara — 4 November 2026"); cek status kode+telepon benar menampilkan blok "Disetujui"; nomor salah menampilkan "Pengajuan tidak ditemukan…"; `/events/evt_future` menampilkan section "Tenant di event ini" dengan booth + voucher dan CTA bertaut `/partisipasi-tenant?event=evt_future`.
   - Catatan harness: shim `pg` untuk smoke **wajib** menghormati `pg.types.setTypeParser(1082)` seperti `server/src/db.js`; tanpa itu DATE keluar sebagai objek `Date` (`2026-11-04T00:00:00.000Z`) dan memunculkan bug palsu pada `formatDateRange`.
5. Produksi: **belum dijalankan** — migrasi + deploy menunggu keputusan Andy (langkah berikutnya).
