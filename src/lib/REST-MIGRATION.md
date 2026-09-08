# REST Migration — sisa call-site supabase-js

File kerja sementara (bukan dokumentasi permanen). Dipakai selama Opsi B:
lepas Supabase total, pindah semua akses data ke `src/lib/rest.ts`
(fetch REST ke `VITE_API_URL/api/v1`) dan backend VPS.

Supabase shim di `src/lib/supabase.ts` sekarang melempar error eksplisit.
Daftar di bawah = call-site yang BELUM dimigrasi dan akan pecah saat dipanggil.
Migrasi per baris: ganti panggilan supabase → `apiGet` / `apiPost` sesuai
kontrak REST di bawah, sesuaikan peta kolom snake_case → camelCase lewat mapper
yang sudah ada di `src/utils/api/_shared.ts` (JANGAN ubah mapper).

## Kontrak REST (backend VPS)

- Base: `VITE_API_URL` + `/api/v1` (lihat `src/lib/rest.ts`).
- Public GET tanpa auth: `/events`, `/events/:id`, `/themes`, `/holidays`,
  `/news`, `/news/:slug`, `/albums`, `/albums/:slug`, `/areas`, `/settings/:key`.
- Admin: `POST /admin/:action` (mirror 42 `ACTION_SCHEMAS` di
  `api/_lib/schemas.js`) via `adminAction` (sudah redirect ke REST).
- Auth: `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`.
- PII: events publik tanpa pic/phone; draft/registrasi/lead/survey PII hanya
  endpoint admin; `generated_letters` publik hanya metadata status=active
  (tanpa `letter_data`/`pdf_base64`).
- Realtime supabase channel → polling atau hapus (keputusan arsitektur
  menyusul; hook realtime belum dijadwalkan).

## Sisa call-site per file

### `src/utils/api/` — domain API (paling prioritas)

#### eventsApi.ts (SELESAI)
- ~~`:14` `supabase.from('events')...order('date_str')` → `apiGet('/events')` (public, tanpa pic/phone)~~
- ~~`:15` `supabase.from('annual_themes')...order('date_start')` → `apiGet('/themes')`~~
- ~~`:16` `supabase.from('holidays')...order('date_str')` → `apiGet('/holidays')`~~
- ~~`:35` `supabase.from('events').select('*').eq('id',...).neq('status','draft')` → `apiGet('/events/{id}')`~~
- ~~`:105` `supabase.from('annual_themes')...order('date_start', desc)` → `apiGet('/themes')` (public, urutkan client)~~
- ~~`:115` `supabase.from('site_settings').select('value').eq('key',...).single()` → `apiGet('/settings/{key}')`~~

#### draftsApi.ts (SELESAI)
- ~~`:15` `supabase.from('draft_events').insert(...)` (proxyKind 'public') → `POST /drafts` publik~~ (server/src/routes/public.js sudah final: POST /drafts tanpa RETURNING)

#### surveysApi.ts (SELESAI)
- ~~`:122` `supabase.from('generated_letters').select('*')…` → `adminAction('listLetters')` (server/src/routes/admin.js + ACTION_SCHEMAS)~~
- ~~`:134` insert letter~~ → `adminAction('createLetter')` (letter_data jsonb, pdf_base64 zod ≤2.5M chars)
- ~~`:152` update letter~~ → `adminAction('updateLetter', { id, updates })` (nested updates wajib)
- ~~`:160` soft-delete letter~~ → `adminAction('deleteLetter')` (UPDATE status='deleted')
- ~~tenant CRUD `:235-:291`~~ → `apiGet('/tenant/list'|'/tenant/get')`, `apiPost('/tenant/create'|'/tenant/update'|'/tenant/review'|'/tenant/delete')` (409 → pesan duplikat ramah)
- ~~`:269` `supabase.auth.getUser()`~~ → `apiGet('/auth/me')` (fallback userId undefined)
- ~~`supabase.rpc` analytics `:349/:378`~~ → `apiGet('/tenant/analytics'|'/tenant/summary')` (SQL agregat di server/src/routes/tenant.js)
- ~~`:406` events past/ongoing~~ → `apiGet('/tenant/events')` (server filter status + limit 200)
- ~~`:469` rpc public check~~ → `apiGet('/tenant/check?event_id=&fingerprint=')`
- ~~legacy fetch('/api/tenant-survey…')~~ → semua diganti `/tenant/*` di atas
- ~~sponsorshipApi: `supabase.from('events')…event_proposals`~~ → `apiGet('/sponsor/events')` (route publik baru extra.js, nested json_build_object) + guard tanggal client `getTodayIsoLocal()`
- ~~sponsorshipApi: `fetch('/api/sponsor-lead')`~~ → `apiPost('/sponsor-leads')` (zod + 10/15mnt, CORS *)
- leads admin (`listSponsorLeads`/`updateSponsorLeadStatus`/`deleteSponsorLead`/`setEventProposal`/`deleteEventProposal`) tetap `adminAction` — backend admin.js pakai SQL pg langsung (mapLead diubah ke flat `sl.*, e.acara, e.date_str`)

#### newsApi.ts (SELESAI)
- ~~`:21` `supabase.from('news_articles').select('*').eq('status','published')...` → `apiGet('/news')`~~
- ~~`:33` `supabase.from('news_articles').select('*').eq('slug',...).eq('status','published').single()` → `apiGet('/news/{slug}')`~~

