# Update Fitur: Kolaborasi Tenant — Pengajuan Event & Proposal

Status: **SELESAI** (live: halaman publik `/kolaborasi-tenant` di Vercel; API `POST /api/v1/tenant-event-proposals` + `/attachment` di VPS; tabel `tenant_event_proposals` sudah dimigrasi di produksi) · Repo: schedule-event-v2 · Stack: Opsi B (Express/Postgres VPS, ADR 005 — bukan Supabase) · 2026-10-13

Preseden: fitur **Pameran & Kolaborasi** (`/pameran`, `POST /exhibition-leads`, `ExhibitionManager`) untuk bentuk halaman-publik + form + antrean review; `/daftar` (community registration) untuk pola unggah proposal; `update-fitur-sponsorship.md` untuk tata letak antrean lead.

## 1. Ringkasan

Kanal pengajuan publik yang ada menyasar pihak luar: `/daftar` (komunitas/EO), `/pameran` (brand/EO pameran), `/sponsor` (calon sponsor). **Tenant/gerai penghuni mal belum punya kanal sendiri** untuk mengajukan event kerja sama (promo, workshop, pameran produk, pertunjukan, launching) yang membutuhkan dukungan Marcomm/Casual Leasing.

Target: halaman publik `/kolaborasi-tenant` berisi **informasi + form pengajuan + unggah proposal**; pengajuan tersimpan di `tenant_event_proposals`; antreannya direview lewat modul dashboard `Kolaborasi Tenant` (`/dashboard/tenant-proposals`, grup Interaksi), dengan kartu antrean di Pusat Komando dan insight.

Non-goal: membuat Event/Draft otomatis dari pengajuan (sejalan ADR 003 — menyetujui pengajuan ≠ menjadwalkan); portal login tenant; lookup identitas gerai via MID (nama gerai/unit diketik manual); endpoint baca publik untuk antrean (privat).

## 2. Keputusan desain

| # | Keputusan |
|---|---|
| D1 | Tabel baru `tenant_event_proposals`, id `tep_<uuid>` (pola `crg_`/`sld_`/`exl_`). Tidak menumpang `community_registrations`/`exhibition_leads`: audiens (gerai mal), data (unit, kategori gerai, kebutuhan fasilitas), dan alur tindak lanjutnya berbeda. |
| D2 | Status review: `pending → contacted → approved / rejected` (vocab sama dengan `sponsor_leads`/`exhibition_leads`), default `pending`; kolom `internal_notes` untuk catatan staff. |
| D3 | Upload proposal memakai **presign publik terbatas**: `POST /api/v1/tenant-event-proposals/attachment` — folder dipaksa `tenant-proposals/`, tipe hanya PDF/DOC/DOCX, rate limit 10/15 mnt. Saat submit server memverifikasi ulang: prefix URL wajib `tenant-proposals/`, `headR2File` (ada + ≤ 20MB = `MAX_PROPOSAL_BYTES`), `verifyMimeMagicBytes` (M-3); gagal → objek dihapus dari R2 + 400. Route staff `/r2/presign` tidak diubah (batasan lama di `src/utils/api/surveysApi.ts:70-74` di luar scope ini). |
| D4 | `POST /api/v1/tenant-event-proposals` publik: zod penuh (`server/src/lib/tenantProposalSchemas.js`), rate limit 10/15 mnt, respons `{success:true,id}` **tanpa echo PII**. `proposed_end` boleh kosong (event sehari); server menolak `end < start` dan `start` lampau (helper `jakartaToday`). |
| D5 | Admin via `adminAction`: `listTenantEventProposals` (ORDER BY created_at DESC), `updateTenantEventProposal` (status dan/atau internalNotes; wajib ada minimal satu perubahan), `deleteTenantEventProposal` (hapus baris + file R2 best-effort). Kolom ditulis lewat SET tetap — **whitelist manual**, bukan mengandalkan zod. |
| D6 | Role demo: `listTenantEventProposals` masuk `DEMO_READ_ACTIONS`; PII (`contact_name`, `phone`, `email`) disamarkan untuk demo (pola `readRegistrations`); update/delete ditolak 403 oleh allowlist. |
| D7 | Dashboard: modul **Kolaborasi Tenant** di grup Interaksi, izin `canViewTenantProposals = isAdmin \|\| isViewer \|\| isDemo`; kartu antrean "pengajuan menunggu review" di Pusat Komando (`getCommandCenterCards`); total `Menunggu keputusan` ikut menghitung; insight `pengajuan-kolaborasi-tenant` (bila ada ≥1 pending). |
| D8 | Tidak ada endpoint baca publik untuk pengajuan — antrean hanya lewat `adminAction` ber-guard. Respons submit tidak mengembalikan data apa pun selain id. |
| D9 | Copy Indonesia; halaman publik mengikuti struktur `RegistrationPage`/`ExhibitionsLandingPage` (header logo + dark toggle, `usePageMeta`, token `var(--brand-*)`, kelas `ui-*`); dashboard memakai komponen MD3 (`src/components/md`) seperti `ExhibitionManager`. |
| D10 | Gerai dipilih dari **master tenant MID** (`GET /api/v1/tenant/tenants?q=`, proxy `apiloyalty.metropolitanland.com/getAllTenants`; kunci `MID_API_KEY` sudah ada di server, tidak pernah ke klien). Form memakai `TenantSearchSelect` yang sudah dipakai survey tenant, lalu mengisi nama/unit (`TENANT_LOT`)/kategori (`TENANT_CATEGORY`) otomatis dan menyimpan `tenant_id`. Jalur isi manual tetap tersedia ("Gerai saya belum ada di daftar") karena halaman ini publik: gerai baru atau upstream MID bermasalah tidak boleh mematikan form. `tenant_id` kosong menandai pengajuan manual — bukan galat. |

