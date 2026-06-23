# Draft: Project Audit

## Requirements (confirmed)
- User want full project audit.
- Scope: UI/UX, Workflow, Security, others.

## Research Findings
- **UI/UX**: `CommunityLandingPage.tsx` (1016 lines), `PublicLandingPage.tsx` (764 lines), `AlbumManagerModal.tsx` (758 lines). Too big. Need split. Tailwind v4 used. Accessibility (a11y) recently improved (aria-labelledby on modals).
- **Workflow**: Vite + React 19 + Tailwind v4. State via custom hooks (`useEvents`, `useAuth`). Supabase replaces old Google Sheets API. Legacy Google Apps Script still used for letter requests.
- **Security**: 
  - Hardcoded Supabase credentials in `api/_lib/auth.js` already FIXED.
  - `.env` NOT in git history. Safe.
  - `npm audit` show 3 vulnerabilities: `react-router` (High), `ws` (Moderate). Need `npm audit fix`.
- **Testing**: `vitest` present. `api/community-registration.test.js` exists.
- **Performance**: Vercel caching missing in `api` routes, but `vercel.json` has Cache-Control for `/` and `/gallery`.

## Technical Decisions
- Need `npm audit fix` for security.
- Need component refactoring for UI/UX maintainability.
- Need legacy Google Apps Script removal if possible.

## Open Questions
- What fix first? Security (npm audit), Refactor (huge files), or Legacy Code (Google Apps Script)?
- Want automated tests (TDD) for new changes?

## Scope Boundaries
- INCLUDE: npm vulnerabilities, component splitting, legacy code migration.
- EXCLUDE: Database schema changes (unless needed for security).