#### albumsApi.ts (SELESAI)
- ~~`:8` `supabase.from('event_photos').select('*')...` → `apiGet('/albums')`+filter atau route foto~~ (pakai `apiGet('/albums').photos` + filter client)
- ~~`:19` `supabase.storage.from('event-photos').upload(...)` → presign REST (uploadToR2 `:114`/`/api/r2-upload` pindah ke VPS; media tetap R2)~~ (`uploadEventPhoto` DIPANDU ke `uploadToR2` — admin pakai `uploadAlbumPhoto`/`uploadAreaPhoto`)
- ~~`:22` `supabase.storage.from('event-photos').getPublicUrl(...)` → `R2_PUBLIC_URL` + key~~ (dihapus bersama `uploadEventPhoto`)
- ~~`:59` `supabase.from('photo_albums').select('*')...` → `apiGet('/albums')`~~
- ~~`:61` `supabase.from('event_photos').select('album_id')` → `apiGet('/albums')` (hitung count client/server)~~
- ~~`:73` `supabase.from('photo_albums').select('*').eq('slug',...).single()` → `apiGet('/albums/{slug}')`~~
- ~~`:75` `supabase.from('event_photos').select('*').eq('album_id',...)` → `apiGet('/albums/{slug}')` (foto termasuk)~~
- ~~`:131` `fetch('/api/r2-delete')` di `deleteFromR2` → presign/delete REST (VPS; R2 tetap)~~ → `apiPost('/r2/delete', { fileName })`
- ~~`:169` `supabase.from('event_areas')...` → `apiGet('/areas')`~~
- ~~`:174` `supabase.from('area_photos').select('area_id')` → `apiGet('/areas')` (hitung count)~~
- ~~`:197` `supabase.from('area_photos').select('*').eq('area_id',...)` → `apiGet('/areas')`+filter / route foto area~~ (pakai `apiGet('/areas').photos` + filter client)

Catatan albumsApi: `uploadToR2` SELESAI → `apiPost('/r2/presign')` + PUT (2026-09-08). `InstagramSettingsModal` hero → `uploadToR2(file,'site/')` (SELESAI). Sisa Supabase Storage = 0 call-site.

#### sponsorshipApi.ts
- `:60` `fetch('/api/sponsor-lead')` di submitSponsorLead → `POST /sponsor-leads` publik (route REST belum final)
- `:88` `supabase.from('events').select('…, event_proposals(…)').eq('status','upcoming')…` → `apiGet('/events')` + embed proposals (kontrak embed menyusul)
- `:114` (via uploadToR2) presign → REST VPS

### `src/components/` — direct supabase di komponen (4)

- `EventPhotoGallery.tsx:44` `supabase.from('event_photos').select('*').eq('event_id',…)` → `apiGet('/albums')`-based (foto per event via backend)
- `EventPhotoGallery.tsx:45` `supabase.from('photo_albums').select('*').eq('event_id',…).limit(1).single()` → `apiGet` serupa
- `ExportPdfModal.tsx:109` `supabase.from('event_photos').select('*').in('album_id',…)` → `apiGet` (PDF export ambil via REST)
- `InstagramSettingsModal.tsx:50` `supabase.storage.from('event-photos').upload(...)` → presign REST
- `InstagramSettingsModal.tsx:52` `supabase.storage.from('event-photos').getPublicUrl(...)` → `R2_PUBLIC_URL`
- `PublicLetterViewer.tsx:29` `supabase.from('generated_letters').select('*').eq('id',…)` → public letter endpoint (hanya status active + tanpa pdf_base64/letter_data; route belum ada)
- `survey/SurveyPage.tsx:83` `supabase.from('events').select('id, acara, tanggal, lokasi, eo, status').eq('id',…)` → `apiGet('/events/{id}')`
- `survey/TenantSurveyPage.tsx:102` `supabase.auth.getUser()` → `GET /auth/me`

### `src/hooks/` — realtime channels (bukan .from)

- `useDraftEvents.ts:50` `.channel('drafts-realtime')` + `:58` `removeChannel` → polling/hapus
- `useEvents.ts:66` `.channel('events-realtime')` + `:75` `removeChannel` → polling/hapus
- `useTenantSurveys.ts:73` `.channel('tenant-surveys-realtime')` + `:83` `removeChannel` → polling/hapus
- `useTenantSurveys.ts:168` `.channel('tenant-survey-analytics-realtime')` + `:178` `removeChannel` → polling/hapus

### Tests (mock shim — jangan migrasi, tapi update mock bentuk)

- ~~`src/utils/supabaseApi.test.ts:5` `vi.mock('../lib/supabase', ...)` — mock supabase.from chainable → mock rest.ts~~ (sudah: mock global fetch per URL REST `/api/v1/...`)
- ~~`src/utils/__tests__/eventAreasApi.test.ts:5` — sama~~ (sudah: mock global fetch per URL REST)
- `src/utils/api/__tests__/` adminAction.test.ts — sudah jalan (adminAction → rest apiPost); cek mock fetch global tetap cocok (apiPost pakai fetch juga)
- `src/components/__tests__/EventPublicDetailPage.test.tsx:18`, `src/hooks/__tests__/useEvents.test.ts:22`, `src/hooks/__tests__/useTenantSurveys.test.ts:5` — mock `../../lib/supabase` (belum — mock komponen utuh via supabaseApi; belum perlu)

## Urutan migrasi yang disarankan

1. Public reads ringan tanpa relasi (eventsApi, newsApi, theme/holiday) — endpoint REST sudah final.
2. Album/area/foto — butuh route `/albums/:slug`, `/areas` + presign VPS.
3. Draft publik + registration/letter public — butuh kontrak submit publik (BackendCore).
4. Survey PII + analytics — butuh endpoint admin survey (BackendCore) + auth me.
5. Komponen direct + realtime hooks — terakhir, setelah API domain jalan.
