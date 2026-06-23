# Design-Taste-Frontend Full Integration - COMPLETE PLAN

## TL;DR

**Quick Summary**: Complete migration of ALL landing pages from raw Tailwind classes and hardcoded colors to full design system token usage, achieving 90%+ design-taste-frontend compliance.

**Deliverables**:
- ✅ Remove ALL hardcoded hex colors (#7c6cf2, #f2743e, #9185f7) from landing pages
- ✅ Replace ALL raw Tailwind classes (bg-slate-*, text-violet-*, etc.) with design tokens  
- ✅ Apply consistent typography scale using display/h1/body classes
- ✅ Add comprehensive motion design with RevealSection component
- ✅ Update ALL UI components in landing pages to use design system

**Estimated Effort**: Medium (4-6 hours)  
**Parallel Execution**: YES - 7 waves  
**Critical Path**: Token foundation → Raw Tailwind migration → Typography → Motion → Verification

---

## Context

### Original Request
Full integration audit of landing page and dashboard against design-taste-frontend skill requirements.

### Audit Findings
- **Design system foundation**: Excellent (95% compliant) - proper Tailwind v4 @theme directive, Metmal pastel aesthetic
- **UI component library**: Good (90% compliant) - 13 components properly use design tokens  
- **Landing pages**: Poor (15% compliant) - 1,253 raw Tailwind classes vs 87 token usages, 16 hardcoded hex colors
- **Dashboard**: Out of scope for design-taste-frontend skill

### Critical Issues
1. **Hardcoded hex colors**: 16 instances across 9 files (BRAND constants, inline gradients)
2. **Raw Tailwind classes**: 1,253 instances of bg-slate-*, text-violet-*, border-slate-* 
3. **Typography inconsistency**: Manual font sizes instead of design system scale
4. **Missing motion**: RevealSection exists but not used comprehensively
5. **Visual inconsistency**: Landing pages look generic while UI components look branded

---

## Work Objectives

### Core Objective
Achieve 90%+ design-taste-frontend compliance in landing pages by migrating ALL code to proper design system tokens.

### Definition of Done
- [ ] `grep -r "#7c6cf2\|#f2743e\|#9185f7" src/components/` returns 0 matches
- [ ] `grep -r "bg-slate-\|text-slate-\|border-slate-\|text-violet-"` returns minimal matches in landing pages
- [ ] All new code uses design tokens: bg-neutral-*, text-brand-primary, etc.
- [ ] npm run build passes without errors
- [ ] Landing pages visually consistent with UI component library
- [ ] All sections have appropriate motion design

---

## Execution Strategy - 7 Waves

```
Wave 1 (Foundation & Hardcoded Colors - 6 tasks):
├── Task 1: Remove hardcoded hex colors from PublicLandingPage.tsx
├── Task 2: Remove hardcoded hex colors from CommunityHero.tsx  
├── Task 3: Remove hardcoded hex colors from PublicHero.tsx
├── Task 4: Fix hardcoded gradients in CommunityLandingPage.tsx and GalleryHeader.tsx
├── Task 5: Update focusRing utilities to use design tokens
└── Task 6: Map all hex colors to design tokens for reference

Wave 2 (Public Landing Page Raw Tailwind Migration - 7 tasks):
├── Task 7: Replace bg-slate-* → bg-neutral-* in PublicLandingPage.tsx
├── Task 8: Replace text-slate-* → text-neutral-* in PublicLandingPage.tsx  
├── Task 9: Replace border-slate-* → border-neutral-* in PublicLandingPage.tsx
├── Task 10: Replace text-violet-* → text-brand-primary* in PublicLandingPage.tsx
├── Task 11: Replace bg-violet-* → bg-brand-primary* in PublicLandingPage.tsx
├── Task 12: Replace border-violet-* → border-brand-primary* in PublicLandingPage.tsx
└── Task 13: Fix any remaining raw Tailwind classes in PublicLandingPage.tsx

Wave 3 (Community Landing Page Raw Tailwind Migration - 7 tasks):
├── Task 14: Replace bg-slate-* → bg-neutral-* in CommunityLandingPage.tsx
├── Task 15: Replace text-slate-* → text-neutral-* in CommunityLandingPage.tsx
├── Task 16: Replace border-slate-* → border-neutral-* in CommunityLandingPage.tsx
├── Task 17: Replace text-violet-* → text-brand-primary* in CommunityLandingPage.tsx
├── Task 18: Replace bg-violet-* → bg-brand-primary* in CommunityLandingPage.tsx
├── Task 19: Replace border-violet-* → border-brand-primary* in CommunityLandingPage.tsx
└── Task 20: Fix any remaining raw Tailwind classes in CommunityLandingPage.tsx

Wave 4 (Community Sub-components Migration - 10 tasks):
├── Task 21: Migrate CommunityBenefits.tsx to design tokens
├── Task 22: Migrate CommunityFacilities.tsx to design tokens
├── Task 23: Migrate CommunitySteps.tsx to design tokens
├── Task 24: Migrate CommunityRegistrationForm.tsx to design tokens
├── Task 25: Migrate CommunityFAQ.tsx to design tokens
├── Task 26: Migrate CommunitySocialProof.tsx to design tokens
├── Task 27: Migrate CommunityUpcomingEvents.tsx to design tokens
├── Task 28: Migrate CommunityGallery.tsx to design tokens
├── Task 29: Migrate CommunityContact.tsx to design tokens
└── Task 30: Migrate CommunityRevealPrimitives.tsx to design tokens

Wave 5 (Public Sub-components Migration - 8 tasks):
├── Task 31: Migrate PublicHero.tsx to design tokens (comprehensive)
├── Task 32: Migrate PublicEventGrid.tsx to design tokens
├── Task 33: Migrate PublicSubmissionForm.tsx to design tokens
├── Task 34: Migrate PublicFooter.tsx to design tokens
├── Task 35: Migrate PublicShared.tsx to design tokens
├── Task 36: Migrate QuarterTimeline.tsx to design tokens
├── Task 37: Migrate AnnualTimeline.tsx to design tokens
└── Task 38: Migrate LetterGenerator.tsx to design tokens

Wave 6 (Typography Scale Application - 4 tasks):
├── Task 39: Apply typography scale to PublicLandingPage.tsx (display-1, h1, body-lg)
├── Task 40: Apply typography scale to CommunityLandingPage.tsx (display-1, h1, body-lg)
├── Task 41: Apply typography scale to all community sub-components
└── Task 42: Apply typography scale to all public sub-components

Wave 7 (Motion Design Implementation - 4 tasks):
├── Task 43: Add RevealSection motion to PublicLandingPage.tsx sections
├── Task 44: Add RevealSection motion to CommunityLandingPage.tsx sections
├── Task 45: Add RevealSection motion to all community sub-components
└── Task 46: Add RevealSection motion to all public sub-components

Wave FINAL (4 parallel reviews):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
```

---

## DETAILED TASKS

### Wave 1: Foundation & Hardcoded Colors

- [ ] **Task 1: Remove hardcoded hex colors from PublicLandingPage.tsx**
  
  **What to do**:
  - Remove BRAND constant (lines 46-50) with hardcoded hex values (#7c6cf2, #9185f7, #f2743e)
  - Replace with CSS variables: var(--color-brand-primary), var(--color-brand-primary-400), var(--color-brand-secondary)
  - Update any inline style usage to use CSS variables
  
  **Must NOT do**: Introduce new hardcoded hex colors, break existing functionality
  
  **Recommended Agent Profile**:
  - **Category**: `quick` - Simple find-and-replace in single file
  - **Skills**: [`tailwind-css-patterns`] - Understanding of design tokens
  
  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2-6)
  - **Blocks**: Tasks 7-13 (Public Landing Page migration)
  
  **References**:
  - `src/styles/theme.css:12-36` - Brand color definitions
  - `src/styles/tokens.css:7-13` - CSS variable mappings
  - `src/components/PublicLandingPage.tsx:46-50` - Current BRAND constant
  
  **QA Scenarios**:
  ```
  Scenario: Verify no hardcoded colors remain
    Tool: Bash (grep)
    Steps: grep -r "#7c6cf2\|#f2743e\|#9185f7" src/components/PublicLandingPage.tsx
    Expected: No matches found
    Evidence: .sisyphus/evidence/task-1-no-hardcoded-colors.txt
  ```
  
  **Commit**: `fix(landing): replace hardcoded colors with css variables in PublicLandingPage`

- [ ] **Task 2: Remove hardcoded hex colors from CommunityHero.tsx**
  
  **What to do**:
  - Remove BRAND constant (lines 6-8) with hardcoded hex values
  - Replace with CSS variables
  
  **Must NOT do**: Introduce new hardcoded hex colors, break existing functionality
  
  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`tailwind-css-patterns`]
  
  **Parallelization**: YES, Wave 1 (with Tasks 1, 3-6)
  
  **References**:
  - `src/styles/theme.css:12-36` - Brand color definitions
  - `src/components/community/CommunityHero.tsx:6-8` - Current BRAND constant
  
  **QA Scenarios**:
  ```
  Scenario: Verify no hardcoded colors remain
    Tool: Bash (grep)
    Steps: grep -r "#7c6cf2\|#f2743e\|#9185f7" src/components/community/CommunityHero.tsx
    Expected: No matches found
    Evidence: .sisyphus/evidence/task-2-no-hardcoded-colors.txt
  ```
  
  **Commit**: `fix(landing): replace hardcoded colors with css variables in CommunityHero`

