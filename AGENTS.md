# Repository Guidelines

Event-ops dashboard + public marketing site for **Metropolitan Mall Bekasi** (single mall, Indonesian UI copy). Remote: `github.com/andsfx/dashboard-calendar-event`. React 19 + TypeScript + Vite + Tailwind v4 SPA. **Opsi B (ADR 005, sejak 2026-09-08): Supabase ditinggalkan total** — SPA di Vercel (`www.metmalcommunityspace.web.id`) memanggil REST API Express/Postgres di VPS Tailscale/Caddy `metmal.metmalcommunityspace.web.id` (stack `server/` + `deploy/vps/`; `api.metmalcommunityspace.web.id` lama = NXDOMAIN, jangan dipakai); media tetap Cloudflare R2. Supabase project = paused; `api/*.js` Vercel lama sudah dihapus tuntas (commit `a60dd8d`). Respond to Andy in Indonesian by default; terse status updates with exact paths, commands, errors.

## Architecture & Data Flow

Two strictly separated data channels — never mix them. Basis: `VITE_API_URL` (SPA di Vercel = `https://metmal.metmalcommunityspace.web.id`; lokal dev = `http://localhost:3001`), path `/api/v1/*`, helper `apiGet`/`apiPost` di `src/lib/rest.ts` (selalu `credentials:'include'`).

1. **Public channel (browser → REST Publik)**: reads (`GET /events`, `/themes`, `/holidays`, `/news`, `/albums`, `/areas`, `/tenant/events`, `/directory`, `/sponsor/events`) dan public submissions (`POST /registrations`, `/sponsor-leads`, `/survey/submit`, `/tenant/submit`) — dipetakan di `server/src/routes/{public,survey,tenant,extra}.js`. Catatan prefix: survey router di-mount di `/api/v1/survey` (jadi `/survey/summary`, `/survey/submit`), tenant router di `/api/v1/tenant` (jadi `/tenant/results-list`, `/tenant/submit` — BUKAN `/tenant-survey-results`, itu path route SPA). Semua lewat validasi + `enforceRateLimit`; PII (phone/email/pic) dibungkus dengan kolom tanpa-PII di SQL.
2. **Admin channel (browser → `/api/v1/admin/{action}`)**: semua mutasi admin POST `{action, ...payload}` via `adminAction()` (`src/utils/api/_shared.ts`). Guard `requireRole(['superadmin','admin'])` + whitelist zod `ACTION_SCHEMAS` (`server/src/lib/schemas.js`) — unknown action dibiarkan switch membalas. **Catatan:** zod TIDAK strip key asing di semua aksi — banyak schema memakai `.passthrough()`, jadi keamanan kolom yang sebenarnya berasal dari whitelist manual di `server/src/routes/admin.js` (`ALLOWED`/`DRAFT_COLUMNS`/`NEWS_COLUMNS` + parameter binding). Jangan mengandalkan zod sebagai satu-satunya pertahanan. Semua SQL `pg` langsung (tanpa ORM); tiap write dicatat `logActivity`.

Auth: login POST `/auth/login` (bcrypt compare `users.password_hash` — akun Supabase-Auth lama di-reset via `server/scripts/create-admin.mjs --reset`) → HttpOnly cookies `sb-access-token`/`sb-refresh-token` (JWT HS256 `jose`, payload `{sub,role,email,typ,ver}`; **COOKIE_SAMESITE=none + Secure** wajib di produksi karena SPA Vercel cross-site). Pencabutan token lewat `users.token_version`: access+refresh membawa claim `ver`, `authenticate` membandingkannya di kedua jalur, dan `POST /auth/logout` + `create-admin --reset` menaikkannya (logout gagal → 5xx, bukan sukses palsu). Migrasi: `server/migrations/2026-10-04-user-token-version.sql` **sebelum** deploy. Role hierarchy `superadmin > admin > demo > viewer > eo_tenant | tenant_relation`; matriks per-role di `server/src/auth.js` + `server/src/routes/tenant.js`. Role `demo` = lihat semua, ubah tidak — ditegakkan backend (`READ_ONLY_ACTIONS` allowlist di `server/src/auth.js`; aksi di luar allowlist ditolak 403), jadi menyembunyikan tombol di UI saja tidak cukup. Pengecualian dokumentasi: `getInsightNarrative` **tidak** ada di `DEMO_READ_ACTIONS` (`server/src/auth.js:67-89`) karena akun peragaan dibagikan dan handler-nya memanggil API AI berbayar per panggilan sekaligus menulis `activity_logs`; `viewer` **tetap** memilikinya (`VIEWER_READ_ACTIONS`, `:113-121`, SPEC.md §2). UI ikut menyembunyikan entri rail dan kartu "Insight Cerdas" untuk `demo` — `src/components/dashboard/dashboardNavigation.tsx:140` (rail) dan `:424-429` (kartu); viewer/staff tetap melihatnya. `usePermission` (`src/hooks/usePermission.ts`) maps roles ke granular booleans; flag `canView*` memisahkan "boleh lihat" dari `canManage*` ("boleh kelola"). Login legacy Apps Script / `admin_session` = mati.

