# Tenant Survey Business Impact Enhancement

## TL;DR

> **Quick Summary**: Enhance tenant survey to measure sales/traffic lift during events at Metropolitan Mall Bekasi
> 
> **Deliverables**:
> - Database migration: 6 new columns for business metrics
> - API update: validation for percentage inputs
> - Frontend: new form sections for business type and lift percentages
> - Validation: percentage range checks (-100% to +1000%)
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Migration → API → Frontend → Validation → QA

---

## Context

### Original Request
User wants to measure whether tenants at Metropolitan Mall Bekasi experience increased traffic/sales during events. Current survey only captures satisfaction ratings (1-5 scale).

### Interview Summary
**Key Discussions**:
- Core question: Apakah tenant mengalami kenaikan traffic/sales saat event?
- Metrics: Kenaikan SALES + TRAFFIC (keduanya)
- **Input method**: Persentase langsung (bukan angka absolut)
- Data type: Kuantitatif saja (persentase)
- Segmentation: Berdasarkan tipe bisnis (2 level: kategori + subkategori)
- Tujuan: Laporan manajemen + dashboard + prediksi ROI
- Frekuensi: Sekali setelah event selesai

**Research Findings**:
- Current table: `tenant_event_surveys` with 4 rating fields + optional comments
- API: `api/tenant-survey.js` handles both public and auth modes
- Frontend: `TenantSurveyPublicPage.tsx` with star rating components
- DB migration already applied in production
- Supabase service role key available for direct queries

