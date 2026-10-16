# Repository Guidelines

Event-ops dashboard + public marketing site for **Metropolitan Mall Bekasi** (single mall, Indonesian UI copy). Remote: `github.com/andsfx/dashboard-calendar-event`. React 19 + TypeScript + Vite + Tailwind v4 SPA. **Opsi B (ADR 005, sejak 2026-09-08): Supabase ditinggalkan total** — SPA di Vercel (`www.metmalcommunityspace.web.id`) memanggil REST API Express/Postgres di VPS Tailscale/Caddy `metmal.metmalcommunityspace.web.id` (stack `server/` + `deploy/vps/`; `api.metmalcommunityspace.web.id` lama = NXDOMAIN, jangan dipakai); media tetap Cloudflare R2. Supabase project = paused; `api/*.js` Vercel lama sudah dihapus tuntas (commit `a60dd8d`). Respond to Andy in Indonesian by default; terse status updates with exact paths, commands, errors.

## Architecture & Data Flow

Two strictly separated data channels — never mix them. Basis: `VITE_API_URL` (SPA di Vercel = `https://metmal.metmalcommunityspace.web.id`; lokal dev = `http://localhost:3001`), path `/api/v1/*`, helper `apiGet`/`apiPost` di `src/lib/rest.ts` (selalu `credentials:'include'`).

1. **Public channel (browser → REST Publik)**: reads (`GET /events`, `/themes`, `/holidays`, `/news`, `/albums`, `/areas`, `/tenant/events`, `/directory`, `/sponsor/events`) dan public submissions (`POST /registrations`, `/sponsor-leads`, `/survey/submit`, `/tenant/submit`) — dipetakan di `server/src/routes/{public,survey,tenant,extra}.js`. Catatan prefix: survey router di-mount di `/api/v1/survey` (jadi `/survey/summary`, `/survey/submit`), tenant router di `/api/v1/tenant` (jadi `/tenant/results-list`, `/tenant/submit` — BUKAN `/tenant-survey-results`, itu path route SPA). Semua lewat validasi + `enforceRateLimit`; PII (phone/email/pic) dibungkus dengan kolom tanpa-PII di SQL.
2. **Admin channel (browser → `/api/v1/admin/{action}`)**: semua mutasi admin POST `{action, ...payload}` via `adminAction()` (`src/utils/api/_shared.ts`). Guard `requireRole(['superadmin','admin'])` + whitelist zod `ACTION_SCHEMAS` (`server/src/lib/schemas.js`) — unknown action dibiarkan switch membalas. **Catatan:** zod TIDAK strip key asing di semua aksi — banyak schema memakai `.passthrough()`, jadi keamanan kolom yang sebenarnya berasal dari whitelist manual di `server/src/routes/admin.js` (`ALLOWED`/`DRAFT_COLUMNS`/`NEWS_COLUMNS` + parameter binding). Jangan mengandalkan zod sebagai satu-satunya pertahanan. Semua SQL `pg` langsung (tanpa ORM); tiap write dicatat `logActivity`.

Auth: login POST `/auth/login` (bcrypt compare `users.password_hash` — akun Supabase-Auth lama di-reset via `server/scripts/create-admin.mjs --reset`) → HttpOnly cookies `sb-access-token`/`sb-refresh-token` (JWT HS256 `jose`, payload `{sub,role,email,typ,ver}`; **COOKIE_SAMESITE=none + Secure** wajib di produksi karena SPA Vercel cross-site). Pencabutan token lewat `users.token_version`: access+refresh membawa claim `ver`, `authenticate` membandingkannya di kedua jalur, dan `POST /auth/logout` + `create-admin --reset` menaikkannya (logout gagal → 5xx, bukan sukses palsu). Migrasi: `server/migrations/2026-10-04-user-token-version.sql` **sebelum** deploy. Role hierarchy `superadmin > admin > demo > viewer > eo_tenant | tenant_relation`; matriks per-role di `server/src/auth.js` + `server/src/routes/tenant.js`. Role `demo` = lihat semua, ubah tidak — ditegakkan backend (`READ_ONLY_ACTIONS` allowlist di `server/src/auth.js`; aksi di luar allowlist ditolak 403), jadi menyembunyikan tombol di UI saja tidak cukup. `usePermission` (`src/hooks/usePermission.ts`) maps roles ke granular booleans; flag `canView*` memisahkan "boleh lihat" dari `canManage*` ("boleh kelola"). Login legacy Apps Script / `admin_session` = mati.