- [ ] **Task 3: Remove hardcoded hex colors from PublicHero.tsx**
  
  **What to do**:
  - Remove accent constants (lines 9-10) with hardcoded hex values
  - Replace with CSS variables
  
  **Must NOT do**: Introduce new hardcoded hex colors, break existing functionality
  
  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`tailwind-css-patterns`]
  
  **Parallelization**: YES, Wave 1 (with Tasks 1-2, 4-6)
  
  **References**:
  - `src/styles/theme.css:12-36`
  - `src/components/PublicHero.tsx:9-10`
  
  **QA Scenarios**:
  ```
  Scenario: Verify no hardcoded colors remain
    Tool: Bash (grep)
    Steps: grep -r "#7c6cf2\|#f2743e" src/components/PublicHero.tsx
    Expected: No matches found
    Evidence: .sisyphus/evidence/task-3-no-hardcoded-colors.txt
  ```
  
  **Commit**: `fix(landing): replace hardcoded colors with css variables in PublicHero`

- [ ] **Task 4: Fix hardcoded gradients in CommunityLandingPage.tsx and GalleryHeader.tsx**
  
  **What to do**:
  - Replace inline gradient style in CommunityLandingPage.tsx line 146
  - Replace inline gradient style in GalleryHeader.tsx line 37
  - Use CSS variables: var(--color-brand-primary), var(--color-brand-primary-400)
  
  **Must NOT do**: Keep any hardcoded hex values, break gradient appearance
  
  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`tailwind-css-patterns`]
  
  **Parallelization**: YES, Wave 1 (with Tasks 1-3, 5-6)
  
  **References**:
  - `src/styles/theme.css:12-22` - Brand primary color scale
  - `src/components/CommunityLandingPage.tsx:146`
  - `src/components/GalleryHeader.tsx:37`
  
  **QA Scenarios**:
  ```
  Scenario: Verify no hardcoded gradients remain
    Tool: Bash (grep)
    Steps: grep -r "#7c6cf2.*#9185f7" src/components/CommunityLandingPage.tsx src/components/GalleryHeader.tsx
    Expected: No matches found
    Evidence: .sisyphus/evidence/task-4-no-hardcoded-gradients.txt
  ```
  
  **Commit**: `fix(landing): replace hardcoded gradients with css variables`

