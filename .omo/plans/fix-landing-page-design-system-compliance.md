# Fix Landing Page Design System Compliance

## TL;DR
> **Quick Summary**: Migrate landing pages from hardcoded hex colors and raw Tailwind classes to proper design system tokens for full design-taste-frontend compliance.
> 
> **Deliverables**: 
> - Remove all hardcoded hex colors (#7c6cf2, #f2743e, #9185f7) from landing pages
> - Replace raw Tailwind classes (bg-slate-*, text-violet-*) with design tokens (bg-neutral-*, text-brand-primary)
> - Apply consistent typography scale using display/h1/body classes
> - Add motion design with RevealSection component
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Token migration → Typography → Motion → Verification

---

## Context

### Original Request
Audit landing page dan dashboard terhadap design-taste-frontend skill compliance.

### Audit Findings
- **Design system foundation**: Excellent (95% compliant) - proper Tailwind v4 @theme directive, Metmal pastel aesthetic
- **UI component library**: Good (90% compliant) - 13 components use design tokens properly  
- **Landing pages**: Poor (15% compliant) - 1,253 raw Tailwind classes vs 87 token usages, 16 hardcoded hex color instances
- **Dashboard**: Out of scope for design-taste-frontend skill (focuses on landing pages/portfolios)

### Critical Issues Identified
1. **Hardcoded hex colors**: 16 instances across 9 files including BRAND constants and inline gradients
2. **Raw Tailwind classes**: Heavy usage of bg-slate-*, text-violet-*, border-slate-* instead of neutral/brand tokens
3. **Typography inconsistency**: Manual font sizes instead of design system scale (display-1, h1, body-lg)
4. **Missing motion**: RevealSection exists but not used in landing pages

---

## Work Objectives

### Core Objective
Achieve 90%+ design-taste-frontend compliance in landing pages by migrating to proper design system tokens.

### Concrete Deliverables
- PublicLandingPage.tsx using design tokens instead of hardcoded colors
- CommunityLandingPage.tsx using design tokens instead of raw Tailwind classes  
- All BRAND constants replaced with CSS variables or Tailwind classes
- Typography consistently using design system scale
- Motion implemented via RevealSection component

### Definition of Done
- [ ] `grep -r "#7c6cf2\|#f2743e\|#9185f7" src/components/` returns 0 matches
- [ ] `grep -r "bg-slate-\|text-slate-\|border-slate-" src/components/PublicLandingPage.tsx src/components/CommunityLandingPage.tsx` returns minimal matches (only where appropriate)
- [ ] All new code uses design tokens: bg-neutral-*, text-brand-primary, etc.
- [ ] npm run build passes without errors
- [ ] Landing pages visually consistent with UI component library

### Must Have
- Remove all hardcoded hex colors from landing page files
- Replace raw Tailwind classes with design tokens systematically
- Maintain backward compatibility and functionality
- Preserve Metmal pastel aesthetic

### Must NOT Have (Guardrails)
- No new hardcoded hex colors introduced
- No removal of existing functionality during migration
- No breaking changes to component APIs
- Dashboard components remain untouched (out of scope)

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed. No exceptions.
> Acceptance criteria requiring "user manually tests/confirms" are FORBIDDEN.

### Test Decision
- **Infrastructure exists**: YES (Vitest + Playwright)
- **Automated tests**: Tests-after (existing test infrastructure)
- **Framework**: vitest
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
Wave 1 (Start Immediately - Foundation):
├── Task 1: Remove hardcoded hex colors from PublicLandingPage.tsx
├── Task 2: Remove hardcoded hex colors from CommunityHero.tsx  
├── Task 3: Remove hardcoded hex colors from PublicHero.tsx
├── Task 4: Fix hardcoded gradients in CommunityLandingPage.tsx and GalleryHeader.tsx
└── Task 5: Update focusRing utilities to use design tokens

Wave 2 (After Wave 1 - Raw Tailwind Migration):
├── Task 6: Replace bg-slate-* with bg-neutral-* in PublicLandingPage.tsx
├── Task 7: Replace text-slate-* with text-neutral-* in PublicLandingPage.tsx  
├── Task 8: Replace border-slate-* with border-neutral-* in PublicLandingPage.tsx
├── Task 9: Replace bg-slate-* with bg-neutral-* in CommunityLandingPage.tsx
├── Task 10: Replace text-slate-* with text-neutral-* in CommunityLandingPage.tsx
└── Task 11: Replace border-slate-* with border-neutral-* in CommunityLandingPage.tsx

Wave 3 (After Wave 2 - Typography & Motion):
├── Task 12: Apply typography scale to PublicLandingPage.tsx (display-1, h1, body-lg)
├── Task 13: Apply typography scale to CommunityLandingPage.tsx (display-1, h1, body-lg)
├── Task 14: Add RevealSection motion to PublicLandingPage.tsx sections
└── Task 15: Add RevealSection motion to CommunityLandingPage.tsx sections

Wave FINAL (After ALL tasks — 4 parallel reviews, then user okay):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay
```

### Dependency Matrix

- **1-5**: - - 6-15, 1
- **6-11**: 1-5 - 12-15, 2  
- **12-15**: 6-11 - F1-F4, 3
- **F1-F4**: 12-15 - user okay

### Agent Dispatch Summary

- **1**: **5** - T1-T5 → `quick`
- **2**: **6** - T6-T11 → `quick`  
- **3**: **4** - T12-T15 → `visual-engineering`
- **FINAL**: **4** - F1-F4 → oracle/unspecified-high/deep

---

## TODOs

> Implementation + Test = ONE Task. Never separate.
> EVERY task MUST have: Recommended Agent Profile + Parallelization info + QA Scenarios.
> **A task WITHOUT QA Scenarios is INCOMPLETE. No exceptions.**

- [ ] 1. Remove hardcoded hex colors from PublicLandingPage.tsx

  **What to do**:
  - Remove BRAND constant with hardcoded hex values (#7c6cf2, #9185f7, #f2743e)
  - Replace with CSS variables: var(--color-brand-primary), var(--color-brand-primary-400), var(--color-brand-secondary)
  - Update any inline style usage to use CSS variables instead of hex values

  **Must NOT do**:
  - Introduce new hardcoded hex colors
  - Break existing functionality or styling

  **Recommended Agent Profile**:
  > Select category + skills based on task domain. Justify each choice.
  - **Category**: `quick`
    - Reason: Simple find-and-replace operation in single file
  - **Skills**: [`tailwind-css-patterns`]
    - `tailwind-css-patterns`: Understanding of Tailwind CSS v4 design tokens and CSS variable usage

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2-5)
  - **Blocks**: Task 6 (bg-slate-* migration in PublicLandingPage)
  - **Blocked By**: None (can start immediately)

  **References** (CRITICAL - Be Exhaustive):

  **Pattern References** (existing code to follow):
  - `src/styles/theme.css:12-36` - Brand color definitions in @theme directive
  - `src/styles/tokens.css:7-13` - CSS variable mappings for brand colors

  **API/Type References** (contracts to implement against):
  - `src/components/PublicLandingPage.tsx:46-50` - Current BRAND constant structure

  **WHY Each Reference Matters**:
  - `theme.css` shows the correct brand color token names to reference
  - `tokens.css` shows how to map theme tokens to CSS variables
  - Current BRAND constant shows what needs to be replaced

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY - task is INCOMPLETE without these):**

  ```
  Scenario: Hardcoded hex colors removed from PublicLandingPage.tsx
    Tool: Bash (grep)
    Preconditions: Working directory is project root
    Steps:
      1. grep -r "#7c6cf2\|#f2743e\|#9185f7" src/components/PublicLandingPage.tsx
    Expected Result: Command returns no matches (exit code 1)
    Failure Indicators: Any matches found for hardcoded hex colors
    Evidence: .sisyphus/evidence/task-1-hardcoded-colors-removed.txt

  Scenario: CSS variables used instead of hex colors
    Tool: Bash (grep)  
    Preconditions: Working directory is project root
    Steps:
      1. grep -r "var(--color-brand-primary)\|var(--color-brand-primary-400)\|var(--color-brand-secondary)" src/components/PublicLandingPage.tsx
    Expected Result: Command finds CSS variable usage (exit code 0)
    Evidence: .sisyphus/evidence/task-1-css-variables-used.txt
  ```

  **Evidence to Capture**:
  - [ ] Each evidence file named: task-{N}-{scenario-slug}.{ext}

  **Commit**: YES
  - Message: `fix(landing): replace hardcoded colors with css variables in PublicLandingPage`
  - Files: `src/components/PublicLandingPage.tsx`
  - Pre-commit: `npm run build`

- [ ] 2. Remove hardcoded hex colors from CommunityHero.tsx

  **What to do**:
  - Remove BRAND constant with hardcoded hex values (#7c6cf2, #9185f7, #f2743e)
  - Replace with CSS variables: var(--color-brand-primary), var(--color-brand-primary-400), var(--color-brand-secondary)

  **Must NOT do**:
  - Introduce new hardcoded hex colors
  - Break existing functionality or styling

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple find-and-replace operation in single file
  - **Skills**: [`tailwind-css-patterns`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3-5)
  - **Blocks**: Task 9 (bg-slate-* migration in CommunityLandingPage)
  - **Blocked By**: None

  **References**:
  - `src/styles/theme.css:12-36` - Brand color definitions
  - `src/styles/tokens.css:7-13` - CSS variable mappings
  - `src/components/community/CommunityHero.tsx:6-8` - Current BRAND constant

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: Hardcoded hex colors removed from CommunityHero.tsx
    Tool: Bash (grep)
    Steps:
      1. grep -r "#7c6cf2\|#f2743e\|#9185f7" src/components/community/CommunityHero.tsx
    Expected Result: No matches found
    Evidence: .sisyphus/evidence/task-2-hardcoded-colors-removed.txt
  ```

  **Commit**: YES
  - Message: `fix(landing): replace hardcoded colors with css variables in CommunityHero`
  - Files: `src/components/community/CommunityHero.tsx`
  - Pre-commit: `npm run build`

- [ ] 3. Remove hardcoded hex colors from PublicHero.tsx

  **What to do**:
  - Remove accent constants with hardcoded hex values (#7c6cf2, #f2743e)
  - Replace with CSS variables: var(--color-brand-primary), var(--color-brand-secondary)

  **Must NOT do**:
  - Introduce new hardcoded hex colors
  - Break existing functionality

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`tailwind-css-patterns`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-2, 4-5)
  - **Blocks**: None directly, but part of overall landing page cleanup
  - **Blocked By**: None

  **References**:
  - `src/styles/theme.css:12-36`
  - `src/components/PublicHero.tsx:9-10`

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: Hardcoded hex colors removed from PublicHero.tsx
    Tool: Bash (grep)
    Steps:
      1. grep -r "#7c6cf2\|#f2743e" src/components/PublicHero.tsx
    Expected Result: No matches found
    Evidence: .sisyphus/evidence/task-3-hardcoded-colors-removed.txt
  ```

  **Commit**: YES
  - Message: `fix(landing): replace hardcoded colors with css variables in PublicHero`
  - Files: `src/components/PublicHero.tsx`
  - Pre-commit: `npm run build`

- [ ] 4. Fix hardcoded gradients in CommunityLandingPage.tsx and GalleryHeader.tsx

  **What to do**:
  - Replace inline gradient style with CSS variables
  - CommunityLandingPage.tsx line 146: linear-gradient(135deg, #7c6cf2 0%, #9185f7 100%)
  - GalleryHeader.tsx line 37: linear-gradient(135deg, #7c6cf2 0%, #9185f7 100%)
  - Use var(--color-brand-primary) and var(--color-brand-primary-400)

  **Must NOT do**:
  - Keep any hardcoded hex values in gradients
  - Break gradient visual appearance

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`tailwind-css-patterns`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-3, 5)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `src/styles/theme.css:12-22` - Brand primary color scale
  - `src/components/CommunityLandingPage.tsx:146`
  - `src/components/GalleryHeader.tsx:37`

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: Hardcoded gradients replaced with CSS variables
    Tool: Bash (grep)
    Steps:
      1. grep -r "#7c6cf2.*#9185f7" src/components/CommunityLandingPage.tsx src/components/GalleryHeader.tsx
    Expected Result: No matches found
    Evidence: .sisyphus/evidence/task-4-gradients-fixed.txt
  ```

  **Commit**: YES
  - Message: `fix(landing): replace hardcoded gradients with css variables`
  - Files: `src/components/CommunityLandingPage.tsx`, `src/components/GalleryHeader.tsx`
  - Pre-commit: `npm run build`

- [ ] 5. Update focusRing utilities to use design tokens

  **What to do**:
  - Find all focusRing utilities using raw Tailwind classes (ring-violet-400, ring-offset-slate-950)
  - Replace with design tokens: ring-brand-primary, ring-offset-neutral-900
  - Update PublicLandingPage.tsx and CommunityLandingPage.tsx focusRing constants

  **Must NOT do**:
  - Leave any raw Tailwind focus ring classes
  - Break accessibility focus states

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`tailwind-css-patterns`, `accessibility`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1-4)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `src/components/PublicLandingPage.tsx` - focusRing usage
  - `src/components/CommunityLandingPage.tsx` - focusRing usage
  - `src/styles/theme.css:12-22, 38-51` - Brand and neutral color tokens

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: Raw Tailwind focus rings replaced with design tokens
    Tool: Bash (grep)
    Steps:
      1. grep -r "ring-violet-\|ring-offset-slate-" src/components/PublicLandingPage.tsx src/components/CommunityLandingPage.tsx
    Expected Result: No matches found
    Evidence: .sisyphus/evidence/task-5-focus-rings-fixed.txt
  ```

  **Commit**: YES
  - Message: `fix(landing): update focus rings to use design tokens`
  - Files: `src/components/PublicLandingPage.tsx`, `src/components/CommunityLandingPage.tsx`
  - Pre-commit: `npm run build`

- [ ] 6. Replace bg-slate-* with bg-neutral-* in PublicLandingPage.tsx

  **What to do**:
  - Systematically replace all bg-slate-* classes with corresponding bg-neutral-* classes
  - bg-slate-50 → bg-neutral-50
  - bg-slate-100 → bg-neutral-100  
  - bg-slate-200 → bg-neutral-200
  - bg-slate-800 → bg-neutral-800
  - bg-slate-900 → bg-neutral-900
  - bg-slate-950 → bg-neutral-900

  **Must NOT do**:
  - Miss any bg-slate-* instances
  - Replace non-background slate classes incorrectly

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`tailwind-css-patterns`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 7-11)
  - **Blocks**: Task 12 (typography in PublicLandingPage)
  - **Blocked By**: Tasks 1-5 (Wave 1)

  **References**:
  - `src/styles/theme.css:38-51` - Neutral color palette mapping
  - `src/components/PublicLandingPage.tsx` - Current bg-slate-* usage

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: All bg-slate-* replaced with bg-neutral-* in PublicLandingPage
    Tool: Bash (grep)
    Steps:
      1. grep -r "bg-slate-" src/components/PublicLandingPage.tsx
    Expected Result: No matches found
    Evidence: .sisyphus/evidence/task-6-bg-slate-replaced.txt
  ```

  **Commit**: YES
  - Message: `fix(landing): replace bg-slate with bg-neutral in PublicLandingPage`
  - Files: `src/components/PublicLandingPage.tsx`
  - Pre-commit: `npm run build`