Boundary rule: DB is snake_case, client is camelCase. **Every** read/write crosses an explicit mapper — `dbEventToEventItem` / `eventItemToDbRow` (`src/utils/api/_shared.ts`), `dbTenantSurveyToTenantSurvey` / `tenantSurveyFormToDbRow` (`surveysApi.ts`), `mapRow` (`newsApi.ts`). Mapper melindungi boundary; zod server memvalidasi field yang dideklarasikan (schema `.passthrough()` tidak menolak key asing, jadi whitelist kolom di route tetap penjaga terakhir).

Event `status` (temporal: `upcoming`/`ongoing`/`past`) is **derived from dates, never stored as authority** (ADR 002 + ADR 008, `getStatus` in `src/utils/eventUtils.ts`; tz Asia/Jakarta). Kolom `events.status` di DB **hanya** menyimpan flag lifecycle `'draft' | 'published'` (gerbang visibilitas publik); writer memaksa non-draft jadi `'published'` dan query waktu memakai helper tanggal di `server/src/lib/eventWindow.js` (lihat ADR 008). Draft vs Event are distinct entities (ADR 001); approving a registration does NOT auto-create a Draft (ADR 003); letters kill Apps Script path (ADR 004) dan kini di VPS via `adminAction('listLetters'|'createLetter'|'updateLetter'|'deleteLetter')` pada tabel `generated_letters`.

State: **no context, no global store**. Data hooks (`useEvents`, `useDraftEvents`, `useTenantSurveys`, `useAuth`) hold everything; modal/CRUD orchestration concentrates in `useDashboardHandlers` (12 modals) passed down as grouped `dp*` prop objects typed by `DashboardPage*` interfaces. Update model = **polling** (bukan realtime): useEvents 30 s + debounce 400 ms, useDraftEvents 60 s saat enabled, useTenantSurveys 60 s (list) + 60 s analytics — legacy realtime `postgres_changes` dihapus bersama supabase-js.

Routing (`src/App.tsx`): react-router-dom v7, every route `lazy()` with named-export adapter `.then(m => ({ default: m.X }))` inside `<Suspense fallback={<DashboardSkeleton/>}>`. `/dashboard/*` is a catch-all with **conditional rendering inside `DashboardPage.tsx`** (no nested `<Routes>`); visible sections come from `getAllowedDashboardPaths(permissions)` (`dashboardNavigation.tsx`). Public: `/`, `/events`, `/gallery`, `/news`, `/sponsor`, `/tenants`, `/community`, `/survey/:eventId`, `/tenant-survey(/:eventId)` (anonymous, **no login**), `/tenant-survey-results`, `/letter/:id`.

