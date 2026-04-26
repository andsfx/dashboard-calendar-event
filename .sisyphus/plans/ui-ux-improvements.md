# UI/UX Improvements - Community Landing Page

## TL;DR

> **Quick Summary**: Implement 3 critical visual enhancements to Community Landing Page to boost quality from 7.5/10 to 8.5/10: (1) Add texture + mesh gradients to hero background, (2) Enhance CTA button hierarchy with shadows + hover effects, (3) Redesign benefits cards with accent colors + engaging interactions.
> 
> **Deliverables**:
> - Enhanced hero background with noise texture + mesh gradient overlays
> - Improved CTA buttons with bold shadows, scale-on-hover, icon animations
> - Redesigned benefits cards with colored accent bars, icon backgrounds, hover effects
> 
> **Estimated Effort**: Short (2-3 hours)
> **Parallel Execution**: NO - sequential (visual changes need incremental testing)
> **Critical Path**: Hero → CTA → Benefits → Visual QA

---

## Context

### Original Request
User requested UI/UX audit of Community Landing Page. After comprehensive audit revealing 7.5/10 score with 3 critical issues, user approved immediate implementation: "oke implementasikan sekarang"

### Interview Summary
**Key Discussions**:
- Audit identified hero background as flat/generic (purple-blue gradient cliché)
- CTA buttons lack visual dominance (shadows too subtle, no engaging hover)
- Benefits cards too uniform (icon colors unused, minimal differentiation)
- Goal: Surgical improvements to boost visual quality without major refactoring

