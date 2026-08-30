# Repository Guidelines

Event-ops dashboard + public marketing site for **Metropolitan Mall Bekasi** (single mall, Indonesian UI copy). Remote: `github.com/andsfx/dashboard-calendar-event`. React 19 + TypeScript + Vite + Tailwind v4 SPA, Vercel serverless functions (`api/*.js`), Supabase (Postgres + Auth + RLS) and Cloudflare R2 for media. Respond to Andy in Indonesian by default; terse status updates with exact paths, commands, errors.

## Architecture & Data Flow

Two strictly separated data channels — never mix them:

1. **Public channel (browser → Supabase anon + RLS)**: `src/lib/supabase.ts` anon client, PKCE. Public reads (`events`, albums, news, directories) and public submissions (draft events, surveys, registrations) go direct. RLS must block sensitive reads; public endpoints strip PII (phone/email/pic/notes).
2. **Admin channel (browser → `/api/supabase-admin` → service role)**: all admin mutations POST `{action, ...payload}` with `credentials:'include'` via `adminAction()` (`src/utils/api/_shared.ts`). Server validates against zod `ACTION_SCHEMAS` (`src/lib/schemas.ts` client, `api/_lib/schemas.js` server), then uses service-role client. Service-role keys, R2 keys, admin tokens exist **server-side only** — never in client code or docs.

Auth: Supabase email/password → HttpOnly cookies `sb-access-token`/`sb-refresh-token` (`api/auth.js`); `requireAuth` (`api/_lib/auth.js`) verifies server-side with service role. Role hierarchy `superadmin > admin > viewer > eo_tenant | tenant_relation`; mid-tier roles get per-action gating + PII stripping (`api/tenant-survey.js` role arrays). `usePermission` (`src/hooks/usePermission.ts`) maps roles to ~18 granular booleans. Legacy password login (`api/admin-login.js`, `admin_session` cookie) is disabled unless `ALLOW_LEGACY_ADMIN=1`.

Boundary rule: DB is snake_case, client is camelCase. **Every** read/write crosses an explicit mapper — `dbEventToEventItem` / `eventItemToDbRow` (`src/utils/api/_shared.ts`), `dbTenantSurveyToTenantSurvey` / `tenantSurveyFormToDbRow` (`surveysApi.ts`), `mapRow` (`newsApi.ts`). PostgREST rejects unmapped inserts.

Event `status` is **derived from dates, never stored** (ADR 002, `getStatus` in `src/utils/eventUtils.ts`; tz Asia/Jakarta). Draft vs Event are distinct entities (ADR 001); approving a registration does NOT auto-create a Draft (ADR 003); letters are Supabase-only (ADR 004 killed the Apps Script letter path).

State: **no context, no global store**. Data hooks (`useEvents`, `useDraftEvents`, `useTenantSurveys`, `useAuth`) hold everything; modal/CRUD orchestration concentrates in `useDashboardHandlers` (12 modals) passed down as grouped `dp*` prop objects typed by `DashboardPage*` interfaces. Realtime = Supabase `postgres_changes` → debounced 400 ms full re-fetch, dashboard paths only (`useEvents.ts`).

Routing (`src/App.tsx`): react-router-dom v7, every route `lazy()` with named-export adapter `.then(m => ({ default: m.X }))` inside `<Suspense fallback={<DashboardSkeleton/>}>`. `/dashboard/*` is a catch-all with **conditional rendering inside `DashboardPage.tsx`** (no nested `<Routes>`); visible sections come from `getAllowedDashboardPaths(permissions)` (`dashboardNavigation.tsx`). Public: `/`, `/events`, `/gallery`, `/news`, `/sponsor`, `/tenants`, `/community`, `/survey/:eventId`, `/tenant-survey(/:eventId)` (anonymous, **no login**), `/tenant-survey-results`, `/letter/:id`.

## Key Directories