**Navigasi publik = satu header bersama, bukan header per halaman.** Setiap rute publik non-survei (yaitu semua rute di atas **kecuali** formulir survei anonim `/survey/:eventId`, `/tenant-survey`, `/tenant-survey/:eventId` — sengaja tanpa header publik agar responden tidak tergoda meninggalkan formulir — dan `/tenant-survey-results`, yang justru memakai `DashboardShell` dengan `publicMode`; `publicSectionItems` di rute itu diisi `TENANT_SURVEY_SECTION_ITEMS = []` (`src/App.tsx:93`, dipakai di `:558`), sehingga `SectionNav` tidak merender tab yang tidak punya tujuan sementara chrome tetap ada untuk membaca hasil tanpa login) merender `<PublicSiteHeader>` (`src/components/nav/PublicSiteHeader.tsx`) sebagai chrome global: bar `h-16` (64 px) di semua lebar, kontainer `max-w-7xl` tetap di semua rute (jangan bercabang, logo tidak boleh bergeser antar halaman), nav `hidden lg:flex` berisi lima tujuan primer, dropdown `Jelajahi` untuk tujuan sekunder (hanya item panel yang menunjuk rute aktif ditandai `aria-current="page"`; trigger dropdown memakai `aria-expanded` + warna aktif, bukan `aria-current` — `src/components/nav/NavDropdown.tsx:276` untuk trigger, `:302`/`:313` untuk item), toggle tema, CTA `Daftar Event` (disembunyikan di `/daftar`), dan tombol `Menu` berlabel teks untuk semua lebar di bawah `lg`. Tujuan, label, dan CTA hanya boleh dideklarasikan di `src/components/nav/publicNav.ts`; `isPublicNavActive` memakai prefix `to + '/'` supaya `/tenant-survey` tidak dianggap `/tenants`, dan rute turunan (`/events/:id`, `/gallery/:slug`, `/news/:slug`, `/pameran/:id`) dipegang induknya dengan tepat satu `aria-current="page"`. Aksi lokal halaman masuk slot `actions`, anchor in-page masuk `sectionLinks`. Jangan menulis ulang header di dalam `src/pages/*`.

## Key Directories

- `src/pages/` — komponen level-route (public + `/dashboard` login), tiap file 1 rute lazy; `src/components/` — semua **berkelompok**, tidak ada file flat di akarnya: `modals/` (dialog/overlay), `views/` (mode tampilan: kalender, kanban, timeline), `events/` (widget domain event), `drafts/` (antrian pra-jadwal), `media/` (galeri/lightbox), `ui/` (primitif bersama + `index.ts` barrel), `shared/`, `nav/`, plus feature folder `dashboard/`, `community/`, `survey/`, `admin/`, `forms/`, `pdf/`. Test colocated di `__tests__/` milik folder masing-masing
- `src/utils/api/` — domain API modules (`eventsApi`, `draftsApi`, `surveysApi`, `newsApi`, `albumsApi`, `sponsorshipApi`) + `_shared.ts` (ADMIN_PROXY_URL, mappers; re-export `ApiError` dari `lib/rest`); re-exported through `src/utils/domainApi.ts` barrel
- `src/hooks/` — data + UI hooks; `src/lib/` — `rest.ts` (apiGet/apiPost/apiUrl + ApiError + `setUnauthorizedHandler`), `adminError.ts` (AdminError/toAdminError), `schemas.ts` (schema zod klien — **tanpa pemakai**, tidak masuk bundle); `src/styles/` — Tailwind v4 `@theme` tokens; `src/constants/survey-options.ts` — survey enum source of truth
- `server/` — Express backend REST production (ESM, Node 20): `src/index.js`, `src/db.js` (pg Pool), `src/auth.js` (JWT jose + bcrypt js + cookie), `src/r2.js` (presign S3 R2 + allowlist, magic-byte check), `src/routes/` (`public.js`, `auth.js`, `admin.js` — aksi CRUD + `lib/schemas.js` ACTION_SCHEMAS, `survey.js`, `tenant.js` — anon + role matrix, `extra.js` — community reg + sponsor + users + instagram + event-og) · `schema.sql` (DDL satu file) · `scripts/create-admin.mjs` (seed/reset bcrypt user)
- `deploy/vps/` — stack produksi: `docker-compose.yml` (postgres 16-alpine + api node20 + nginx 1.27-alpine; nginx bind `127.0.0.1:8080` di VPS ini karena host Caddy memegang 80/443), `nginx.conf` (static SPA + proxy /api/v1 + rewrite OG `/events/:id` → `/api/v1/event-og?id=$1`), `backup.sh` (pg_dump harian rotasi 14 ke `/opt/metmal/backups`, cron 03:00 di host), `README-DEPLOY.md`
- `scripts/migrate/` — skrip migrasi satu kali Opsi B: `dump-prod.mjs` (20 tabel → `seed/*.json`, gitignored), `photos-to-r2.mjs` (legacy storage → R2 + `photo-url-map.json`), `seed-vps.mjs` (FK-safe, idempotent `ON CONFLICT DO NOTHING`; `seed/` di-gitignore)
- `e2e/` — Playwright specs + `helpers.ts`; `docs/` — `SPEC.md`, `docs/adr/` (termasuk `005-vps-postgres-lepas-supabase.md`), `docs/agents/`, `docs/tickets/`, `docs/features/` (brief `update-fitur-*.md`), `docs/research/`, `docs/reports/`
- `improve/` — **separate prototype sandbox** with its own `AGENTS.md`. No production import from `improve/`; never commit its noise.

