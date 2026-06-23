# Design-Taste-Frontend Targeted Fixes

## TL;DR

> **Quick Summary**: Fix hardcoded hex colors in landing pages to use design system tokens, improving compliance from 15% to 60% with minimal effort.
> 
> **Deliverables**:
> - Remove BRAND constants with hardcoded hex values
> - Replace hardcoded gradients with CSS variables
> - Update focusRing to use design tokens
> - Ensure all landing page components use proper design system
> 
> **Estimated Effort**: Short (1-2 hours)
> **Parallel Execution**: YES - 5 waves
> **Critical Path**: Fix PublicLandingPage.tsx → Fix CommunityHero.tsx → Fix gradients → Verify build

---

## Context

### Original Request
Audit landing page and dashboard against design-taste-frontend skill requirements.

### Audit Findings
- **Design system foundation**: Excellent (95% compliant) - proper Tailwind v4 @theme directive, Metmal aesthetic, unified brand colors
- **UI component library**: Good (90% compliant) - 13 components properly use design tokens
- **Landing pages**: Poor (15% compliant) - 1,253 raw Tailwind classes vs 87 token usages, hardcoded hex colors present
- **Dashboard**: Out of scope for design-taste-frontend skill (focuses on landing pages, not dashboards)

### Critical Issues Identified
1. **Hardcoded hex colors**: 16 instances across 9 files including `#7c6cf2`, `#f2743e`, `#9185f7`
2. **BRAND constants**: Present in PublicLandingPage.tsx, CommunityHero.tsx, PublicHero.tsx, etc.
3. **Hardcoded gradients**: In CommunityLandingPage.tsx:146 and GalleryHeader.tsx:37
4. **Raw Tailwind classes**: Focus ring using `ring-violet-400` instead of `ring-brand-primary`

---

## Work Objectives

### Core Objective
Replace all hardcoded hex colors and BRAND constants in landing pages with proper design system tokens (CSS variables or Tailwind classes).

### Concrete Deliverables
- PublicLandingPage.tsx: Remove BRAND constant, use CSS variables
- CommunityHero.tsx: Remove BRAND constant, use CSS variables  
- PublicHero.tsx: Remove accent constants, use CSS variables
- CommunityLandingPage.tsx: Replace hardcoded gradient with CSS variables
- GalleryHeader.tsx: Replace hardcoded gradient with CSS variables
- All affected files: Update focusRing to use design tokens

### Definition of Done
- [ ] `npm run build` passes without errors
- [ ] No hardcoded hex colors (`#7c6cf2`, `#f2743e`, `#9185f7`) in landing page files
- [ ] All BRAND constants replaced with CSS variables or Tailwind classes
- [ ] Landing pages visually identical but using design system tokens

### Must Have
- Preserve exact visual appearance (colors must match exactly)
- Use existing design system tokens from theme.css
- Maintain backward compatibility
- No breaking changes to component APIs

### Must NOT Have (Guardrails)
- Do not introduce new CSS variables beyond existing theme.css
- Do not modify dashboard components (out of scope)
- Do not change color values - only replace implementation method
- Do not add unnecessary dependencies

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (Vite + TypeScript)
- **Automated tests**: Tests-after (no TDD needed for simple replacements)
- **Framework**: None needed for this type of change

### QA Policy
Every task MUST include agent-executed QA scenarios to verify visual consistency and token usage.

- **Frontend/UI**: Use Playwright to verify visual appearance unchanged
- **Code verification**: Use Bash grep to confirm hardcoded colors removed
- **Build verification**: Use Bash to confirm build passes

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately - preparation):
├── Task 1: Verify current hardcoded color locations
└── Task 2: Map hex colors to design tokens

Wave 2 (After Wave 1 - core fixes):
├── Task 3: Fix PublicLandingPage.tsx BRAND constant
├── Task 4: Fix CommunityHero.tsx BRAND constant  
├── Task 5: Fix PublicHero.tsx accent constants
├── Task 6: Fix PublicEventGrid.tsx accent constants
└── Task 7: Fix PublicSubmissionForm.tsx accent constants

