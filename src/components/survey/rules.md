# Tenant Survey Form — Agent Rules

Baca file ini **sebelum** edit form / API / types / migrate tenant survey.

## Product intent

- **Public form = anonymous, no login.** Jangan tambah auth wall di `/tenant-survey` atau `/tenant-survey/:eventId`.
- Tujuan: tenant mall (gerai) isi self-assessment pasca event lewat link/QR.
- Dashboard `/dashboard/tenant-surveys` = admin/EO manage list, analytics, config, QR — **bukan** jalur utama pengisian tenant.
- Jangan campur dengan **visitor survey** (`SurveyPage`, `api/survey.js`, `migrate/survey-schema.sql`).

## Canonical paths

| Role | Path |
|------|------|
| Public form | `src/components/survey/TenantSurveyPublicPage.tsx` |
| Public event picker | `src/components/survey/TenantSurveyEventPicker.tsx` |
| Shared UI (RadioGroup, TenantSearchSelect, helpers) | `src/components/survey/TenantSurveyShared.tsx` |
| Dashboard shell | `src/components/survey/TenantSurveyPage.tsx` |
| Dashboard form (auth) | `src/components/survey/TenantSurveyForm.tsx` |
| List / analytics / QR | `TenantSurveyList.tsx`, `TenantSurveyAnalytics.tsx`, `TenantSurveyTrendChart.tsx`, `SurveyQRCode.tsx` |
| Routes | `src/App.tsx` — public `/tenant-survey*`, dash `/dashboard/tenant-surveys` |
| Options (enum source of truth FE) | `src/constants/survey-options.ts` |
| FE validate | `src/utils/validation.ts` → `validateTenantSurvey` |
| Fingerprint public | `src/utils/fingerprint.ts` |
| API client | `src/utils/supabaseApi.ts` (tenant survey block) |
| Hooks | `src/hooks/useTenantSurveys.ts` |
| Types | `src/types.ts` (`TenantSurvey*`, `TenantEventSurvey`, …) |
| Backend | `api/tenant-survey.js` |
| Auth helper | `api/_lib/auth.js` |
| DB | `migrate/tenant-event-surveys*.sql`, `tenant-survey-config.sql`, `pic-fields.sql` |
| Tests | `src/utils/__tests__/tenantSurveyValidation.test.ts`, `src/hooks/__tests__/useTenantSurveys.test.ts`, `e2e/tenant-survey-*.spec.ts` |

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

Legacy v2 (DB/types masih ada, **jangan** minta lagi di form baru):

- `venue_rating`, `management_rating`, `event_organization_rating`, `booth_facility_rating`
- `feedback_comment`, `improvement_suggestion`, `tenant_organization`, `business_category` stubs

Display legacy: pakai `isV3Survey` (`src/utils/surveyUtils.ts`). Jangan hapus kolom DB v2 tanpa migrasi data.

## Public flow (no login)

```
/tenant-survey
  → TenantSurveyEventPicker
  → GET /api/tenant-survey?mode=public&action=events

/tenant-survey/:eventId
  → TenantSurveyPublicPage
  → event-info + check(fingerprint) + tenants(search)
  → validateTenantSurvey → POST mode=public&action=submit
  → status: idle | submitting | success | error | duplicate
```

Aturan public:

1. **Jangan require login / JWT** di public actions.
2. Dup = `device_fingerprint` + event (RPC/unique index). Soft anti-spam saja — clear storage/incognito bisa resubmit; harden via rate limit IP, **bukan** login.
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
- Saat ubah auth path:
  - `requireAuth` return `{ user, role, legacy }` — **bukan** `auth.userId`. Pakai `auth.user?.id`.
  - Role app termasuk `eo_tenant`; default `requireAuth` admin-only. Expand role per action, jangan paksa EO lewat client-only write.
  - Prefer **satu write path** lewat `/api/tenant-survey` + Bearer. Hindari dual-write (API + direct Supabase insert/update) kecuali RLS sudah ketat dan disengaja.

## Validation parity

- Enum source of truth: `src/constants/survey-options.ts` (`SURVEY_OPTIONS`).
- API import path harus resolve di runtime Node/Vercel (saat ini `api/tenant-survey.js` import `../src/constants/survey-options.js` — file disk `.ts`; jangan pecah deploy).
- FE `validateTenantSurvey` + BE `validatePublicSubmission` / `validateSurveyBody` harus cek field **v3 yang sama**.
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

- Jangan expose: Supabase service role, R2 keys, admin password/token, Apps Script token, `MID_API_KEY`.
- Public = service-role di server only; client anon tidak boleh service key.
- Status machine (dashboard): `draft → submitted → reviewed`. Jangan biarkan reverse bebas (reviewed → submitted) tanpa superadmin.
- RLS `tenant_survey_config`: write bukan untuk any authenticated; config-set admin-only di API.
- RPC SECURITY DEFINER: REVOKE dari PUBLIC/anon bila tidak perlu; jangan IDOR lewat `p_user_id`.
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
- Ubah label enum v3 tanpa migrate data + update RPC filter string.
- Commit secrets / credential remote URL.
- “Perbaiki” dengan dual path baru (API + client) tanpa alasan.

## Known debt (jangan ulangi / perbaiki saat sentuh area)

1. ~~`auth.userId` typo di `api/tenant-survey.js` (harusnya `auth.user?.id`)~~ — fixed: pakai `auth.user?.id`.
2. Dual-write auth: FE create/update/submit lewat Supabase client, API create/update jarang dipakai.
3. ~~Public gate event/config `is_active`~~ — fixed: gate submit/event-info/events + FE closed state + hydrate config.
  4. ~~Public tenants PII dump~~ — fixed: strip PIC/telp di list (min q=2, limit 50);
     PIC auto-fill aman lewat `action=tenant-detail?id=` (satu tenant, bukan mass dump).
5. ~~`feedback_teks` limit~~ — fixed FE+BE (+ legacy fields still limited).
6. ~~Shared components diduplikasi di public page~~ — fixed: public import Shared.
7. Types form masih bawa stub v2 + cast `as never`.
8. Shared RadioGroup accent violet vs public brand tokens — visual minor drift OK.
9. Rate limit public IP belum ada.

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