- [ ] **Task 5: Update focusRing utilities to use design tokens**
  
  **What to do**:
  - Find all focusRing utilities using raw Tailwind classes (ring-violet-400, ring-offset-slate-950)
  - Replace with design tokens: ring-brand-primary, ring-offset-neutral-900
  - Update PublicLandingPage.tsx and CommunityLandingPage.tsx focusRing constants
  
  **Must NOT do**: Leave raw Tailwind focus ring classes, break accessibility
  
  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`tailwind-css-patterns`, `accessibility`]
  
  **Parallelization**: YES, Wave 1 (with Tasks 1-4, 6)
  
  **References**:
  - `src/components/PublicLandingPage.tsx` - focusRing usage
  - `src/components/CommunityLandingPage.tsx` - focusRing usage
  - `src/styles/theme.css:12-22, 38-51` - Brand and neutral color tokens
  
  **QA Scenarios**:
  ```
  Scenario: Verify no raw Tailwind focus rings remain
    Tool: Bash (grep)
    Steps: grep -r "ring-violet-\|ring-offset-slate-" src/components/PublicLandingPage.tsx src/components/CommunityLandingPage.tsx
    Expected: No matches found
    Evidence: .sisyphus/evidence/task-5-no-raw-focus-rings.txt
  ```
  
  **Commit**: `fix(landing): update focus rings to use design tokens`