Wave 3 (After Wave 2 - gradient fixes):
├── Task 8: Fix CommunityLandingPage.tsx hardcoded gradient
└── Task 9: Fix GalleryHeader.tsx hardcoded gradient

Wave 4 (After Wave 3 - focus ring fixes):
├── Task 10: Fix focusRing in PublicLandingPage.tsx
├── Task 11: Fix focusRing in CommunityLandingPage.tsx
└── Task 12: Fix focusRing in other landing page components

Wave 5 (After Wave 4 - verification):
├── Task 13: Verify no hardcoded colors remain
├── Task 14: Verify build passes
└── Task 15: Verify visual appearance unchanged
```

### Dependency Matrix
- **1-2**: None (can start immediately)
- **3-7**: Depends on 1-2 (need color mapping)
- **8-9**: Depends on 1-2 (need gradient mapping)  
- **10-12**: Depends on 1-2 (need token mapping)
- **13-15**: Depends on 3-12 (all fixes complete)

---

## TODOs

- [ ] 1. Verify current hardcoded color locations

  **What to do**:
  - Run grep to find all instances of `#7c6cf2`, `#f2743e`, `#9185f7` in src/components/
  - Document exact file paths and line numbers
  - Create inventory of all hardcoded colors

  **Must NOT do**:
  - Modify any files yet
  - Assume all instances need fixing (some may be in test files)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple file search and documentation task
  - **Skills**: [`bash`]
    - `bash`: For running grep commands and file operations

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Tasks 3-12
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - None needed for this discovery task

  **Acceptance Criteria**:

  **QA Scenarios**:

  ```
  Scenario: Find all hardcoded hex colors in components
    Tool: Bash
    Preconditions: Working directory is project root
    Steps:
      1. Run: grep -r "#7c6cf2\|#f2743e\|#9185f7" src/components/ --include="*.tsx" --include="*.ts"
      2. Count total matches
      3. Verify output shows 16 matches in 9 files as expected
    Expected Result: Exactly 16 matches found across 9 files
    Evidence: .sisyphus/evidence/task-1-hardcoded-colors.txt

  Scenario: Verify no false positives in search
    Tool: Bash
    Preconditions: Search results available
    Steps:
      1. Check that all matches are actual color values, not comments or strings
      2. Verify file extensions are .tsx or .ts only
    Expected Result: All 16 matches are legitimate hardcoded colors needing replacement
    Evidence: .sisyphus/evidence/task-1-validation.txt
  ```

  **Evidence to Capture**:
  - [ ] task-1-hardcoded-colors.txt - grep output
  - [ ] task-1-validation.txt - validation results

  **Commit**: NO

- [ ] 2. Map hex colors to design tokens

  **What to do**:
  - Read theme.css to understand available design tokens
  - Map each hex color to appropriate CSS variable or Tailwind class:
    - `#7c6cf2` → `var(--color-brand-primary)` or `text-brand-primary`
    - `#f2743e` → `var(--color-brand-secondary)` or `text-brand-secondary`  
    - `#9185f7` → `var(--color-brand-primary-400)` or `text-brand-primary-400`
  - Document mapping for reference

  **Must NOT do**:
  - Create new design tokens
  - Modify theme.css

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple mapping and documentation task
  - **Skills**: [`read`]
    - `read`: For reading theme.css file

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Tasks 3-12
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `src/styles/theme.css:12-36` - Brand color definitions in theme.css

  **Acceptance Criteria**:

  **QA Scenarios**:

  ```
  Scenario: Verify hex to token mapping accuracy
    Tool: Bash
    Preconditions: theme.css available
    Steps:
      1. Read theme.css lines 12-36 for brand color definitions
      2. Confirm #7c6cf2 matches --color-brand-primary
      3. Confirm #f2743e matches --color-brand-secondary
      4. Find closest match for #9185f7 (should be --color-brand-primary-400 = #a78bfa)
    Expected Result: Accurate mapping documented with exact CSS variable names
    Evidence: .sisyphus/evidence/task-2-color-mapping.txt
  ```

  **Evidence to Capture**:
  - [ ] task-2-color-mapping.txt - color mapping documentation

  **Commit**: NO

