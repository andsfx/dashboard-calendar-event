# Work Plan: Fix Community Registration Critical Issues

## TL;DR

> **Quick Summary**: Fix 5 critical issues di Community Registration Form: database schema mismatch, missing validation (client & server), RLS privacy issue, dan duplicate prevention.
>
> **Deliverables**:
> - Database migration untuk add missing columns
> - Client-side validation (email, phone, instagram)
> - Server-side validation API endpoint
> - Fix RLS policy untuk protect PII
> - Add duplicate prevention
>
> **Estimated Effort**: 6-8 jam
> **Critical Path**: DB Migration → Client Validation → Server Validation → RLS Fix → Duplicate Prevention

---

## Context

### Current State (From Audit)
- ❌ Database missing columns: `organization_type`, `organization_name`, `type_specific_data`
- ❌ Zero server-side validation
- ❌ Weak client-side validation (email, phone, instagram)
- ❌ RLS policy allows public read of PII data
- ❌ No duplicate prevention (spam risk)

### Target State
- ✅ Database schema complete dengan semua columns
- ✅ Strong client-side validation dengan regex patterns
- ✅ Server-side validation API endpoint
- ✅ RLS policy protect PII data
- ✅ Duplicate prevention via unique constraint

### Constraints
- Backward compatible - existing data harus tetap valid
- No breaking changes untuk existing registrations
- Maintain current UX flow

---

## Work Objectives

### Core Objective
Fix critical security, validation, and data integrity issues di Community Registration Form.

### Concrete Deliverables
1. SQL migration file: `migrate/fix-community-registration-schema.sql`
2. Validation utilities: `src/utils/validation.ts`
3. Updated form component: `src/components/community/CommunityRegistrationForm.tsx`
4. Server validation endpoint: `api/community-registration.js`
5. Updated RLS policies in Supabase

### Definition of Done
- [ ] Database schema complete dengan missing columns
- [ ] Client-side validation untuk email, phone, instagram
- [ ] Server-side validation API endpoint implemented
- [ ] RLS policy updated untuk protect PII
- [ ] Duplicate prevention via unique constraint
- [ ] All tests pass
- [ ] No TypeScript errors

### Must Have
- Database migration yang backward compatible
- Validation yang user-friendly (clear error messages)
- Server-side validation yang comprehensive
- RLS policy yang secure tapi tidak break existing functionality

### Must NOT Have (Guardrails)
- Jangan break existing registrations
- Jangan ubah UX flow drastically
- Jangan add dependencies baru

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (vitest)
- **Automated tests**: Unit tests untuk validation functions
- **Framework**: Vitest + React Testing Library

### QA Policy
- Unit tests untuk validation utilities
- Integration test untuk form submission
- Manual test untuk RLS policies

---

## TODOs