Boundary rule: DB is snake_case, client is camelCase. **Every** read/write crosses an explicit mapper — `dbEventToEventItem` / `eventItemToDbRow` (`src/utils/api/_shared.ts`), `dbTenantSurveyToTenantSurvey` / `tenantSurveyFormToDbRow` (`surveysApi.ts`), `mapRow` (`newsApi.ts`). Mapper melindungi boundary; zod server menolak payload asing.

Event `status` (temporal: `upcoming`/`ongoing`/`past`) is **derived from dates, never stored as authority** (ADR 002 + ADR 008, `getStatus` in `src/utils/eventUtils.ts`; tz Asia/Jakarta). Kolom `events.status` di DB **hanya** menyimpan flag lifecycle `'draft' | 'published'` (gerbang visibilitas publik); writer memaksa non-draft jadi `'published'` dan query waktu memakai helper tanggal di `server/src/lib/eventWindow.js` (lihat ADR 008). Draft vs Event are distinct entities (ADR 001); approving a registration does NOT auto-create a Draft (ADR 003); letters kill Apps Script path (ADR 004) dan kini di VPS via `adminAction('listLetters'|'createLetter'|'updateLetter'|'deleteLetter')` pada tabel `generated_letters`.

State: **no context, no global store**. Data hooks (`useEvents`, `useDraftEvents`, `useTenantSurveys`, `useAuth`) hold everything; modal/CRUD orchestration concentrates in `useDashboardHandlers` (12 modals) passed down as grouped `dp*` prop objects typed by `DashboardPage*` interfaces. Update model = **polling** (bukan realtime): useEvents 30 s + debounce 400 ms, useDraftEvents 60 s saat enabled, useTenantSurveys 60 s (list) + 60 s analytics — legacy realtime `postgres_changes` dihapus bersama supabase-js.

Routing (`src/App.tsx`): react-router-dom v7, every route `lazy()` with named-export adapter `.then(m => ({ default: m.X }))` inside `<Suspense fallback={<DashboardSkeleton/>}>`. `/dashboard/*` is a catch-all with **conditional rendering inside `DashboardPage.tsx`** (no nested `<Routes>`); visible sections come from `getAllowedDashboardPaths(permissions)` (`dashboardNavigation.tsx`). Public: `/`, `/events`, `/gallery`, `/news`, `/sponsor`, `/tenants`, `/community`, `/survey/:eventId`, `/tenant-survey(/:eventId)` (anonymous, **no login**), `/tenant-survey-results`, `/letter/:id`.

## Key Directories