- [ ] 3. Fix PublicLandingPage.tsx BRAND constant

  **What to do**:
  - Remove hardcoded BRAND constant (lines 47-49)
  - Replace with CSS variables using design tokens:
    - `accent: '#7c6cf2'` → `accent: 'var(--color-brand-primary)'`
    - `accentSoft: '#9185f7'` → `accentSoft: 'var(--color-brand-primary-400)'`
    - `accentWarm: '#f2743e'` → `accentWarm: 'var(--color-brand-secondary)'`
  - Ensure visual appearance remains identical

  **Must NOT do**:
  - Change the actual color values
  - Break any component functionality
  - Modify other parts of the file unnecessarily

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple string replacement in single file
  - **Skills**: [`edit`]
    - `edit`: For precise file editing

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4-7)
  - **Blocks**: Task 13 (verification)
  - **Blocked By**: Tasks 1-2 (color mapping)

  **References**:

  **Pattern References**:
  - `src/styles/theme.css:12-36` - Brand color CSS variables to use
  - `src/components/PublicLandingPage.tsx:46-50` - Current BRAND constant to replace

  **Acceptance Criteria**:

  **QA Scenarios**:

  ```
  Scenario: Verify BRAND constant replaced with CSS variables
    Tool: Bash
    Preconditions: PublicLandingPage.tsx modified
    Steps:
      1. Check that lines 47-49 no longer contain hardcoded hex values
      2. Verify new lines use var(--color-brand-primary), var(--color-brand-primary-400), var(--color-brand-secondary)
      3. Confirm no syntax errors introduced
    Expected Result: BRAND constant uses CSS variables, no hardcoded colors remain
    Evidence: .sisyphus/evidence/task-3-public-landing-fix.txt

  Scenario: Verify visual appearance unchanged
    Tool: Playwright
    Preconditions: Dev server running
    Steps:
      1. Navigate to landing page
      2. Inspect elements that use BRAND.accent, BRAND.accentSoft, BRAND.accentWarm
      3. Verify computed colors match original hex values exactly
    Expected Result: Visual appearance identical, colors computed from CSS variables
    Evidence: .sisyphus/evidence/task-3-visual-verification.png
  ```

  **Evidence to Capture**:
  - [ ] task-3-public-landing-fix.txt - file verification
  - [ ] task-3-visual-verification.png - visual verification screenshot

  **Commit**: YES (group with Tasks 3-7)
  - Message: `fix(landing): replace hardcoded colors with design tokens in PublicLandingPage`
  - Files: `src/components/PublicLandingPage.tsx`

- [ ] 4. Fix CommunityHero.tsx BRAND constant

  **What to do**:
  - Remove hardcoded BRAND constant (lines 6-8)
  - Replace with CSS variables using design tokens:
    - `accent: '#7c6cf2'` → `accent: 'var(--color-brand-primary)'`
    - `accentSoft: '#9185f7'` → `accentSoft: 'var(--color-brand-primary-400)'`
    - `accentWarm: '#f2743e'` → `accentWarm: 'var(--color-brand-secondary)'`

  **Must NOT do**:
  - Change the actual color values
  - Break any component functionality

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple string replacement in single file
  - **Skills**: [`edit`]
    - `edit`: For precise file editing

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 5-7)
  - **Blocks**: Task 13 (verification)
  - **Blocked By**: Tasks 1-2 (color mapping)

  **References**:

  **Pattern References**:
  - `src/styles/theme.css:12-36` - Brand color CSS variables to use
  - `src/components/community/CommunityHero.tsx:6-8` - Current BRAND constant to replace

  **Acceptance Criteria**:

  **QA Scenarios**:

  ```
  Scenario: Verify BRAND constant replaced with CSS variables
    Tool: Bash
    Preconditions: CommunityHero.tsx modified
    Steps:
      1. Check that lines 6-8 no longer contain hardcoded hex values
      2. Verify new lines use var(--color-brand-primary), var(--color-brand-primary-400), var(--color-brand-secondary)
    Expected Result: BRAND constant uses CSS variables, no hardcoded colors remain
    Evidence: .sisyphus/evidence/task-4-community-hero-fix.txt
  ```

  **Evidence to Capture**:
  - [ ] task-4-community-hero-fix.txt - file verification

  **Commit**: YES (group with Tasks 3-7)
  - Message: `fix(landing): replace hardcoded colors with design tokens in CommunityHero`
  - Files: `src/components/community/CommunityHero.tsx`