## Development Commands

```bash
npm run dev            # Vite on :5173
npm run dev:api        # backend Express di :3001 (butuh DATABASE_URL/JWT_SECRET di env)
npm run build          # tsc && vite build — run after every change
npm test               # vitest (watch)
NODE_ENV=test npx vitest run   # Windows: NODE_ENV leaks from shell; without =test vitest fails ('act(...)' prod-build error)
npm run test:coverage  # v8, no thresholds
npm run test:e2e       # Playwright; auto-starts dev server on :5173
npm run test:a11y      # Playwright + axe (playwright.a11y.config.ts)
npm run test:audit     # suite audit (playwright.audit.config.ts)
```

There are **no** `test:unit` / `test:visual` / `test:all` scripts; the completion gate lives in `## Workflow: Audit, Bug, dan Error`.

## Workflow: Audit, Bug, dan Error

Tiga jalur masuk, satu gerbang selesai. Pilih jalur dari **jenis masukannya** (menilai / perilaku salah / gejala rusak), bukan dari besar-kecilnya perubahan.

**Gerbang selesai (wajib untuk ketiganya)** — `npm run build` (tsc ikut) + **seluruh** file vitest yang menyentuh area perubahan (bukan hanya tes yang diharapkan berubah) + smoke nyata pada surface yang berubah (dev server, `curl` endpoint, atau browser). Quirk `NODE_ENV=test` ada di `## Testing & QA`. Perubahan UI dianggap belum terverifikasi sebelum layarnya dilihat.

### A. Audit — permintaan menilai, bukan memperbaiki

Default **read-only**: tidak ada edit kode kecuali diminta eksplisit.

1. **Tetapkan surface** yang diaudit (route/endpoint/role) dan sebutkan batasnya di laporan.
2. **Telusuri rantai penuh** UI→DB: `src/App.tsx` → `src/pages/` → `src/hooks/` → `src/utils/api/*` → `server/src/routes/*` → `server/src/lib/schemas.js` (`ACTION_SCHEMAS`) → `server/migrations/*` + `server/schema.sql`. Simpul yang dilewati = temuan palsu.
3. **Periksa setiap dimensi** (semua, bukan yang kebetulan terlihat):
   - mapper snake_case↔camelCase di `src/utils/api/_shared.ts` — ada field yang bocor/tertinggal?
   - error ditelan: `catch {}` kosong menyulap kegagalan fetch jadi state "tidak ada data".
   - otorisasi: `requireRole`, `READ_ONLY_ACTIONS` (role `demo`), matriks di `server/src/routes/tenant.js`. Menyembunyikan tombol di UI bukan enforcement.
   - validasi: zod `.passthrough()` → whitelist kolom manual di route tetap pertahanan sebenarnya.
   - PII tidak masuk log/output; `enforceRateLimit` terpasang di endpoint tulis.
   - a11y & responsive bila surface berupa UI.
4. **Klasifikasi + bukti**: P0 (data hilang/bocor, auth bypass, 500 di jalur utama) · P1 (perilaku salah, ada workaround) · P2 (kualitas). Tiap temuan wajib `path:line` + kutipan kode/hasil query read-only + dampak ke user.
5. **Lapor ke user dulu.** Issue GitHub hanya bila diminta — format `docs/agents/issue-tracker.md`, label `docs/agents/triage-labels.md`.

Kriteria selesai: setiap dimensi di langkah 3 punya verdict eksplisit (aman / temuan + P-level); nol temuan tanpa `path:line`.

### B. Bug — perilaku salah yang dilaporkan

