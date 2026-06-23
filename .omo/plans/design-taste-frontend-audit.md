# Design Taste Frontend Audit - Metropolitan Mall Bekasi Landing Page

## TL;DR (For humans)
> **Quick Summary**: Fix hardcoded hex colors and raw Tailwind classes in landing pages to achieve 100% design-taste-frontend compliance while maintaining visual fidelity.
> 
> **Deliverables**: 
> - Remove all hardcoded hex colors (#7c6cf2, #f2743e, #9185f7) from landing page components
> - Replace raw Tailwind classes with design system tokens (bg-neutral-*, text-brand-primary, etc.)
> - Standardize focus ring implementation using ui-focus-ring class
> - Clean up commented color references
> 
> **Estimated Effort**: Short (2-3 hours)
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Hardcoded color removal → Raw Tailwind migration → Verification

---

## Context

### Original Request
Audit dan analisa landing page project ini, gunakan skill taste-design-frontend

### Audit Findings
- **Design system foundation**: Excellent (95% compliant) - proper Tailwind v4 @theme directive, Metmal pastel aesthetic
- **UI component library**: Good (90% compliant) - consistent component architecture and props
- **Landing pages**: Good but needs cleanup (85% compliant) - hardcoded hex colors present, some raw Tailwind classes
- **Accessibility**: Excellent (95% compliant) - proper focus states, semantic HTML, WCAG AA compliance
- **Performance**: Good (90% compliant) - Intersection Observer scroll reveals, lazy loading, reduced motion support

### Critical Issues Identified
1. **Hardcoded hex colors**: 14 instances across 7 files including BRAND constants and inline gradients
2. **Raw Tailwind classes**: Focus ring using `ring-violet-400` instead of design tokens, text colors using `text-slate-*`
3. **Commented color references**: Confusing commented hex values in PublicEventGrid.tsx

---

## Work Objectives

### Core Objective
Achieve 100% design-taste-frontend compliance in landing pages by migrating all hardcoded colors and raw Tailwind classes to proper design system tokens.

### Concrete Deliverables
- CommunityLandingPage.tsx: Replace gradient background with CSS variables
- CommunityHero.tsx: Replace BRAND constants with CSS variables  
- GalleryHeader.tsx: Replace gradient background with CSS variables
- All affected files: Update focusRing to use ui-focus-ring class
- PublicEventGrid.tsx: Remove commented color references
- Full verification that visual appearance remains identical

### Definition of Done
- [ ] `grep -r "#7c6cf2\|#f2743e\|#9185f7" src/components/` returns 0 matches
- [ ] All focus rings use `ui-focus-ring` class instead of raw Tailwind
- [ ] No commented hex color references remain in codebase
- [ ] `npm run build` passes without errors
- [ ] Landing pages visually identical but using design system tokens

### Must Have
- Preserve exact visual appearance (colors must match exactly)
- Use existing design system tokens from theme.css and tokens.css
- Maintain backward compatibility and functionality
- No breaking changes to component APIs

### Must NOT Have (Guardrails)
- Do not introduce new CSS variables beyond existing theme.css
- Do not modify dashboard components (out of scope for landing page audit)
- Do not change color values - only replace implementation method
- Do not add unnecessary dependencies

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed. No exceptions.
> Acceptance criteria requiring "user manually tests/confirms" are FORBIDDEN.

### Test Decision
- **Infrastructure exists**: YES (Vite + TypeScript + Playwright)
- **Automated tests**: Tests-after (existing test infrastructure)
- **Framework**: vitest + Playwright

### QA Policy
Every task MUST include agent-executed QA scenarios (see TODO template below).
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Use Playwright (playwright skill) - Navigate, interact, assert DOM, screenshot
- **Code verification**: Use Bash grep to confirm hardcoded colors removed
- **Build verification**: Use Bash to confirm build passes

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately - Hardcoded Color Removal):
├── Task 1: Fix CommunityLandingPage.tsx gradient background
├── Task 2: Fix CommunityHero.tsx BRAND constants
├── Task 3: Fix GalleryHeader.tsx gradient background
└── Task 4: Fix Public* components BRAND constants