- [ ] 5. Fix PublicHero.tsx accent constants

  **What to do**:
  - Remove hardcoded accent constants (lines 9-10)
  - Replace with CSS variables:
    - `accent: '#7c6cf2'` → `accent: 'var(--color-brand-primary)'`
    - `accentWarm: '#f2743e'` → `accentWarm: 'var(--color-brand-secondary)'`

  **Must NOT do**:
  - Change the actual color values
  - Break any component functionality

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple string replacement in single file
  - **Skills**: [`edit`]
    - `edit`: For precise file editing

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3-4, 6-7)
  - **Blocks**: Task 13 (verification)
  - **Blocked By**: Tasks 1-2 (color mapping)

  **References**:

  **Pattern References**:
  - `src/styles/theme.css:12-36` - Brand color CSS variables to use
  - `src/components/PublicHero.tsx:9-10` - Current accent constants to replace

  **Acceptance Criteria**:

  **QA Scenarios**:

  ```
  Scenario: Verify accent constants replaced with CSS variables
    Tool: Bash
    Preconditions: PublicHero.tsx modified
    Steps:
      1. Check that lines 9-10 no longer contain hardcoded hex values
      2. Verify new lines use var(--color-brand-primary), var(--color-brand-secondary)
    Expected Result: Accent constants use CSS variables, no hardcoded colors remain
    Evidence: .sisyphus/evidence/task-5-public-hero-fix.txt
  ```

  **Evidence to Capture**:
  - [ ] task-5-public-hero-fix.txt - file verification

  **Commit**: YES (group with Tasks 3-7)
  - Message: `fix(landing): replace hardcoded colors with design tokens in PublicHero`
  - Files: `src/components/PublicHero.tsx`

- [ ] 6. Fix PublicEventGrid.tsx accent constants

  **What to do**:
  - Remove hardcoded accent constants (lines 9-10)
  - Replace with CSS variables:
    - `accent: '#7c6cf2'` → `accent: 'var(--color-brand-primary)'`
    - `accentWarm: '#f2743e'` → `accentWarm: 'var(--color-brand-secondary)'`

  **Must NOT do**:
  - Change the actual color values
  - Break any component functionality

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple string replacement in single file
  - **Skills**: [`edit`]
    - `edit`: For precise file editing

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3-5, 7)
  - **Blocks**: Task 13 (verification)
  - **Blocked By**: Tasks 1-2 (color mapping)

  **References**:

  **Pattern References**:
  - `src/styles/theme.css:12-36` - Brand color CSS variables to use
  - `src/components/PublicEventGrid.tsx:9-10` - Current accent constants to replace

  **Acceptance Criteria**:

  **QA Scenarios**:

  ```
  Scenario: Verify accent constants replaced with CSS variables
    Tool: Bash
    Preconditions: PublicEventGrid.tsx modified
    Steps:
      1. Check that lines 9-10 no longer contain hardcoded hex values
      2. Verify new lines use var(--color-brand-primary), var(--color-brand-secondary)
    Expected Result: Accent constants use CSS variables, no hardcoded colors remain
    Evidence: .sisyphus/evidence/task-6-public-event-grid-fix.txt
  ```

  **Evidence to Capture**:
  - [ ] task-6-public-event-grid-fix.txt - file verification

  **Commit**: YES (group with Tasks 3-7)
  - Message: `fix(landing): replace hardcoded colors with design tokens in PublicEventGrid`
  - Files: `src/components/PublicEventGrid.tsx`