**Research Findings**:
- Target: `src/components/CommunityLandingPage.tsx` (1142 lines, React 19 + TypeScript + Tailwind CSS v4)
- Existing animation system in `src/index.css` with custom keyframes
- BRAND tokens: accent (#7c6cf2), accentWarm (#f2743e)
- BENEFITS array has unused `color` property per item
- Dark mode support via Tailwind `dark:` variant

### Metis Review
**Identified Gaps** (addressed):
- Dark mode preservation → Default: Maintain equal quality in both modes
- Animation intensity → Default: Noticeable but not excessive (scale 1.05x, not 1.02x)
- Benefits card colors → Default: Use individual colors from array for differentiation
- Hero texture approach → Default: CSS-only inline SVG (no external assets)
- CTA icon animations → Default: Arrow slides right on hover

---

## Work Objectives

### Core Objective
Enhance visual quality of Community Landing Page through 3 targeted improvements: hero background depth, CTA button hierarchy, and benefits card differentiation.

### Concrete Deliverables
- Hero section with noise texture + mesh gradient overlays (lines ~665-695 in CommunityLandingPage.tsx)
- Primary CTA button with enhanced shadow + scale hover effect (lines ~716-724)
- Secondary CTA button with glassmorphism enhancement (lines ~725-730)
- Benefits cards with accent color bars + colored icon backgrounds + hover effects (lines ~765-850)

### Definition of Done
- [ ] Hero background shows visible texture overlay (not flat gradient) in both light/dark modes
- [ ] Primary CTA has bold shadow (rgba opacity 0.5) and scales to 1.05x on hover
- [ ] Benefits cards display individual accent colors and engaging hover states
- [ ] All Playwright QA scenarios pass with screenshot evidence

### Must Have
- Preserve all existing functionality (click handlers, routing, responsive breakpoints)
- Maintain dark mode support with proper `dark:` variants
- Use existing animation keyframes from `src/index.css` (no new @keyframes)
- CSS-only implementation (no external assets or new dependencies)

### Must NOT Have (Guardrails)
- **NO new components or file extraction** - all edits in CommunityLandingPage.tsx
- **NO modifications outside 3 target sections** - hero, CTA buttons, benefits cards only
- **NO 3D transforms** - no rotateX/rotateY/perspective in hover effects
- **NO complex animations** - no stagger, parallax, or scroll-triggered effects
- **NO over-engineering** - hover effects limited to single-property transforms (scale OR translateY)
- **NO external assets** - texture must be inline SVG data URI
- **NO refactoring** - keep component structure unchanged

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed via Playwright.

### Test Decision
- **Infrastructure exists**: YES (Vite + React dev server)
- **Automated tests**: NO (visual changes, Playwright QA sufficient)
- **Framework**: Playwright (already in project dependencies)

### QA Policy
Every task includes agent-executed Playwright scenarios with screenshot evidence.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.png`.

- **Frontend/UI**: Use Playwright - Navigate, hover, screenshot, extract computed styles
- **Visual Regression**: Compare screenshots before/after for each section
- **Dark Mode**: Toggle dark class and re-verify all scenarios

---

## Execution Strategy

### Parallel Execution Waves

> Sequential execution required - visual changes need incremental verification.

```
Wave 1 (Foundation):
├── Task 1: Hero background enhancement [visual-engineering]

Wave 2 (After Wave 1):
├── Task 2: CTA buttons improvement [visual-engineering]

Wave 3 (After Wave 2):
├── Task 3: Benefits cards redesign [visual-engineering]

Wave FINAL (After ALL tasks):
├── Task F1: Visual regression check (visual-engineering)
├── Task F2: Dark mode verification (visual-engineering)
├── Task F3: Responsive breakpoints QA (visual-engineering)
└── Task F4: Cross-browser compatibility (visual-engineering)
-> Present results -> Get explicit user okay
```

**Critical Path**: Task 1 → Task 2 → Task 3 → F1-F4 → user okay
**Parallel Speedup**: N/A (sequential required)
**Max Concurrent**: 1 (visual changes)

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1    | -         | 2      | 1    |
| 2    | 1         | 3      | 2    |
| 3    | 2         | F1-F4  | 3    |
| F1-F4| 3         | -      | FINAL|

### Agent Dispatch Summary

- **Wave 1**: 1 task → `visual-engineering` (frontend-design skill)
- **Wave 2**: 1 task → `visual-engineering` (frontend-design skill)
- **Wave 3**: 1 task → `visual-engineering` (frontend-design skill)
- **Wave FINAL**: 4 tasks → `visual-engineering` (playwright skill)

---

## TODOs

- [x] 1. Hero Background Enhancement - Add Texture + Mesh Gradients

  **What to do**:
  - Locate hero section background fallback (lines ~682-687, the `else` block without heroImageUrl)
  - Replace single gradient `<div>` with multi-layer structure:
    1. Base gradient layer (keep existing colors)
    2. Noise texture overlay using inline SVG data URI
    3. Mesh gradient overlay with radial-gradients
  - Add 4th decorative blur element for depth
  - Increase opacity of existing blur elements from /20 to /25
  - Test in both light and dark modes

  **Must NOT do**:
  - Do NOT modify hero section when `heroImageUrl` exists (lines 671-681)
  - Do NOT add external image files or assets
  - Do NOT change hero content (title, CTA buttons, stats)
  - Do NOT add new animation keyframes

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Frontend visual enhancement requiring CSS/design expertise
  - **Skills**: [`frontend-design`]
    - `frontend-design`: Needed for distinctive visual aesthetics, texture/gradient composition
  - **Skills Evaluated but Omitted**:
    - `accessibility`: Not needed - no semantic/ARIA changes, purely visual

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (solo task)
  - **Blocks**: Task 2 (CTA buttons)
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References** (existing code to follow):
  - `src/components/CommunityLandingPage.tsx:682-687` - Current hero background fallback structure
  - `src/components/CommunityLandingPage.tsx:690-694` - Existing decorative blur elements pattern

  **API/Type References**:
  - Inline SVG data URI format: `url("data:image/svg+xml,%3Csvg...")`
  - Tailwind opacity utilities: `/[0.03]` for arbitrary opacity values

  **External References**:
  - SVG noise filter technique: https://css-tricks.com/snippets/svg/svg-noise-filter/
  - Radial gradient syntax: https://developer.mozilla.org/en-US/docs/Web/CSS/gradient/radial-gradient

  **WHY Each Reference Matters**:
  - Lines 682-687: Shows current structure to replace - single div with inline gradient style
  - Lines 690-694: Pattern for blur elements - use same structure for 4th element
  - SVG noise: Technique for creating texture without external assets
  - Radial gradient: Syntax for mesh gradient overlays

  **Acceptance Criteria**:

  - [ ] Hero background has 3 layers: base gradient + noise texture + mesh gradient
  - [ ] Noise texture visible but subtle (opacity 0.03)
  - [ ] Mesh gradient uses 4 radial-gradients with brand colors (orange, violet, pink, indigo)
  - [ ] 4 decorative blur elements present (increased from 3)
  - [ ] Dark mode: texture/mesh opacity adjusted for proper contrast

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Hero background shows texture overlay (happy path)
    Tool: Playwright
    Preconditions: Dev server running on http://localhost:5173, heroImageUrl is empty/null
    Steps:
      1. Navigate to http://localhost:5173 (or community landing route)
      2. Wait for hero section: await page.locator('section#hero').waitFor()
      3. Extract background layers: await page.locator('section#hero > div').first().evaluate(el => Array.from(el.children).map(child => window.getComputedStyle(child).background))
      4. Take screenshot: await page.locator('section#hero').screenshot({path: '.sisyphus/evidence/task-1-hero-texture.png'})
    Expected Result: Background layers array contains 3+ items (base gradient, noise, mesh), screenshot shows visible texture
    Failure Indicators: Only 1 background layer, screenshot shows flat gradient
    Evidence: .sisyphus/evidence/task-1-hero-texture.png

  Scenario: Dark mode preserves texture visibility (edge case)
    Tool: Playwright
    Preconditions: Dev server running, dark mode enabled
    Steps:
      1. Navigate to http://localhost:5173
      2. Toggle dark mode: await page.evaluate(() => document.documentElement.classList.add('dark'))
      3. Wait 500ms for transition
      4. Extract texture opacity: await page.locator('section#hero > div > div').nth(1).evaluate(el => window.getComputedStyle(el).opacity)
      5. Take screenshot: await page.locator('section#hero').screenshot({path: '.sisyphus/evidence/task-1-hero-dark.png'})
    Expected Result: Texture opacity ≤ 0.05 in dark mode, screenshot shows texture without being too intense
    Failure Indicators: Opacity > 0.1 (too bright), or texture invisible
    Evidence: .sisyphus/evidence/task-1-hero-dark.png
  ```

  **Evidence to Capture**:
  - [ ] task-1-hero-texture.png - Hero section with visible texture overlay
  - [ ] task-1-hero-dark.png - Hero section in dark mode

  **Commit**: YES
  - Message: `feat(ui): enhance hero background with texture and mesh gradients`
  - Files: `src/components/CommunityLandingPage.tsx`
  - Pre-commit: `npm run build` (verify no TypeScript errors)


- [x] 2. CTA Buttons Improvement - Enhanced Shadows + Hover Effects

  **What to do**:
  - Locate primary CTA button (lines ~717-724, "Daftar Sekarang" button)
  - Enhance inline style to add bold box-shadow with brand color
  - Add Tailwind classes for hover effects: `hover:scale-105 transition-all duration-300`
  - Add group class to button, make ArrowRight icon animate: `group-hover:translate-x-1 transition-transform`
  - Locate secondary CTA button (lines ~725-730, "Lihat Benefits" button)
  - Enhance glassmorphism: increase border to `border-2`, bg to `bg-white/10`, add `backdrop-blur-xl`
  - Add hover state: `hover:bg-white/20 hover:border-white/40`
  - Test hover states in both light and dark modes

  **Must NOT do**:
  - Do NOT modify button text or href attributes
  - Do NOT add 3D transforms (rotateX/rotateY)
  - Do NOT change button positioning or layout
  - Do NOT modify other buttons outside these 2 CTAs

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Frontend interaction design requiring CSS animation expertise
  - **Skills**: [`frontend-design`]
    - `frontend-design`: Needed for engaging hover effects and visual hierarchy
  - **Skills Evaluated but Omitted**:
    - `accessibility`: Not needed - buttons already have proper semantics

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (after Task 1)
  - **Blocks**: Task 3 (Benefits cards)
  - **Blocked By**: Task 1 (Hero background)

  **References**:

  **Pattern References**:
  - `src/components/CommunityLandingPage.tsx:717-724` - Current primary CTA structure
  - `src/components/CommunityLandingPage.tsx:725-730` - Current secondary CTA structure
  - `src/components/CommunityLandingPage.tsx:42-44` - BRAND color tokens to use in shadow

  **API/Type References**:
  - Tailwind scale utility: `hover:scale-105` for 5% scale increase
  - Tailwind transition: `transition-all duration-300` for smooth animations
  - CSS box-shadow with rgba: `boxShadow: '0 20px 40px -12px rgba(242, 116, 62, 0.5)'`

  **External References**:
  - Tailwind transform docs: https://tailwindcss.com/docs/scale
  - CSS box-shadow generator: https://cssgenerator.org/box-shadow-css-generator.html

  **WHY Each Reference Matters**:
  - Lines 717-724: Current button to enhance - shows inline style + className pattern
  - Lines 42-44: Brand colors for shadow (accentWarm #f2743e)
  - Tailwind scale: Proper syntax for hover scale effect
  - Box-shadow: Technique for bold, colored shadows

  **Acceptance Criteria**:

  - [ ] Primary CTA has box-shadow with rgba(242, 116, 62, 0.5) color
  - [ ] Primary CTA scales to 1.05x on hover
  - [ ] ArrowRight icon translates 4px right on hover
  - [ ] Secondary CTA has enhanced glassmorphism (border-2, bg-white/10, backdrop-blur-xl)
  - [ ] Secondary CTA hover state changes bg to white/20 and border to white/40
  - [ ] All transitions smooth (300ms duration)

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Primary CTA button hierarchy (happy path)
    Tool: Playwright
    Preconditions: Dev server running, hero section visible
    Steps:
      1. Navigate to http://localhost:5173
      2. Locate primary CTA: const primaryBtn = page.locator('a[href="#register"]').first()
      3. Get initial box-shadow: const initialShadow = await primaryBtn.evaluate(el => window.getComputedStyle(el).boxShadow)
      4. Hover: await primaryBtn.hover()
      5. Wait 350ms for transition
      6. Get hover transform: const hoverTransform = await primaryBtn.evaluate(el => window.getComputedStyle(el).transform)
      7. Take screenshot: await primaryBtn.screenshot({path: '.sisyphus/evidence/task-2-cta-primary-hover.png'})
    Expected Result: initialShadow contains 'rgba(242, 116, 62', hoverTransform contains 'matrix(1.05' (scale 1.05)
    Failure Indicators: No shadow color, transform is 'none' or scale is 1.0
    Evidence: .sisyphus/evidence/task-2-cta-primary-hover.png

  Scenario: Secondary CTA glassmorphism (happy path)
    Tool: Playwright
    Preconditions: Dev server running
    Steps:
      1. Navigate to http://localhost:5173
      2. Locate secondary CTA: const secondaryBtn = page.locator('a[href="#benefits"]').first()
      3. Get backdrop-filter: const backdropFilter = await secondaryBtn.evaluate(el => window.getComputedStyle(el).backdropFilter)
      4. Hover: await secondaryBtn.hover()
      5. Wait 350ms
      6. Get hover bg: const hoverBg = await secondaryBtn.evaluate(el => window.getComputedStyle(el).backgroundColor)
      7. Take screenshot: await secondaryBtn.screenshot({path: '.sisyphus/evidence/task-2-cta-secondary-hover.png'})
    Expected Result: backdropFilter contains 'blur', hoverBg has increased opacity (rgba alpha > 0.1)
    Failure Indicators: backdropFilter is 'none', hoverBg unchanged
    Evidence: .sisyphus/evidence/task-2-cta-secondary-hover.png

  Scenario: CTA buttons on mobile viewport (edge case)
    Tool: Playwright
    Preconditions: Dev server running
    Steps:
      1. Set mobile viewport: await page.setViewportSize({width: 375, height: 667})
      2. Navigate to http://localhost:5173
      3. Locate both CTAs: const ctas = page.locator('a[href^="#"]').filter({hasText: /Daftar|Lihat/})
      4. Check stacking: const positions = await ctas.evaluateAll(els => els.map(el => el.getBoundingClientRect()))
      5. Take screenshot: await page.locator('section#hero').screenshot({path: '.sisyphus/evidence/task-2-cta-mobile.png'})
    Expected Result: Buttons stack vertically (y positions differ by > 50px), no overlap
    Failure Indicators: Buttons overlap, horizontal layout on mobile
    Evidence: .sisyphus/evidence/task-2-cta-mobile.png
  ```

  **Evidence to Capture**:
  - [ ] task-2-cta-primary-hover.png - Primary CTA with shadow + scale on hover
  - [ ] task-2-cta-secondary-hover.png - Secondary CTA glassmorphism on hover
  - [ ] task-2-cta-mobile.png - CTAs on mobile viewport

  **Commit**: YES
  - Message: `feat(ui): enhance CTA buttons with shadows and hover effects`
  - Files: `src/components/CommunityLandingPage.tsx`
  - Pre-commit: `npm run build`


- [x] 3. Benefits Cards Redesign - Accent Colors + Engaging Hover

  **What to do**:
  - Locate benefits cards rendering (lines ~765-850, the BENEFITS.map() section)
  - Wrap each card in a container with `group` class and CSS variable for accent color
  - Add accent bar at top of card: absolute positioned div, height 4px, background from benefit.color, transitions to 8px on hover
  - Wrap icon in colored background div: 56px circle, background benefit.color with 15% opacity, icon color from benefit.color
  - Add icon scale animation on hover: `group-hover:scale-110 transition-transform duration-300`
  - Add card hover effects: `hover:shadow-xl hover:-translate-y-1 transition-all duration-300`
  - Add decorative gradient blob on hover: absolute positioned, benefit.color, blur-2xl, opacity 0 → 20% on hover
  - Ensure dark mode compatibility with proper contrast

  **Must NOT do**:
  - Do NOT change BENEFITS array data structure
  - Do NOT modify benefit text content (title, desc)
  - Do NOT add stagger animations or complex orchestration
  - Do NOT use 3D transforms (rotateX/rotateY)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Complex visual redesign requiring design system thinking
  - **Skills**: [`frontend-design`]
    - `frontend-design`: Needed for distinctive card design and color differentiation
  - **Skills Evaluated but Omitted**:
    - `accessibility`: Not needed - cards already have proper semantics and ARIA

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (after Task 2)
  - **Blocks**: F1-F4 (Final verification)
  - **Blocked By**: Task 2 (CTA buttons)

  **References**:

  **Pattern References**:
  - `src/components/CommunityLandingPage.tsx:50-75` - BENEFITS array with color property
  - `src/components/CommunityLandingPage.tsx:765-850` - Current benefits cards rendering
  - `src/components/CommunityLandingPage.tsx:42-44` - BRAND tokens (not used in cards, but pattern reference)

  **API/Type References**:
  - React inline style with CSS variables: `style={{ '--accent-color': benefit.color } as React.CSSProperties}`
  - Tailwind group utilities: `group`, `group-hover:scale-110`
  - Tailwind arbitrary values: `bg-[${benefit.color}]/15` for colored backgrounds

  **External References**:
  - Tailwind group hover: https://tailwindcss.com/docs/hover-focus-and-other-states#styling-based-on-parent-state
  - CSS custom properties in React: https://react.dev/reference/react-dom/components/common#applying-css-styles

  **WHY Each Reference Matters**:
  - Lines 50-75: BENEFITS array structure - each item has unused `color` property to leverage
  - Lines 765-850: Current card rendering - shows map pattern and existing structure
  - Group utilities: Technique for parent-hover triggering child animations
  - CSS variables: Method for passing dynamic colors to pseudo-elements

  **Acceptance Criteria**:

  - [ ] Each benefit card has colored accent bar at top (4px height, 8px on hover)
  - [ ] Icon wrapped in colored circle background (benefit.color with 15% opacity)
  - [ ] Icon scales to 1.1x on card hover
  - [ ] Card translates -4px on Y-axis on hover
  - [ ] Card shadow increases on hover (shadow-sm → shadow-xl)
  - [ ] Decorative gradient blob appears on hover (opacity 0 → 20%)
  - [ ] All 4 benefit cards use different colors from array
  - [ ] Dark mode: colors remain visible with proper contrast

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Benefits cards show individual accent colors (happy path)
    Tool: Playwright
    Preconditions: Dev server running, benefits section visible
    Steps:
      1. Navigate to http://localhost:5173
      2. Scroll to benefits: await page.locator('#benefits').scrollIntoViewIfNeeded()
      3. Locate all benefit cards: const cards = page.locator('[data-benefit-card]') // or appropriate selector
      4. For each card (0-3):
         - Get accent bar color: const barColor = await card.locator('.accent-bar').evaluate(el => window.getComputedStyle(el).backgroundColor)
         - Get icon bg color: const iconBg = await card.locator('.icon-wrapper').evaluate(el => window.getComputedStyle(el).backgroundColor)
         - Take screenshot: await card.screenshot({path: `.sisyphus/evidence/task-3-benefit-card-${i}.png`})
      5. Assert all 4 colors are different
    Expected Result: 4 different accent bar colors matching BENEFITS array, icon backgrounds match
    Failure Indicators: All cards same color, or default gray/black
    Evidence: .sisyphus/evidence/task-3-benefit-card-0.png through task-3-benefit-card-3.png

  Scenario: Benefits card hover effects (happy path)
    Tool: Playwright
    Preconditions: Dev server running
    Steps:
      1. Navigate to http://localhost:5173
      2. Scroll to benefits: await page.locator('#benefits').scrollIntoViewIfNeeded()
      3. Locate first card: const card = page.locator('[data-benefit-card]').first()
      4. Get initial transform: const initialTransform = await card.evaluate(el => window.getComputedStyle(el).transform)
      5. Hover: await card.hover()
      6. Wait 350ms for transition
      7. Get hover transform: const hoverTransform = await card.evaluate(el => window.getComputedStyle(el).transform)
      8. Get icon scale: const iconScale = await card.locator('.icon-wrapper').evaluate(el => window.getComputedStyle(el).transform)
      9. Take screenshot: await card.screenshot({path: '.sisyphus/evidence/task-3-benefit-hover.png'})
    Expected Result: hoverTransform shows translateY(-4px), iconScale shows scale(1.1)
    Failure Indicators: No transform change, icon doesn't scale
    Evidence: .sisyphus/evidence/task-3-benefit-hover.png

  Scenario: Benefits cards in dark mode (edge case)
    Tool: Playwright
    Preconditions: Dev server running, dark mode enabled
    Steps:
      1. Navigate to http://localhost:5173
      2. Toggle dark mode: await page.evaluate(() => document.documentElement.classList.add('dark'))
      3. Scroll to benefits: await page.locator('#benefits').scrollIntoViewIfNeeded()
      4. Wait 500ms for transition
      5. Locate all cards: const cards = page.locator('[data-benefit-card]')
      6. For each card:
         - Get accent bar color: const barColor = await card.locator('.accent-bar').evaluate(el => window.getComputedStyle(el).backgroundColor)
         - Check contrast: parse RGB, calculate relative luminance
      7. Take screenshot: await page.locator('#benefits').screenshot({path: '.sisyphus/evidence/task-3-benefits-dark.png'})
    Expected Result: Accent colors visible in dark mode, contrast ratio ≥ 3:1
    Failure Indicators: Colors invisible or too bright/glaring
    Evidence: .sisyphus/evidence/task-3-benefits-dark.png
  ```

  **Evidence to Capture**:
  - [ ] task-3-benefit-card-0.png through task-3-benefit-card-3.png - Individual cards with accent colors
  - [ ] task-3-benefit-hover.png - Card with hover effects active
  - [ ] task-3-benefits-dark.png - All cards in dark mode

  **Commit**: YES
  - Message: `feat(ui): redesign benefits cards with accent colors and hover effects`
  - Files: `src/components/CommunityLandingPage.tsx`
  - Pre-commit: `npm run build`


---

## Final Verification Wave

> 4 review tasks run in PARALLEL after all implementation complete. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before marking work complete.

- [x] F1. Visual Regression Check - Compare Before/After Screenshots

  **What to do**:
  - Take baseline screenshots of hero, CTA, benefits sections BEFORE changes (if not already captured)
  - After all tasks complete, take new screenshots of same sections
  - Use Playwright's screenshot comparison or visual diff tool
  - Generate side-by-side comparison images
  - Verify improvements: hero has texture, CTAs have shadows, cards have colors
  - Check for unintended changes in other sections (header, footer, testimonials)

  **Recommended Agent Profile**: `visual-engineering` + `playwright` skill

  **QA**: Compare pixel differences, ensure changes only in target sections

  **Evidence**: `.sisyphus/evidence/final-visual-regression-report.png`

- [x] F2. Dark Mode Verification - Test All Changes in Dark Theme

  **What to do**:
  - Toggle dark mode via `document.documentElement.classList.add('dark')`
  - Navigate through all 3 modified sections
  - Verify texture/mesh gradients not too intense (opacity ≤ 0.05)
  - Verify CTA shadows visible but not glaring
  - Verify benefits card accent colors have proper contrast
  - Take screenshots of each section in dark mode
  - Check WCAG contrast ratios for text on colored backgrounds

  **Recommended Agent Profile**: `visual-engineering` + `accessibility` skill

  **QA**: All sections pass WCAG AA contrast (4.5:1 for text, 3:1 for UI components)

  **Evidence**: `.sisyphus/evidence/final-dark-mode-verification.png`

- [x] F3. Responsive Breakpoints QA - Test Mobile, Tablet, Desktop

  **What to do**:
  - Test 3 viewports: Mobile (375x667), Tablet (768x1024), Desktop (1920x1080)
  - For each viewport:
    - Navigate to landing page
    - Verify hero background renders correctly (no overflow, texture visible)
    - Verify CTAs stack properly on mobile, inline on desktop
    - Verify benefits cards grid: 1 column mobile, 2 tablet, 4 desktop
    - Test hover effects (desktop) and touch interactions (mobile)
  - Take screenshots at each breakpoint

  **Recommended Agent Profile**: `visual-engineering` + `playwright` skill

  **QA**: No layout breaks, all hover effects work on desktop, touch-friendly on mobile

  **Evidence**: `.sisyphus/evidence/final-responsive-mobile.png`, `final-responsive-tablet.png`, `final-responsive-desktop.png`

- [x] F4. Cross-Browser Compatibility - Test Chrome, Firefox, Safari

  **What to do**:
  - Run Playwright tests in 3 browsers: Chromium, Firefox, WebKit (Safari)
  - For each browser:
    - Navigate to landing page
    - Verify hero texture renders (SVG data URI support)
    - Verify CTA shadows and transforms work
    - Verify benefits card colors and hover effects
    - Check for browser-specific CSS bugs (backdrop-filter, transform, etc.)
  - Take screenshots in each browser
  - Document any browser-specific issues

  **Recommended Agent Profile**: `visual-engineering` + `playwright` skill

  **QA**: All features work in all 3 browsers, or graceful degradation documented

  **Evidence**: `.sisyphus/evidence/final-browser-chrome.png`, `final-browser-firefox.png`, `final-browser-webkit.png`

---

## Commit Strategy

- **Task 1**: `feat(ui): enhance hero background with texture and mesh gradients`
- **Task 2**: `feat(ui): enhance CTA buttons with shadows and hover effects`
- **Task 3**: `feat(ui): redesign benefits cards with accent colors and hover effects`

All commits follow conventional commits format with `feat(ui)` prefix.

---

## Success Criteria

### Verification Commands
```bash
# Start dev server
npm run dev

# Run Playwright visual tests (if configured)
npx playwright test

# Build for production (verify no errors)
npm run build
```

### Final Checklist
- [ ] Hero background shows visible texture + mesh gradients (not flat)
- [ ] Primary CTA has bold shadow (rgba 0.5 opacity) and scales 1.05x on hover
- [ ] Secondary CTA has enhanced glassmorphism (backdrop-blur-xl)
- [ ] All 4 benefits cards display individual accent colors
- [ ] Benefits cards have engaging hover effects (scale icon, translate card, show gradient blob)
- [ ] All changes work in dark mode with proper contrast
- [ ] Responsive: works on mobile (375px), tablet (768px), desktop (1920px)
- [ ] Cross-browser: works in Chrome, Firefox, Safari
- [ ] No regressions in other sections (header, footer, testimonials unchanged)
- [ ] Build succeeds with no TypeScript errors
- [ ] All Playwright QA scenarios pass with screenshot evidence

**Target Quality Score**: 8.5/10 (up from 7.5/10)

