# Tenant Survey Form — Agent Rules

Baca file ini **sebelum** edit form / API / types / migrate tenant survey.

## Product intent

- **Public form = anonymous, no login.** Jangan tambah auth wall di `/tenant-survey` atau `/tenant-survey/:eventId`.
- Tujuan: tenant mall (gerai) isi self-assessment pasca event lewat link/QR.
- Dashboard `/dashboard/tenant-surveys` = admin/EO manage list, analytics, config, QR — **bukan** jalur utama pengisian tenant.
- Standalone `/tenant-survey-results` = **public** read-only analisa (filter, KPI, checklist, bagikan form + QR). **Tanpa** form/CRUD/config toggle admin, **tanpa** PIC, **tanpa** login. Legacy `/dashboard/tenant-survey-results` redirect ke sini.
- Share form: link `/tenant-survey/:eventId` + QR (`SurveyQRCode`, `basePath="/tenant-survey"`) — tampil **nama event** (`acara`).
- Public data via `GET /api/v1/tenant/results-*` (rate-limited, PII stripped). PDF export only if logged-in admin/TR.
- Role `tenant_relation`: default home results page; write actions still 403 on auth API.
- Jangan campur dengan **visitor survey** (`SurveyPage`, backend `server/src/routes/survey.js`, legacy `migrate/survey-schema.sql`).

## Canonical paths

| Role | Path |
|------|------|
| Public form | `src/components/survey/TenantSurveyPublicPage.tsx` |
| Public event picker | `src/components/survey/TenantSurveyEventPicker.tsx` |
| Shared UI (RadioGroup, TenantSearchSelect, helpers) | `src/components/survey/TenantSurveyShared.tsx` |
| Dashboard shell (ops) | `src/components/survey/TenantSurveyPage.tsx` |
| TR / admin results (read-only) | `src/components/survey/TenantSurveyResultsPage.tsx` |
| Results aggregate + PDF | `src/utils/tenantSurveyResultsAggregate.ts`, `src/utils/tenantSurveyResultsPdf.ts`, `src/components/pdf/buildSurveyResultsPdf.ts` (jsPDF, bukan react-pdf) |
| Dashboard form (auth) | `src/components/survey/TenantSurveyForm.tsx` |
| List / analytics / QR | `TenantSurveyList.tsx`, `TenantSurveyAnalytics.tsx`, `TenantSurveyTrendChart.tsx`, `SurveyQRCode.tsx` |
| Routes | `src/App.tsx` — public `/tenant-survey*`, dash `/dashboard/tenant-surveys`, public results `/tenant-survey-results` |
| Public results API | `results-list`, `results-analytics`, `results-roster` (rate limit / IP) |
| Options (enum source of truth FE) | `src/constants/survey-options.ts` |
| FE validate | `src/utils/validation.ts` → `validateTenantSurvey` |
| Fingerprint public | `src/utils/fingerprint.ts` |
| API client | `src/utils/supabaseApi.ts` (tenant survey block; barrel legacy-name, isi REST) |
| Hooks | `src/hooks/useTenantSurveys.ts` |
| Types | `src/types.ts` (`TenantSurvey*`, `TenantEventSurvey`, …), `src/types/auth.ts` (`tenant_relation`) |
| Backend | `server/src/routes/tenant.js` (legacy `api/tenant-survey.js` = MATI) |
| Auth helper | `server/src/auth.js` (`authenticate`, `requireRole`) |
| DB | `server/schema.sql` (DDL satu file; legacy `migrate/*.sql` = MATI) |
| Tests | `src/utils/__tests__/tenantSurvey*.test.ts`, `e2e/tenant-survey-*.spec.ts` |

**ADR 005**: backend = Express/Postgres VPS (`server/`); SPA fetch `VITE_API_URL/api/v1/...` via `src/lib/rest.ts`. Endpoint survey lama `mode=public&action=X` → kini route REST eksplisit di `server/src/routes/tenant.js`: `GET /tenant/events|event-info|check|tenants|tenant-detail|results-list|results-analytics|results-roster`, `POST /tenant/submit` (public, rate-limit + fingerprint), `POST /tenant/create|update|review|delete` (auth) + `GET /tenant/list|get|analytics|summary` (auth, PII ok).

## Schema v3 (current form fields)

Wajib (non-draft / public submit):

