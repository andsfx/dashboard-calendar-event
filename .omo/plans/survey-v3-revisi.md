# survey-v3-revisi - Work Plan

## TL;DR (For humans)

**What you'll get:** Form survey tenant yang lebih sederhana — 3 bagian (Informasi Gerai, Evaluasi Traffic & Sales, Umpan Balik) tanpa rating bintang dan input persentase. Semua pertanyaan pakai radio button atau select, lebih cepat diisi tenant.

**Why this approach:** Rating bintang tidak relevan untuk tenant sekitar venue (mereka menilai dampak event ke bisnis, bukan kualitas venue). Radio button kualitatif lebih gampang diisi daripada input angka persentase. Event auto-detect dari URL (tidak perlu pilih). Nama gerai masih text bebas karena data tenant dari IT belum siap.

**What it will NOT do:**
- Tidak akan membuat tabel tenants (nunggu IT)
- Tidak ada rating bintang, input persentase, email, telepon
- Tidak ada dropdown pilih event (auto-detect URL)
- Tidak akan mengubah halaman survey authenticated (TenantSurveyPage.tsx)

**Effort:** Short (~7 tasks, 3-4 waves)
**Risk:** Medium — ada RPC (analytics + summary) yang perlu di-update agar tidak broken dengan data survey baru (NULL ratings)
**Decisions to sanity-check:**
1. Rating fields dibuat nullable di DB (data lama tetap ada)
2. nama_gerai = text input bebas (akan diganti select saat tabel tenants siap)
3. kenaikan_sales pakai range (<10%, 10-30%, 30-50%, >50%) bukan persentase
4. Kolom lama `business_category` (enum fnb/retail/jasa/other) tetap ada tapi deprecated — diganti `kategori` (VARCHAR dengan 6 opsi baru)

Your next move: approve untuk lanjut, atau jalankan high-accuracy Momus review dulu.

---

> TL;DR (machine): <1 line - effort, risk, deliverables>

## Scope
### Must have
- DB migration v3 — add new columns, make rating columns nullable, document deprecated columns
- TypeScript type updates — add new fields, extract SHARED_ALLOWED_VALUES constant
- Shared constants — single source of truth for allowed values used by API + FE validation + UI
- API validation rewrite — remove rating validation, add new field validation
- Frontend validation rewrite — match API validation
- Form UI rewrite — 3 sections (Info Gerai, Traffic & Sales, Feedback), remove RatingStars
- Submission payload update — send new fields
- RPC update — update analytics + summary to handle new NULL ratings gracefully

### Must NOT have (guardrails, anti-slop, scope boundaries)
- No tenants table creation (tunggu IT)
- No event dropdown (URL auto-detect)
- No absolute Rupiah values
- No multi-language
- No POS integration
- No photo upload
- No tenant self-service dashboard
- No ML/predictive analytics
- No real-time analytics
- No changes to `TenantSurveyPage.tsx` (authenticated tenant survey — separate UI path, out of scope)
- No changes to auth-mode survey flow (api/tenant-survey.js auth handlers stay compatible)

## Verification strategy
> Zero human intervention - all verification is agent-executed.
- Test decision: tests-after
- Framework: Vitest (existing) + tsc --noEmit + node --check
- Evidence: .omo/evidence/task-<N>-survey-v3-revisi.<ext>

## Execution strategy
### Parallel execution waves
Wave 1 (foundation — parallel):
- T1: Database migration v3 [quick]
- T2: TypeScript type updates + shared constants [quick]

Wave 2 (core logic — parallel):
- T3: API validation rewrite [quick]
- T4: Frontend validation rewrite [quick]

Wave 3 (UI + submit — depends on W1+W2):
- T5: Form UI rewrite — 3 sections [visual-engineering]
- T6: Submission payload + row builder update [quick]

Wave 4 (RPC updates — depends on W1):
- T7: Update analytics + summary RPC [quick]

Wave FINAL:
- F1-F4: Final verification (4 parallel reviews)

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |
| T1 (Migration) | None | T5, T6, T7 | T2 |
| T2 (Types + constants) | None | T5, T6 | T1 |
| T3 (API validation) | T2 | T6 | T4 |
| T4 (FE validation) | T2 | T6 | T3 |
| T5 (Form UI) | T1, T2 | T6 | — |
| T6 (Submission) | T1, T2, T3, T4 | F1-F4 | — |
| T7 (RPC update) | T1 | F1-F4 | — |

