# Update Fitur: Foto Area Event di Landing Page — Rencana Implementasi

Status: RENCANA (belum dieksekusi) · Repo: schedule-event-v2 · 2026-08-30
Sumber domain: `photo_albums.lokasi` + `events.lokasi` (data produksi) · Terkait: `src/components/AlbumManagerModal.tsx` (pola CRUD + upload R2), `src/components/community/CommunityGallery.tsx` (pola grid galeri landing)

## 1. Ringkasan

Kondisi saat ini: halaman utama `/` (Community Hub) sudah menampilkan fasilitas venue (`CommunityFacilities`), dokumentasi event (`CommunityGallery`), tapi **tidak ada galeri foto per area event**. Padahal data produksi membuktikan area event beragam dan berulang: `events.lokasi` berisi 190+ event di "Panggung Lt. 3/Dasar", "Musholla Lt. 3", "Atrium 2 Lt. Dasar", "Foodventure Lt. 2", "Parkir Timur", dst.

Target: section "Foto Area Event" di landing `/` — grid kartu area (cover foto + nama + deskripsi) yang dikelola lewat modal admin CRUD lengkap (tambah/ubah/hapus area, unggah foto, atur urutan), dengan tabel Supabase baru + RLS publik read + endpoint admin action (pola `photo_albums`).

Non-goal: halaman detail area, peta mall interaktif, lightbox galeri (cukup klik → buka foto di tab baru), sinkronisasi dari `events.lokasi`, realtime landing.

## 2. Evaluasi kandidat (ranking dengan bukti)

| Rank | Kandidat | Bukti domain | Verdict |
|---|---|---|---|
| **1** | **Tabel `event_areas` + CRUD admin + section landing** | Data area eksis (`events.lokasi` di produksi: Panggung Lt 3 = 112 + 14 + 3 + 2 + 1, Panggung Lt. Dasar = 50, Musholla = 11, dsb); `photo_albums.lokasi` + `createAlbum(lokasi?)` sudah ada — jejak domain foto-per-area; album manager = resep CRUD + upload R2 matang; galeri landing = resep grid. Tidak ada tabel area → celah kurasi foto area. | **PILIH** — fit domain kuat (area = vocab mall), risiko terkendali (pola persis `photo_albums`), kurasi admin = kontrol konten (bukan autogen). |
| 2 | Grouping `photo_albums.lokasi` tanpa tabel | Hanya 6 album ber-lokasi, semua varian "Panggung Lt 3" → section nyaris kosong; tidak ada deskripsi/urutan/kontrol; admin tidak bisa kurasi. | Tolak — kapasitas data tak cukup, tanpa kurasi. |
| 3 | Backfill `events.lokasi` ke area | Data gambar per area tidak tersedia (tidak ada kolom foto per area di events); area != event. | Tolak — tak ada aset foto. |

Alasan final: (a) foto area = aset kurasi (butuh tempat simpan + kontrol admin), (b) reuse pola `photo_albums` end-to-end (tabel + RLS + zod + actions + modal + wiring) menekan risiko, (c) tidak menyentuh fitur lain.

## 3. Keputusan desain

| # | Keputusan |
|---|---|
| D1 | **Dua tabel baru**: `event_areas` (id `era_*`, name, description, cover_photo_url, sort_order, is_active) + `area_photos` (id `aph_*`, area_id FK CASCADE, url, caption, sort_order). RLS: SELECT publik true (pola `photo_albums.sql`); tulis lewat admin action service-role saja. `supabase_realtime` DITAMBAHKAN untuk area_photos (supaya landing ikut realtime seperti `photo_albums`). |
| D2 | Foto diunggah ke R2 folder `areas/` — tambah prefix ke `ALLOWED_PREFIXES` `api/_lib/r2Key.js` + kunci `ALLOWED_MIME` image saja pas presign (validasi MIME final via `verifyMimeMagicBytes` di `supabase-admin.js`). |
| D3 | 3 action baru di `api/supabase-admin.js` + zod (`api/_lib/schemas.js` server + `src/lib/schemas.ts` klien): `createEventArea`, `updateEventArea` (termasuk reorder via sort_order), `deleteEventArea` (hapus semua `area_photos` + file R2 fire-and-forget, pola `deleteAlbum`). Foto area: `createAreaPhoto` + `deleteAreaPhoto` + `updateAreaPhotoOrder` — sama pola album. |
| D4 | Admin UI: modal baru `EventAreaManagerModal` (pola `AlbumManagerModal`): daftar area (urut sort_order, drag handle naik/turun), create/edit inline (nama, deskripsi, upload cover), foto area (upload + hapus + set cover + atur urutan), toggle aktif/nonaktif. Item nav dashboard: label "Foto Area Event", ikon `MapPin`, grup Konten, `canManageSettings`. |
| D5 | Landing: section baru `CommunityEventAreas` (pola `CommunityGallery` + `CommunityFacilities`): `RevealSection id="areas"`, eyebrow "Foto Area Event", grid kartu area `is_active` terurut sort_order, cover `thumbUrl`, nama + deskripsi, klik foto → tab baru. Posisi: setelah `CommunityFacilities` (sebelum `CommunitySteps`). Tambahkan nav item `#areas` "Area". |
| D6 | Data hook: `useEventAreas()` (pola `useEvents.ts`) — fetch via client anon (SELECT RLS), subscription `postgres_changes` debounce 400ms (realtime di area_photos → re-fetch). Landscape state di `App.tsx` (pola `landingAlbums`): `eventAreas` state + fetch di useSiteSettingsHandlers. |
| D7 | Tipe: `EventArea` + `AreaPhoto` di `src/types.ts` (pola `PhotoAlbum`); mapper `dbEventAreaToEventArea` / `areaPhotoToDbRow` di `albumsApi.ts` (boundary snake_case↔camelCase). |
| D8 | Migrasi SQL manual (pola repo): `migrate/event-areas.sql`. Tidak otomatis; DDL = langkah user (SQL Editor / run-schema.mjs). |