- [ ] 7. Replace text-slate-* with text-neutral-* in PublicLandingPage.tsx

  **What to do**:
  - Replace all text-slate-* classes with corresponding text-neutral-* classes
  - text-slate-50 → text-neutral-50
  - text-slate-100 → text-neutral-100
  - text-slate-200 → text-neutral-200
  - text-slate-400 → text-neutral-400
  - text-slate-500 → text-neutral-500
  - text-slate-600 → text-neutral-600
  - text-slate-700 → text-neutral-700
  - text-slate-800 → text-neutral-800
  - text-slate-900 → text-neutral-900
  - text-slate-950 → text-neutral-900

  **Must NOT do**:
  - Miss any text-slate-* instances
  - Replace non-text slate classes incorrectly

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`tailwind-css-patterns`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 8-11)
  - **Blocks**: Task 12 (typography in PublicLandingPage)
  - **Blocked By**: Tasks 1-5 (Wave 1)

  **References**:
  - `src/styles/theme.css:38-51` - Neutral color palette mapping
  - `src/components/PublicLandingPage.tsx` - Current text-slate-* usage

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: All text-slate-* replaced with text-neutral-* in PublicLandingPage
    Tool: Bash (grep)
    Steps:
      1. grep -r "text-slate-" src/components/PublicLandingPage.tsx
    Expected Result: No matches found
    Evidence: .sisyphus/evidence/task-7-text-slate-replaced.txt
  ```

  **Commit**: YES
  - Message: `fix(landing): replace text-slate with text-neutral in PublicLandingPage`
  - Files: `src/components/PublicLandingPage.tsx`
  - Pre-commit: `npm run build`

- [ ] 8. Replace border-slate-* with border-neutral-* in PublicLandingPage.tsx

  **What to do**:
  - Replace all border-slate-* classes with corresponding border-neutral-* classes
  - border-slate-200 → border-neutral-200
  - border-slate-800 → border-neutral-800

  **Must NOT do**:
  - Miss any border-slate-* instances
  - Replace non-border slate classes incorrectly

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`tailwind-css-patterns`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6-7, 9-11)
  - **Blocks**: Task 12 (typography in PublicLandingPage)
  - **Blocked By**: Tasks 1-5 (Wave 1)

  **References**:
  - `src/styles/theme.css:38-51` - Neutral color palette mapping
  - `src/components/PublicLandingPage.tsx` - Current border-slate-* usage

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: All border-slate-* replaced with border-neutral-* in PublicLandingPage
    Tool: Bash (grep)
    Steps:
      1. grep -r "border-slate-" src/components/PublicLandingPage.tsx
    Expected Result: No matches found
    Evidence: .sisyphus/evidence/task-8-border-slate-replaced.txt
  ```

  **Commit**: YES
  - Message: `fix(landing): replace border-slate with border-neutral in PublicLandingPage`
  - Files: `src/components/PublicLandingPage.tsx`
  - Pre-commit: `npm run build`