- `event_id`
- `nama_gerai` (max 100)
- `lokasi_zona` ∈ `SURVEY_OPTIONS.lokasi_zona`
- `kategori` ∈ `SURVEY_OPTIONS.kategori`
- `kenaikan_traffic` ∈ `SURVEY_OPTIONS.kenaikan_traffic`
- `kenaikan_sales` ∈ `SURVEY_OPTIONS.kenaikan_sales`

Opsional:

- `feedback_teks` (max 2000 — **bukan** `feedback_comment`)
- `pic_name` (max 100), `pic_phone` (max 20)
- `tenant_id` (dari pilih tenant MID; boleh kosong jika free-text nama)

## Public flow (no login)

```
/tenant-survey
  → TenantSurveyEventPicker
  → GET /api/v1/tenant/events

/tenant-survey/:eventId
  → TenantSurveyPublicPage
  → event-info + check(fingerprint) + tenants(search)
  → validateTenantSurvey → POST /tenant/submit
  → status: idle | submitting | success | error | duplicate
```

Aturan public:

1. **Jangan require login / JWT** di public actions.
2. Dup = `device_fingerprint` + event (unique index di `server/schema.sql`; legacy RPC). Soft anti-spam saja — clear storage/incognito bisa resubmit; harden via rate limit IP, **bukan** login.
3. Submit selalu `status=submitted` (tidak ada draft public).
4. `tenant_user_id` public = `null`.
5. Sebelum buka/submit: event harus exist; hormati `tenant_survey_config.is_active` (**default off** jika row config tidak ada).
   - Public `event-info` return `is_active`; FE tampil “Survey Ditutup” bila false.
   - Public `events` list hanya event **aktif** + status `past|ongoing`.
   - Public `submit` 403 bila inactive; 404 bila event hilang.
   - Dashboard kelola: past + ongoing, **search by name**, no hard-limit 30; hydrate config-get; toggle default off.
  6. `action=tenants`: proxy MID server-side (`MID_API_KEY` env only).
     - Wajib `q` min 2 karakter (tanpa full dump).
     - Response minimal: `id,name,floor,lot,category,logo` — **tanpa** PIC/telp massal.
     - Limit hasil (~50).
  6b. `action=tenant-detail?id=...`: proxy MID, return **hanya** `{id,name,pic,picTelp}`
      untuk tenant yang **eksplisit dipilih** (auto-fill PIC). Bukan mass dump — satu id.
      FE `TenantSearchSelect.selectTenant` fetch ini lalu re-call `onTenantSelect` dengan
      `pic`/`picTelp` terisi. Guard `selectedIdRef` agar tidak stale saat user ganti pilihan.
7. Rate limit public surface (events / event-info / tenants / check / submit) wajib dipikir saat ubah API.
8. `feedback_teks` max 2000 di FE `validateTenantSurvey` + BE `validatePublicSubmission` / `validateSurveyBody`.

## Dashboard flow (login)

- Nav: “Tenant Self-Assessment” → `/dashboard/tenant-surveys`.
- CRUD draft/submit/list/analytics/config/export untuk admin/EO.
- Public link/QR: `/tenant-survey/:eventId`.
- Saat ubah auth path — backend `server/src/auth.js`:
  - `authenticate` → `req.auth = { user }`; guard `requireRole([...])` per route. Akses user id: `req.auth.user.id`.
  - Role app termasuk `eo_tenant`; matriks role ada di `server/src/routes/tenant.js`. Expand role per action, jangan paksa EO lewat client-only write.
  - **Satu write path** = REST `/api/v1/tenant/*` (cookie JWT). Tidak ada lagi direct Supabase insert/update dari FE — dual-write tidak mungkin (supabase-js dilepas).

## Validation parity

- Enum source of truth: `src/constants/survey-options.ts` (`SURVEY_OPTIONS`).
- FE `validateTenantSurvey` + BE validasi di `server/src/routes/tenant.js` (`validatePublicSubmission`/`validateSurveyBody` port) harus cek field **v3 yang sama**. Enum parity FE↔BE dijaga manual (constant shared via `src/constants/` yang di-import server? — tidak; server punya salinan literal di `server/src/routes/tenant.js`) — update keduanya saat ubah enum.
- Limit teks: `feedback_teks` 2000, `pic_name` 100, `pic_phone` 20, `nama_gerai` 100.
- Draft (dashboard only): required field boleh longgar; submit/public ketat.

## UI / shared components