- [ ] 1. Database Migration - Add Missing Columns

  **What to do**:
  - Create SQL migration file `migrate/fix-community-registration-schema.sql`
  - Add missing columns: `organization_type`, `organization_name`, `type_specific_data`
  - Add length constraints untuk TEXT columns
  - Add CHECK constraints untuk format validation
  - Add unique constraint untuk duplicate prevention
  - Backfill existing data

  **Must NOT do**:
  - Jangan drop existing columns
  - Jangan break existing data
  - Jangan add NOT NULL constraints yang break existing rows

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Database migration requires careful analysis, backward compatibility
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (blocks all other tasks)
  - **Blocks**: All tasks (database must be ready first)
  - **Blocked By**: None

  **References**:
  - Audit report: `.sisyphus/evidence/community-registration-audit.md` (lines 200-250)
  - Current schema: `migrate/community-registrations.sql`
  - Milestone plan: `.sisyphus/plans/milestone-a-multi-type-registration.md` (lines 44-77)

  **Acceptance Criteria**:
  - [ ] File `migrate/fix-community-registration-schema.sql` created
  - [ ] Contains ALTER TABLE statements untuk add missing columns
  - [ ] Contains length constraints (VARCHAR limits)
  - [ ] Contains CHECK constraints untuk validation
  - [ ] Contains unique constraint untuk duplicate prevention
  - [ ] Contains backfill UPDATE statement
  - [ ] SQL is idempotent (safe to run multiple times)
  - [ ] Backward compatible dengan existing data

  **QA Scenarios**:

  ```
  Scenario: Verify migration SQL is valid
    Tool: Bash (psql dry-run or syntax check)
    Preconditions: Migration file created
    Steps:
      1. Check SQL syntax
      2. Verify all ALTER TABLE statements are idempotent (IF NOT EXISTS)
      3. Verify backfill logic is safe
    Expected Result: SQL is valid and safe to run
    Failure Indicators: Syntax errors, missing IF NOT EXISTS
    Evidence: .sisyphus/evidence/task-1-migration-validation.txt

  Scenario: Document migration for user
    Tool: Write
    Preconditions: Migration file created
    Steps:
      1. Create migration instructions in evidence folder
      2. Include steps untuk run migration via Supabase SQL Editor
      3. Include rollback instructions
    Expected Result: Clear instructions for Andy to run migration
    Failure Indicators: Missing instructions
    Evidence: .sisyphus/evidence/task-1-migration-instructions.md
  ```

  **Evidence to Capture**:
  - [ ] task-1-migration-validation.txt - SQL validation output
  - [ ] task-1-migration-instructions.md - Instructions untuk Andy

  **Commit**: YES
  - Message: `db: add migration for community registration schema fixes`
  - Files: `migrate/fix-community-registration-schema.sql`, `.sisyphus/evidence/task-1-*`

---

- [ ] 2. Create Validation Utilities

  **What to do**:
  - Create `src/utils/validation.ts` dengan validation functions
  - Add email validation dengan regex
  - Add phone validation (Indonesian format)
  - Add Instagram validation (username or URL)
  - Add URL validation helper
  - Export validation functions dan regex patterns
  - Add TypeScript types untuk validation results

  **Must NOT do**:
  - Jangan add external validation libraries
  - Jangan over-complicate validation logic
  - Jangan forget edge cases

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Straightforward utility functions, clear requirements
  - **Skills**: [`typescript-advanced-types`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Task 1)
  - **Parallel Group**: Can run with Task 3
  - **Blocks**: Task 4 (server validation needs these utilities)
  - **Blocked By**: Task 1 (conceptually, but can start in parallel)

  **References**:
  - Audit report: `.sisyphus/evidence/community-registration-audit.md` (lines 30-110)
  - Current form: `src/components/community/CommunityRegistrationForm.tsx`

  **Acceptance Criteria**:
  - [ ] File `src/utils/validation.ts` created
  - [ ] Function `validateEmail(email: string): ValidationResult`
  - [ ] Function `validatePhone(phone: string): ValidationResult`
  - [ ] Function `validateInstagram(instagram: string): ValidationResult`
  - [ ] Export regex patterns: `EMAIL_REGEX`, `PHONE_REGEX`, `INSTAGRAM_REGEX`
  - [ ] TypeScript types defined
  - [ ] No TypeScript errors
  - [ ] Unit tests created

  **QA Scenarios**:

  ```
  Scenario: Email validation works correctly
    Tool: Vitest
    Preconditions: validation.ts created
    Steps:
      1. Test valid emails: "test@example.com", "user+tag@domain.co.id"
      2. Test invalid emails: "test@", "@domain.com", "test", "a@b"
      3. Verify error messages are clear
    Expected Result: Valid emails pass, invalid emails fail with clear messages
    Failure Indicators: False positives/negatives
    Evidence: Test file src/utils/__tests__/validation.test.ts

  Scenario: Phone validation works correctly
    Tool: Vitest
    Preconditions: validation.ts created
    Steps:
      1. Test valid phones: "08123456789", "+628123456789", "628123456789"
      2. Test invalid phones: "123", "abc", "08123"
      3. Verify normalization (remove spaces/dashes)
    Expected Result: Valid Indonesian phones pass
    Failure Indicators: Valid phones rejected
    Evidence: Test file src/utils/__tests__/validation.test.ts

  Scenario: Instagram validation works correctly
    Tool: Vitest
    Preconditions: validation.ts created
    Steps:
      1. Test valid: "@username", "https://instagram.com/username"
      2. Test invalid: "random text", "http://malicious.com"
    Expected Result: Valid Instagram handles/URLs pass
    Failure Indicators: Malicious URLs accepted
    Evidence: Test file src/utils/__tests__/validation.test.ts
  ```

  **Evidence to Capture**:
  - [ ] src/utils/__tests__/validation.test.ts - Unit tests
  - [ ] .sisyphus/evidence/task-2-test-results.txt - Test run output

  **Commit**: YES
  - Message: `feat: add validation utilities for registration form`
  - Files: `src/utils/validation.ts`, `src/utils/__tests__/validation.test.ts`