## 4. Database — `migrate/event-areas.sql`

Tabel + RLS + realtime + index (detail §3 D1). Prefix id konsisten: `era_` / `aph_`. `is_active` menjawab kebutuhan "sembunyikan area" tanpa hapus foto.

## 5. Server API

### 5.1 `api/_lib/schemas.js` — tambah action (pola album)

```js
createEventArea: z.object({ action: z.literal('createEventArea'), data: z.object({ name: z.string().min(1, 'Nama area wajib diisi') }).passthrough() }),
updateEventArea: z.object({ action: z.literal('updateEventArea'), id: z.string().min(1), data: z.object({}).passthrough() }),
deleteEventArea: z.object({ action: z.literal('deleteEventArea'), id: z.string().min(1) }),
createAreaPhoto: z.object({ action: z.literal('createAreaPhoto'), data: z.object({ url: z.string().min(1), area_id: z.string().min(1) }).passthrough() }),
deleteAreaPhoto: z.object({ action: z.literal('deleteAreaPhoto'), id: z.string().min(1) }),
updateAreaPhotoOrder: z.object({ action: z.literal('updateAreaPhotoOrder'), data: z.array(z.object({ id: z.string(), sortOrder: z.number() })) }),
```

### 5.2 `api/supabase-admin.js` — case baru (pola album, logActivity)

- `createEventArea` → insert, return id, log `create_event_area`.
- `updateEventArea` → update by id, log `update_event_area`.
- `deleteEventArea` → ambil semua `area_photos` (id,url) → delete rows → delete R2 fire-and-forget (`deleteR2File`) → delete area, log `delete_event_area`.
- `createAreaPhoto` → ambil max sort_order per area (pola `createAlbumPhoto`) → insert, return id+sortOrder.
- `deleteAreaPhoto` → hapus row.
- `updateAreaPhotoOrder` → update berurutan (pola `updateEventPhotoOrder`).

### 5.3 `api/_lib/r2Key.js` — tambah `'areas/'` ke `ALLOWED_PREFIXES`.

## 6. Client API — `src/utils/api/albumsApi.ts` + barrel

- `fetchEventAreas(): Promise<EventArea[]>` — `supabase.from('event_areas').select('*').order('sort_order')`, lalu `area_photos` count per area (`countMap` pola `fetchAlbums`), mapper snake→camel.
- `createEventArea(name, description, coverPhotoUrl?)`, `updateEventArea(id, data)`, `deleteEventArea(id)`.
- `uploadAreaPhoto(areaId, file)` = `uploadToR2(file, 'areas/')` + `createAreaPhoto`; `deleteAreaPhoto(id, url)` = `deleteFromR2` + admin action; `updateAreaPhotoOrder(photos)`.
- Re-export di `src/utils/supabaseApi.ts` (barrel).

## 7. Tipe — `src/types.ts`

```ts
export interface EventArea { id: string; name: string; description: string; coverPhotoUrl: string; sortOrder: number; isActive: boolean; photoCount?: number; }
export interface AreaPhoto { id: string; url: string; caption: string; areaId: string; sortOrder: number; }
```

## 8. Admin UI — rantai wiring (per-file, pola `update-fitur-sponsorship.md` §7)

