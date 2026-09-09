# Repository Guidelines

Event-ops dashboard + public marketing site for **Metropolitan Mall Bekasi** (single mall, Indonesian UI copy). Remote: `github.com/andsfx/dashboard-calendar-event`. React 19 + TypeScript + Vite + Tailwind v4 SPA. **Opsi B (ADR 005, sejak 2026-09-08): Supabase ditinggalkan total** — SPA di Vercel (`www.metmalcommunityspace.web.id`) memanggil REST API Express/Postgres di VPS Tailscale/Caddy `metmal.andotherstori.my.id` (stack `server/` + `deploy/vps/`); media tetap Cloudflare R2. Supabase project = paused. `api/*.js` Vercel lama = legacy mati (belum dihapus). Respond to Andy in Indonesian by default; terse status updates with exact paths, commands, errors.

## Architecture & Data Flow

Two strictly separated data channels — never mix them. Basis: `VITE_API_URL` (SPA di Vercel = `https://metmal.andotherstori.my.id`; lokal dev = `http://localhost:3001`), path `/api/v1/*`, helper `apiGet`/`apiPost` di `src/lib/rest.ts` (selalu `credentials:'include'`).

1. **Public channel (browser → REST Publik)**: reads (`GET /events`, `/themes`, `/holidays`, `/news`, `/albums`, `/areas`, `/tenant/events`, `/directory`, `/sponsor/events`) dan public submissions (`POST /registrations`, `/sponsor-leads`, `/survey/submit`, `/tenant/submit`) — dipetakan di `server/src/routes/{public,survey,tenant,extra}.js`. Semua lewat validasi + `enforceRateLimit`; PII (phone/email/pic) dibungkus dengan kolom tanpa-PII di SQL.
2. **Admin channel (browser → `/api/v1/admin/{action}`)**: semua mutasi admin POST `{action, ...payload}` via `adminAction()` (`src/utils/api/_shared.ts`). Guard `requireRole(['superadmin','admin'])` + whitelist zod `ACTION_SCHEMAS` (`server/src/lib/schemas.js`) — unknown action dibiarkan switch membalas, key tak dikenal ter-strip oleh zod. Semua SQL `pg` langsung (tanpa ORM); tiap write dicatat `logActivity`.

Auth: login POST `/auth/login` (bcrypt compare `users.password_hash` — akun Supabase-Auth lama di-reset via `server/scripts/create-admin.mjs --reset`) → HttpOnly cookies `sb-access-token`/`sb-refresh-token` (JWT HS256 `jose`, payload `{sub,role,email}`; **COOKIE_SAMESITE=none + Secure** wajib di produksi karena SPA Vercel cross-site). Role hierarchy `superadmin > admin > viewer > eo_tenant | tenant_relation`; matriks per-role di `server/src/auth.js` + `server/src/routes/tenant.js`. `usePermission` (`src/hooks/usePermission.ts`) maps roles ke ~18 granular booleans. Login legacy Apps Script / `admin_session` = mati.

Boundary rule: DB is snake_case, client is camelCase. **Every** read/write crosses an explicit mapper — `dbEventToEventItem` / `eventItemToDbRow` (`src/utils/api/_shared.ts`), `dbTenantSurveyToTenantSurvey` / `tenantSurveyFormToDbRow` (`surveysApi.ts`), `mapRow` (`newsApi.ts`). Mapper melindungi boundary; zod server menolak payload asing.

Event `status` is **derived from dates, never stored** (ADR 002, `getStatus` in `src/utils/eventUtils.ts`; tz Asia/Jakarta). Draft vs Event are distinct entities (ADR 001); approving a registration does NOT auto-create a Draft (ADR 003); letters kill Apps Script path (ADR 004) dan kini di VPS via `adminAction('listLetters'|'createLetter'|'updateLetter'|'deleteLetter')` pada tabel `generated_letters`.

State: **no context, no global store**. Data hooks (`useEvents`, `useDraftEvents`, `useTenantSurveys`, `useAuth`) hold everything; modal/CRUD orchestration concentrates in `useDashboardHandlers` (12 modals) passed down as grouped `dp*` prop objects typed by `DashboardPage*` interfaces. Update model = **polling** (bukan realtime): useEvents 30 s + debounce 400 ms, useDraftEvents 60 s saat enabled, useTenantSurveys 60 s (list) + 60 s analytics — legacy realtime `postgres_changes` dihapus bersama supabase-js.

Routing (`src/App.tsx`): react-router-dom v7, every route `lazy()` with named-export adapter `.then(m => ({ default: m.X }))` inside `<Suspense fallback={<DashboardSkeleton/>}>`. `/dashboard/*` is a catch-all with **conditional rendering inside `DashboardPage.tsx`** (no nested `<Routes>`); visible sections come from `getAllowedDashboardPaths(permissions)` (`dashboardNavigation.tsx`). Public: `/`, `/events`, `/gallery`, `/news`, `/sponsor`, `/tenants`, `/community`, `/survey/:eventId`, `/tenant-survey(/:eventId)` (anonymous, **no login**), `/tenant-survey-results`, `/letter/:id`.