## Todos
> Implementation + Test = ONE todo. Never separate.
<!-- APPEND TASK BATCHES BELOW THIS LINE WITH edit/apply_patch - never rewrite the headers above. -->
- [x] 1. Database Migration v3

  **What to do**:
  - Create `migrate/tenant-event-surveys-v3.sql`
  - Add columns: `nama_gerai` (VARCHAR 100), `lokasi_zona` (VARCHAR 50), `kategori` (VARCHAR 50), `kenaikan_traffic` (VARCHAR 50), `kenaikan_sales` (VARCHAR 50), `feedback_teks` (TEXT)
  - Make rating columns nullable via ALTER COLUMN DROP NOT NULL: `venue_rating`, `management_rating`, `event_organization_rating`, `booth_facility_rating`, `overall_rating`
  - Make percentage columns nullable: `sales_lift_pct`, `traffic_lift_pct`
  - Make old required fields nullable: `tenant_name`, `tenant_organization`, `tenant_email`, `tenant_phone`, `business_category`, `business_subcategory`, `feedback_comment`, `improvement_suggestion`
  - Add optional column: `tenant_id` (VARCHAR, for future tenants table FK)
  - Add SQL comment marking `business_category` + `business_subcategory` as DEPRECATED (replaced by new `kategori` column)
  - Keep existing data intact — no DELETE or UPDATE on existing rows
  - Use IF NOT EXISTS / idempotent syntax for all DDL

  **Must NOT do**:
  - Do NOT drop existing columns (data preservation)
  - Do NOT DELETE or UPDATE existing rows
  - Do NOT use non-idempotent syntax

  **Parallelization**: Wave 1 | Blocked by: None | Blocks: T5, T6, T7

  **References**:
  - `migrate/tenant-event-surveys-v2.sql` — existing migration to extend
  - `api/tenant-survey.js:257-276` — current row builder showing all column names
  - `src/types.ts:258-315` — TenantEventSurvey + TenantSurveyFormData interfaces

  **Acceptance criteria**:
  - [ ] SQL syntax valid for PostgreSQL dialect
  - [ ] All 7 new columns + nullable alters + deprecated comments present
  - [ ] Idempotent — repeatable without errors
  - [ ] All existing columns preserved (no DROP COLUMN)
  - [ ] Verification query confirms columns exist with correct NULL constraints

  **QA scenarios**:
  ```
  Scenario: SQL syntax validation
    Tool: Bash (grep + manual review)
    Steps:
      1. Read migration file
      2. Check for ALTER COLUMN DROP NOT NULL for each rating + percentage field
      3. Verify all new columns added with proper types
      4. Verify deprecated comment on business_category column
    Expected: No syntax errors, all nullable alters present
    Evidence: .omo/evidence/task-1-migration-v3-syntax.txt

  Scenario: Column existence verification query
    Tool: Bash (psql or Supabase SQL editor)
    Steps: Run `SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'tenant_event_surveys'`
    Expected: All new columns listed, rating columns marked YES in is_nullable
    Evidence: .omo/evidence/task-1-column-verify.txt
  ```

  **Commit**: YES | `feat(survey): add v3 migration — make ratings nullable, add new form fields`

