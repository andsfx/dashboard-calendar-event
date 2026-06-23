# Audit Fixes — Dashboard Calendar Event v2

## TL;DR

> **Quick Summary**: Remediation plan for audit findings — security (npm vuln, vercel headers), UI/UX (split 1000+ line components, fix mojibake), workflow (remove legacy GAS), testing (add key unit tests).
>
> **Deliverables**:
> - `npm audit fix` — zero high/critical vulns
> - `vercel.json` — security headers added (HSTS, X-Frame, X-Content-Type, Referrer-Policy, Permissions-Policy)
> - `index.html` — mojibake title fixed
> - `CommunityLandingPage.tsx` — split into sub-components (<400 lines each)
> - `PublicLandingPage.tsx` — split into sub-components (<400 lines each)
> - `api/apps-script-admin.js` + `api/apps-script-public.js` — removed (legacy Google Apps Script)
> - Test files for supabaseApi, useEvents, community-registration
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 4 waves
> **Critical Path**: T1 (deps) → T2 (gas check) → T5 (headers) → T6-T8 (refactor) → T9 (GAS removal) → T10-T12 (tests)

---

## Context

### Original Request
User asked: "Audit Full Project ini, mulai dari UI UX, Workflow, Security, dan lainnya"
Then: "Mau high accuracy mode (Momus review loop) biar plan super ketat"

### Interview Summary
**Key Decisions**:
- Test scope: Add 3 test files (supabaseApi, useEvents, community-registration)
- Legacy GAS: Pre-check then remove if safe
- CSP: Skip for now, add other security headers
- Priority: Security → Refactor → Legacy removal → Tests

**Research Findings**:
- npm audit: 3 vulns (react-router HIGH, ws MODERATE)
- vercel.json: no security headers at all
- index.html: `Event Dashboard �?" Metropolitan Mall Bekasi` (mojibake)
- CommunityLandingPage.tsx: 1016 lines
- PublicLandingPage.tsx: 764 lines
- Only 1 test file exists for 139 source files

### Metis Review
**Identified Gaps** (addressed):
- Test scope: Locked to 3 exact files
- GAS safety: Pre-check task added
- CSP strictness: Deferred, added other headers
- Regression risk: react-router-dom updated alone, refactor extracts only (no logic change)

---

## Work Objectives

### Core Objective
Fix all audit findings with minimal regression risk.

### Concrete Deliverables
- npm deps patched — zero high/critical vulns
- Security headers served on all routes
- index.html renders correctly
- 2 huge components split (1016, 764 -> <400 lines each)
- Legacy GAS removed (if safe)
- 3 new test files added

### Definition of Done
- [ ] `npm audit` — zero vulnerabilities
- [ ] `curl -I localhost:3000` — shows security headers
- [ ] `cat index.html | grep "<title>"` — no mojibake
- [ ] All components < 500 lines
- [ ] `npm test` — all tests pass
- [ ] Playwright — CommunityLandingPage loads without console errors

### Must Have
- Security headers added to vercel.json
- npm vulns fixed
- index.html mojibake fixed
- CommunityLandingPage split
- PublicLandingPage split
- 3 test files added

### Must NOT Have (Guardrails)
- No logic changes during component split (extract only, no rewrite)
- No CSP headers yet (user decision)
- No deleting GAS without pre-check confirmation
- No test expansion beyond 3 files
- No changes to database schema or RLS policies

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: YES (vitest)
- **Automated tests**: Tests-after (tests added after implementation)
- **Framework**: vitest + testing-library

### QA Policy
Every task MUST include agent-executed QA scenarios.
- **npm/deps**: Bash — run commands, assert output
- **Vercel headers**: Bash — curl and check response headers
- **UI refactor**: Playwright — load page, assert no console errors, screenshot
- **Tests**: Bash — run vitest, assert pass
- **GAS removal**: Bash — check no imports remain

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — foundation):
├── T1: npm audit fix + update react-router-dom [quick]
├── T2: Investigate Google Apps Script usage (pre-check) [unspecified-low]
└── T3: Fix index.html mojibake [quick]

Wave 2 (After Wave 1 — infrastructure):
├── T4: Add vercel security headers [quick]
├── T5: Remove legacy GAS (if T2 confirms safe) [quick]
└── T6: Pre-refactor — create sub-component files structure [quick]