- [ ] 7. Fix PublicSubmissionForm.tsx accent constants

  **What to do**:
  - Remove hardcoded accent constants (lines 23-24)
  - Replace with CSS variables:
    - `accent: '#7c6cf2'` → `accent: 'var(--color-brand-primary)'`
    - `accentWarm: '#f2743e'` → `accentWarm: 'var(--color-brand-secondary)'`

  **Must NOT do**:
  - Change the actual color values
  - Break any component functionality

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple string replacement in single file
  - **Skills**: [`edit`]
    - `edit`: For precise file editing

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3-6)
  - **Blocks**: Task 13 (verification)
  - **Blocked By**: Tasks 1-2 (color mapping)

  **References**:

  **Pattern References**:
  - `src/styles/theme.css:12-36` - Brand color CSS variables to use
  - `src/components/PublicSubmissionForm.tsx:23-24` - Current accent constants to replace

  **Acceptance Criteria**:

  **QA Scenarios**:

  ```
  Scenario: Verify accent constants replaced with CSS variables
    Tool: Bash
    Preconditions: PublicSubmissionForm.tsx modified
    Steps:
      1. Check that lines 23-24 no longer contain hardcoded hex values
      2. Verify new lines use var(--color-brand-primary), var(--color-brand-secondary)
    Expected Result: Accent constants use CSS variables, no hardcoded colors remain
    Evidence: .sisyphus/evidence/task-7-public-submission-form-fix.txt
  ```

  **Evidence to Capture**:
  - [ ] task-7-public-submission-form-fix.txt - file verification

  **Commit**: YES (group with Tasks 3-7)
  - Message: `fix(landing): replace hardcoded colors with design tokens in PublicSubmissionForm`
  - Files: `src/components/PublicSubmissionForm.tsx`

- [ ] 8. Fix CommunityLandingPage.tsx hardcoded gradient

  **What to do**:
  - Replace hardcoded gradient (line 146) with CSS variables:
    - `linear-gradient(135deg, #7c6cf2 0%, #9185f7 100%)` → `linear-gradient(135deg, var(--color-brand-primary) 0%, var(--color-brand-primary-400) 100%)`

  **Must NOT do**:
  - Change the gradient direction or stops
  - Break any styling functionality

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple string replacement in single file
  - **Skills**: [`edit`]
    - `edit`: For precise file editing

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 9)
  - **Blocks**: Task 13 (verification)
  - **Blocked By**: Tasks 1-2 (color mapping)

  **References**:

  **Pattern References**:
  - `src/styles/theme.css:12-36` - Brand color CSS variables to use
  - `src/components/CommunityLandingPage.tsx:146` - Current hardcoded gradient to replace

  **Acceptance Criteria**:

  **QA Scenarios**:

  ```
  Scenario: Verify hardcoded gradient replaced with CSS variables
    Tool: Bash
    Preconditions: CommunityLandingPage.tsx modified
    Steps:
      1. Check that line 146 no longer contains hardcoded hex values
      2. Verify new line uses var(--color-brand-primary), var(--color-brand-primary-400)
    Expected Result: Gradient uses CSS variables, no hardcoded colors remain
    Evidence: .sisyphus/evidence/task-8-community-landing-gradient-fix.txt

  Scenario: Verify gradient visual appearance unchanged
    Tool: Playwright
    Preconditions: Dev server running
    Steps:
      1. Navigate to community landing page
      2. Inspect gradient element
      3. Verify computed gradient matches original exactly
    Expected Result: Gradient appearance identical, computed from CSS variables
    Evidence: .sisyphus/evidence/task-8-gradient-visual-verification.png
  ```

  **Evidence to Capture**:
  - [ ] task-8-community-landing-gradient-fix.txt - file verification
  - [ ] task-8-gradient-visual-verification.png - visual verification

  **Commit**: YES (group with Task 9)
  - Message: `fix(landing): replace hardcoded gradient with design tokens in CommunityLandingPage`
  - Files: `src/components/CommunityLandingPage.tsx`