## 3. Database — `server/migrations/2026-10-13-tenant-event-proposals.sql` (+ blok sama di `server/schema.sql`)

```sql
CREATE TABLE IF NOT EXISTS tenant_event_proposals (
  id TEXT PRIMARY KEY DEFAULT ('tep_' || replace(gen_random_uuid()::text, '-', '')),
  tenant_id TEXT NOT NULL DEFAULT '',   -- TENANT_ID master MID; '' = diisi manual
  tenant_name TEXT NOT NULL,
  unit_number TEXT NOT NULL DEFAULT '',
  tenant_category TEXT NOT NULL DEFAULT '',
  contact_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  event_title TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'other'
    CONSTRAINT chk_tenant_proposals_event_type
    CHECK (event_type IN ('promo','workshop','exhibition','performance','launching','other')),
  event_description TEXT NOT NULL,
  proposed_start DATE NOT NULL,
  proposed_end DATE,
  preferred_area TEXT NOT NULL DEFAULT '',
  expected_visitors TEXT NOT NULL DEFAULT '',
  needs TEXT NOT NULL DEFAULT '',
  proposal_file_url TEXT NOT NULL DEFAULT '',
  proposal_file_name TEXT NOT NULL DEFAULT '',
  proposal_mime_type TEXT NOT NULL DEFAULT '',
  proposal_file_size BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CONSTRAINT chk_tenant_proposals_status
    CHECK (status IN ('pending','contacted','approved','rejected')),
  internal_notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_event_proposals_status ON tenant_event_proposals (status);
CREATE INDEX IF NOT EXISTS idx_tenant_event_proposals_created_at ON tenant_event_proposals (created_at DESC);
-- + trigger updated_at (pola tabel lain di schema.sql)
```

Kolom non-skalar: **tidak ada** (TEXT/DATE/BIGINT saja) → tidak butuh `pgValues`. Migrasi dijalankan manual di VPS **sebelum** deploy kode api.