Wave 3 (After Wave 2 — heavy lifting):
├── T7: Split CommunityLandingPage.tsx [unspecified-high]
├── T8: Split PublicLandingPage.tsx [unspecified-high]
└── T9: Add tests — supabaseApi [quick]

Wave 4 (After Wave 3 — remaining tests):
├── T10: Add tests — useEvents [unspecified-low]
├── T11: Add tests — community-registration [quick]
└── WAVE FINAL: F1-F4 reviews [parallel]

Critical Path: T1 → T2 → T5 → T7 → T9 → F1-F4
Max Concurrent: 3 per wave
```

### Dependency Matrix
- **1-6**: - - 7, 8
- **2**: - - 5
- **3**: - - 10, 11, F3
- **5**: 2 - F3
- **7-8**: 1-6 - 9, 12, F3
- **9-11**: 7, 8 - F1-F4

---

## TODOs

- [x] 1. npm audit fix + update react-router-dom

  **What to do**:
  - Run `npm audit fix` to resolve vulnerabilities.
  - Manually update `react-router-dom` to `^7.17.0` (or latest safe) if audit fix doesn't cover it.
  - Run typecheck and existing tests to ensure no regressions.

  **Must NOT do**:
  - Do not update other major dependencies that might break Vite config.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Basic dependency update and audit patch.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: T7, T8
  - **Blocked By**: None

  **References**:
  - `package.json`

  **Acceptance Criteria**:
  - [ ] `npm audit` shows 0 high/critical vulnerabilities.
  - [ ] App builds without type errors (`npm run build`).

  **QA Scenarios**:
  ```
  Scenario: Verify npm audit passes
    Tool: Bash
    Preconditions: None
    Steps:
      1. Run "npm audit" in terminal
    Expected Result: Exit code 0, no high/critical vulnerabilities.
    Failure Indicators: High/critical vulnerabilities still present.
    Evidence: .sisyphus/evidence/task-1-npm-audit.txt
  ```

- [x] 2. Investigate Google Apps Script usage

  **What to do**:
  - Search codebase for `APPS_SCRIPT_URL`, `ADMIN_API_TOKEN`, `apps-script-admin.js`, and `apps-script-public.js`.
  - Confirm if any features (like letter request) still actively depend on GAS.
  - Verify if these features can be migrated to Supabase or if they are already migrated.

  **Must NOT do**:
  - Do not delete any files yet.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Context gathering and code search.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: T5
  - **Blocked By**: None

  **References**:
  - `src/utils/supabaseApi.ts`
  - `api/apps-script-admin.js`
  - `api/apps-script-public.js`

  **Acceptance Criteria**:
  - [ ] List of all files referencing GAS generated.
  - [ ] Confirmation of safety to delete.

  **QA Scenarios**:
  ```
  Scenario: Check GAS references
    Tool: Bash
    Preconditions: None
    Steps:
      1. Search for APPS_SCRIPT_URL references
    Expected Result: Documented list of references and their status.
    Failure Indicators: Missing references in the list.
    Evidence: .sisyphus/evidence/task-2-gas-audit.txt
  ```

- [x] 3. Fix index.html mojibake

  **What to do**:
  - Edit `index.html` to fix the title character encoding issue.
  - Replace `Event Dashboard ?" Metropolitan Mall Bekasi` with `Event Dashboard — Metropolitan Mall Bekasi` or `Event Dashboard - Metropolitan Mall Bekasi`.

  **Must NOT do**:
  - Do not change other meta tags unless they also have mojibake.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple text fix in a single file.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `index.html`

  **Acceptance Criteria**:
  - [ ] `index.html` title contains clean text (no `?`).

  **QA Scenarios**:
  ```
  Scenario: Verify index.html title
    Tool: Bash
    Preconditions: None
    Steps:
      1. Run "cat index.html" and check <title> tag
    Expected Result: Title tag contains "Event Dashboard — Metropolitan Mall Bekasi".
    Failure Indicators: Title tag contains mojibake characters.
    Evidence: .sisyphus/evidence/task-3-title-check.txt
  ```