- [ ] **Task 6: Map all hex colors to design tokens for reference**
  
  **What to do**:
  - Create comprehensive mapping document showing all hex colors and their design token equivalents
  - Document: #7c6cf2 → var(--color-brand-primary), #f2743e → var(--color-brand-secondary), #9185f7 → var(--color-brand-primary-400)
  - Save to .sisyphus/reference/color-mapping.md
  
  **Must NOT do**: Skip any hex colors found in codebase
  
  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`tailwind-css-patterns`]
  
  **Parallelization**: YES, Wave 1 (with Tasks 1-5)
  
  **References**:
  - `src/styles/theme.css:12-36` - All brand color definitions
  - All files with hardcoded hex colors
  
  **QA Scenarios**:
  ```
  Scenario: Verify color mapping is complete
    Tool: Bash (grep)
    Steps: grep -r "#7c6cf2\|#f2743e\|#9185f7\|#7c3aed\|#f97316" src/components/ --include="*.tsx" | wc -l
    Expected: Count matches for documentation
    Evidence: .sisyphus/evidence/task-6-color-mapping.txt
  ```
  
  **Commit**: NO (reference document only)

---

### Wave 2: Public Landing Page Raw Tailwind Migration

[Tasks 7-13 follow same pattern - replace raw Tailwind classes with design tokens]

- [ ] **Task 7: Replace bg-slate-* → bg-neutral-* in PublicLandingPage.tsx**
- [ ] **Task 8: Replace text-slate-* → text-neutral-* in PublicLandingPage.tsx**
- [ ] **Task 9: Replace border-slate-* → border-neutral-* in PublicLandingPage.tsx**
- [ ] **Task 10: Replace text-violet-* → text-brand-primary* in PublicLandingPage.tsx**
- [ ] **Task 11: Replace bg-violet-* → bg-brand-primary* in PublicLandingPage.tsx**
- [ ] **Task 12: Replace border-violet-* → border-brand-primary* in PublicLandingPage.tsx**
- [ ] **Task 13: Fix any remaining raw Tailwind classes in PublicLandingPage.tsx**

All Wave 2 tasks:
- **Category**: `quick`
- **Skills**: [`tailwind-css-patterns`]
- **Parallelization**: YES, Wave 2 (all 7 tasks can run in parallel)
- **Blocked By**: Tasks 1-6 (Wave 1)
- **QA**: Each task includes grep verification of no raw Tailwind classes remaining

---

### Wave 3: Community Landing Page Raw Tailwind Migration

[Tasks 14-20 follow same pattern as Wave 2 but for CommunityLandingPage.tsx]

- [ ] **Task 14-20**: Same as Tasks 7-13 but for CommunityLandingPage.tsx

---

### Wave 4: Community Sub-components Migration

[Tasks 21-30 migrate each community sub-component to design tokens]

- [ ] **Task 21: Migrate CommunityBenefits.tsx to design tokens**
- [ ] **Task 22: Migrate CommunityFacilities.tsx to design tokens**
- [ ] **Task 23: Migrate CommunitySteps.tsx to design tokens**
- [ ] **Task 24: Migrate CommunityRegistrationForm.tsx to design tokens**
- [ ] **Task 25: Migrate CommunityFAQ.tsx to design tokens**
- [ ] **Task 26: Migrate CommunitySocialProof.tsx to design tokens**
- [ ] **Task 27: Migrate CommunityUpcomingEvents.tsx to design tokens**
- [ ] **Task 28: Migrate CommunityGallery.tsx to design tokens**
- [ ] **Task 29: Migrate CommunityContact.tsx to design tokens**
- [ ] **Task 30: Migrate CommunityRevealPrimitives.tsx to design tokens**