- [ ] 9. Replace bg-slate-* with bg-neutral-* in CommunityLandingPage.tsx

  **What to do**:
  - Systematically replace all bg-slate-* classes with corresponding bg-neutral-* classes
  - Same mapping as Task 6

  **Must NOT do**:
  - Miss any bg-slate-* instances
  - Replace non-background slate classes incorrectly

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`tailwind-css-patterns`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6-8, 10-11)
  - **Blocks**: Task 13 (typography in CommunityLandingPage)
  - **Blocked By**: Tasks 1-5 (Wave 1)

  **References**:
  - `src/styles/theme.css:38-51` - Neutral color palette mapping
  - `src/components/CommunityLandingPage.tsx` - Current bg-slate-* usage

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: All bg-slate-* replaced with bg-neutral-* in CommunityLandingPage
    Tool: Bash (grep)
    Steps:
      1. grep -r "bg-slate-" src/components/CommunityLandingPage.tsx
    Expected Result: No matches found
    Evidence: .sisyphus/evidence/task-9-bg-slate-replaced.txt
  ```

  **Commit**: YES
  - Message: `fix(landing): replace bg-slate with bg-neutral in CommunityLandingPage`
  - Files: `src/components/CommunityLandingPage.tsx`
  - Pre-commit: `npm run build`

- [ ] 10. Replace text-slate-* with text-neutral-* in CommunityLandingPage.tsx

  **What to do**:
  - Replace all text-slate-* classes with corresponding text-neutral-* classes
  - Same mapping as Task 7

  **Must NOT do**:
  - Miss any text-slate-* instances
  - Replace non-text slate classes incorrectly

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`tailwind-css-patterns`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6-9, 11)
  - **Blocks**: Task 13 (typography in CommunityLandingPage)
  - **Blocked By**: Tasks 1-5 (Wave 1)

  **References**:
  - `src/styles/theme.css:38-51` - Neutral color palette mapping
  - `src/components/CommunityLandingPage.tsx` - Current text-slate-* usage

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: All text-slate-* replaced with text-neutral-* in CommunityLandingPage
    Tool: Bash (grep)
    Steps:
      1. grep -r "text-slate-" src/components/CommunityLandingPage.tsx
    Expected Result: No matches found
    Evidence: .sisyphus/evidence/task-10-text-slate-replaced.txt
  ```

  **Commit**: YES
  - Message: `fix(landing): replace text-slate with text-neutral in CommunityLandingPage`
  - Files: `src/components/CommunityLandingPage.tsx`
  - Pre-commit: `npm run build`