- [ ] 9. Fix GalleryHeader.tsx hardcoded gradient

  **What to do**:
  - Replace hardcoded gradient (line 37) with CSS variables:
    - `linear-gradient(135deg, #7c6cf2 0%, #9185f7 100%)` → `linear-gradient(135deg, var(--color-brand-primary) 0%, var(--color-brand-primary-400) 100%)`

  **Must NOT do**:
  - Change the gradient direction or stops
  - Break any styling functionality

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple string replacement in single file
  - **Skills**: [`edit`]
    - `edit`: For precise file editing

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 8)
  - **Blocks**: Task 13 (verification)
  - **Blocked By**: Tasks 1-2 (color mapping)

  **References**:

  **Pattern References**:
  - `src/styles/theme.css:12-36` - Brand color CSS variables to use
  - `src/components/GalleryHeader.tsx:37` - Current hardcoded gradient to replace

  **Acceptance Criteria**:

  **QA Scenarios**:

  ```
  Scenario: Verify hardcoded gradient replaced with CSS variables
    Tool: Bash
    Preconditions: GalleryHeader.tsx modified
    Steps:
      1. Check that line 37 no longer contains hardcoded hex values
      2. Verify new line uses var(--color-brand-primary), var(--color-brand-primary-400)
    Expected Result: Gradient uses CSS variables, no hardcoded colors remain
    Evidence: .sisyphus/evidence/task-9-gallery-header-gradient-fix.txt
  ```

  **Evidence to Capture**:
  - [ ] task-9-gallery-header-gradient-fix.txt - file verification

  **Commit**: YES (group with Task 8)
  - Message: `fix(landing): replace hardcoded gradient with design tokens in GalleryHeader`
  - Files: `src/components/GalleryHeader.tsx`

- [ ] 10. Fix focusRing in PublicLandingPage.tsx

  **What to do**:
  - Update focusRing constant to use design tokens:
    - `focus-visible:ring-violet-400` → `focus-visible:ring-brand-primary`
    - `dark:focus-visible:ring-offset-slate-950` → `dark:focus-visible:ring-offset-neutral-900`

  **Must NOT do**:
  - Change focus ring behavior
  - Break accessibility functionality

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple string replacement in single file
  - **Skills**: [`edit`]
    - `edit`: For precise file editing

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 11-12)
  - **Blocks**: Task 13 (verification)
  - **Blocked By**: Tasks 1-2 (token mapping)

  **References**:

  **Pattern References**:
  - `src/styles/theme.css:38-51` - Neutral color palette for dark mode
  - `src/components/PublicLandingPage.tsx` - Current focusRing to update

  **Acceptance Criteria**:

  **QA Scenarios**:

  ```
  Scenario: Verify focusRing uses design tokens
    Tool: Bash
    Preconditions: PublicLandingPage.tsx modified
    Steps:
      1. Search for focusRing constant
      2. Verify it uses ring-brand-primary and ring-offset-neutral-900
      3. Confirm no violet-400 or slate-950 references remain
    Expected Result: focusRing uses design system tokens, no raw Tailwind classes
    Evidence: .sisyphus/evidence/task-10-focus-ring-fix.txt
  ```

  **Evidence to Capture**:
  - [ ] task-10-focus-ring-fix.txt - file verification

  **Commit**: YES (group with Tasks 10-12)
  - Message: `fix(landing): update focusRing to use design tokens in PublicLandingPage`
  - Files: `src/components/PublicLandingPage.tsx`