- [x] 4. Add vercel security headers

  **What to do**:
  - Update `vercel.json` to include security headers: `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`.
  - Do NOT add `Content-Security-Policy` yet as requested by user.

  **Must NOT do**:
  - Do not add CSP headers.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Configuration file update.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `vercel.json`

  **Acceptance Criteria**:
  - [ ] `vercel.json` contains the specified security headers.

  **QA Scenarios**:
  ```
  Scenario: Verify vercel.json headers
    Tool: Bash
    Preconditions: None
    Steps:
      1. Run "cat vercel.json" and check headers block
    Expected Result: Headers block contains the specified security headers.
    Failure Indicators: Headers block missing or incorrect.
    Evidence: .sisyphus/evidence/task-4-vercel-headers.txt
  ```

- [x] 5. Remove unused GAS parts

  **What to do**:
  - Delete `api/apps-script-public.js` (unused, no active imports to it)
  - Delete `src/utils/sheetsApi.ts` (unused legacy module, no active imports)
  - Remove `APPS_SCRIPT_URL` and `ADMIN_API_TOKEN` references from `.env` only if confirmed unused
  - Keep `api/apps-script-admin.js` and its env vars — letter request feature still active

  **Must NOT do**:
  - Do NOT delete `api/apps-script-admin.js` (letter request still uses it)
  - Do NOT delete `createLetterRequest` from `src/utils/supabaseApi.ts`

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: File deletion and reference cleanup.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: None
  - **Blocked By**: T2

  **References**:
  - `src/utils/supabaseApi.ts`
  - `api/apps-script-admin.js`

  **Acceptance Criteria**:
  - [ ] Legacy GAS files deleted.
  - [ ] No GAS references remain in the codebase.

  **QA Scenarios**:
  ```
  Scenario: Verify GAS removal
    Tool: Bash
    Preconditions: None
    Steps:
      1. Search for APPS_SCRIPT_URL references
    Expected Result: No references found.
    Failure Indicators: References still exist.
    Evidence: .sisyphus/evidence/task-5-gas-removal.txt
  ```

- [x] 6. Pre-refactor — create sub-component files structure

  **What to do**:
  - Create new files in `src/components/` for sub-components extracted from `CommunityLandingPage` and `PublicLandingPage`.
  - Examples: `CommunityHero.tsx`, `CommunityFeatures.tsx`, `PublicHero.tsx`, etc.

  **Must NOT do**:
  - Do not move code yet, just create files.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: File creation.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: T7, T8
  - **Blocked By**: None

  **References**:
  - `src/components/CommunityLandingPage.tsx`
  - `src/components/PublicLandingPage.tsx`

  **Acceptance Criteria**:
  - [ ] New component files created.

  **QA Scenarios**:
  ```
  Scenario: Verify file creation
    Tool: Bash
    Preconditions: None
    Steps:
      1. Check if new files exist in src/components/
    Expected Result: Files exist.
    Failure Indicators: Files missing.
    Evidence: .sisyphus/evidence/task-6-file-creation.txt
  ```

- [x] 7. Split CommunityLandingPage.tsx

  **What to do**:
  - Move code from `CommunityLandingPage.tsx` to the new sub-components created in T6.
  - Update imports and ensure the main component works as before.

  **Must NOT do**:
  - Do not change any business logic or styling.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Large file refactoring.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: T6

  **References**:
  - `src/components/CommunityLandingPage.tsx`

  **Acceptance Criteria**:
  - [ ] `CommunityLandingPage.tsx` is < 400 lines.
  - [ ] App builds and runs without errors.

  **QA Scenarios**:
  ```
  Scenario: Verify CommunityLandingPage split
    Tool: Playwright
    Preconditions: None
    Steps:
      1. Load CommunityLandingPage
    Expected Result: Page loads without console errors.
    Failure Indicators: Console errors or page fails to load.
    Evidence: .sisyphus/evidence/task-7-community-page.png
  ```

- [x] 8. Split PublicLandingPage.tsx

  **What to do**:
  - Move code from `PublicLandingPage.tsx` to the new sub-components created in T6.
  - Update imports and ensure the main component works as before.

  **Must NOT do**:
  - Do not change any business logic or styling.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Large file refactoring.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: T6

  **References**:
  - `src/components/PublicLandingPage.tsx`

  **Acceptance Criteria**:
  - [ ] `PublicLandingPage.tsx` is < 400 lines.
  - [ ] App builds and runs without errors.

  **QA Scenarios**:
  ```
  Scenario: Verify PublicLandingPage split
    Tool: Playwright
    Preconditions: None
    Steps:
      1. Load PublicLandingPage
    Expected Result: Page loads without console errors.
    Failure Indicators: Console errors or page fails to load.
    Evidence: .sisyphus/evidence/task-8-public-page.png
  ```