- `src/components/` — most components **flat** (59 files, incl. several "pages"); feature folders: `dashboard/`, `community/`, `survey/`, `admin/`, `forms/`, `pdf/`, `ui/` (shared primitives, `index.ts` barrel)
- `src/utils/api/` — domain API modules (`eventsApi`, `draftsApi`, `surveysApi`, `newsApi`, `albumsApi`) + `_shared.ts` (proxy, mappers, `SupabaseApiError`); re-exported through `src/utils/supabaseApi.ts` barrel
- `src/hooks/` — data + UI hooks; `src/lib/` — `supabase.ts` client, `schemas.ts` zod; `src/styles/` — Tailwind v4 `@theme` tokens; `src/constants/survey-options.ts` — survey enum source of truth
- `api/` — Vercel functions (ESM); `api/_lib/` — `auth.js`, `schemas.js`, `rateLimit.js` (in-memory per-IP sliding window), `r2Key.js` (MIME/prefix allowlists)
- `migrate/` — ~30 hand-written SQL (feature SQL, `tenant-event-surveys-v2…v4-rpc.sql`, `fix-*.sql`) + helpers; `supabase/migrations/` — 3 CLI-style files. **Migrations are applied manually** (SQL Editor / `migrate/run-schema.mjs`); no automated pipeline. DDL is a manual user step.
- `e2e/` — Playwright specs + `helpers.ts`; `docs/` — `SPEC.md` (product spec), `docs/adr/`, `docs/agents/` (issue-tracker, triage-labels, domain), `docs/tickets/`
- `improve/` — **separate prototype sandbox** with its own `AGENTS.md`. No production import from `improve/`; never commit its noise.

## Development Commands

```bash
npm run dev            # Vite on :5173
npm run build          # tsc && vite build — run after every change
npm test               # vitest (watch)
NODE_ENV=test npx vitest run   # Windows: NODE_ENV leaks from shell; without =test vitest fails ('act(...)' prod-build error)
npm run test:coverage  # v8, no thresholds
npm run test:e2e       # Playwright; auto-starts dev server on :5173
```

There are **no** `test:unit` / `test:visual` / `test:all` scripts. Verification habit: `npm run build` + targeted vitest file + browser/dev-server smoke; e2e/visual via Playwright when the surface is visual.

## Code Conventions & Common Patterns