## Key Directories

- `src/components/` — most components **flat** (59 files, incl. several "pages"); feature folders: `dashboard/`, `community/`, `survey/`, `admin/`, `forms/`, `pdf/`, `ui/` (shared primitives, `index.ts` barrel)
- `src/utils/api/` — domain API modules (`eventsApi`, `draftsApi`, `surveysApi`, `newsApi`, `albumsApi`, `sponsorshipApi`) + `_shared.ts` (ADMIN_PROXY_URL, mappers; re-export `ApiError` dari `lib/rest`); re-exported through `src/utils/domainApi.ts` barrel
- `src/hooks/` — data + UI hooks; `src/lib/` — `rest.ts` (apiGet/apiPost/apiUrl + ApiError), `schemas.ts` zod; `src/styles/` — Tailwind v4 `@theme` tokens; `src/constants/survey-options.ts` — survey enum source of truth
- `server/` — Express backend REST production (ESM, Node 20): `src/index.js`, `src/db.js` (pg Pool), `src/auth.js` (JWT jose + bcrypt js + cookie), `src/r2.js` (presign S3 R2 + allowlist, magic-byte check), `src/routes/` (`public.js`, `auth.js`, `admin.js` — aksi CRUD + `lib/schemas.js` ACTION_SCHEMAS, `survey.js`, `tenant.js` — anon + role matrix, `extra.js` — community reg + sponsor + users + instagram + event-og) · `schema.sql` (DDL satu file) · `scripts/create-admin.mjs` (seed/reset bcrypt user)
- `deploy/vps/` — stack produksi: `docker-compose.yml` (postgres 16-alpine + api node20 + nginx 1.27-alpine; nginx bind `127.0.0.1:8080` di VPS ini karena host Caddy memegang 80/443), `nginx.conf` (static SPA + proxy /api/v1 + rewrite OG `/events/:id` → `/api/v1/event-og?id=$1`), `backup.sh` (pg_dump harian rotasi 14 ke `/opt/metmal/backups`, cron 03:00 di host), `README-DEPLOY.md`
- `scripts/migrate/` — skrip migrasi satu kali Opsi B: `dump-prod.mjs` (20 tabel → `seed/*.json`, gitignored), `photos-to-r2.mjs` (legacy storage → R2 + `photo-url-map.json`), `seed-vps.mjs` (FK-safe, idempotent `ON CONFLICT DO NOTHING`; `seed/` di-gitignore)
- `e2e/` — Playwright specs + `helpers.ts`; `docs/` — `SPEC.md`, `docs/adr/` (termasuk `005-vps-postgres-lepas-supabase.md`), `docs/agents/`, `docs/tickets/`
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
- **Mutations are optimistic**: update local state → call API → rollback + surface error on failure; hooks return `boolean` success. Errors: `ApiError` (`lib/rest`; throw langsung dari API modules), `AdminError` with kinds (`lib/schemas.ts`), Postgres 23505 → friendly Indonesian message; toasts via `useToast`.
- **Validation**: zod at every boundary (`ACTION_SCHEMAS` server, payload schemas client); FE form validators in `src/utils/validation.ts` return `{valid, errors}`. Prefer zod over `as` casts.
- **Backend**: Express `router.method((req,res)=>...)` di `server/src/routes/`, respons `{success, error?, data?}`, rate-limit `enforceRateLimit` + `clientIp` bersama (`server/src/lib/rateLimit.js`; baca `X-Real-IP` hasil `real_ip` nginx — XFF mentah diabaikan), admin pakai `requireRole` + zod `validateAction`; CORS whitelist `CORS_ORIGIN` (origin jahat → 403).
- **Tests colocated** in `__tests__/` beside source; semua mock **fetch route** ke `REST` (pola di `src/utils/domainApi.test.ts`, `src/utils/__tests__/eventAreasApi.test.ts`) dengan `vi.hoisted` state + raw `mockReq`/`mockRes` (no supertest).
- Markers: `// ─── Section ───` banners; `// ponytail: <note>` = deliberate cross-cutting design decision (don't "fix" without reading it).

## Important Files

`src/App.tsx` (routes, gating) · `src/types.ts` (all domain types; extend `EventBase`, not parallel interfaces) · `src/lib/rest.ts` (apiGet/apiPost) + `src/lib/schemas.ts` (zod client) · `src/utils/api/_shared.ts` (mappers/ADMIN_PROXY_URL) · `src/hooks/useAuth.ts` (session via `/api/v1/auth/me`; dev bypass `VITE_DEV_AUTO_LOGIN`) + `usePermission.ts` · `src/components/dashboard/DashboardPage.tsx` (inner router) + `dashboardNavigation.tsx` · `src/components/survey/rules.md` (**MUST read before touching survey form/API/types/migrations** — anonymous public form, v3 schema, FE/BE enum parity via `src/constants/survey-options.ts`) · `server/src/index.js` + `server/src/auth.js` + `server/src/routes/admin.js` · `server/src/lib/schemas.js` (ACTION_SCHEMAS) + `server/src/routes/tenant.js` (matriks role + MID proxy) · `server/schema.sql` (DDL) · `deploy/vps/docker-compose.yml` + `deploy/vps/nginx.conf` · `vercel.json` (SPA rewrites + OG eksternal ke VPS `/events/:id`, security headers) · `docs/SPEC.md`, `CONTEXT.md` (glossary — pakai kosakatanya), `docs/adr/`.

Env vars — client: `VITE_API_URL` (**required di produksi**, tidak dipakai lokal bila SPA+backend satu host), `VITE_R2_PUBLIC_URL`, `VITE_DEV_AUTO_LOGIN`. Server-only (di `deploy/vps/.env` di VPS, jangan commit): `DATABASE_URL`, `JWT_SECRET`, `POSTGRES_PASSWORD`, `COOKIE_DOMAIN` (opsi), **`COOKIE_SAMESITE=none`** (wajib cross-site Vercel→VPS), `CORS_ORIGIN` (whitelist), `R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET_NAME/R2_PUBLIC_URL`, `MID_API_KEY` (proxy tenant). **Never expose these values in code, docs, or output**; remote git URL may contain a credential — never copy it.

**Operasional VPS (host `vm-2-245-ubuntu` Tailscale, IP publik `43.134.72.148`, repo `/opt/metmal`)**:
- Update stack: edit repo lokal → `scp` file → `docker compose -f /opt/metmal/deploy/vps/docker-compose.yml up -d --force-recreate <service>`.
- Backup DB: `deploy/vps/backup.sh` (cron host 03:00 → `/opt/metmal/backups`, rotasi 14 file, `gunzip -t` validasi). Restore: `gunzip -c <file> | docker compose exec -T postgres psql -U metmal -d metmal`.
- Reset password user (bcrypt, via env — JANGAN via argv): `ADMIN_PASSWORD='...' docker compose exec -e ADMIN_PASSWORD api node server/scripts/create-admin.mjs <email> "" --reset`.
- Migrasi data satu kali (sudah selesai 2026-09-08; 811 baris): `scripts/migrate/dump-prod.mjs` → `photos-to-r2.mjs --apply` → `seed-vps.mjs --apply` (ulang-apply aman, idempotent).
- Migrasi SQL baru: DDL ditulis di `server/schema.sql` (lalu `docker compose exec -T postgres psql -U metmal -d metmal -f -`).

## Runtime/Tooling Preferences

- **npm is canonical** (`package-lock.json` is the lockfile of record; `pnpm-lock.yaml`/`pnpm-workspace.yaml` are ignored leftovers — never commit them). Node 24.x lokal; backend produksi `node:20-alpine` di container (compose meng-npm-ci sendiri di named volume).
- ESM everywhere (`"type": "module"`); backend runtime Node 20 ESM, no cron in container (cron backup di host).
- Workflows: GitHub issues via `gh` CLI on `andsfx/dashboard-calendar-event` with the five-label triage vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`) — see `docs/agents/`; read `CONTEXT.md` + `docs/adr/` before exploring domain questions; feature work follows the doc-first `update-fitur-*.md` brief pattern at repo root. CRUD diverifikasi langsung pada produksi (Vercel SPA + API `metmal.andotherstori.my.id`), tidak hanya lokal; jangan jalankan resource-destructive checks ke produksi (read-only verification).

## Testing & QA

- **Unit (vitest)**: jsdom + globals, setup `src/test/setup.ts` (mocks `matchMedia`, `IntersectionObserver`); 63 file / 446 test hijau setelah migrasi (fetch-REST mocks; `api/__tests__/` legacy supabase tidak masuk suite utama tapi vitest-runnable). Mock REST di global fetch per-URL, jangan spin server sungguhan.
- **E2E (Playwright)**: `testDir e2e/`, chromium, `baseURL http://localhost:5173`, webServer auto-starts Vite. `helpers.ts` era-Supabase (inject localStorage auth token + Mock Supabase REST) **belum di-update ke model cookie/REST Opsi B** — specs `tenant-survey-*`/`replay` mungkin pecah; e2e tetap utility dok, bukan CI gate. `deck-assets` (regenerate screenshot ke `presentasi/assets/`) juga di-freeze binding ke Supabase-URL-tidak-ada — sedang di-freeze.
- Known quirks: Windows flaky vitest exit codes are environmental, not regressions; e2e last run green pramigration (`test-results/.last-run.json` dari lama). Coverage configured, ungated.