- [x] 2. TypeScript Type Updates + Shared Constants

  **What to do**:
  - Extract SHARED_ALLOWED_VALUES constant into `src/utils/validation.ts` (or new `src/constants/survey-options.ts`):
    ```ts
    export const SURVEY_OPTIONS = {
      lokasi_zona: ['Atrium Utama', 'Pintu Utara 2', 'Lantai Dasar', 'Lantai 1', 'Lantai 2', 'Lantai 3'],
      kategori: ['Food & Beverage (F&B)', 'Fashion & Aksesoris', 'Lifestyle & Hobi', 'Hiburan / Mainan Anak', 'Servis / Jasa', 'Supermarket / Department Store'],
      kenaikan_traffic: ['Signifikan', 'Sedikit Naik', 'Tidak Ada', 'Menurun'],
      kenaikan_sales: ['Tidak ada kenaikan / Sama saja', '< 10%', '10% - 30%', '30% - 50%', '> 50%'],
    } as const;
    ```
    This is the SINGLE SOURCE OF TRUTH — API validation (T3), FE validation (T4), and UI (T5) all import from here.
  - Update `TenantEventSurvey` interface in `src/types.ts`:
    - Add: `nama_gerai`, `lokasi_zona`, `kategori`, `kenaikan_traffic`, `kenaikan_sales`, `feedback_teks`
    - Make rating fields optional: `venue_rating?`, `management_rating?`, `event_organization_rating?`, `booth_facility_rating?`, `overall_rating?`
    - Make percentage fields optional: `sales_lift_pct?`, `traffic_lift_pct?`
    - Add `tenant_id?` (optional, for future)
  - Update `TenantSurveyFormData` interface — same pattern
  - Update `PublicTenantSurveySubmission` in `src/utils/supabaseApi.ts` — same pattern
  - Update `PublicTenantSurveyEventInfo` — keep as-is (still needed)

  **Must NOT do**:
  - Do NOT remove existing fields (they still exist in DB)
  - Do NOT change field types (all VARCHAR/TEXT/NUMERIC stays)

  **Parallelization**: Wave 1 | Blocked by: None | Blocks: T5, T6

  **References**:
  - `src/types.ts:258-315` — TenantEventSurvey + TenantSurveyFormData
  - `src/utils/supabaseApi.ts:1207-1211` — PublicTenantSurveySubmission
  - `src/utils/supabaseApi.ts:868-894` — DbTenantSurvey interface
  - `src/utils/supabaseApi.ts:926-943` — tenantSurveyFormToDbRow
  - `src/utils/validation.ts` — target for SURVEY_OPTIONS constant

  **Acceptance criteria**:
  - [ ] tsc --noEmit passes with zero errors
  - [ ] SURVEY_OPTIONS exportable from single source file
  - [ ] All new fields present in both interfaces
  - [ ] All rating fields made optional
  - [ ] npm run build passes

  **QA scenarios**:
  ```
  Scenario: TypeScript compilation
    Tool: Bash
    Steps: npx tsc --noEmit
    Expected: No errors
    Evidence: .omo/evidence/task-2-tsc.txt

  Scenario: SURVEY_OPTIONS importable
    Tool: Bash (node -e)
    Steps: node -e "const opts = require('./src/constants/survey-options.ts'); console.log(Object.keys(opts.SURVEY_OPTIONS))"
    Expected: ['lokasi_zona', 'kategori', 'kenaikan_traffic', 'kenaikan_sales']
    Evidence: .omo/evidence/task-2-constants.txt

  Scenario: Build passes
    Tool: Bash
    Steps: npm run build
    Expected: Build succeeds
    Evidence: .omo/evidence/task-2-build.txt
  ```

  **Commit**: YES | `feat(survey): update types — v3 fields, nullable ratings`