- [x] 9. Add tests — supabaseApi

  **What to do**:
  - Create `src/utils/supabaseApi.test.ts`.
  - Write tests for key utility functions in `supabaseApi.ts`.

  **Must NOT do**:
  - Do not test external Supabase API directly (mock it).

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Unit testing.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `src/utils/supabaseApi.ts`

  **Acceptance Criteria**:
  - [ ] Test file created and passes.

  **QA Scenarios**:
  ```
  Scenario: Verify supabaseApi tests
    Tool: Bash
    Preconditions: None
    Steps:
      1. Run "npx vitest run src/utils/supabaseApi.test.ts"
    Expected Result: Tests pass.
    Failure Indicators: Tests fail.
    Evidence: .sisyphus/evidence/task-9-supabase-tests.txt
  ```

- [x] 10. Add tests — useEvents

  **What to do**:
  - Create `src/hooks/useEvents.test.ts` or `src/hooks/__tests__/useEvents.test.ts`.
  - Mock Supabase calls and test load/success/error states.

  **Must NOT do**:
  - Do not require real Supabase network calls.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Hook testing with mocks.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: T7, T8

  **References**:
  - `src/hooks/useEvents.ts`

  **Acceptance Criteria**:
  - [ ] Hook tests pass.

  **QA Scenarios**:
  ```
  Scenario: Verify useEvents tests
    Tool: Bash
    Preconditions: None
    Steps:
      1. Run "npx vitest run src/hooks/useEvents.test.ts"
    Expected Result: Tests pass.
    Failure Indicators: Tests fail.
    Evidence: .sisyphus/evidence/task-10-useevents-tests.txt
  ```

- [x] 11. Add tests — community-registration

  **What to do**:
  - Expand existing `__tests__/api/community-registration.test.js` if needed.
  - Ensure validation scenarios include happy path and invalid input cases.

  **Must NOT do**:
  - Do not require real Supabase network calls.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Existing test file available.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `__tests__/api/community-registration.test.js`
  - `api/community-registration.js`

  **Acceptance Criteria**:
  - [ ] Existing community registration tests pass.
  - [ ] At least 1 happy path + 3 invalid input cases covered.

  **QA Scenarios**:
  ```
  Scenario: Verify community registration tests
    Tool: Bash
    Preconditions: None
    Steps:
      1. Run "node __tests__/api/community-registration.test.js"
    Expected Result: All tests pass.
    Failure Indicators: Any test fails.
    Evidence: .sisyphus/evidence/task-11-community-registration-tests.txt
  ```

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE.

- [x] F1. **Plan Compliance Audit** — oracle
  Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT

- [x] F2. **Code Quality Review** — unspecified-high
  Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | VERDICT

- [x] F3. **Real Manual QA** — unspecified-high (+ playwright)
  Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT

- [x] F4. **Scope Fidelity Check** — deep
  Tasks [N/N compliant] | Contamination [CLEAN/N issues] | VERDICT

---

## Commit Strategy

- **1**: `chore(deps): npm audit fix + update react-router-dom`
- **3**: `fix(html): mojibake title in index.html`
- **4**: `security(vercel): add missing security headers`
- **5**: `refactor: remove legacy Google Apps Script`
- **7**: `refactor(ui): split CommunityLandingPage into sub-components`
- **8**: `refactor(ui): split PublicLandingPage into sub-components`
- **9-11**: `test(api): add tests for supabaseApi, useEvents, community-registration`
- **F1-F4**: `chore: final verification` (squash)

---

## Success Criteria

### Verification Commands
```bash
npm audit           # Expected: 0 vulnerabilities
curl -I http://localhost:3000  # Expected: security headers present
cat index.html | grep "<title>"  # Expected: clean text, no ?
npx vitest run      # Expected: all tests pass
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] No console errors on CommunityLandingPage
- [ ] GAS safely removed (no dangling imports)