All Wave 4 tasks:
- **Category**: `quick`
- **Skills**: [`tailwind-css-patterns`]
- **Parallelization**: YES, Wave 4 (all 10 tasks can run in parallel)
- **Blocked By**: Tasks 1-6 (Wave 1)
- **What to do**: For each component, replace ALL raw Tailwind classes (bg-slate-*, text-violet-*, etc.) with design tokens (bg-neutral-*, text-brand-primary*, etc.)
- **QA**: Grep verification + build verification for each component

---

### Wave 5: Public Sub-components Migration

[Tasks 31-38 migrate each public sub-component to design tokens]

- [ ] **Task 31: Migrate PublicHero.tsx to design tokens (comprehensive)**
- [ ] **Task 32: Migrate PublicEventGrid.tsx to design tokens**
- [ ] **Task 33: Migrate PublicSubmissionForm.tsx to design tokens**
- [ ] **Task 34: Migrate PublicFooter.tsx to design tokens**
- [ ] **Task 35: Migrate PublicShared.tsx to design tokens**
- [ ] **Task 36: Migrate QuarterTimeline.tsx to design tokens**
- [ ] **Task 37: Migrate AnnualTimeline.tsx to design tokens**
- [ ] **Task 38: Migrate LetterGenerator.tsx to design tokens**

All Wave 5 tasks:
- **Category**: `quick`
- **Skills**: [`tailwind-css-patterns`]
- **Parallelization**: YES, Wave 5 (all 8 tasks can run in parallel)
- **Blocked By**: Tasks 1-6 (Wave 1)

---

### Wave 6: Typography Scale Application

- [ ] **Task 39: Apply typography scale to PublicLandingPage.tsx**
  
  **What to do**:
  - Replace manual font sizes (text-4xl, text-xl, etc.) with typography classes
  - Use display-1, display-2, display-3, display-4 for hero headlines
  - Use h1, h2, h3, h4 for section headings
  - Use body-lg, body-md, body-sm for paragraph text
  - Use ui-eyebrow, ui-label, ui-caption for UI text
  
  **Must NOT do**: Use manual font-size classes, break visual hierarchy
  
  **Recommended Agent Profile**:
  - **Category**: `visual-engineering` - Typography and visual design task
  - **Skills**: [`tailwind-css-patterns`, `frontend-design`]
  
  **Parallelization**: YES, Wave 6 (with Tasks 40-42)
  **Blocked By**: Tasks 7-13 (Wave 2 - Public Landing Page migration)
  
  **References**:
  - `src/styles/typography.css` - Typography scale definitions
  - `src/components/PublicLandingPage.tsx` - Current manual font sizes
  
  **QA Scenarios**:
  ```
  Scenario: Verify typography scale applied
    Tool: Bash (grep)
    Steps: grep -r "text-4xl\|text-5xl\|text-6xl" src/components/PublicLandingPage.tsx | wc -l
    Expected: Minimal or zero matches for manual sizing
    Evidence: .sisyphus/evidence/task-39-typography-applied.txt
  ```
  
  **Commit**: `feat(landing): apply typography scale to PublicLandingPage`

- [ ] **Task 40: Apply typography scale to CommunityLandingPage.tsx**
- [ ] **Task 41: Apply typography scale to all community sub-components**
- [ ] **Task 42: Apply typography scale to all public sub-components**

All Wave 6 tasks:
- **Category**: `visual-engineering`
- **Skills**: [`tailwind-css-patterns`, `frontend-design`]
- **Parallelization**: YES (all 4 tasks can run in parallel)
- **Blocked By**: Waves 2-5 (all raw Tailwind migration complete)

---

### Wave 7: Motion Design Implementation