---

- [ ] 3. Update Client-Side Validation

  **What to do**:
  - Update `CommunityRegistrationForm.tsx` to use validation utilities
  - Add email validation on submit
  - Add phone validation on submit
  - Add Instagram validation on submit
  - Add field-level error state
  - Show validation errors below each field
  - Improve error messages (user-friendly)

  **Must NOT do**:
  - Jangan break existing form flow
  - Jangan add validation yang terlalu strict (UX issue)
  - Jangan forget to import validation utilities

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Frontend form component, UX considerations
  - **Skills**: [`frontend-design`, `accessibility`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 2)
  - **Parallel Group**: Can run with Task 2
  - **Blocks**: None
  - **Blocked By**: Task 2 (needs validation utilities)

  **References**:
  - Audit report: `.sisyphus/evidence/community-registration-audit.md` (lines 30-110, 450-500)
  - Current form: `src/components/community/CommunityRegistrationForm.tsx`
  - Validation utilities: `src/utils/validation.ts` (from Task 2)

  **Acceptance Criteria**:
  - [ ] Import validation utilities from `src/utils/validation.ts`
  - [ ] Add email validation in `handleSubmit`
  - [ ] Add phone validation in `handleSubmit`
  - [ ] Add Instagram validation in `handleSubmit`
  - [ ] Add field-level error state: `fieldErrors: Record<string, string>`
  - [ ] Show error messages below each field
  - [ ] Error messages are user-friendly (Indonesian)
  - [ ] No TypeScript errors
  - [ ] Form still submits successfully with valid data

  **QA Scenarios**:

  ```
  Scenario: Email validation shows error
    Tool: Manual (browser test)
    Preconditions: Form updated with validation
    Steps:
      1. Open form in browser
      2. Enter invalid email: "test@"
      3. Try to submit
      4. Verify error message appears below email field
    Expected Result: Clear error message shown, form not submitted
    Failure Indicators: Form submits with invalid email
    Evidence: .sisyphus/evidence/task-3-email-validation-screenshot.png

  Scenario: Phone validation shows error
    Tool: Manual (browser test)
    Preconditions: Form updated with validation
    Steps:
      1. Enter invalid phone: "123"
      2. Try to submit
      3. Verify error message appears
    Expected Result: Error message: "Nomor telepon tidak valid. Format: 08xx atau +628xx"
    Failure Indicators: Form submits with invalid phone
    Evidence: .sisyphus/evidence/task-3-phone-validation-screenshot.png

  Scenario: Valid data submits successfully
    Tool: Manual (browser test)
    Preconditions: Form updated with validation
    Steps:
      1. Fill form with valid data
      2. Submit
      3. Verify success message
    Expected Result: Form submits, success message shown
    Failure Indicators: Valid data rejected
    Evidence: .sisyphus/evidence/task-3-valid-submission-screenshot.png
  ```

  **Evidence to Capture**:
  - [ ] task-3-*-screenshot.png - Browser test screenshots
  - [ ] task-3-validation-test.txt - Manual test results

  **Commit**: YES
  - Message: `feat: add client-side validation to registration form`
  - Files: `src/components/community/CommunityRegistrationForm.tsx`

---