- Prefer `TenantSurveyShared.tsx` untuk RadioGroup, TenantSearchSelect, `floorToZona`, `apiCategoryToKategori`.
- **Jangan** reimplement copy di `TenantSurveyPublicPage` — drift bug. Public **import Shared**.
- `TenantSearchSelect` = **pick-from-list only** (tenant dari API MID):
  - Placeholder: “Cari & pilih gerai dari daftar”
  - Ketik = search only; **tidak** commit free-text ke `nama_gerai`
  - Commit `nama_gerai` + `tenant_id` **hanya** lewat pilih item list
  - Ketik ulang setelah select → clear selection + reset auto-fill (zona/kategori/pic yang auto)
  - Submit non-draft/public **wajib** `selectedTenant` — error: “Pilih gerai dari daftar, bukan ketik bebas.”
  - Progress gerai terisi hanya jika `selectedTenant` ada
  - Draft dashboard boleh tanpa select; submit ketat
- Style: Metmal pastel, clean data-first (lihat root `AGENTS.md`).
- Public form: loading / empty / error / duplicate / success states wajib tetap ada.

## Security (non-negotiable)

- Jangan expose: `JWT_SECRET`, `DATABASE_URL`, R2 keys, `MID_API_KEY` (semuanya server-only di `deploy/vps/.env`).
- Secret hanya di server; client tidak punya kredential apapun (SPA anonim publik + cookie HttpOnly).
- Status machine (dashboard): `draft → submitted → reviewed`. Jangan biarkan reverse bebas (reviewed → submitted) tanpa superadmin.
- `tenant_survey_config` write: route config-set di `server/src/routes/tenant.js` admin-only (`requireRole`), bukan any-authenticated.
- (Legacy RLS/RPC SECURITY DEFINER tidak berlaku lagi — Postgres VPS tanpa RLS; guard = filter SQL + requireRole server.)
- Export CSV: escape formula injection (`= + - @`); PIC di CSV sensitif.
- Fingerprint client-controlled — bukan auth.

## Do / Don't

**Do**

- Baca rules ini + file kanonik di atas sebelum patch.
- Samakan enum/label di FE, BE, RPC analytics.
- Update unit + e2e terkait saat ubah field/validasi/flow.
- Verifikasi: `npm run build` + test tenant survey yang relevan.

**Don't**

- Paksa login di public form.
- Campur visitor survey dengan tenant survey.
- Tambah dependency baru untuk validasi enum sederhana.
- “Perbaiki” dengan dual path baru (API + client) tanpa alasan.

## Known debt (jangan ulangi / perbaiki saat sentuh area)

1. ~~`auth.userId` typo~~ — fixed era Vercel; port VPS pakai `req.auth.user.id`.
2. ~~Dual-write auth (FE Supabase client)~~ — resolved ADR 005: supabase-js dilepas; satu write path REST.
3. ~~Public gate event/config `is_active`~~ — fixed: gate submit/event-info/events + FE closed state + hydrate config.
  4. ~~Public tenants PII dump~~ — fixed: strip PIC/telp di list (min q=2, limit 50);
     PIC auto-fill aman lewat `action=tenant-detail?id=` (satu tenant, bukan mass dump).
5. ~~`feedback_teks` limit~~ — fixed FE+BE (+ legacy fields still limited).
6. ~~Shared components diduplikasi di public page~~ — fixed: public import Shared.
7. Types form masih bawa stub v2 + cast `as never`.
  8. ~~Shared RadioGroup accent violet~~ — prefer brand-primary; residual only if shared component still uses default.
9. ~~Rate limit public IP belum ada~~ — fixed di VPS: submit 15/15mnt, results-list/analytics 40/mnt, results-roster/directory 12/mnt (`server/src/routes/tenant.js`).

## Change checklist

Saat edit form/API tenant survey:

- [ ] Public tetap no-login
- [ ] Field v3 + `SURVEY_OPTIONS` sinkron FE/BE
- [ ] Validasi `feedback_teks` / pic / nama_gerai
- [ ] Dup fingerprint public tidak diubah jadi “wajib login”
- [ ] Config `is_active` dihormati
- [ ] Tidak bocor PII tenants ke public
- [ ] Tidak reintroduksi dual-write tanpa desain
- [ ] Test unit/e2e / build

## Quick test commands

```bash
npm run build
npm run test:unit -- tenantSurvey
npm run test:e2e -- e2e/tenant-survey-public.spec.ts
npm run test:e2e -- e2e/tenant-survey-admin.spec.ts
```