**Design Decision**:
- User prefers percentage input over absolute Rupiah values
- More privacy-friendly (tenants don't reveal actual sales)
- Simpler form (2 fields instead of 4)
- Easier to compare across different business sizes

### Metis Review
**Identified Gaps** (addressed):
- Edge case: negative percentages (sales decrease) → allowed with min=-100
- Edge case: very large increases → max=1000% cap
- Missing: rate limiting on form submissions → not in Phase 1 scope
- Missing: RLS on Supabase → using service role key
- Missing: time-bound access → form accessible until manually disabled

---

## Work Objectives

### Core Objective
Add business impact metrics (sales/traffic lift percentages) to tenant survey form

### Concrete Deliverables
- `migrate/tenant-event-surveys-v2.sql` — Database migration script
- `api/tenant-survey.js` — Updated validation
- `src/components/survey/TenantSurveyPublicPage.tsx` — New form sections
- `src/utils/supabaseApi.ts` — Updated API calls
- `src/utils/validation.ts` — Updated validation logic

### Definition of Done
- [ ] Database migration runs without errors
- [ ] API accepts new required fields
- [ ] Frontend form shows all new sections
- [ ] Validation rejects invalid percentages
- [ ] Build passes: `npm run build`
- [ ] Manual test: submit survey with new fields

### Must Have
- business_category + business_subcategory fields
- sales_lift_pct (percentage, -100% to +1000%)
- traffic_lift_pct (percentage, -100% to +1000%)
- Validation for percentage fields
- Handle edge cases (negative values, large increases)

### Must NOT Have (Guardrails)
- No absolute Rupiah values (use percentages only)
- No ML/predictive analytics (Phase 2)
- No POS integration (Phase 2)
- No multi-language support (Phase 2)
- No real-time dashboard updates (Phase 2)
- No SMS/email reminders (Phase 2)
- No photo upload (Phase 2)
- No tenant self-service dashboard (Phase 2)

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (npm scripts available)
- **Automated tests**: Tests-after (add test cases after implementation)
- **Framework**: Vitest (already configured)
- **If TDD**: Each task follows RED (failing test) → GREEN (minimal impl) → REFACTOR

### QA Policy
Every task MUST include agent-executed QA scenarios (see TODO template below).
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Use Playwright (playwright skill) - Navigate, interact, assert DOM, screenshot
- **TUI/CLI**: Use interactive_bash (tmux) - Run command, send keystrokes, validate output
- **API/Backend**: Use Bash (curl) - Send requests, assert status + response fields
- **Library/Module**: Use Bash (bun/node REPL) - Import, call functions, compare output

---

## Execution Strategy

### Parallel Execution Waves

> Maximize throughput by grouping independent tasks into parallel waves.
> Each wave completes before the next begins.
> Target: 5-8 tasks per wave. Fewer than 3 per wave (except final) = under-splitting.

```
Wave 1 (Start Immediately - foundation):
├── Task 1: Database migration script [quick]
├── Task 2: API validation updates [quick]
└── Task 3: Frontend validation utility [quick]

Wave 2 (After Wave 1 - core modules):
├── Task 4: Frontend form - business type section [visual-engineering]
├── Task 5: Frontend form - metrics section [visual-engineering]
└── Task 6: Frontend form submission update [quick]

Wave FINAL (After ALL tasks — 4 parallel reviews, then user okay):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay

Critical Path: Task 1 → Task 4+5 → Task 6 → F1-F4 → user okay
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 3 (Wave 1)
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| 1 (Migration) | None | 4, 5, 6 |
| 2 (API Validation) | None | 6 |
| 3 (FE Validation) | None | 4, 5 |
| 4 (FE Business Type) | 1, 3 | 6 |
| 5 (FE Metrics) | 1, 3 | 6 |
| 6 (FE Submission) | 2, 4, 5 | F1-F4 |

### Agent Dispatch Summary

- **Wave 1**: **3** - T1 → `quick`, T2 → `quick`, T3 → `quick`
- **Wave 2**: **3** - T4 → `visual-engineering`, T5 → `visual-engineering`, T6 → `quick`
- **FINAL**: **4** - F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

> Implementation + Test = ONE Task. Never separate.
> EVERY task MUST have: Recommended Agent Profile + Parallelization info + QA Scenarios.
> **A task WITHOUT QA Scenarios is INCOMPLETE. No exceptions.**

- [ ] 1. Database Migration Script

  **What to do**:
  - Create `migrate/tenant-event-surveys-v2.sql` with idempotent migration
  - Add `business_category_enum` type (fnb, retail, jasa, other)
  - Add 6 new columns with proper constraints
  - Add indexes for business_category and lift percentage queries
  - Include comments explaining each column

  **Must NOT do**:
  - Do NOT drop existing columns
  - Do NOT modify existing data
  - Do NOT use non-idempotent syntax

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`nodejs-backend-patterns`]
    - `nodejs-backend-patterns`: Database migration patterns and SQL best practices

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Tasks 4, 5, 6
  - **Blocked By**: None (can start immediately)

  **References**:
  - `migrate/tenant-event-surveys.sql` — Existing migration to extend
  - `api/tenant-survey.js:236-255` — Current row builder showing column names

  **Acceptance Criteria**:
  - [ ] File created: `migrate/tenant-event-surveys-v2.sql`
  - [ ] SQL syntax valid (can verify with `psql` or online validator)
  - [ ] All 6 columns added with correct types and constraints
  - [ ] Idempotent: can run multiple times without errors

  **QA Scenarios**:

  ```
  Scenario: SQL syntax validation
    Tool: Bash (psql or online validator)
    Preconditions: None
    Steps:
      1. Read the migration file
      2. Check for common SQL errors (missing commas, wrong types)
      3. Verify IF NOT EXISTS clauses
    Expected Result: No syntax errors
    Failure Indicators: SQL parse error
    Evidence: .sisyphus/evidence/task-1-sql-syntax.txt

  Scenario: Column existence check
    Tool: Bash (grep)
    Preconditions: None
    Steps:
      1. grep for each column name in the migration file
      2. Verify all 6 columns are present
    Expected Result: All 6 columns found
    Failure Indicators: Missing column
    Evidence: .sisyphus/evidence/task-1-columns.txt
  ```

  **Commit**: YES
  - Message: `feat(survey): add business impact fields to database schema`
  - Files: `migrate/tenant-event-surveys-v2.sql`
  - Pre-commit: None (SQL file only)

- [ ] 2. API Validation Updates

  **What to do**:
  - Update `validatePublicSubmission()` in `api/tenant-survey.js`
  - Add required fields: business_category, business_subcategory, sales_lift_pct, traffic_lift_pct
  - Add validation ranges: percentages (-100% to +1000%)
  - Add business_category enum validation
  - Add business_subcategory length validation (1-50 chars)

  **Must NOT do**:
  - Do NOT remove existing validation
  - Do NOT change existing field requirements
  - Do NOT add absolute Rupiah value fields

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`nodejs-backend-patterns`]
    - `nodejs-backend-patterns`: Validation patterns and error handling

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Task 6
  - **Blocked By**: None (can start immediately)

  **References**:
  - `api/tenant-survey.js:105-130` — Current `validatePublicSubmission()` function
  - `api/tenant-survey.js:74-79` — RATING_FIELDS array pattern

  **Acceptance Criteria**:
  - [ ] All 4 new required fields validated
  - [ ] Proper error messages in Indonesian
  - [ ] Range validation for percentage fields (-100 to 1000)
  - [ ] Existing validation unchanged

  **QA Scenarios**:

  ```
  Scenario: Validation accepts valid input
    Tool: Bash (curl)
    Preconditions: None
    Steps:
      1. Call POST /api/tenant-survey?mode=public&action=submit with valid data
      2. Check response status is 201
    Expected Result: Survey submitted successfully
    Failure Indicators: 400 error with validation message
    Evidence: .sisyphus/evidence/task-2-valid-submit.json

  Scenario: Validation rejects missing business_category
    Tool: Bash (curl)
    Preconditions: None
    Steps:
      1. Call POST without business_category field
      2. Check response status is 400
      3. Check error message contains "business_category"
    Expected Result: 400 error with business_category validation message
    Failure Indicators: 201 success or missing error message
    Evidence: .sisyphus/evidence/task-2-missing-category.json

  Scenario: Validation rejects out-of-range percentage
    Tool: Bash (curl)
    Preconditions: None
    Steps:
      1. Call POST with sales_lift_pct = 5000 (above max)
      2. Check response status is 400
      3. Check error message contains "persentase"
    Expected Result: 400 error with percentage range message
    Failure Indicators: 201 success or missing error message
    Evidence: .sisyphus/evidence/task-2-invalid-percentage.json
  ```

  **Commit**: YES
  - Message: `feat(survey): add validation for business impact fields`
  - Files: `api/tenant-survey.js`
  - Pre-commit: None

- [ ] 3. Frontend Validation Utility

  **What to do**:
  - Update `validateTenantSurvey()` in `src/utils/validation.ts`
  - Add validation for new fields matching API validation
  - Add TypeScript types for new fields
  - Ensure consistent error messages with API

  **Must NOT do**:
  - Do NOT change existing validation logic
  - Do NOT add new validation libraries
  - Do NOT modify API validation (separate concern)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`typescript-advanced-types`]
    - `typescript-advanced-types`: Type definitions and validation patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Tasks 4, 5
  - **Blocked By**: None (can start immediately)

  **References**:
  - `src/utils/validation.ts` — Current validation utility
  - `src/components/survey/TenantSurveyPublicPage.tsx:15` — Import of validateTenantSurvey

  **Acceptance Criteria**:
  - [ ] New fields added to TypeScript interface
  - [ ] Validation function updated with new fields
  - [ ] Error messages match API validation
  - [ ] No TypeScript errors

  **QA Scenarios**:

  ```
  Scenario: TypeScript compilation
    Tool: Bash (tsc)
    Preconditions: None
    Steps:
      1. Run `npx tsc --noEmit`
      2. Check for type errors
    Expected Result: No TypeScript errors
    Failure Indicators: Type mismatch or missing property
    Evidence: .sisyphus/evidence/task-3-tsc.txt

  Scenario: Validation function test
    Tool: Bash (vitest)
    Preconditions: None
    Steps:
      1. Create test case with valid data
      2. Create test case with missing required field
      3. Run validation tests
    Expected Result: Valid data passes, missing field fails
    Failure Indicators: Unexpected validation result
    Evidence: .sisyphus/evidence/task-3-validation-test.txt
  ```

  **Commit**: YES
  - Message: `feat(survey): add frontend validation for business impact fields`
  - Files: `src/utils/validation.ts`
  - Pre-commit: None

- [ ] 4. Frontend Form - Business Type Section

  **What to do**:
  - Add "Kategori Bisnis" dropdown (Level 1)
  - Add "Sub-Kategori Bisnis" dropdown (Level 2, dynamic)
  - Implement dynamic subcategory options based on category
  - Add form state management for new fields

  **Must NOT do**:
  - Do NOT modify existing form sections
  - Do NOT change form layout or styling
  - Do NOT add new form validation (separate task)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-design`, `tailwind-css-patterns`]
    - `frontend-design`: Component design patterns
    - `tailwind-css-patterns`: Styling consistency

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 5)
  - **Parallel Group**: Wave 2 (after Wave 1)
  - **Blocks**: Task 6
  - **Blocked By**: Tasks 1, 3

  **References**:
  - `src/components/survey/TenantSurveyPublicPage.tsx:19-44` — RATING_FIELDS pattern
  - `src/components/survey/TenantSurveyPublicPage.tsx:57-75` — Field component pattern

  **Acceptance Criteria**:
  - [ ] Category dropdown with 4 options
  - [ ] Subcategory dropdown with dynamic options
  - [ ] Form state includes new fields
  - [ ] Responsive design maintained

  **QA Scenarios**:

  ```
  Scenario: Category dropdown renders
    Tool: Playwright
    Preconditions: Page loaded
    Steps:
      1. Navigate to /tenant-survey/test-event
      2. Find "Kategori Bisnis" dropdown
      3. Verify 4 options exist
    Expected Result: Dropdown with F&B, Retail, Jasa, Lainnya
    Failure Indicators: Missing dropdown or options
    Evidence: .sisyphus/evidence/task-4-category-dropdown.png

  Scenario: Subcategory updates on category change
    Tool: Playwright
    Preconditions: Page loaded
    Steps:
      1. Select "F&B" from category
      2. Verify subcategory shows: Restoran, Cafe, Minuman, Bakery
      3. Change to "Retail"
      4. Verify subcategory updates to: Fashion, Elektronik, etc.
    Expected Result: Dynamic subcategory options
    Failure Indicators: Static options or wrong categories
    Evidence: .sisyphus/evidence/task-4-subcategory-dynamic.png
  ```

  **Commit**: YES (groups with Task 5)
  - Message: `feat(survey): add business type section to form`
  - Files: `src/components/survey/TenantSurveyPublicPage.tsx`
  - Pre-commit: None