Laporan user = ground truth. Jangan minta info yang bisa direproduksi sendiri.

1. **Reproduksi** dengan langkah terkecil (URL, role, payload). Catat status HTTP + body `{success, error}`.
2. **Lokalisasi layer dari respons**: 401/403 → `server/src/auth.js` (`requireRole`, `token_version`) · 400 → zod `ACTION_SCHEMAS`, atau peta SQLSTATE input klien (`admin.js:108` / `tenant.js:56`) · 500 + `22P02` → `server/src/lib/pgValues.js` · bentuk data salah → mapper · UI diam → `catch {}` / state hilang.
3. **Tes merah dulu** di `__tests__/` sebelah source (pola mock fetch per-URL). Bug yang tidak bisa di-unit-test: skrip sekali pakai yang mencetak request/response, dihapus setelah selesai.
4. **Fix di layer yang benar** — mapper untuk bentuk data, route untuk SQL/whitelist, hook untuk optimistic rollback. Tambalan di UI saat akarnya server = bug yang kembali.
5. **Gate** di atas + ulangi langkah 1: gejala awal harus hilang.

Kriteria selesai: reproduksi terbukti gagal sebelum dan benar sesudah; tidak ada tes existing yang diubah agar lolos.

### C. Error / insiden — 500, halaman kosong, console error, deploy gagal

Mulai dari gejala, bukan dari file.

| Gejala | Cek pertama |
|---|---|
| Semua `/api/v1` 404 di Preview Vercel | `VITE_API_URL` belum diisi untuk environment Preview |
| CORS 403 di browser | `CORS_ORIGIN` — glob beranchor, harus memuat slug tim Vercel |
| Login sukses tapi langsung 401 | `COOKIE_SAMESITE=none` + `Secure` (cookie lintas-site) |
| 401 setelah reset password | `users.token_version` naik → token lama memang dicabut |
| "Gagal memperbarui — Perubahan belum tersimpan" | `22P02`: `categories` dikirim `JSON.stringify`, harus `toTextArray` |
| `/instagram-sync` 500 | `APIFY_API_TOKEN` tidak ada di `environment:` service `api` |
| 429 | `enforceRateLimit`; `clientIp` membaca `X-Real-IP` hasil nginx |
| 5xx produksi lain | `ssh medprom` → `docker compose -f /opt/metmal/deploy/vps/docker-compose.yml logs --tail=100 api` |

Setelah itu: baca stack trace asli, perbaiki akar, lalu **pasang penangkap kekambuhan** — tes bila deterministik, asersi/smoke bila bergantung lingkungan. Kriteria selesai: akar disebut dengan `path:line`, gejala hilang pada smoke, dan kekambuhan akan gagal lebih dulu.

**Aturan keras**: verifikasi produksi read-only (`docs/agents/vps-db-access.md`) · migrasi SQL dijalankan **sebelum** kode terkait di-deploy · pesan error ke user Bahasa Indonesia · tes/aset verifikasi tidak diubah agar lolos.

## Code Conventions & Common Patterns