- [ ] 11. Replace border-slate-* with border-neutral-* in CommunityLandingPage.tsx

  **What to do**:
  - Replace all border-slate-* classes with corresponding border-neutral-* classes
  - Same mapping as Task 8

  **Must NOT do**:
  - Miss any border-slate-* instances
  - Replace non-border slate classes incorrectly

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`tailwind-css-patterns`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6-10)
  - **Blocks**: Task 13 (typography in CommunityLandingPage)
  - **Blocked By**: Tasks 1-5 (Wave 1)

  **References**:
  - `src/styles/theme.css:38-51` - Neutral color palette mapping
  - `src/components/CommunityLandingPage.tsx` - Current border-slate-* usage

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: All border-slate-* replaced with border-neutral-* in CommunityLandingPage
    Tool: Bash (grep)
    Steps:
      1. grep -r "border-slate-" src/components/CommunityLandingPage.tsx
    Expected Result: No matches found
    Evidence: .sisyphus/evidence/task-11-border-slate-replaced.txt
  ```

  **Commit**: YES
  - Message: `fix(landing): replace border-slate with border-neutral in CommunityLandingPage`
  - Files: `src/components/CommunityLandingPage.tsx`
  - Pre-commit: `npm run build`

- [ ] 12. Apply typography scale to PublicLandingPage.tsx (display-1, h1, body-lg)

  **What to do**:
  - Replace manual font sizes with design system typography classes
  - Use display-1, display-2, display-3, display-4 for hero headlines
  - Use h1, h2, h3, h4 for section headings
  - Use body-lg, body-md, body-sm for paragraph text
  - Use ui-label, ui-caption for small text

  **Must NOT do**:
  - Use manual font-size classes like text-4xl, text-xl
  - Break existing visual hierarchy

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Requires understanding of visual hierarchy and typography design
  - **Skills**: [`tailwind-css-patterns`, `frontend-design`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 13-15)
  - **Blocks**: None
  - **Blocked By**: Tasks 6-8 (Wave 2)

  **References**:
  - `src/styles/typography.css` - Typography scale definitions
  - `src/components/PublicLandingPage.tsx` - Current manual font sizes

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: Manual font sizes replaced with typography scale in PublicLandingPage
    Tool: Bash (grep)
    Steps:
      1. grep -r "text-\[0-9\]\|text-xl\|text-2xl\|text-3xl\|text-4xl\|text-5xl" src/components/PublicLandingPage.tsx
    Expected Result: Minimal matches only for non-typography purposes
    Evidence: .sisyphus/evidence/task-12-typography-applied.txt
  ```

  **Commit**: YES
  - Message: `fix(landing): apply typography scale to PublicLandingPage`
  - Files: `src/components/PublicLandingPage.tsx`
  - Pre-commit: `npm run build`