- [ ] 5. Frontend Form - Metrics Section

  **What to do**:
  - Add "Dampak Event" section with 2 percentage inputs
  - Sales lift percentage (-100% to +1000%)
  - Traffic lift percentage (-100% to +1000%)
  - Add helper text explaining the percentage scale
  - Add proper input formatting for percentages

  **Must NOT do**:
  - Do NOT add absolute Rupiah value inputs
  - Do NOT add live preview (separate task)
  - Do NOT change existing form styling

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-design`, `tailwind-css-patterns`]
    - `frontend-design`: Input component design
    - `tailwind-css-patterns`: Consistent styling

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 4)
  - **Parallel Group**: Wave 2 (after Wave 1)
  - **Blocks**: Task 6
  - **Blocked By**: Tasks 1, 3

  **References**:
  - `src/components/survey/TenantSurveyPublicPage.tsx:57-75` — Field component
  - `src/components/supabaseApi.ts` — Submit function signature

  **Acceptance Criteria**:
  - [ ] 2 percentage inputs with proper labels
  - [ ] Helper text explaining percentage scale
  - [ ] Input validation hints displayed
  - [ ] Responsive layout

  **QA Scenarios**:

  ```
  Scenario: Percentage inputs render
    Tool: Playwright
    Preconditions: Page loaded
    Steps:
      1. Navigate to /tenant-survey/test-event
      2. Find "Dampak Event" section
      3. Verify 2 percentage inputs exist
    Expected Result: 2 inputs with correct labels
    Failure Indicators: Missing inputs or wrong labels
    Evidence: .sisyphus/evidence/task-5-percentage-inputs.png

  Scenario: Percentage input validation
    Tool: Playwright
    Preconditions: Page loaded
    Steps:
      1. Enter -150% in sales lift field (below min)
      2. Enter 5000% in sales lift field (above max)
      3. Verify validation hints appear
    Expected Result: Validation hints for invalid ranges
    Failure Indicators: No validation or wrong hints
    Evidence: .sisyphus/evidence/task-5-percentage-validation.png
  ```

  **Commit**: YES (groups with Task 4)
  - Message: `feat(survey): add metrics section to form`
  - Files: `src/components/survey/TenantSurveyPublicPage.tsx`
  - Pre-commit: None

- [ ] 6. Frontend Form Submission Update

  **What to do**:
  - Update `submitPublicTenantSurvey()` in `src/utils/supabaseApi.ts`
  - Add new fields to form submission payload
  - Update form state to include business type and metrics
  - Ensure proper data types sent to API

  **Must NOT do**:
  - Do NOT change existing submission logic
  - Do NOT add new API endpoints
  - Do NOT modify form validation

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`typescript-advanced-types`]
    - `typescript-advanced-types`: Type-safe API calls

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Tasks 2, 4, 5)
  - **Parallel Group**: Wave 2 (after Tasks 4, 5)
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 2, 4, 5

  **References**:
  - `src/utils/supabaseApi.ts` — Current API call functions
  - `src/components/survey/TenantSurveyPublicPage.tsx` — Full component

  **Acceptance Criteria**:
  - [ ] API call includes all new fields
  - [ ] Data types match API expectations
  - [ ] No TypeScript errors
  - [ ] Form submits successfully

  **QA Scenarios**:

  ```
  Scenario: Submit with all new fields
    Tool: Bash (curl)
    Preconditions: None
    Steps:
      1. POST with all new fields including business_category
      2. Verify 201 response
      3. Check database has all fields
    Expected Result: All fields stored correctly
    Failure Indicators: Missing fields or wrong values
    Evidence: .sisyphus/evidence/task-6-submit-all.json

  Scenario: Form state management
    Tool: Playwright
    Preconditions: Page loaded
    Steps:
      1. Fill all form fields
      2. Submit form
      3. Verify success message
    Expected Result: Form submits with all data
    Failure Indicators: Missing data or validation error
    Evidence: .sisyphus/evidence/task-6-form-submit.png
  ```

  **Commit**: YES
  - Message: `feat(survey): update form submission with new fields`
  - Files: `src/utils/supabaseApi.ts`, `src/components/survey/TenantSurveyPublicPage.tsx`
  - Pre-commit: None

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
>
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + linter + `bun test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp).
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill if UI)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (features working together, not isolation). Test edge cases: empty state, invalid input, rapid actions. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination: Task N touching Task M's files. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **Wave 1**: `feat(survey): add business impact fields to database schema` — migrate/tenant-event-surveys-v2.sql
- **Wave 2**: `feat(survey): add business type and metrics sections to form` — src/components/survey/TenantSurveyPublicPage.tsx, src/utils/supabaseApi.ts
- **Wave 2**: `feat(survey): add validation for business impact fields` — api/tenant-survey.js, src/utils/validation.ts
- **Final**: `chore(survey): cleanup and final verification` — (if needed)

---

## Success Criteria

### Verification Commands
```bash
npm run build                    # Expected: no errors
node --check api/tenant-survey.js  # Expected: no syntax errors
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] Build succeeds
- [ ] User approves final verification
- [ ] Form accepts percentage inputs (-100% to +1000%)
- [ ] Business category/subcategory dropdowns work
- [ ] Validation rejects invalid percentages