Wave 2 (After Wave 1 - Raw Tailwind Migration):
├── Task 5: Standardize focus ring implementation across all landing components
└── Task 6: Remove commented color references from PublicEventGrid.tsx

Wave FINAL (After ALL tasks — 4 parallel reviews, then user okay):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay
```

### Dependency Matrix
- **1-4**: - - 5-6, 1
- **5-6**: 1-4 - F1-F4, 2  
- **F1-F4**: 5-6 - user okay

### Agent Dispatch Summary
- **Wave 1**: **4** tasks → `quick`
- **Wave 2**: **2** tasks → `quick`  
- **FINAL**: **4** tasks → oracle/unspecified-high/deep

---

## TODOs

> Implementation + Test = ONE Task. Never separate.
> EVERY task MUST have: Recommended Agent Profile + Parallelization info + QA Scenarios.
> **A task WITHOUT QA Scenarios is INCOMPLETE. No exceptions.**

- [x] 1. Fix CommunityLandingPage.tsx gradient background

  **What to do**:
  - Replace hardcoded gradient (line 146) with CSS variables:
    - `linear-gradient(135deg, #7c6cf2 0%, #9185f7 100%)` → `linear-gradient(135deg, var(--color-brand-primary) 0%, var(--color-brand-primary-400) 100%)`
  - Replace focusRing `ring-violet-400` with `ui-focus-ring`

  **Must NOT do**:
  - Change the gradient direction or stops
  - Break any styling functionality

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple string replacement in single file
  - **Skills**: [`tailwind-css-patterns`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2-4)
  - **Blocks**: Task 5 (focus ring standardization)
  - **Blocked By**: None (can start immediately)

  **References**:
  - `src/styles/theme.css:12-22` - Brand color CSS variables
  - `src/styles/tokens.css:6-8` - CSS variable mappings
  - `src/components/CommunityLandingPage.tsx:146` - Current hardcoded gradient to replace

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: Hardcoded gradient replaced with CSS variables
    Tool: Bash (grep)
    Preconditions: Working directory is project root
    Steps:
      1. grep "#7c6cf2.*#9185f7" src/components/CommunityLandingPage.tsx
    Expected Result: No matches found
    Evidence: .sisyphus/evidence/task-1-communitylanding-gradient-fixed.txt

  Scenario: Focus ring uses ui-focus-ring class
    Tool: Bash (grep)
    Steps:
      1. grep "ui-focus-ring" src/components/CommunityLandingPage.tsx
    Expected Result: Match found for ui-focus-ring usage
    Evidence: .sisyphus/evidence/task-1-focusring-fixed.txt
  ```

  **Commit**: YES
  - Message: `fix(landing): replace hardcoded gradient with css variables in CommunityLandingPage`
  - Files: `src/components/CommunityLandingPage.tsx`
  - Pre-commit: `npm run build`

- [x] 2. Fix CommunityHero.tsx BRAND constants

  **What to do**:
  - Remove hardcoded BRAND constant (lines 6-8)
  - Replace with CSS variables:
    - `accent: '#7c6cf2'` → `accent: 'var(--color-brand-primary)'`
    - `accentSoft: '#9185f7'` → `accentSoft: 'var(--color-brand-primary-400)'`
    - `accentWarm: '#f2743e'` → `accentWarm: 'var(--color-brand-secondary)'`
  - Ensure visual appearance remains identical

  **Must NOT do**:
  - Change the actual color values
  - Break any component functionality

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple string replacement in single file
  - **Skills**: [`tailwind-css-patterns`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3-4)
  - **Blocks**: Task 5 (focus ring standardization)
  - **Blocked By**: None

  **References**:
  - `src/styles/theme.css:12-22` - Brand color CSS variables
  - `src/styles/tokens.css:6-8` - CSS variable mappings
  - `src/components/community/CommunityHero.tsx:5-9` - Current BRAND constant to replace

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: BRAND constant replaced with CSS variables
    Tool: Bash (grep)
    Preconditions: CommunityHero.tsx modified
    Steps:
      1. grep "#7c6cf2\|#f2743e\|#9185f7" src/components/community/CommunityHero.tsx
    Expected Result: No matches found
    Evidence: .sisyphus/evidence/task-2-communityhero-fixed.txt
  ```

  **Commit**: YES
  - Message: `fix(landing): replace hardcoded colors with css variables in CommunityHero`
  - Files: `src/components/community/CommunityHero.tsx`
  - Pre-commit: `npm run build`

- [x] 3. Fix GalleryHeader.tsx gradient background

  **What to do**:
  - Replace hardcoded gradient (line 37) with CSS variables:
    - `linear-gradient(135deg, #7c6cf2 0%, #9185f7 100%)` → `linear-gradient(135deg, var(--color-brand-primary) 0%, var(--color-brand-primary-400) 100%)`

  **Must NOT do**:
  - Change the gradient direction or stops
  - Break any styling functionality

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple string replacement in single file
  - **Skills**: [`tailwind-css-patterns`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-2, 4)
  - **Blocks**: Task 5 (focus ring standardization)
  - **Blocked By**: None

  **References**:
  - `src/styles/theme.css:12-22` - Brand color CSS variables
  - `src/styles/tokens.css:6-8` - CSS variable mappings
  - `src/components/GalleryHeader.tsx:37` - Current hardcoded gradient to replace

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: Hardcoded gradient replaced with CSS variables
    Tool: Bash (grep)
    Steps:
      1. grep "#7c6cf2.*#9185f7" src/components/GalleryHeader.tsx
    Expected Result: No matches found
    Evidence: .sisyphus/evidence/task-3-galleryheader-fixed.txt
  ```

  **Commit**: YES
  - Message: `fix(landing): replace hardcoded gradient with css variables in GalleryHeader`
  - Files: `src/components/GalleryHeader.tsx`
  - Pre-commit: `npm run build`

- [x] 4. Fix Public* components BRAND constants

  **What to do**:
  - PublicLandingPage.tsx: Remove BRAND constant, use CSS variables (accent, accentSoft, accentWarm)
  - PublicHero.tsx: Remove accent constants, use CSS variables (accent, accentWarm)
  - PublicSubmissionForm.tsx: Remove accent constants, use CSS variables (accent, accentWarm)

  **Must NOT do**:
  - Change the actual color values
  - Break any component functionality

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple replacements across multiple files
  - **Skills**: [`tailwind-css-patterns`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-3)
  - **Blocks**: Task 5 (focus ring standardization)
  - **Blocked By**: None

  **References**:
  - `src/styles/theme.css:12-22` - Brand color CSS variables
  - `src/styles/tokens.css:6-8` - CSS variable mappings
  - `src/components/PublicLandingPage.tsx:45-47` - Current BRAND constant
  - `src/components/PublicHero.tsx:9-10` - Current accent constants
  - `src/components/PublicSubmissionForm.tsx:22-23` - Current accent constants

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: All BRAND constants replaced with CSS variables
    Tool: Bash (grep)
    Steps:
      1. grep "#7c6cf2\|#f2743e\|#9185f7" src/components/PublicLandingPage.tsx src/components/PublicHero.tsx src/components/PublicSubmissionForm.tsx
    Expected Result: No matches found
    Evidence: .sisyphus/evidence/task-4-public-fixed.txt
  ```

  **Commit**: YES
  - Message: `fix(landing): replace hardcoded colors with css variables in Public components`
  - Files: `src/components/PublicLandingPage.tsx`, `src/components/PublicHero.tsx`, `src/components/PublicSubmissionForm.tsx`
  - Pre-commit: `npm run build`

- [x] 5. Standardize focus ring implementation across all landing components

  **What to do**:
  - CommunityLandingPage.tsx: Replace `ring-violet-400` + `ring-offset-slate-950` with `ui-focus-ring`
  - GalleryHeader.tsx: Replace `ring-violet-500` with `ui-focus-ring`
  - Verify all landing components use consistent focus ring

  **Must NOT do**:
  - Change focus ring behavior
  - Break accessibility functionality

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple string replacements across files
  - **Skills**: [`tailwind-css-patterns`, `accessibility`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 6)
  - **Blocks**: None
  - **Blocked By**: Tasks 1-4 (Wave 1)

  **References**:
  - `src/styles/theme.css:12-22, 38-51` - Brand and neutral color tokens
  - `src/styles/tokens.css:22-24` - Focus ring CSS variable definitions
  - `src/components/CommunityLandingPage.tsx:17` - Current focusRing to update
  - `src/components/GalleryHeader.tsx:18` - Current focus ring to update

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: All focus rings use ui-focus-ring class
    Tool: Bash (grep)
    Steps:
      1. grep "ui-focus-ring" src/components/CommunityLandingPage.tsx
      2. grep "ui-focus-ring" src/components/GalleryHeader.tsx
    Expected Result: Both files use ui-focus-ring class, no raw ring-violet-* or ring-offset-slate-* in focus rings
    Evidence: .sisyphus/evidence/task-5-focusring-standardized.txt
  ```

  **Commit**: YES
  - Message: `fix(landing): standardize focus ring implementation with ui-focus-ring class`
  - Files: `src/components/CommunityLandingPage.tsx`, `src/components/GalleryHeader.tsx`
  - Pre-commit: `npm run build`

- [x] 6. Remove commented color references from PublicEventGrid.tsx

  **What to do**:
  - Remove commented color references (lines 9-10):
    - `// --color-brand-primary: #7c6cf2` and `// --color-brand-secondary: #f2743e`

  **Must NOT do**:
  - Delete any active code
  - Break any functionality

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple comment removal
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 5)
  - **Blocks**: None
  - **Blocked By**: Tasks 1-4 (Wave 1)

  **References**:
  - `src/components/PublicEventGrid.tsx:9-10` - Commented hex references to remove

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: Commented color references removed
    Tool: Bash (grep)
    Steps:
      1. grep "#7c6cf2\|#f2743e" src/components/PublicEventGrid.tsx
    Expected Result: No matches found
    Evidence: .sisyphus/evidence/task-6-comments-removed.txt
  ```

  **Commit**: YES
  - Message: `chore(landing): remove commented color references from PublicEventGrid`
  - Files: `src/components/PublicEventGrid.tsx`
  - Pre-commit: `npm run build`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
>
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + linter + `bun test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill if UI)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (features working together, not isolation). Test edge cases: empty state, invalid input, rapid actions. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination: Task N touching Task M's files. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **1**: `fix(landing): replace hardcoded gradient with css variables in CommunityLandingPage` - src/components/CommunityLandingPage.tsx, npm run build
- **2**: `fix(landing): replace hardcoded colors with css variables in CommunityHero` - src/components/community/CommunityHero.tsx, npm run build
- **3**: `fix(landing): replace hardcoded gradient with css variables in GalleryHeader` - src/components/GalleryHeader.tsx, npm run build
- **4**: `fix(landing): replace hardcoded colors with css variables in Public components` - src/components/PublicLandingPage.tsx, src/components/PublicHero.tsx, src/components/PublicSubmissionForm.tsx, npm run build
- **5**: `fix(landing): standardize focus ring implementation with ui-focus-ring class` - src/components/CommunityLandingPage.tsx, src/components/GalleryHeader.tsx, npm run build
- **6**: `chore(landing): remove commented color references from PublicEventGrid` - src/components/PublicEventGrid.tsx, npm run build

---

## Success Criteria

### Verification Commands
```bash
# Verify no hardcoded hex colors remain
grep -r "#7c6cf2\|#f2743e\|#9185f7" src/components/

# Verify build passes
npm run build

# Verify design tokens are used
grep -r "var(--color-brand-primary)\|var(--color-brand-primary-400)\|var(--color-brand-secondary)" src/components/
```

### Final Checklist
- [ ] All hardcoded hex colors removed from landing pages
- [ ] All gradients use design system CSS variables
- [ ] All focus rings use consistent ui-focus-ring class
- [ ] No commented color references in codebase
- [ ] Build passes without errors
- [ ] Landing pages visually identical but using design tokens