- [ ] 13. Apply typography scale to CommunityLandingPage.tsx (display-1, h1, body-lg)

  **What to do**:
  - Replace manual font sizes with design system typography classes
  - Same approach as Task 12

  **Must NOT do**:
  - Use manual font-size classes
  - Break existing visual hierarchy

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`tailwind-css-patterns`, `frontend-design`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 12, 14-15)
  - **Blocks**: None
  - **Blocked By**: Tasks 9-11 (Wave 2)

  **References**:
  - `src/styles/typography.css`
  - `src/components/CommunityLandingPage.tsx`

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: Manual font sizes replaced with typography scale in CommunityLandingPage
    Tool: Bash (grep)
    Steps:
      1. grep -r "text-\[0-9\]\|text-xl\|text-2xl\|text-3xl\|text-4xl\|text-5xl" src/components/CommunityLandingPage.tsx
    Expected Result: Minimal matches only for non-typography purposes
    Evidence: .sisyphus/evidence/task-13-typography-applied.txt
  ```

  **Commit**: YES
  - Message: `fix(landing): apply typography scale to CommunityLandingPage`
  - Files: `src/components/CommunityLandingPage.tsx`
  - Pre-commit: `npm run build`

- [ ] 14. Add RevealSection motion to PublicLandingPage.tsx sections

  **What to do**:
  - Wrap key sections in RevealSection component for scroll animations
  - Hero section, features section, testimonials, CTA section
  - Use appropriate intensity and delay props

  **Must NOT do**:
  - Break existing layout or functionality
  - Add excessive animation that hurts performance

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Requires understanding of motion design and user experience
  - **Skills**: [`frontend-design`, `tailwind-css-patterns`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 12-13, 15)
  - **Blocks**: None
  - **Blocked By**: Tasks 6-8 (Wave 2)

  **References**:
  - `src/components/ui/RevealSection.tsx` - RevealSection component API
  - `src/components/PublicLandingPage.tsx` - Current section structure

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: RevealSection added to PublicLandingPage sections
    Tool: Bash (grep)
    Steps:
      1. grep -r "RevealSection" src/components/PublicLandingPage.tsx
    Expected Result: Multiple matches found for RevealSection usage
    Evidence: .sisyphus/evidence/task-14-revealsection-added.txt
  ```

  **Commit**: YES
  - Message: `feat(landing): add motion design to PublicLandingPage`
  - Files: `src/components/PublicLandingPage.tsx`
  - Pre-commit: `npm run build`