| File rantai | Perubahan |
|---|---|
| `src/components/dashboard/dashboardNavigation.tsx` | tambah callback `onOpenEventAreaManager` (props + callbacks + no-op + wire) + item nav `{ id: 'event-areas', label: 'Foto Area Event', icon: <MapPin/>, callback: callbacks.onOpenEventAreaManager }` dalam grup Konten `canManageSettings` |
| `src/components/dashboard/AdminSidebar.tsx` | props + wire (pola `onOpenAlbumManager`) |
| `src/components/dashboard/DashboardShell.tsx` | props + wire |
| `src/components/dashboard/DashboardPage.tsx` | tambah `showEventAreaManager/setShow…` di `DashboardPageSiteSettings` + props + `onOpenEventAreaManager` + `onCloseEventAreaManager` ke `DashboardModals` |
| `src/components/dashboard/DashboardModals.tsx` | lazy import + props + render `{showEventAreaManager && <EventAreaManagerModal …/>}` |
| `src/hooks/useSiteSettingsHandlers.ts` | state `showEventAreaManager/setShowEventAreaManager` + `eventAreas` + fetch (pola `landingAlbums`) |
| `src/hooks/useDashboardHandlers.ts` | re-export dari `site.*` |
| `src/App.tsx` | destructure + `dpSiteSettings` + `albums`→`landingAlbums` + `eventAreas={dpSiteSettings.eventAreas}` ke `CommunityLandingPage` |

## 9. Publik UI

### 9.1 File baru `src/components/community/CommunityEventAreas.tsx`

- Props `{ areas: EventArea[]; isLoading?: boolean }`.
- `RevealSection id="areas"` (skeleton pola `CommunityGallery`), eyebrow `CommunityEyebrow` "Foto Area Event", heading + subcopy.
- `areas.filter(a => a.isActive)` diurut `sortOrder`, grid `sm:grid-cols-2 lg:grid-cols-3`.
- Kartu (pola `CommunityGallery` album card + `ui-campaign-card`): cover `thumbUrl(a.coverPhotoUrl)` aspect-[16/10], `loading="lazy"`, nama + deskripsi `line-clamp-2`, badge "X foto". Bila `coverPhotoUrl` kosong → placeholder icon `Camera`. Klik foto → buka `a.coverPhotoUrl` di tab baru? TIDAK — tetap kartu statis (galeri area = teaser; link ke `/gallery` tidak relevan). Ongoing: klik kartu buka foto pertama area di tab baru bila ada foto.
- Empty state: jangan render section bila `areas` kosong DAN `!isLoading` (pola `albums.length > 0` di CommunityGallery). Skeleton saat loading.

### 9.2 `src/components/CommunityLandingPage.tsx`

- Import `CommunityEventAreas`, render tepat setelah `<CommunityFacilities />`.
- `NAV_ITEMS`: tambah `{ href: '#areas', label: 'Area' }` setelah `#benefits` (posisi masuk akal — section area dekat facilities).

## 10. Verifikasi (saat eksekusi)

1. `npm run build` — tsc + vite 0 error.
2. Unit: mapper `dbEventAreaToEventArea` (snake→camel, count map, is_active bool) + `updateAreaPhotoOrder` sorting (vitest, pola `publicEventVisibility.test.ts` — logika murni tanpa Supabase).
3. Supabase (read-only via anon): `event_areas` SELECT publik → 200; RLS tulis → ditolak (harus via admin action).
4. Admin: `npm run dev` + dashboard → nav Konten "Foto Area Event" → modal CRUD: buat area (cover upload R2 folder `areas/`), tambah foto, atur urutan, ubah, hapus (R2 ikut terhapus).
5. Landing `/`: section area muncul setelah Facilities; hanya area `is_active`; reorder tampil; foto lazy; dark mode OK.
6. Non-regresi: album/gallery/events tidak terkena (tak ada file yang disentuh selain rantai). `npx vitest run --dir src --maxWorkers=2` hijau.

## 11. Catatan implementasi

- `uploadToR2(file, 'areas/')` — folder baru butuh prefix di r2Key; R2 bucket yang sama (`metmal-gallery`).
- `verifyMimeMagicBytes` dipanggil di `supabase-admin.js` untuk seluruh upload (sudah ada untuk proposal); area photo hanya image → MIME magic image ok.
- TIDAK menyentuh `photo_albums`/`event_photos`/`events`/RLS existing. TIDAK menambah endpoint publik baru (landing baca langsung via client anon — RLS SELECT).
- Roadmap lanjutan (di luar scope): halaman detail area, peta interaktif, sinkronisasi otomatis `events.lokasi` → area (butuh mapping manual/curated).