- **TS strict +** `noUncheckedIndexedAccess`, `noImplicitReturns`, `noFallthroughCasesInSwitch` (`tsconfig.json`) → always null-guard indexed access (`const first = slots[0]; if (!first) return ''`). `@/*` alias is configured but imports use **relative paths** — follow existing style.
- **Components**: PascalCase files, `export function X()` named exports (`src/pages/` files are the default-export exception). Lazy-load with the named-export adapter shown above.
- **Styling**: Tailwind v4; tokens in `src/styles/theme.css` (`--color-brand-primary-*` tosca `#00918e`, slate palette overridden warm) + legacy aliases in `tokens.css`; custom class system `ui-*` in `utilities.css`; class composition via `cn()` (`clsx` + `tailwind-merge`, `src/utils/cn.ts`); icons `lucide-react` with shared size consts. Dark mode = `.dark` class. Visual source of truth: root `DESIGN.md` (+ `docs/DESIGN-SYSTEM.md` is historical).
- **UI copy and error messages in Indonesian** ("Gagal memuat…", "Terlalu banyak permintaan"); filter sentinel `'Semua'`.
- **Mutations are optimistic**: update local state → call API → rollback + surface error on failure; hooks return `boolean` success. Errors: `SupabaseApiError` (API layer), `AdminError` with kinds (`lib/schemas.ts`), Postgres 23505 → friendly Indonesian message; toasts via `useToast`.
- **Validation**: zod at every boundary (`ACTION_SCHEMAS` server, payload schemas client); FE form validators in `src/utils/validation.ts` return `{valid, errors}`. Prefer zod over `as` casts.
- **Serverless endpoints** export `async function handler(req, res)`, respond `{success, error?, data?}`, rate-limit via `enforceRateLimit`, admin routes same-origin (no CORS); public POST endpoints (`community-registration`, `sponsor-lead`) set CORS `*`, sanitize, rate-limit.
- **Tests colocated** in `__tests__/` beside source; mocks: `vi.mock('../lib/supabase', …)` with chainable builders; API tests use `vi.hoisted` state + raw `mockReq`/`mockRes` (no supertest).
- Markers: `// ─── Section ───` banners; `// ponytail: <note>` = deliberate cross-cutting design decision (don't "fix" without reading it).

## Important Files

`src/App.tsx` (routes, gating) · `src/types.ts` (all domain types; extend `EventBase`, not parallel interfaces) · `src/lib/supabase.ts` + `src/lib/schemas.ts` · `src/utils/api/_shared.ts` (mappers/proxy) · `src/hooks/useAuth.ts` (session via `/api/auth?action=me`; dev bypass `VITE_DEV_AUTO_LOGIN`) + `usePermission.ts` · `src/components/dashboard/DashboardPage.tsx` (inner router) + `dashboardNavigation.tsx` · `src/components/survey/rules.md` (**MUST read before touching survey form/API/types/migrations** — anonymous public form, v3 schema, FE/BE enum parity via `src/constants/survey-options.ts`) · `api/_lib/auth.js` + `api/supabase-admin.js` + `api/tenant-survey.js` · `vercel.json` (SPA rewrites, security headers, `api/*.js` maxDuration 60) · `docs/SPEC.md`, `CONTEXT.md` (glossary — use its vocabulary), `docs/adr/`.

Env vars — client: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_R2_PUBLIC_URL`, `VITE_DEV_AUTO_LOGIN`. Server-only: `SUPABASE_SERVICE_ROLE_KEY`, `R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET_NAME/R2_PUBLIC_URL`, `ADMIN_PASSWORD`/`ADMIN_SESSION_TOKEN`/`ALLOW_LEGACY_ADMIN`, `APPS_SCRIPT_URL`/`ADMIN_API_TOKEN` (legacy GAS migration proxy), `APIFY_API_TOKEN`, `MID_API_KEY`. **Never expose these values in code, docs, or output**; remote git URL may contain a credential — never copy it. (README's `VITE_R2_*` credential example is stale; code reads server-only `R2_*`.)

**Migrasi SQL** — `node migrate/run-schema.mjs [file.sql]` (default `supabase-schema.sql`) membaca env khusus `.env.supabase` (gitignored): `VITE_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ACCESS_TOKEN` (PAT `sbp_...` dari dashboard.supabase.com → Account → Access Tokens). PAT wajib: endpoint legacy `/pg/query` sudah ditutup Supabase — satu-satunya jalur DDL tanpa CLI adalah Management API (`POST https://api.supabase.com/v1/projects/<ref>/database/query`). Service role key hanya untuk CRUD REST, bukan DDL.

## Runtime/Tooling Preferences

- **npm is canonical** (`package-lock.json` is the lockfile of record; `pnpm-lock.yaml`/`pnpm-workspace.yaml` are ignored leftovers — never commit them). Node 24.x on Vercel; project `metmal-community-hub`; deploy = push to `main`.
- ESM everywhere (`"type": "module"`); Vercel functions are Node runtime, no cron.
- Workflows: GitHub issues via `gh` CLI on `andsfx/dashboard-calendar-event` with the five-label triage vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`) — see `docs/agents/`; read `CONTEXT.md` + `docs/adr/` before exploring domain questions; feature work follows the doc-first `update-fitur-*.md` brief pattern at repo root. CRUD is verified directly on live production (Vercel + Supabase), not just local; never run destructive checks against production (read-only verification).

## Testing & QA

- **Unit (vitest)**: jsdom + globals, setup `src/test/setup.ts` (mocks `matchMedia`, `IntersectionObserver`); 40+ files under `src/**/__tests__/` plus `api/__tests__/` (excluded from main suite config but vitest-runnable). Mock Supabase at module level, never spin real clients.
- **E2E (Playwright)**: `testDir e2e/`, chromium, `baseURL http://localhost:5173`, webServer auto-starts Vite with **pinned fake env** `VITE_SUPABASE_URL=https://test-project.supabase.co` — `mockAuth` in `e2e/helpers.ts` injects localStorage key `sb-test-project-auth-token` derived from that projectRef; changing either breaks auth mocks. `helpers.ts` also provides `setupSurveyApiMocks` / `setupSupabaseMocks` route interceptors and fixture data. Specs: `tenant-survey-public`, `tenant-survey-admin`, `tenant-survey-results` (fully mocked), `deck-assets` (screenshot regeneration against **real Supabase data** into `presentasi/assets/` — a utility, not a CI test; standalone variant: `node e2e/deck-screenshots.mjs`).
- Known quirks: Windows flaky vitest exit codes are environmental, not regressions; e2e last run green (`test-results/.last-run.json`). Coverage is configured but ungated.