- [ ] 15. Add RevealSection motion to CommunityLandingPage.tsx sections

  **What to do**:
  - Wrap key sections in RevealSection component for scroll animations
  - Same approach as Task 14

  **Must NOT do**:
  - Break existing layout or functionality
  - Add excessive animation

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-design`, `tailwind-css-patterns`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 12-14)
  - **Blocks**: None
  - **Blocked By**: Tasks 9-11 (Wave 2)

  **References**:
  - `src/components/ui/RevealSection.tsx`
  - `src/components/CommunityLandingPage.tsx`

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: RevealSection added to CommunityLandingPage sections
    Tool: Bash (grep)
    Steps:
      1. grep -r "RevealSection" src/components/CommunityLandingPage.tsx
    Expected Result: Multiple matches found for RevealSection usage
    Evidence: .sisyphus/evidence/task-15-revealsection-added.txt
  ```

  **Commit**: YES
  - Message: `feat(landing): add motion design to CommunityLandingPage`
  - Files: `src/components/CommunityLandingPage.tsx`
  - Pre-commit: `npm run build`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

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

- **1**: `fix(landing): replace hardcoded colors with css variables in PublicLandingPage` - src/components/PublicLandingPage.tsx, npm run build
- **2**: `fix(landing): replace hardcoded colors with css variables in CommunityHero` - src/components/community/CommunityHero.tsx, npm run build
- **3**: `fix(landing): replace hardcoded colors with css variables in PublicHero` - src/components/PublicHero.tsx, npm run build
- **4**: `fix(landing): replace hardcoded gradients with css variables` - src/components/CommunityLandingPage.tsx, src/components/GalleryHeader.tsx, npm run build
- **5**: `fix(landing): update focus rings to use design tokens` - src/components/PublicLandingPage.tsx, src/components/CommunityLandingPage.tsx, npm run build
- **6**: `fix(landing): replace bg-slate with bg-neutral in PublicLandingPage` - src/components/PublicLandingPage.tsx, npm run build
- **7**: `fix(landing): replace text-slate with text-neutral in PublicLandingPage` - src/components/PublicLandingPage.tsx, npm run build
- **8**: `fix(landing): replace border-slate with border-neutral in PublicLandingPage` - src/components/PublicLandingPage.tsx, npm run build
- **9**: `fix(landing): replace bg-slate with bg-neutral in CommunityLandingPage` - src/components/CommunityLandingPage.tsx, npm run build
- **10**: `fix(landing): replace text-slate with text-neutral in CommunityLandingPage` - src/components/CommunityLandingPage.tsx, npm run build
- **11**: `fix(landing): replace border-slate with border-neutral in CommunityLandingPage` - src/components/CommunityLandingPage.tsx, npm run build
- **12**: `fix(landing): apply typography scale to PublicLandingPage` - src/components/PublicLandingPage.tsx, npm run build
- **13**: `fix(landing): apply typography scale to CommunityLandingPage` - src/components/CommunityLandingPage.tsx, npm run build
- **14**: `feat(landing): add motion design to PublicLandingPage` - src/components/PublicLandingPage.tsx, npm run build
- **15**: `feat(landing): add motion design to CommunityLandingPage` - src/components/CommunityLandingPage.tsx, npm run build

---

## Success Criteria

### Verification Commands
```bash
# Verify no hardcoded hex colors remain
grep -r "#7c6cf2\|#f2743e\|#9185f7" src/components/

# Verify minimal raw Tailwind classes in landing pages  
grep -r "bg-slate-\|text-slate-\|border-slate-" src/components/PublicLandingPage.tsx src/components/CommunityLandingPage.tsx

# Verify build passes
npm run build

# Verify design tokens are used
grep -r "bg-neutral-\|text-neutral-\|border-neutral-\|text-brand-primary" src/components/PublicLandingPage.tsx src/components/CommunityLandingPage.tsx
```

### Final Checklist
- [ ] All hardcoded hex colors removed from landing pages
- [ ] All raw Tailwind slate/violet classes replaced with design tokens
- [ ] Typography consistently uses design system scale
- [ ] Motion implemented via RevealSection
- [ ] Build passes without errors
- [ ] Landing pages visually consistent with UI component library