- [ ] 11. Fix focusRing in CommunityLandingPage.tsx

  **What to do**:
  - Update focusRing constant to use design tokens:
    - `focus-visible:ring-violet-400` → `focus-visible:ring-brand-primary`
    - `dark:focus-visible:ring-offset-slate-950` → `dark:focus-visible:ring-offset-neutral-900`

  **Must NOT do**:
  - Change focus ring behavior
  - Break accessibility functionality

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple string replacement in single file
  - **Skills**: [`edit`]
    - `edit`: For precise file editing

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 10, 12)
  - **Blocks**: Task 13 (verification)
  - **Blocked By**: Tasks 1-2 (token mapping)

  **References**:

  **Pattern References**:
  - `src/styles/theme.css:38-51` - Neutral color palette for dark mode
  - `src/components/CommunityLandingPage.tsx:17` - Current focusRing to update

  **Acceptance Criteria**:

  **QA Scenarios**:

  ```
  Scenario: Verify focusRing uses design tokens
    Tool: Bash
    Preconditions: CommunityLandingPage.tsx modified
    Steps:
      1. Search for focusRing constant (line 17)
      2. Verify it uses ring-brand-primary and ring-offset-neutral-900
      3. Confirm no violet-400 or slate-950 references remain
    Expected Result: focusRing uses design system tokens, no raw Tailwind classes
    Evidence: .sisyphus/evidence/task-11-focus-ring-fix.txt
  ```

  **Evidence to Capture**:
  - [ ] task-11-focus-ring-fix.txt - file verification

  **Commit**: YES (group with Tasks 10, 12)
  - Message: `fix(landing): update focusRing to use design tokens in CommunityLandingPage`
  - Files: `src/components/CommunityLandingPage.tsx`

- [ ] 12. Fix focusRing in other landing page components

  **What to do**:
  - Search for any remaining focusRing implementations in landing page components
  - Update to use design tokens if found

  **Must NOT do**:
  - Modify non-landing page components
  - Change focus ring behavior

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple search and replace task
  - **Skills**: [`grep`, `edit`]
    - `grep`: For finding focusRing implementations
    - `edit`: For updating if found

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 10-11)
  - **Blocks**: Task 13 (verification)
  - **Blocked By**: Tasks 1-2 (token mapping)

  **References**:

  **Pattern References**:
  - `src/styles/theme.css:38-51` - Neutral color palette for dark mode

  **Acceptance Criteria**:

  **QA Scenarios**:

  ```
  Scenario: Verify no raw Tailwind focus rings remain in landing pages
    Tool: Bash
    Preconditions: All focusRing fixes applied
    Steps:
      1. Search for "ring-violet-400" in src/components/ --include="*.tsx"
      2. Search for "ring-offset-slate-950" in src/components/ --include="*.tsx"
      3. Verify no matches found in landing page components
    Expected Result: Zero instances of raw Tailwind focus ring classes in landing pages
    Evidence: .sisyphus/evidence/task-12-focus-ring-comprehensive-fix.txt
  ```

  **Evidence to Capture**:
  - [ ] task-12-focus-ring-comprehensive-fix.txt - comprehensive verification

  **Commit**: YES (group with Tasks 10-11)
  - Message: `fix(landing): update all focusRings to use design tokens`
  - Files: `src/components/[affected-files].tsx`

- [ ] 13. Verify no hardcoded colors remain

  **What to do**:
  - Run comprehensive grep to ensure no hardcoded hex colors remain in landing page files
  - Verify all instances have been replaced

  **Must NOT do**:
  - False positive on non-color hex values

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple verification task
  - **Skills**: [`bash`]
    - `bash`: For running verification commands

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 5)
  - **Blocks**: Tasks 14-15
  - **Blocked By**: Tasks 3-12 (all fixes)

  **References**:

  **Acceptance Criteria**:

  **QA Scenarios**:

  ```
  Scenario: Verify zero hardcoded colors in landing pages
    Tool: Bash
    Preconditions: All fixes applied
    Steps:
      1. Run: grep -r "#7c6cf2\|#f2743e\|#9185f7" src/components/ --include="*.tsx" --include="*.ts"
      2. Verify output is empty (no matches found)
    Expected Result: Zero hardcoded hex colors found in component files
    Evidence: .sisyphus/evidence/task-13-no-hardcoded-colors.txt
  ```

  **Evidence to Capture**:
  - [ ] task-13-no-hardcoded-colors.txt - verification result

  **Commit**: NO

