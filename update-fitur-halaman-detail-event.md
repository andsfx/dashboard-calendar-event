# Update Fitur: Halaman Detail Event Publik + OG Meta — Rencana Implementasi

Status: RENCANA (dieksekusi bersamaan) · Repo: schedule-event-v2 · 2026-09-04
Sumber domain: `docs/SPEC.md` §3.6, §7.2 · Menindaklanjuti: diskusi fitur #1 (gap terbesar audit fitur)

## 1. Ringkasan

Kondisi saat ini: event publik hanya bisa dilihat lewat modal (`EventsLandingPage` → `EventDetailModal`); **tidak ada** route `/events/:id` di `App.tsx` — event adalah satu-satunya entitas publik tanpa URL shareable (bandingkan `/gallery/:slug`, `/news/:slug`). Akibatnya: link per-event tidak bisa dibagikan ke WhatsApp/Instagram, SEO per-event nol, dan OG/Twitter meta statis "Komunitas" untuk semua URL. Terpisah: `index.html` referensi `/og-image.jpg` yang **404** (public/ hanya berisi `vite.svg` + `screenshots/`).

Target:

- **Halaman detail event publik** `GET /events/:id` — self-fetch by id (anon client, exclude `status='draft'`), konten reuse tampilan `EventDetailModal` (tanggal/waktu/lokasi/EO/keterangan/multi-day slots), tombol share WA + copy link, link "Lihat semua event".
- **OG/Twitter meta server-side per event** — crawler WhatsApp/Facebook/Telegram tidak menjalankan JS, jadi inject meta via **API function** yang membaca `dist/index.html`, fetch event dari Supabase, dan menyuntikkan `<meta>` + JSON-LD sebelum dikirim. Ditambah `document.title` client-side untuk tab title UX.
- **Fix og-image 404** — pakai `src/assets/landing/event-hero.jpg` sebagai `public/og-image.jpg` (1200×630-ish default share image, di-copy ke public/).