- `src/pages/` — komponen level-route (public + `/dashboard` login), tiap file 1 rute lazy; `src/components/` — semua **berkelompok**, tidak ada file flat di akarnya: `modals/` (dialog/overlay), `views/` (mode tampilan: kalender, kanban, timeline), `events/` (widget domain event), `drafts/` (antrian pra-jadwal), `media/` (galeri/lightbox), `ui/` (primitif bersama + `index.ts` barrel), `shared/`, `nav/`, plus feature folder `dashboard/`, `community/`, `survey/`, `admin/`, `forms/`, `pdf/`. Test colocated di `__tests__/` milik folder masing-masing
- `src/utils/api/` — domain API modules (`eventsApi`, `draftsApi`, `surveysApi`, `newsApi`, `albumsApi`, `sponsorshipApi`) + `_shared.ts` (ADMIN_PROXY_URL, mappers; re-export `ApiError` dari `lib/rest`); re-exported through `src/utils/domainApi.ts` barrel
- `src/hooks/` — data + UI hooks; `src/lib/` — `rest.ts` (apiGet/apiPost/apiUrl + ApiError), `schemas.ts` zod; `src/styles/` — Tailwind v4 `@theme` tokens; `src/constants/survey-options.ts` — survey enum source of truth
- `server/` — Express backend REST production (ESM, Node 20): `src/index.js`, `src/db.js` (pg Pool), `src/auth.js` (JWT jose + bcrypt js + cookie), `src/r2.js` (presign S3 R2 + allowlist, magic-byte check), `src/routes/` (`public.js`, `auth.js`, `admin.js` — aksi CRUD + `lib/schemas.js` ACTION_SCHEMAS, `survey.js`, `tenant.js` — anon + role matrix, `extra.js` — community reg + sponsor + users + instagram + event-og) · `schema.sql` (DDL satu file) · `scripts/create-admin.mjs` (seed/reset bcrypt user)
- `deploy/vps/` — stack produksi: `docker-compose.yml` (postgres 16-alpine + api node20 + nginx 1.27-alpine; nginx bind `127.0.0.1:8080` di VPS ini karena host Caddy memegang 80/443), `nginx.conf` (static SPA + proxy /api/v1 + rewrite OG `/events/:id` → `/api/v1/event-og?id=$1`), `backup.sh` (pg_dump harian rotasi 14 ke `/opt/metmal/backups`, cron 03:00 di host), `README-DEPLOY.md`
- `scripts/migrate/` — skrip migrasi satu kali Opsi B: `dump-prod.mjs` (20 tabel → `seed/*.json`, gitignored), `photos-to-r2.mjs` (legacy storage → R2 + `photo-url-map.json`), `seed-vps.mjs` (FK-safe, idempotent `ON CONFLICT DO NOTHING`; `seed/` di-gitignore)
- `e2e/` — Playwright specs + `helpers.ts`; `docs/` — `SPEC.md`, `docs/adr/` (termasuk `005-vps-postgres-lepas-supabase.md`), `docs/agents/`, `docs/tickets/`, `docs/features/` (brief `update-fitur-*.md`), `docs/research/`, `docs/reports/`
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
- **Validation**: zod at every boundary (`ACTION_SCHEMAS` server, payload schemas client); FE form validators in `src/utils/validation.ts` return `{valid, errors}`. Prefer zod over `as` casts. **Zod bukan satu-satunya pertahanan:** sebagian schema `.passthrough()`, jadi whitelist kolom manual di route tetap wajib.
- **Migrasi DB**: `server/migrations/*.sql` idempoten, dijalankan manual di VPS (`docker compose exec -T postgres psql -U metmal -d metmal < server/migrations/<file>.sql`) **sebelum** kode terkait di-deploy. `server/schema.sql` hanya untuk DB baru (`CREATE TABLE IF NOT EXISTS` tidak mengubah tabel existing).
- **Backend**: Express `router.method((req,res)=>...)` di `server/src/routes/`, respons `{success, error?, data?}`, rate-limit `enforceRateLimit` + `clientIp` bersama (`server/src/lib/rateLimit.js`; baca `X-Real-IP` hasil `real_ip` nginx — XFF mentah diabaikan), admin pakai `requireRole` + zod `validateAction`; CORS whitelist `CORS_ORIGIN` (origin jahat → 403).
- **Kolom non-skalar wajib lewat `server/src/lib/pgValues.js`** — `events.categories`/`draft_events.categories` bertipe **`TEXT[]`** (bukan JSONB): kirim **array JS** via `toTextArray(...)`, JANGAN `JSON.stringify(...)` — itu menghasilkan `malformed array literal` (22P02) dan muncul ke user sebagai "Gagal memperbarui — Perubahan belum tersimpan". Hanya `day_time_slots` yang JSONB (`toJsonb`/`JSON.stringify`). Berlaku di `admin.js` (createEvent/updateEvent/batchCreateEvents/publishDraft/createDraft/updateDraft) dan `public.js` (`POST /drafts`).
- **Tests colocated** in `__tests__/` beside source; semua mock **fetch route** ke `REST` (pola di `src/utils/domainApi.test.ts`, `src/utils/__tests__/eventAreasApi.test.ts`) dengan `vi.hoisted` state + raw `mockReq`/`mockRes` (no supertest).
- Markers: `// ─── Section ───` banners; `// ponytail: <note>` = deliberate cross-cutting design decision (don't "fix" without reading it).

## Important Files

`src/App.tsx` (routes, gating) · `src/types/index.ts` (all domain types; extend `EventBase`, not parallel interfaces) · `src/lib/rest.ts` (apiGet/apiPost) + `src/lib/schemas.ts` (zod client) · `src/utils/api/_shared.ts` (mappers/ADMIN_PROXY_URL) · `src/hooks/useAuth.ts` (session via `/api/v1/auth/me`; dev bypass `VITE_DEV_AUTO_LOGIN`) + `usePermission.ts` · `src/components/dashboard/DashboardPage.tsx` (inner router) + `dashboardNavigation.tsx` · `src/components/survey/rules.md` (**MUST read before touching survey form/API/types/migrations** — anonymous public form, v3 schema, FE/BE enum parity via `src/constants/survey-options.ts`) · `server/src/index.js` + `server/src/auth.js` + `server/src/routes/admin.js` · `server/src/lib/schemas.js` (ACTION_SCHEMAS) + `server/src/routes/tenant.js` (matriks role + MID proxy) · `server/schema.sql` (DDL) · `deploy/vps/docker-compose.yml` + `deploy/vps/nginx.conf` · `vercel.json` (SPA rewrites + OG eksternal ke VPS `/events/:id`, security headers) · `docs/SPEC.md`, `CONTEXT.md` (glossary — pakai kosakatanya), `docs/adr/`.

Env vars — client: `VITE_API_URL` (**required di produksi, dan wajib juga untuk environment Preview Vercel** — env Vercel berlaku per-environment; build preview tanpa var ini menembak same-origin `/api/v1` → 404 di semua panggilan; tidak dipakai lokal bila SPA+backend satu host), `VITE_R2_PUBLIC_URL`, `VITE_DEV_AUTO_LOGIN`. Server-only (di `deploy/vps/.env` di VPS, jangan commit): `DATABASE_URL`, `JWT_SECRET`, `POSTGRES_PASSWORD`, `COOKIE_DOMAIN` (opsi), **`COOKIE_SAMESITE=none`** (wajib cross-site Vercel→VPS), `CORS_ORIGIN` (whitelist origin, exact-match; entri ber-`*` = pola glob beranchor di `server/src/lib/corsOrigin.js` — dipakai untuk hostname deployment Vercel yang berubah tiap push, wajib memuat slug tim), `R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET_NAME/R2_PUBLIC_URL`, `MID_API_KEY` (proxy tenant). **Never expose these values in code, docs, or output**; remote git URL may contain a credential — never copy it.

**Operasional VPS (host `vm-2-245-ubuntu` Tailscale, IP publik `43.134.72.148`, repo `/opt/metmal`)**:
- Akses SSH — dua jalur, keduanya `User root` dengan kunci `~/.ssh/evonic_local` (tanpa passphrase, untuk otomasi) via alias di `~/.ssh/config`:
  - `ssh medprom` — lewat **IP publik** `43.134.72.148`; dipakai lebih dulu agar tidak bergantung pemeriksaan Tailscale berkala.
  - `ssh medprom-ts` — lewat **Tailscale** `100.69.24.32` (tailnet `andotherstori@`); Tailscale SSH bisa meminta satu kali auth browser saat pertama. Berguna bila IP publik diblokir/berubah.
  - **JANGAN** `ssh vm-2-245-ubuntu` tanpa alias: policy tailnet menolak user `malme` ("tailnet policy does not permit you to SSH as user"), jadi sambung sebagai `root` lewat alias di atas. Kunci & nilai rahasia tidak pernah dicopy ke kode/docs/output.
- **Cek database produksi (read-only) — prosedur: `docs/agents/vps-db-access.md`.** Ringkasnya: `ssh medprom-ts` (Tailscale) atau `ssh medprom` (IP publik) → `cd /opt/metmal/deploy/vps && docker compose exec -T postgres psql -U metmal -d metmal -c "<query>"`. Postgres TIDAK di-map ke host; selalu lewat container. Verifikasi produksi bersifat **read-only** — jangan mutasi data untuk membuktikan perilaku.
- Update stack: edit repo lokal → `scp` file → `docker compose -f /opt/metmal/deploy/vps/docker-compose.yml up -d --force-recreate <service>`.
- Backup DB: `deploy/vps/backup.sh` (cron host 03:00 → `/opt/metmal/backups`, rotasi 14 file, `gunzip -t` validasi). Restore: `gunzip -c <file> | docker compose exec -T postgres psql -U metmal -d metmal`.
- Reset password user (bcrypt, via env — JANGAN via argv): `ADMIN_PASSWORD='...' docker compose exec -e ADMIN_PASSWORD api node server/scripts/create-admin.mjs <email> "" --reset`.
- Migrasi data satu kali (sudah selesai 2026-09-08; 811 baris): `scripts/migrate/dump-prod.mjs` → `photos-to-r2.mjs --apply` → `seed-vps.mjs --apply` (ulang-apply aman, idempotent).
- Migrasi SQL baru: DDL ditulis di `server/schema.sql` (lalu `docker compose exec -T postgres psql -U metmal -d metmal -f -`).

## Runtime/Tooling Preferences

- **npm is canonical** (`package-lock.json` is the lockfile of record; `pnpm-lock.yaml`/`pnpm-workspace.yaml` are ignored leftovers — never commit them). Node 24.x lokal; backend produksi `node:20-alpine` di container (compose meng-npm-ci sendiri di named volume).
- ESM everywhere (`"type": "module"`); backend runtime Node 20 ESM, no cron in container (cron backup di host).
- Workflows: GitHub issues via `gh` CLI on `andsfx/dashboard-calendar-event` with the five-label triage vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`) — see `docs/agents/`; read `CONTEXT.md` + `docs/adr/` before exploring domain questions; feature work follows the doc-first `update-fitur-*.md` brief pattern in `docs/features/`. CRUD diverifikasi langsung pada produksi (Vercel SPA + API `metmal.metmalcommunityspace.web.id`), tidak hanya lokal; jangan jalankan resource-destructive checks ke produksi (read-only verification).

## Testing & QA

- **Unit (vitest)**: jsdom + globals, setup `src/test/setup.ts` (mocks `matchMedia`, `IntersectionObserver`, object URL — dijaga `typeof window`/`typeof URL` agar aman untuk tes ber-`@vitest-environment node`); 102 file / 777 test hijau (verifikasi 2026-10-04; `NODE_ENV=test` WAJIB — tanpa itu React memakai build produksi dan tes `act()` gagal menyesatkan). Mock REST di global fetch per-URL, jangan spin server sungguhan. CI: `.github/workflows/ci.yml` (tsc + vitest + build).
- **E2E (Playwright)**: `testDir e2e/`, chromium, `baseURL http://localhost:5173`, webServer auto-starts Vite. `helpers.ts` sudah Opsi B (mock cookie JWT + REST `/api/v1`, one-handler dispatch — jangan regresi ke Supabase-era localStorage injection); e2e tetap utility dok, bukan CI gate. `deck-assets` (regenerate screenshot ke `presentasi/assets/`) juga di-freeze binding ke Supabase-URL-tidak-ada — sedang di-freeze.
- Known quirks: Windows flaky vitest exit codes are environmental, not regressions; e2e last run green pramigration (`test-results/.last-run.json` dari lama). Coverage configured, ungated.

<!-- antislop:start -->
## antislop
For UI, copy, people, mobile layout, or code comments work, read `antislop.md` (core) and then the skill for the task:
- UI / visual: `skills/antislop-ui/SKILL.md`
- Copy & text: `skills/antislop-copywriting/SKILL.md`
- People: `skills/antislop-human/SKILL.md`
- Mobile / responsive: `skills/antislop-layoutmobile/SKILL.md`
- Code comments: `skills/antislop-code/SKILL.md`
Before starting, follow the core's "Two Usage Modes" section in strict order: explicit session instruction first, then global preference, then ask. A session instruction always wins. For a resolved mode, say `antislop active: <mode> (session override).` or `antislop active: <mode> (global preference).` once before presenting findings or making edits, using the actual mode and source. Acknowledging the user's request without naming the source does not replace this notice.
Only an explicit choice of antislop during or after selects a session mode. A request to review, audit, or avoid file edits does not select antislop's mode; read the global preference in that case. Another skill's mode does not select antislop's mode.
If the mode is unresolved, ask during/after and end the response; wait for the answer before any UI review, planning, or concept. For read-only tasks, put the active-mode notice only at the start of the final answer, never in progress messages. For editing tasks, announce before the first edit and omit it from the final answer.
To update antislop later: download `antislop.md` again, or run `npx antislop-ai --update` if it was installed as skill folders.
<!-- antislop:end -->