- [x] 3. API Validation Rewrite

  **What to do**:
  - Rewrite `validatePublicSubmission()` in `api/tenant-survey.js:105-150`
  - Remove rating validation (venue_rating, management_rating, etc.)
  - Remove percentage validation (sales_lift_pct, traffic_lift_pct)
  - New field validations:
    - `nama_gerai`: required, 1-100 chars
    - `lokasi_zona`: required, must be one of: Atrium Utama, Pintu Utara 2, Lantai Dasar, Lantai 1, Lantai 2, Lantai 3
    - `kategori`: required, must be one of: Food & Beverage (F&B), Fashion & Aksesoris, Lifestyle & Hobi, Hiburan / Mainan Anak, Servis / Jasa, Supermarket / Department Store
    - `kenaikan_traffic`: required, must be one of: Signifikan, Sedikit Naik, Tidak Ada, Menurun
    - `kenaikan_sales`: required, must be one of: Tidak ada kenaikan / Sama saja, < 10%, 10% - 30%, 30% - 50%, > 50%
  - Update `validateSurveyBody()` (auth version) — same changes
  - Remove RATING_FIELDS constant (or deprecate)
  - Error messages in Indonesian

  **Must NOT do**:
  - Do NOT break existing authenticated survey functionality
  - Do NOT touch the row builder (T6 handles that)

  **Parallelization**: Wave 2 | Blocked by: None | Blocks: T6

  **References**:
  - `api/tenant-survey.js:105-150` — current validatePublicSubmission
  - `api/tenant-survey.js:74-77` — RATING_FIELDS
  - `api/tenant-survey.js:83-103` — validateSurveyBody
  - T2 — SURVEY_OPTIONS shared constant (import for allowed values)

  **Acceptance criteria**:
  - [ ] node --check api/tenant-survey.js passes
  - [ ] curl POST (public) with valid new fields returns 201
  - [ ] curl POST (public) with missing nama_gerai returns 400
  - [ ] curl POST (public) with invalid kategori returns 400
  - [ ] curl POST (public) with no rating fields returns 201 (they're now optional)
  - [ ] curl POST (auth-mode, with auth) without rating fields returns 201 (validateSurveyBody updated)

  **QA scenarios**:
  ```
  Scenario: Valid submission without ratings (public)
    Tool: Bash (curl)
    Steps: POST /api/tenant-survey?mode=public&action=submit with new fields, no ratings
    Expected: 201 Created
    Evidence: .omo/evidence/task-3-valid-no-ratings.json

  Scenario: Reject invalid lokasi_zona
    Tool: Bash (curl)
    Steps: POST with lokasi_zona="Invalid Zone"
    Expected: 400 with error mentioning lokasi_zona
    Evidence: .omo/evidence/task-3-invalid-zona.json

  Scenario: Auth-mode submission without ratings
    Tool: Bash (curl with auth cookie)
    Steps: POST /api/tenant-survey?action=create without rating fields
    Expected: 201 Created (ratings no longer required)
    Evidence: .omo/evidence/task-3-auth-no-ratings.json

  **Commit**: YES | `feat(survey): rewrite API validation — v3 form fields`

- [x] 4. Frontend Validation Rewrite

  **What to do**:
  - Rewrite `validateTenantSurvey()` in `src/utils/validation.ts`
  - Remove rating validation
  - Remove percentage input validation
  - Add validation for new fields matching API validation exactly:
    - `nama_gerai`: required, 1-100 chars
    - `lokasi_zona`: required, must be in allowed list
    - `kategori`: required, must be in allowed list
    - `kenaikan_traffic`: required, must be in allowed list
    - `kenaikan_sales`: required, must be in allowed list
  - Error messages in Indonesian, matching API

  **Must NOT do**:
  - Do NOT change existing validation for auth-mode survey (if applicable)
  - Do NOT add new validation libraries

  **Parallelization**: Wave 2 | Blocked by: None | Blocks: T6

  **References**:
  - `src/utils/validation.ts` — current validation
  - `src/components/survey/TenantSurveyPublicPage.tsx:15` — import of validateTenantSurvey
  - Task T3 — matching API validation spec

  **Acceptance criteria**:
  - [ ] tsc --noEmit passes
  - [ ] Validation accepts valid field combinations
  - [ ] Validation rejects missing required fields
  - [ ] Error messages match API messages

  **QA scenarios**:
  ```
  Scenario: TypeScript compilation
    Tool: Bash
    Steps: npx tsc --noEmit
    Expected: No errors
    Evidence: .omo/evidence/task-4-tsc.txt

  Scenario: Validation function test
    Tool: Bash (vitest or node)
    Steps: Create test cases for valid + invalid submissions
    Expected: Valid passes, invalid rejected
    Evidence: .omo/evidence/task-4-validation-test.txt
  ```

  **Commit**: YES | `feat(survey): rewrite frontend validation — v3 form fields`

- [x] 5. Form UI Rewrite — 3 Sections

  **What to do**:
  - Rewrite `TenantSurveyPublicPage.tsx` form body (sections between lines 585-825)
  - Remove RatingStars component import and usage
  - Remove PercentageField component import and usage
  - Remove BUSINESS_CATEGORIES constant
  - Remove DISPLAY_TO_INTERNAL_CATEGORY constant
  - Remove RATING_FIELDS constant
  - **Bagian 1: Informasi Gerai**
    - `nama_gerai` text input (required)
    - `lokasi_zona` select: Atrium Utama, Pintu Utara 2, Lantai Dasar, Lantai 1, Lantai 2, Lantai 3
    - `kategori` radio: Food & Beverage (F&B), Fashion & Aksesoris, Lifestyle & Hobi, Hiburan / Mainan Anak, Servis / Jasa, Supermarket / Department Store
  - **Bagian 2: Evaluasi Traffic & Sales**
    - `kenaikan_traffic` radio: Signifikan, Sedikit Naik, Tidak Ada, Menurun
    - `kenaikan_sales` radio: Tidak ada kenaikan / Sama saja, < 10%, 10% - 30%, 30% - 50%, > 50%
  - **Bagian 3: Umpan Balik**
    - Single textarea `feedback_teks` (optional)
  - Update form state to include new fields
  - Remove old form state (ratings, businessCategory, businessSubcategory, impactMetrics)
  - Keep event banner, submit button, success/error/duplicate screens
  - Keep the shell styling (gradient background, card sections)

  **Must NOT do**:
  - Do NOT change the page shell (header, loading, error states)
  - Do NOT change duplicate detection logic
  - Do NOT change form submission flow (handleSubmit stays)

  **Parallelization**: Wave 3 | Blocked by: T1, T2 | Blocks: T6

  **References**:
  - `src/components/survey/TenantSurveyPublicPage.tsx:585-825` — form body
  - `src/components/survey/TenantSurveyPublicPage.tsx:33-58` — RATING_FIELDS + BUSINESS_CATEGORIES
  - `src/components/survey/TenantSurveyPublicPage.tsx:102-145` — PercentageField component
  - `src/components/survey/TenantSurveyPublicPage.tsx:147-222` — RatingStars component
  - Spesifikasi form di chat

  **Acceptance criteria**:
  - [ ] Form renders 3 sections with correct labels
  - [ ] No RatingStars component rendered
  - [ ] No PercentageField component rendered
  - [ ] Radio buttons work for kategori, kenaikan_traffic, kenaikan_sales
  - [ ] Select works for lokasi_zona
  - [ ] npm run build passes

  **QA scenarios**:
  ```
  Scenario: Form renders with 3 sections
    Tool: Playwright
    Steps: Navigate to /tenant-survey/test-event
    Expected: 3 sections visible — Informasi Gerai, Evaluasi Traffic & Sales, Umpan Balik
    Evidence: .omo/evidence/task-5-three-sections.png

  Scenario: No rating stars visible
    Tool: Playwright
    Steps: Navigate to form
    Expected: No star rating buttons visible
    Evidence: .omo/evidence/task-5-no-ratings.png
  ```

  **Commit**: YES | `feat(survey): rewrite form UI — 3 sections, remove ratings`

- [x] 6. Submission Payload Update

  **What to do**:
  - Update `handleSubmit()` in TenantSurveyPublicPage.tsx — map form state → submission payload
  - Update row builder in `api/tenant-survey.js:257-276` — insert new fields (nama_gerai, lokasi_zona, kategori, kenaikan_traffic, kenaikan_sales, feedback_teks), remove rating + business impact rows (venue_rating, sales_lift_pct etc no longer inserted — they will be NULL by default)
  - Update `tenantSurveyFormToDbRow()` in `src/utils/supabaseApi.ts:926-943` — map new fields
  - Update `updateTenantSurvey()` in `src/utils/supabaseApi.ts:1022-1082`:
    - Add new fields to the textKeys array (nama_gerai, lokasi_zona, kategori, kenaikan_traffic, kenaikan_sales, feedback_teks)
    - Ensure partial update still works — existing surveys with rating data should still have their rating fields untouched when updated via this function. Only new fields should be settable.
    - Do NOT add rating fields to percentageKeys — they stay optional and untouched by update.
  - Ensure proper database insertion with new schema
  - Verify `submitPublicTenantSurvey()` function path still works (sends payload to API, API builds row, inserts into DB via anon key bypass)

  **Must NOT do**:
  - Do NOT add new API endpoints
  - Do NOT change existing submission logic for auth mode
  - Do NOT change duplicate detection

  **Parallelization**: Wave 3 | Blocked by: T1, T2, T3, T4 | Blocks: F1-F4

  **References**:
  - `api/tenant-survey.js:257-276` — current row builder
  - `src/utils/supabaseApi.ts:1213-1245` — submitPublicTenantSurvey
  - `src/utils/supabaseApi.ts:926-943` — tenantSurveyFormToDbRow
  - `src/components/survey/TenantSurveyPublicPage.tsx:320-380` — handleSubmit
  - T1 — migration schema
  - T2 — updated types

  **Acceptance criteria**:
  - [ ] curl POST with all new fields returns 201
  - [ ] Submitted data has correct values in DB
  - [ ] Old rating fields are NULL in DB for new submissions
  - [ ] tsc --noEmit passes
  - [ ] node --check api/tenant-survey.js passes

  **QA scenarios**:
  ```
  Scenario: Submit with all new fields
    Tool: Bash (curl)
    Steps: POST with nama_gerai, lokasi_zona, kategori, kenaikan_traffic, kenaikan_sales
    Expected: 201 Created, verify DB has correct values
    Evidence: .omo/evidence/task-6-submit-v3.json

  Scenario: Old rating fields null
    Tool: Bash (curl + DB query)
    Steps: Submit new survey, query venue_rating
    Expected: venue_rating is NULL
    Evidence: .omo/evidence/task-6-null-ratings.json
  ```

  **Commit**: YES | `feat(survey): update submission payload — v3 fields, nullable ratings`

- [x] 7. Update Analytics + Summary RPC Functions

  **What to do**:
  - Find the RPC definitions (likely in `supabase/migrations/` or `migrate/survey-schema.sql`) — search for `get_tenant_survey_analytics` and `get_tenant_survey_event_summary`
  - Update `get_tenant_survey_analytics`:
    - Keep AVG(venue_rating) etc. — they still work (NULLs ignored). But mark as DEPRECATED with SQL comment.
    - Add new aggregation columns: COUNT of each `kenaikan_traffic` value, COUNT of each `kenaikan_sales` value
  - Update `get_tenant_survey_event_summary`:
    - Add new columns to SELECT: `nama_gerai`, `lokasi_zona`, `kategori`, `kenaikan_traffic`, `kenaikan_sales`, `feedback_teks`
    - Keep old columns but make them optional in the return
  - Create migration SQL for RPC updates: `migrate/tenant-event-surveys-v3-rpc.sql`
  - Ensure backward compatibility — existing analytics dashboard still loads without error

  **Must NOT do**:
  - Do NOT delete old RPC columns (they return NULL for new surveys — still valid)
  - Do NOT change existing analytics UI (TenantSurveyAnalytics.tsx) — it will gracefully show N/A for NULLs

  **Parallelization**: Wave 4 | Blocked by: T1 | Blocks: F1-F4

  **References**:
  - Search for `get_tenant_survey_analytics` in entire codebase (migration files)
  - Search for `get_tenant_survey_event_summary` in entire codebase
  - `src/utils/supabaseApi.ts:1115-1126` — fetchTenantSurveyAnalytics() + fetchTenantSurveyEventSummary()
  - `src/components/survey/TenantSurveyAnalytics.tsx` — analytics UI (check for graceful NULL handling)
  - T1 — migration schema (column names)

  **Acceptance criteria**:
  - [ ] RPC migration SQL valid
  - [ ] fetchTenantSurveyAnalytics() returns without error for events with only v3 surveys
  - [ ] fetchTenantSurveyEventSummary() returns new fields for v3 surveys
  - [ ] Analytics UI does not crash on NULL rating values
  - [ ] tsc --noEmit passes

  **QA scenarios**:
  ```
  Scenario: Analytics for event with v3 surveys
    Tool: Bash (curl Supabase REST)
    Steps: Call RPC get_tenant_survey_analytics, verify no error
    Expected: Returns data with NULL rating averages + new traffic/sales counts
    Evidence: .omo/evidence/task-7-analytics-rpc.json

  Scenario: Summary for event with v3 survey
    Tool: Bash (curl Supabase REST)
    Steps: Call RPC get_tenant_survey_event_summary(p_event_id => 'test-id')
    Expected: Returns object with nama_gerai, kenaikan_traffic, kenaikan_sales, feedback_teks fields
    Evidence: .omo/evidence/task-7-summary-rpc.json
  ```

  **Commit**: YES | `feat(survey): update analytics + summary RPC for v3 nullable ratings`

## Final verification wave
> Runs in parallel after ALL todos. ALL must APPROVE. Surface results and wait for the user's explicit okay before declaring complete.
- [x] F1. Plan compliance audit
- [x] F2. Code quality review
- [x] F3. Real manual QA
- [x] F4. Scope fidelity

## Commit strategy
- Wave 1: `feat(survey): add v3 migration — make ratings nullable, add new form fields` (migrate/...v3.sql)
- Wave 2: `feat(survey): update types — v3 fields, nullable ratings` (src/types.ts, supabaseApi.ts)
- Wave 2: `feat(survey): rewrite API validation — v3 form fields` (api/tenant-survey.js)
- Wave 3: `feat(survey): rewrite frontend validation — v3 form fields` (src/utils/validation.ts)
- Wave 3: `feat(survey): rewrite form UI — 3 sections, remove ratings` (TenantSurveyPublicPage.tsx)
- Final: `feat(survey): update submission and cleanup` (row builder + supabaseApi.ts)

## Success criteria
```bash
npm run build                    # Expected: no errors
node --check api/tenant-survey.js  # Expected: no syntax errors
tsc --noEmit                     # Expected: no type errors
```