- [ ] **Task 43: Add RevealSection motion to PublicLandingPage.tsx sections**
  
  **What to do**:
  - Wrap key sections in RevealSection component
  - Apply appropriate intensity and delay props
  - Ensure smooth scroll animations
  
  **Must NOT do**: Over-animate, break existing functionality
  
  **Recommended Agent Profile**:
  - **Category**: `visual-engineering` - Motion design task
  - **Skills**: [`frontend-design`, `tailwind-css-patterns`]
  
  **Parallelization**: YES, Wave 7 (with Tasks 44-46)
  **Blocked By**: Tasks 7-42 (all migration and typography complete)
  
  **References**:
  - `src/components/ui/RevealSection.tsx` - RevealSection component API
  - `src/components/PublicLandingPage.tsx` - Sections to animate
  
  **QA Scenarios**:
  ```
  Scenario: Verify motion implemented
    Tool: Playwright
    Steps: 
      1. Navigate to public landing page
      2. Scroll through page
      3. Verify sections fade/slide in on scroll
    Expected: Smooth scroll animations on key sections
    Evidence: .sisyphus/evidence/task-43-motion-implemented.mp4
  ```
  
  **Commit**: `feat(landing): add motion design to PublicLandingPage`

- [ ] **Task 44: Add RevealSection motion to CommunityLandingPage.tsx sections**
- [ ] **Task 45: Add RevealSection motion to all community sub-components**
- [ ] **Task 46: Add RevealSection motion to all public sub-components**

All Wave 7 tasks:
- **Category**: `visual-engineering`
- **Skills**: [`frontend-design`, `tailwind-css-patterns`]
- **Parallelization**: YES (all 4 tasks can run in parallel)
- **Blocked By**: Waves 2-6 (all migration and typography complete)

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] **Task F1: Plan Compliance Audit** — `oracle`
  
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  
  **Output**: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] **Task F2: Code Quality Review** — `unspecified-high`
  
  Run `tsc --noEmit` + linter + `bun test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp).
  
  **Output**: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] **Task F3: Real Manual QA** — `unspecified-high` (+ `playwright` skill if UI)
  
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (features working together, not isolation). Test edge cases: empty state, invalid input, rapid actions. Save to `.sisyphus/evidence/final-qa/`.
  
  **Output**: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] **Task F4: Scope Fidelity Check** — `deep`
  
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination: Task N touching Task M's files. Flag unaccounted changes.
  
  **Output**: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **Wave 1**: `fix(landing): replace hardcoded colors and focus rings with design tokens`
- **Wave 2**: `fix(landing): migrate PublicLandingPage raw tailwind classes to design tokens`
- **Wave 3**: `fix(landing): migrate CommunityLandingPage raw tailwind classes to design tokens`
- **Wave 4**: `fix(community): migrate all community sub-components to design tokens`
- **Wave 5**: `fix(public): migrate all public sub-components to design tokens`
- **Wave 6**: `feat(landing): apply typography scale across all landing pages`
- **Wave 7**: `feat(landing): add comprehensive motion design with RevealSection`

---

## Success Criteria

### Verification Commands
```bash
# Verify no hardcoded colors remain
grep -r "#7c6cf2\|#f2743e\|#9185f7" src/components/ --include="*.tsx"

# Verify minimal raw Tailwind classes in landing pages  
grep -r "bg-slate-\|text-slate-\|border-slate-\|text-violet-" src/components/PublicLandingPage.tsx src/components/CommunityLandingPage.tsx src/components/community/ src/components/public/

# Verify build passes
npm run build

# Verify visual appearance (manual check)
npm run dev
```

### Final Checklist
- [ ] All hardcoded hex colors removed from landing pages (16 instances → 0)
- [ ] All raw Tailwind classes replaced with design tokens (1,253 instances → minimal)
- [ ] Typography consistently uses design system scale
- [ ] Motion implemented with RevealSection across all sections
- [ ] Build passes without errors
- [ ] Visual appearance maintained or improved
- [ ] Landing pages now 90%+ compliant with design-taste-frontend

---

## Ready to Execute?

To start the implementation, run:
```bash
/start-work
```

This will begin Sisyphus executor to systematically apply all 46 tasks across 7 waves, achieving full design system integration and 90%+ compliance with design-taste-frontend principles.