- [ ] 14. Verify build passes

  **What to do**:
  - Run `npm run build` to ensure all changes compile successfully
  - Verify no TypeScript or build errors introduced

  **Must NOT do**:
  - Skip build verification

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple build verification task
  - **Skills**: [`bash`]
    - `bash`: For running build command

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 5)
  - **Blocks**: Task 15
  - **Blocked By**: Task 13 (verification)

  **References**:

  **Acceptance Criteria**:

  **QA Scenarios**:

  ```
  Scenario: Verify build passes without errors
    Tool: Bash
    Preconditions: All fixes applied
    Steps:
      1. Run: npm run build
      2. Check exit code is 0
      3. Verify output contains "✓ built in X.XXs"
    Expected Result: Build completes successfully with no errors
    Evidence: .sisyphus/evidence/task-14-build-success.txt
  ```

  **Evidence to Capture**:
  - [ ] task-14-build-success.txt - build output

  **Commit**: NO

- [ ] 15. Verify visual appearance unchanged

  **What to do**:
  - Launch dev server and verify landing pages look identical
  - Confirm all colors and gradients render correctly

  **Must NOT do**:
  - Skip visual verification

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Visual verification and appearance checking
  - **Skills**: [`playwright`]
    - `playwright`: For browser automation and visual verification

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 5)
  - **Blocks**: None (final task)
  - **Blocked By**: Task 14 (build verification)

  **References**:

  **Acceptance Criteria**:

  **QA Scenarios**:

  ```
  Scenario: Verify landing pages visual appearance unchanged
    Tool: Playwright
    Preconditions: Dev server running
    Steps:
      1. Navigate to http://localhost:5173/
      2. Take screenshot of public landing page
      3. Navigate to community landing page
      4. Take screenshot of community landing page
      5. Compare with baseline screenshots (if available)
      6. Manually inspect key elements: gradients, buttons, text colors
    Expected Result: Landing pages render identically to before, all colors correct
    Evidence: .sisyphus/evidence/task-15-visual-verification-final.png
  ```

  **Evidence to Capture**:
  - [ ] task-15-visual-verification-final.png - final visual verification

  **Commit**: NO

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Verify all hardcoded colors replaced, design tokens used consistently, no breaking changes introduced.

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run build and linting, verify no syntax errors, clean code standards maintained.

- [ ] F3. **Real Manual QA** — `unspecified-high`
  Execute all QA scenarios, verify visual appearance unchanged, confirm functionality intact.

- [ ] F4. **Scope Fidelity Check** — `deep`
  Verify only landing page files modified, dashboard untouched, scope boundaries respected.

---

## Commit Strategy

- **Wave 2**: `fix(landing): replace hardcoded colors with design tokens in landing page components`
- **Wave 3**: `fix(landing): replace hardcoded gradients with design tokens`
- **Wave 4**: `fix(landing): update focus rings to use design tokens`

---

## Success Criteria

### Verification Commands
```bash
# Verify no hardcoded colors remain
grep -r "#7c6cf2\|#f2743e\|#9185f7" src/components/ --include="*.tsx" --include="*.ts"

# Verify build passes  
npm run build

# Verify visual appearance (manual check)
npm run dev
```

### Final Checklist
- [ ] All hardcoded hex colors replaced with CSS variables
- [ ] All gradients use design system tokens
- [ ] All focus rings use design tokens
- [ ] Build passes without errors
- [ ] Visual appearance unchanged
- [ ] Dashboard components untouched (out of scope)