Non-goal: tombol "Tambah ke Kalender" (.ics) (fitur #5, terpisah), dynamic title semua halaman lain (fitur #2, terpisah), pre-render semua route.

## 2. Keputusan desain

| # | Keputusan |
|---|---|
| D1 | Route `/events/:id` memakai **id** (bukan slug) — `EventItem.id` sudah stabil, tidak perlu kolom slug baru + migrasi. Slug di gallery/news sudah ada kolomnya; events belum. |
| D2 | Page component self-fetch via anon client `supabase.from('events').select('*').eq('id', id).neq('status', 'draft')` — RLS events = `SELECT USING (true)` (terverifikasi `rls-realtime.sql`), sehingga row `status='draft'` bisa terbaca anon → **wajib filter** `.neq('status','draft')` supaya T-003 (hide draft dari publik) tetap terjaga. |
| D3 | Struktur visual halaman mengikuti pola `GalleryAlbumPage` (back button + skeleton + error + 404), konten card mengikuti `EventDetailModal` (InfoRow grid 2 kolom, dayTimeSlots). Komponen detail di-refactor jadi shared `EventDetailContent` yang dipakai modal + page. |
| D4 | OG meta server-side: `api/event-og.js` (Node runtime) dibaca via rewrite `vercel.json` `source: /events/:id*` → `destination: /api/event-og`. Function fetch index.html dari deployment (fallback `fs` baca `dist/index.html` saat lokal), fetch event by id, inject meta og:title/og:description/og:image/og:url + twitter:card + JSON-LD Event schema ke `<head>`. Bukan `useEffect` — crawler tidak jalankan JS. |
| D5 | `document.title` + meta description client-side di-set di page component (UX tab title) — komponen `usePageMeta` kecil dengan cleanup restore. |
| D6 | Tombol share: `https://wa.me/?text=<judul + tanggal + URL>` (pola `wa.me` sudah dipakai di `CommunityRegistrationDetailModal`) + copy link (`navigator.clipboard`, pola `LetterGenerator`). |
| D7 | Draft/internal event: route merender 404 "Event tidak ditemukan" (fetch sudah exclude draft). Admin tetap pakai modal via dashboard — tidak ada perubahan flow admin. |
| D8 | OG image per event: pakai `poster_url` jika ada, fallback `/og-image.jpg`. |
| D9 | Tidak ada tabel/kolom DB baru. Tidak ada schema change. RLS sudah cukup untuk read anon. |
| D10 | Klik kartu event di `/events` dan `/` tetap buka modal (behavior existing dipertahankan — admin butuh edit/hapus; halaman publik untuk share/SEO). Modal di `/events` dapat link ke permalink. |

## 3. Implementasi

### 3.1 `src/components/EventDetailContent.tsx` — shared content (baru)

Ekstrak body `EventDetailModal` (InfoRow grid, keterangan, dayTimeSlots, series info) menjadi komponen shared dengan props `{ event: EventItem; isAdmin?: boolean; actions?: ReactNode; qr?: ReactNode }`. `EventDetailModal` render `ModalWrapper` + header badges + `<EventDetailContent>`; page publik render versi card. `EventDetailModal` tetap tempat badge admin-only (PIC/phone/model kerja sama) — page publik **tidak** menampilkan PIC/phone (PII internal).

### 3.2 `src/components/EventPublicDetailPage.tsx` — halaman publik (baru)

- `useParams<{ id: string }>`; self-fetch `fetchEventById(id)` (baru di `eventsApi.ts`).
- States: skeleton (pola `GalleryAlbumPage`), error retry, 404 (not found / draft).
- Meta: `usePageMeta({ title: \`${acara} — Metropolitan Mall Bekasi\`, description: ringkasan })`.
- Content: badges (status + kategori), judul, `EventDetailContent` public mode, photo gallery (read-only, `EventPhotoGallery canUpload=false`), survey CTA jika `past` (link `/survey/:id` — pola modal).
- Share row: tombol WA + copy link + permalink.
- Back: `navigate('/events')`.
- Cutover permalink: pada halaman `/events` dan landing `/`, `onDetail` tetap buka modal; di modal publik footer tambah link "Buka halaman event" → `/events/:id` (share/SEO path). Card publik di landing `/` (`CommunityUpcomingEvents`) dapat link icon permalink.

### 3.3 `src/utils/api/eventsApi.ts` — tambah `fetchEventById`

```ts
export async function fetchEventById(id: string): Promise<EventItem | null> {
  const { data, error } = await supabase.from('events')
    .select('*').eq('id', id).neq('status', 'draft').maybeSingle();
  if (error) throw new SupabaseApiError(`Fetch event failed: ${error.message}`);
  return data ? dbEventToEventItem(data as DbEvent, 0) : null;
}
```

Re-export via `src/utils/supabaseApi.ts` (blok eventsApi).

### 3.4 `api/event-og.js` — OG injection (baru)

- GET only; ambil `id` dari query `?__og_id=` (rewrite mengirim `id` param) ATAU dari `x-original-path` header — **final**: rewrite `/events/:id*` → `/api/event-og?id=:id`.
- Fetch `https://<deployment>/index.html` (pakai `req.headers.host`, http/https dari `x-forwarded-proto`) — pola fetch-own-index. Fallback `fs.readFile` `dist/index.html` bila fetch gagal (dev).
- Supabase: pakai anon fetch REST `GET {SUPABASE_URL}/rest/v1/events?id=eq.<id>&status=neq.draft&select=*` header apikey anon — tanpa service role (public read, hemat quota, no PII).
- Row ada → inject: og:title (`${acara} — Metropolitan Mall Bekasi`), og:description (tanggal+lokasi+jam), og:url, og:image (`poster_url` || `/og-image.jpg` absolut), twitter:* setara, JSON-LD `Event` schema (name, startDate, endDate, location, url, image). Escape `"` `<` `>` di nilai.
- Row null / draft → serve index.html tanpa inject (SPA route 404 client-side).
- Cache header `public, s-maxage=300, stale-while-revalidate=600` — pola vercel.json events.
- Error Supabase → serve index.html plain (fail-open, tidak blok SPA).

### 3.5 `vercel.json` — rewrite baru (sebelum SPA catch-all)

```json
{ "source": "/events/:id*", "destination": "/api/event-og?id=:id" }
```

Rewrite urutan: source lebih spesifik `/events/:id*` harus **sebelum** catch-all `/((?!api|_vercel).*)`. Vercel memilih rewrite paling spesifik secara otomatis, tapi tetap ditempatkan pertama agar eksplisit.

### 3.6 `index.html` + `public/og-image.jpg`

- Copy `src/assets/landing/event-hero.jpg` → `public/og-image.jpg` (fix 404 untuk seluruh OG default).
- `og:image` meta jadi absolut `https://metmal-community-hub.vercel.app/og-image.jpg` (WA butuh absolut).

### 3.7 `src/utils/pageMeta.ts` — helper client meta (baru)

```ts
export function usePageMeta({ title, description }: { title: string; description?: string }) — set document.title + meta[name=description], restore on unmount.
```

Dipakai `EventPublicDetailPage`. (Fitur #2 dynamic title semua halaman = terpisah; helper ini fondasinya.)

## 4. Verifikasi

1. `npm run build` — tsc + vite, 0 error.
2. Unit: `api/__tests__/event-og.test.js` — mock fetch index.html + supabase REST; assert meta injected, draft excluded, fail-open. Page test `EventPublicDetailPage.test.tsx` — mock `fetchEventById`, assert render judul/lokasi/404/tombol share.
3. Browser smoke (dev server): `/events/<id-nyata>` render detail; `/events/404` → state tidak ditemukan; WA share link format benar; dark mode; copy link.
4. e2e helpers `**/rest/v1/events*` interceptor sudah fulfill array — `maybeSingle` mengekspetasi objek/single; **cek** `fetchEventById` di page test mock — e2e spec deck tidak menyentuh `/events/:id`, tidak ada perubahan e2e.

## 5. Catatan

- `fetchEventById` publik TIDAK boleh memakai `adminAction` (service role) — public channel anon + RLS + filter draft, sesuai boundary SPEC §7.2.
- JSON-LD `Event` schema `startDate` pakai `date_str`; `endDate` hanya bila `date_end`.
- Modal admin flow tidak berubah (`isAdmin` tetap jalan di dashboard).
- Permalinan dipakai publik; admin dashboard tetap modal — tidak ada duplikasi maintenance karena konten shared component.