- [ ] 4. Create Server-Side Validation API

  **What to do**:
  - Create `api/community-registration.js` endpoint
  - Add comprehensive server-side validation
  - Validate organization type (enum check)
  - Validate organization name (length 3-200)
  - Validate PIC name (length 3-100)
  - Validate phone (regex + length)
  - Validate email (regex if provided)
  - Validate Instagram (regex if provided)
  - Sanitize all text inputs (trim, max length)
  - Return clear error messages
  - Insert to database via service_role

  **Must NOT do**:
  - Jangan trust client-side validation
  - Jangan skip sanitization
  - Jangan expose internal errors to client

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Security-critical, needs thorough validation logic
  - **Skills**: [`nodejs-backend-patterns`, `nodejs-best-practices`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 5 (RLS depends on API being correct)
  - **Blocked By**: Task 2 (needs validation utilities concept)

  **References**:
  - Audit report: `.sisyphus/evidence/community-registration-audit.md` (lines 120-200)
  - Current API: `src/utils/supabaseApi.ts:672-700`
  - Validation utilities: `src/utils/validation.ts`

  **Acceptance Criteria**:
  - [ ] File `api/community-registration.js` created
  - [ ] Validates all required fields
  - [ ] Validates field formats (email, phone, instagram)
  - [ ] Validates field lengths
  - [ ] Sanitizes all inputs (trim, slice)
  - [ ] Returns 400 with clear error for invalid data
  - [ ] Returns 200 with registration ID for valid data
  - [ ] Uses Supabase service_role for insert
  - [ ] No sensitive data in error messages

  **QA Scenarios**:

  ```
  Scenario: Invalid email rejected by server
    Tool: Bash (curl)
    Preconditions: API endpoint created
    Steps:
      1. POST to /api/community-registration with invalid email
      2. Verify 400 response
      3. Verify error message is clear
    Expected Result: 400 status, error: "Invalid email format"
    Failure Indicators: 200 status with invalid data
    Evidence: .sisyphus/evidence/task-4-invalid-email-test.txt

  Scenario: Valid data accepted by server
    Tool: Bash (curl)
    Preconditions: API endpoint created
    Steps:
      1. POST with valid data
      2. Verify 200 response
      3. Verify registration ID returned
      4. Check database for inserted row
    Expected Result: 200 status, { success: true, id: "crg_xxx" }
    Failure Indicators: 400 status with valid data
    Evidence: .sisyphus/evidence/task-4-valid-submission-test.txt

  Scenario: SQL injection attempt blocked
    Tool: Bash (curl)
    Preconditions: API endpoint created
    Steps:
      1. POST with SQL injection in organizationName: "'; DROP TABLE--"
      2. Verify data is sanitized
      3. Verify no SQL error
    Expected Result: Data sanitized, no SQL injection
    Failure Indicators: SQL error, table dropped
    Evidence: .sisyphus/evidence/task-4-sql-injection-test.txt
  ```

  **Evidence to Capture**:
  - [ ] task-4-*-test.txt - API test results
  - [ ] task-4-api-validation.md - Validation rules documentation

  **Commit**: YES
  - Message: `feat: add server-side validation API for registration`
  - Files: `api/community-registration.js`, `.sisyphus/evidence/task-4-*`

---

- [ ] 5. Fix RLS Policy (Privacy Issue)

  **What to do**:
  - Create SQL file `migrate/fix-community-registration-rls.sql`
  - Drop existing public read policy
  - Create admin-only read policy
  - Keep public insert policy (for registration form)
  - Document policy changes
  - Create instructions untuk Andy to run via Supabase SQL Editor

  **Must NOT do**:
  - Jangan break registration form (public insert must work)
  - Jangan break admin dashboard (admin read must work)
  - Jangan forget to test policies

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Security-critical, RLS policies need careful design
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: None (final task)
  - **Blocked By**: Task 4 (conceptually)

  **References**:
  - Audit report: `.sisyphus/evidence/community-registration-audit.md` (lines 250-300)
  - Current RLS: `migrate/community-registrations.sql:15-21`

  **Acceptance Criteria**:
  - [ ] File `migrate/fix-community-registration-rls.sql` created
  - [ ] Drops public read policy
  - [ ] Creates admin-only read policy
  - [ ] Keeps public insert policy
  - [ ] SQL is idempotent
  - [ ] Instructions created for Andy

  **QA Scenarios**:

  ```
  Scenario: Public cannot read registrations
    Tool: Manual (Supabase dashboard or curl)
    Preconditions: RLS policy updated
    Steps:
      1. Try to SELECT from community_registrations without auth
      2. Verify access denied
    Expected Result: No rows returned or access denied error
    Failure Indicators: PII data visible to public
    Evidence: .sisyphus/evidence/task-5-public-read-blocked.txt

  Scenario: Admin can read registrations
    Tool: Manual (admin dashboard)
    Preconditions: RLS policy updated
    Steps:
      1. Login as admin
      2. Navigate to registrations section
      3. Verify registrations are visible
    Expected Result: Admin can see all registrations
    Failure Indicators: Admin cannot see data
    Evidence: .sisyphus/evidence/task-5-admin-read-works.txt

  Scenario: Public can still submit registration
    Tool: Manual (registration form)
    Preconditions: RLS policy updated
    Steps:
      1. Open registration form (not logged in)
      2. Fill and submit
      3. Verify success
    Expected Result: Registration submitted successfully
    Failure Indicators: Insert blocked
    Evidence: .sisyphus/evidence/task-5-public-insert-works.txt
  ```

  **Evidence to Capture**:
  - [ ] task-5-*-test.txt - RLS policy test results
  - [ ] task-5-rls-instructions.md - Instructions untuk Andy

  **Commit**: YES
  - Message: `security: fix RLS policy to protect PII in registrations`
  - Files: `migrate/fix-community-registration-rls.sql`, `.sisyphus/evidence/task-5-*`

---

## Final Verification Wave

> All tasks must pass verification before considering work complete.

- [ ] F1. **Database Schema Verification**
  Verify database migration SQL is valid, idempotent, and backward compatible. Check all missing columns are added. Verify constraints are correct.
  Output: `Schema complete: YES/NO | Backward compatible: YES/NO | VERDICT: PASS/FAIL`

- [ ] F2. **Validation Functionality Test**
  Test validation utilities with valid and invalid inputs. Verify client-side validation shows errors. Test server-side validation rejects invalid data.
  Output: `Client validation: PASS/FAIL | Server validation: PASS/FAIL | VERDICT: PASS/FAIL`

- [ ] F3. **Security Verification**
  Verify RLS policy blocks public read of PII. Verify admin can still read. Verify public can still submit. Test SQL injection protection.
  Output: `RLS secure: YES/NO | Public insert works: YES/NO | VERDICT: PASS/FAIL`

- [ ] F4. **Integration Test**
  End-to-end test: Submit registration with valid data, verify it's saved. Submit with invalid data, verify it's rejected with clear errors. Verify no TypeScript errors.
  Output: `E2E test: PASS/FAIL | TypeScript: PASS/FAIL | VERDICT: PASS/FAIL`

---

## Commit Strategy

- **1**: `db: add migration for community registration schema fixes` - migrate/fix-community-registration-schema.sql
- **2**: `feat: add validation utilities for registration form` - src/utils/validation.ts, tests
- **3**: `feat: add client-side validation to registration form` - src/components/community/CommunityRegistrationForm.tsx
- **4**: `feat: add server-side validation API for registration` - api/community-registration.js
- **5**: `security: fix RLS policy to protect PII in registrations` - migrate/fix-community-registration-rls.sql

---

## Success Criteria

### Verification Commands
```bash
# TypeScript check
npm run build
# Expected: No errors

# Run tests
npm test
# Expected: All tests pass

# LSP diagnostics
lsp_diagnostics(filePath="src/components/community/CommunityRegistrationForm.tsx")
# Expected: No errors
```

### Final Checklist
- [ ] Database migration created and documented
- [ ] Validation utilities created with tests
- [ ] Client-side validation implemented
- [ ] Server-side validation API created
- [ ] RLS policy fixed
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] Manual testing completed
- [ ] Evidence captured for all tasks