Migrasi lanjutan: `server/migrations/2026-10-14-tenant-proposals-tenant-id.sql` (`ADD COLUMN IF NOT EXISTS tenant_id`) menambahkan tautan ke master tenant MID.

## 4. Server API

- **`server/src/routes/tenantProposals.js`** (baru; mount `app.use('/api/v1', tenantProposalsRouter)`):
  - `POST /tenant-event-proposals` — submit publik (zod + rate limit + verifikasi lampiran).
  - `POST /tenant-event-proposals/attachment` — presign publik terbatas (folder `tenant-proposals/`, PDF/DOC/DOCX).
- **`server/src/r2.js`** — `ALLOWED_PREFIXES` += `tenant-proposals/`; export `createPresignedUpload({folder, originalName, contentType})` yang dipakai bersama `/r2/presign` (tidak mengubah perilakunya).
- **`server/src/lib/tenantProposalSchemas.js`** (baru) — `tenantEventProposalSchema` (submit) + `TENANT_PROPOSAL_ACTION_SCHEMAS` (list/update/delete); di-spread di `ACTION_SCHEMAS` (`server/src/lib/schemas.js`).
- **`server/src/routes/admin.js`** — case `listTenantEventProposals` / `updateTenantEventProposal` / `deleteTenantEventProposal` + `logActivity`.
- **`server/src/auth.js`** — `DEMO_READ_ACTIONS` += `listTenantEventProposals`.

## 5. Client

- `src/types/index.ts` — `TenantEventProposalType`, `TenantEventProposalStatus`, `TenantEventProposalInput`, `TenantEventProposal`.
- `src/utils/api/tenantEventProposalsApi.ts` (baru) + re-export di `src/utils/domainApi.ts`; mapper snake_case↔camelCase berhenti di module ini.
- `src/pages/TenantCollaborationPage.tsx` (baru) + route lazy `/kolaborasi-tenant` (`src/App.tsx`) + entri nav Jelajahi ("Kolaborasi") di `src/pages/CommunityLandingPage.tsx` + entri katalog fitur `src/data/featureDocs.ts`.
- Admin: `src/hooks/useTenantEventProposals.ts`, `src/components/admin/TenantProposalManager.tsx`, wiring di `DashboardPage`/`dashboardNavigation` (`/dashboard/tenant-proposals`, grup Interaksi), `usePermission.ts`, `CommandCenterSummary`/`CommandCenterDirectory`/`DashboardStats`, `useInsightContext` + `eventInsights.ts`.

## 6. Verifikasi (hasil 2026-10-13)

1. `npx tsc --noEmit` → 0 error; `npm run build` sukses (penjaga `assert-lazy-entry-chunks` lolos).
2. `NODE_ENV=test npx vitest run` → 859 lulus; 2 test ekspor PDF (`EventsLandingPage.export`, `TenantSurveyResultsPage.export`) flake di suite penuh (timeout 1s `findByRole('dialog')` vs beban import suite) — direproduksi tanpa perubahan fitur ini dan lulus saat dijalankan sendiri. Bukan regresi.
3. Smoke lokal: `/kolaborasi-tenant` render; submit kosong → 6 error Indonesia + `aria-invalid`; submit valid → `POST /api/v1/tenant-event-proposals`; presign PDF → 200, tipe terlarang → 400; lampiran URL di luar prefix → 400. Komponen `TenantProposalManager` ditutup test permanen (review, catatan internal, hapus + batal, read-only, state kosong/error).
4. Produksi (read-only): `POST /tenant-event-proposals` `{}` → 400 (tanpa tulis; `count(*)` tetap 0); presign `text/html` → 400, PDF → 200 dengan key `tenant-proposals/`; `admin/listTenantEventProposals` tanpa sesi → 401; `EXPLAIN` INSERT/UPDATE/DELETE terhadap skema produksi tervalidasi; `/kolaborasi-tenant` di www → 200 dan entri nav "Kolaborasi Tenant" muncul.