- **TS strict +** `noUncheckedIndexedAccess`, `noImplicitReturns`, `noFallthroughCasesInSwitch` (`tsconfig.json`) → always null-guard indexed access (`const first = slots[0]; if (!first) return ''`). `@/*` alias is configured but imports use **relative paths** — follow existing style.
- **Components**: PascalCase files, `export function X()` named exports (`src/pages/` files are the default-export exception). Lazy-load with the named-export adapter shown above.
- **Styling**: Tailwind v4; tokens in `src/styles/theme.css` (`--color-brand-primary-*` tosca `#00918e`, slate palette overridden warm) + legacy aliases in `tokens.css`; custom class system `ui-*` in `utilities.css`; class composition via `cn()` (`clsx` + `tailwind-merge`, `src/utils/cn.ts`); icons `lucide-react` with shared size consts. Dark mode = `.dark` class. Visual source of truth: root `DESIGN.md` (+ `docs/DESIGN-SYSTEM.md` is historical).
- **UI copy and error messages in Indonesian** ("Gagal memuat…", "Terlalu banyak permintaan"); filter sentinel `'Semua'`.
- **Mutations are optimistic**: update local state → call API → rollback + surface error on failure; hooks return `boolean` success. Errors: `ApiError` (`lib/rest`; throw langsung dari API modules), `AdminError` with kinds (`src/lib/adminError.ts`), Postgres 23505 → friendly Indonesian message; toasts via `useToast`.
- **Validation**: zod **hanya di server** — `ACTION_SCHEMAS` (`server/src/lib/schemas.js`) lewat `validateAction`. Klien tidak memakai zod: `src/lib/schemas.ts` (323 baris) tidak diimpor siapa pun dan tidak masuk bundle (hanya file itu yang meng-`import { z } from 'zod'`), jadi jangan memperlakukannya sebagai gerbang aktif. Validasi form FE manual di `src/utils/validation.ts` (`{valid, errors}`); `rest.ts` mengembalikan body sebagai cast `T` dengan hook opsional `RestOptions.parse` bagi pemanggil yang butuh jaminan bentuk. **Zod bukan satu-satunya pertahanan:** sebagian schema `.passthrough()`, jadi whitelist kolom manual di route tetap wajib.
- **Migrasi DB**: `server/migrations/*.sql` idempoten, dijalankan manual di VPS (`docker compose exec -T postgres psql -U metmal -d metmal < server/migrations/<file>.sql`) **sebelum** kode terkait di-deploy. `server/schema.sql` hanya untuk DB baru (`CREATE TABLE IF NOT EXISTS` tidak mengubah tabel existing).
- **Backend**: Express `router.method((req,res)=>...)` di `server/src/routes/`, respons `{success, error?, data?}`, rate-limit `enforceRateLimit` + `clientIp` bersama (`server/src/lib/rateLimit.js`; baca `X-Real-IP` hasil `real_ip` nginx — XFF mentah diabaikan), admin pakai `requireRole` + zod `validateAction`; CORS whitelist `CORS_ORIGIN` (origin jahat → 403).
- **Kolom non-skalar wajib lewat `server/src/lib/pgValues.js`** — `events.categories`/`draft_events.categories` bertipe **`TEXT[]`** (bukan JSONB): kirim **array JS** via `toTextArray(...)`, JANGAN `JSON.stringify(...)` — itu menghasilkan `malformed array literal` (22P02) dan muncul ke user sebagai "Gagal memperbarui — Perubahan belum tersimpan". Hanya `day_time_slots` yang JSONB (`toJsonb`/`JSON.stringify`). Berlaku di `admin.js` (createEvent/updateEvent/batchCreateEvents/publishDraft/createDraft/updateDraft) dan `public.js` (`POST /drafts`).
- **Flag lifecycle draft hanya lewat aksi khusus, dengan kontrak "tolak hanya bila berubah".** `DRAFT_COLUMNS` (`server/src/routes/admin.js:121`) **tidak** memuat `published`/`published_at`/`deleted`/`deleted_at`; daftarnya ada di `DRAFT_LIFECYCLE_COLUMNS` (`:130`) dan default-nya di `:133`. `updateDraft` (`:517`) membaca baris dulu bila payload membawa kolom lifecycle: nilai yang **sama** dengan baris saat ini diabaikan — tidak masuk `SET` dan tidak tercatat di `logActivity` — sedangkan nilai yang **berbeda** dibalas **400** dengan menyebut kolomnya (`:525-543`). `createDraft` (`:479`) memakai perbandingan yang sama terhadap default kolom (false/null): nilai default diabaikan, nilai berbeda → 400 (`:484-493`). Perbandingan dipusatkan di `lifecycleValueChanged` (`:132-172`). Alasan: SPA produksi lama mengirim keempat kolom itu pada setiap perubahan `progress`, jadi penolakan tanpa syarat mematahkan semua edit draft. Ketiga flag tetap hanya ditulis `publishDraft`/`deleteDraft`/`restoreDraft`. Tes: `server/src/routes/__tests__/adminDraftLifecycle.test.js` (17 tes).
- **Urutan deploy draft lifecycle:** backup → migrasi data `2026-10-31-draft-lifecycle-repair.sql` (**belum dijalankan** per 2026-10-31) → SPA Vercel → API VPS. API yang mendahului SPA tetap aman karena nilai flag yang dikirim SPA lama sama dengan baris (no-op); yang tidak boleh adalah men-deploy API yang menolak nilai berubah tanpa SPA baru, bila kontraknya suatu saat diperketat lagi.
- **Scope `eo_tenant` ditegakkan di route.** `/tenant/create` dan `/tenant/update` memanggil `canAccessSurveyEvent(user, eventId)`; EO yang event-nya tidak ada di `users.assigned_events` dibalas **403** (`server/src/routes/tenant.js:801` dan `:888`). Menyembunyikan tombol di UI bukan enforcement.
- **401 ditangani terpusat.** `src/lib/rest.ts` memanggil `setUnauthorizedHandler` pada setiap 401 yang bukan `ANONYMOUS_ENDPOINTS` (endpoint publik/survei dikecualikan agar request anonim tidak mengeluarkan admin); `useAuth` memasang handler yang mereset `user` dan mengirim `null` saat unmount (`src/hooks/useAuth.ts:83-87`). Hook/komponen tidak menangani 401 sendiri.
- **Hapus media: baris DB dulu, objek R2 setelah sukses** — server (`admin.js:603`) dan klien (`src/utils/api/albumsApi.ts:164`, pola sama di `deleteAreaPhoto`) membersihkan R2 best-effort setelah DELETE berhasil; kalau DB gagal, file tidak boleh sudah hilang. Presign R2 menandatangani `content-length` bila klien mengirim ukuran (`server/src/r2.js:169-179`), jadi body dengan panjang berbeda ditolak. Tiga pemanggil klien kini mengirim `size: file.size` — `src/utils/api/albumsApi.ts:133`, `surveysApi.ts:85`, `tenantEventProposalsApi.ts:84` — sehingga batas 20 MB benar-benar ditandatangani server: `r2.js:297` (destructure `size`) → `:314` (`contentLength`), `extra.js:234`, `tenantProposals.js:111`.
- **SQLSTATE dari input klien → 400**, bukan 500: `22007`/`22008`/`22P02`/`23503` dipetakan ke pesan Indonesia di gate admin (`admin.js:108-111`, `PG_INPUT_ERRORS`) dan route tenant (`tenant.js:56-65`). Kedua peta harus diubah bersamaan.
- **Tests colocated** in `__tests__/` beside source; semua mock **fetch route** ke `REST` (pola di `src/utils/domainApi.test.ts`, `src/utils/__tests__/eventAreasApi.test.ts`) dengan `vi.hoisted` state + raw `mockReq`/`mockRes` (no supertest).
- Markers: `// ─── Section ───` banners; `// ponytail: <note>` = deliberate cross-cutting design decision (don't "fix" without reading it).

## Important Files

`src/App.tsx` (routes, gating) · `src/types/index.ts` (all domain types; extend `EventBase`, not parallel interfaces) · `src/lib/rest.ts` (apiGet/apiPost/apiUrl, `ApiError`, `setUnauthorizedHandler`) + `src/lib/adminError.ts` (`AdminError`) · `src/utils/api/_shared.ts` (mappers/ADMIN_PROXY_URL) · `src/hooks/useAuth.ts` (session via `/api/v1/auth/me`; dev bypass `VITE_DEV_AUTO_LOGIN`) + `usePermission.ts` · `src/components/dashboard/DashboardPage.tsx` (inner router) + `dashboardNavigation.tsx` · `src/components/survey/rules.md` (**MUST read before touching survey form/API/types/migrations** — anonymous public form, v3 schema, FE/BE enum parity via `src/constants/survey-options.ts`) · `server/src/index.js` + `server/src/auth.js` + `server/src/routes/admin.js` · `server/src/lib/schemas.js` (ACTION_SCHEMAS) + `server/src/routes/tenant.js` (matriks role + MID proxy) · `server/schema.sql` (DDL) · `deploy/vps/docker-compose.yml` + `deploy/vps/nginx.conf` · `vercel.json` (SPA rewrites + OG eksternal ke VPS `/events/:id`, security headers) · `docs/SPEC.md`, `CONTEXT.md` (glossary — pakai kosakatanya), `docs/adr/`.

Env vars — client: `VITE_API_URL` (**required di produksi, dan wajib juga untuk environment Preview Vercel** — env Vercel berlaku per-environment; build preview tanpa var ini menembak same-origin `/api/v1` → 404 di semua panggilan; tidak dipakai lokal bila SPA+backend satu host), `VITE_R2_PUBLIC_URL`, `VITE_DEV_AUTO_LOGIN`. Server-only (di `deploy/vps/.env` di VPS, jangan commit): `DATABASE_URL`, `JWT_SECRET`, `POSTGRES_PASSWORD`, `COOKIE_DOMAIN` (opsi), **`COOKIE_SAMESITE=none`** (wajib cross-site Vercel→VPS), `CORS_ORIGIN` (whitelist origin, exact-match; entri ber-`*` = pola glob beranchor di `server/src/lib/corsOrigin.js` — dipakai untuk hostname deployment Vercel yang berubah tiap push, wajib memuat slug tim), `R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET_NAME/R2_PUBLIC_URL`, `MID_API_KEY` (proxy tenant), `APIFY_API_TOKEN` (scrape Instagram `/instagram-sync` — **harus juga didaftarkan di `environment:` service `api` pada `deploy/vps/docker-compose.yml`**, karena compose tidak meneruskan env `.env` secara otomatis; tanpa itu nilainya selalu kosong di container dan endpoint membalas 500). **Never expose these values in code, docs, or output**; remote git URL may contain a credential — never copy it.

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

- **Unit (vitest)**: jsdom + globals, setup `src/test/setup.ts` (mocks `matchMedia`, `IntersectionObserver`, object URL — dijaga `typeof window`/`typeof URL` agar aman untuk tes ber-`@vitest-environment node`); 135 file / 1122 test hijau (verifikasi 2026-10-25 dengan `--maxWorkers=2`; angka terkini 2026-10-31: **145 file / 1190 test** lulus — termasuk 3 berkas probe milik user `src/pages/__tests__/__tmp_probe*.test.tsx`; tanpa ketiganya 142 file / 1187 test; `NODE_ENV=test` WAJIB — tanpa itu React memakai build produksi dan tes `act()` gagal menyesatkan). Pada mesin Windows ini suite penuh dengan worker default bisa gagal 19 tes karena kontensi (`Test timed out in 5000ms` di area yang tidak berubah: modals, admin, survey), jadi pakai `--maxWorkers=2` untuk verifikasi. Mock REST di global fetch per-URL, jangan spin server sungguhan. **Preload modul di setup wajib di-`await`** — `void import(...)` yang masih terbang saat environment dibongkar memunculkan `EnvironmentTeardownError` sebagai unhandled rejection: vitest keluar non-zero meski semua tes lulus (CI merah 15–16 Okt; lihat `src/test/md-setup.ts`). CI: `.github/workflows/ci.yml` (tsc + vitest + build).
- **E2E (Playwright)**: `testDir e2e/`, chromium, `baseURL http://localhost:5173`, webServer auto-starts Vite. `helpers.ts` sudah Opsi B (mock cookie JWT + REST `/api/v1`, one-handler dispatch — jangan regresi ke Supabase-era localStorage injection); e2e tetap utilitas manual, bukan CI gate (`.github/workflows/ci.yml` hanya `tsc --noEmit` + `vitest run` + `npm run build`). `deck-assets.spec.ts` di-skip kecuali `VITE_API_URL` diisi, lalu membaca REST produksi read-only untuk regenerasi screenshot `presentasi/assets/` — utilitas manual, bukan CI gate.
- **Known quirks/stale artifacts**: Windows flaky vitest exit codes are environmental, not regressions. `test-results/` adalah artefak per-run dan gitignored (`.gitignore:40`), jadi `test-results/.last-run.json` tidak pernah jadi bukti historis. Status e2e terukur 2026-10-31: `npx playwright test --config=playwright.a11y.config.ts` **34/34 lulus**, setelah `settle()` (`e2e/a11y.config.ts:519`) menunggu end-state entrance/tween sebelum axe menyampel warna; tanpa itu hasilnya 29/34 dengan lima kegagalan `color-contrast` yang semuanya artefak penyampelan di tengah tween GSAP, bukan kontras token. Spec fungsi lain (`tenant-survey-public.spec.ts`, `tenant-survey-admin.spec.ts`, dst.) **tidak dijalankan** pada batch itu — jangan mengklaimnya hijau. Coverage configured, ungated.

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
