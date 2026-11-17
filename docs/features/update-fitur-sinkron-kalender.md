# Update Fitur: Sinkron Jadwal ke Google Calendar: Rencana Implementasi

Status: **SIAP DEPLOY** (feed `GET /api/v1/calendar.ics` + dialog di `/events` dan `/events/:id`; langganan Google dengan akun asli belum diuji karena belum dideploy) · Repo: schedule-event-v2 · 2026-11-17

## 1. Ringkasan

Sebelumnya kalender hanya bekerja per event: halaman detail menyediakan "Google Calendar" dan "Unduh .ics" untuk satu acara. Pengunjung yang ingin mengikuti seluruh jadwal MMB harus mengulanginya untuk setiap event, dan tidak ada cara agar event baru masuk otomatis.

Target:

- **Feed ICS publik** `GET /api/v1/calendar.ics` berisi semua event yang belum selesai dan tidak berstatus draft. URL ini bisa ditambahkan ke Google Calendar ("Kalender lain → Dari URL"), Apple Calendar, atau Outlook.
- **Satu dialog sinkronisasi** di `/events` (tombol "Sinkron kalender") dan `/events/:id` (tombol "Ikuti semua jadwal"): deep link langganan Google (`webcal://` di parameter `cid`), salin URL langganan, dan unduh seluruh jadwal sebagai `.ics`.
- **Perubahan jadwal ikut tersinkron**: UID stabil per event (`<id>@metmalcommunityspace.web.id`) membuat Google memperbarui entri yang sama, bukan menduplikasinya.

Non-goal: OAuth Google Calendar, menulis ke kalender pengguna, pengingat/notifikasi, dan sinkronisasi dua arah.

## 2. Keputusan desain

| # | Keputusan |
|---|---|
| D1 | Langganan memakai **feed URL publik**, bukan OAuth. Pengunjung tidak perlu login, dan event baru tetap masuk tanpa membuka situs. |
| D2 | Feed hanya memuat event yang **belum selesai** (`GREATEST(date_str, date_end) >= hari ini WIB`). Riwayat bertahun-tahun tidak perlu dikirim ke setiap subscriber. |
| D3 | Draft tetap tertutup lewat `status <> 'draft'` (ADR 008). Kolom PII tidak pernah di-SELECT. |
| D4 | Perbandingan `date_str` (TEXT) memakai `safeDate` dari `eventWindow.js` (CASE + regex), bukan cast langsung, karena nilai legacy non-tanggal akan melempar 22007/22008. |
| D5 | Jam ditulis wall-clock + `TZID=Asia/Jakarta` (bukan UTC), sama dengan builder klien. VTIMEZONE WIB ikut dikirim agar Outlook tidak menolak TZID. |
| D6 | Event multi-hari ber-`day_time_slots` ditulis satu VEVENT per slot; satu VEVENT raksasa akan menampilkan jam yang sama di semua hari. |
| D7 | Deep link Google memakai `https://calendar.google.com/calendar/r?cid=<webcal-url>`. Bentuk `webcal://` adalah yang konsisten untuk langganan, bukan impor satu event. |
| D8 | Unduhan `.ics` dibuat di klien dari event yang sedang tampil (`liveEvents`), sebagai fallback bila langganan gagal. Di halaman detail (hanya satu event dimuat) tombol unduh semua disembunyikan. |
| D9 | Tidak ada tabel/kolom baru dan tidak ada migrasi SQL. |
| D10 | Tidak ada rate limit tambahan: endpoint hanya membaca, dan respons di-cache 5 menit (`Cache-Control: public, max-age=300`). |
| D11 | Jam dunia nyata tidak selalu berbentuk rentang: produksi berisi `13.00 WIB`, `11.00 WIB - selesai`, `-`, dan kosong. Nilai tanpa jam selesai yang bisa dipercaya tetap ditulis **all-day**, bukan durasi karangan; jam aslinya dibawa di `DESCRIPTION: Jam: …` agar subscriber tetap melihatnya. `day_time_slots` array kosong diperlakukan sama dengan `null` (tidak ada slot). |
| D12 | Build produksi tanpa `VITE_API_URL` akan menembak `/api/v1/calendar.ics` ke origin Vercel yang tidak punya API. Dialog menyembunyikan aksi langganan dan menampilkan peringatan bila `import.meta.env.PROD` dan variabel itu kosong; unduhan `.ics` tetap tersedia. |

## 3. Implementasi

### 3.1 `server/src/lib/ics.js` (baru)

Builder RFC 5545: header `VCALENDAR` + `VTIMEZONE` WIB, VEVENT per event/slot, escape teks (§3.3.11), lipat baris 75 oktet UTF-8 (§3.1), UID stabil, `DTSTAMP` UTC. Rentang waktu mengikuti `resolveRange` di `src/utils/calendarLinks.ts`:

- dengan jam: `DTSTART/DTEND;TZID=Asia/Jakarta`, jam selesai lebih kecil dari jam mulai pada event satu hari digulung ke hari berikutnya;
- tanpa jam: all-day, `DTEND;VALUE=DATE` = tanggal berakhir + 1 (eksklusif).

### 3.2 `server/src/routes/public.js`: `GET /calendar.ics`

`SELECT id, date_str, date_end, jam, acara, lokasi, keterangan, day_time_slots` dari `events` dengan filter draft + belum selesai, lalu `res.send` bertipe `text/calendar; charset=utf-8`. Bukan envelope JSON.

### 3.3 `src/utils/calendarLinks.ts`

Tambahan `calendarFeedUrl()`, `googleCalendarSubscribeUrl(feedUrl)`, `buildEventsIcsBlob(events)`, dan `CALENDAR_ICS_FILE_NAME`. Fungsi `buildEventLines()` menjadi satu-satunya jalur ekspansi `dayTimeSlots`, dipakai unduhan satu event (`buildIcsBlob`) dan unduhan banyak event; hasilnya sejalan dengan builder server. Event all-day yang jamnya tidak bisa diparse tetap membawa `Jam: …` di deskripsi.

### 3.4 `src/components/events/CalendarSyncDialog.tsx` (baru)

Dialog shadcn (`Dialog`, `Button`, `Input`, `Label`) dengan:

- tombol primer "Tambah ke Google Calendar" (deep link langganan),
- URL langganan yang bisa disalin (`role="status"` mengumumkan hasil salin/gagal),
- tombol "Unduh semua event (.ics)" bila daftar event tersedia,
- petunjuk Google Calendar, peringatan mode lokal (URL localhost), dan peringatan build tanpa `VITE_API_URL`.

### 3.5 Entri UI

- `src/pages/EventsLandingPage.tsx`: tombol "Sinkron kalender" di baris aksi hero, dialog menerima `liveEvents`.
- `src/pages/EventPublicDetailPage.tsx`: tombol "Ikuti semua jadwal" di baris aksi kalender, dialog tanpa daftar event (hanya langganan).
- `src/data/featureDocs.ts`: entri "Sinkron jadwal ke kalender" + langkah di "Jadwal event" dan "Detail event".

## 4. Verifikasi

- [x] `npx tsc --noEmit` 0 error.
- [x] `npm run build` hijau (`[assert-lazy-entry-chunks] ok`).
- [x] `NODE_ENV=test npx vitest run` untuk 15 file terkait (page `/events`, detail, docs, dialog, util, builder + route server): **102 tes hijau**, termasuk guard build produksi tanpa `VITE_API_URL` (aksi langganan disembunyikan, unduhan `.ics` tetap tampil).
- [x] Smoke rute lokal: `GET http://localhost:3001/api/v1/calendar.ics` menjawab **503 DB belum dikonfigurasi**, bukan 404, jadi rute ter-mount. Ini **bukan** bukti body 200; body ICS diverifikasi oleh tes route dan oleh query produksi di bawah.
- [x] SQL feed dijalankan **read-only** di Postgres produksi (`ssh medprom` → `docker compose exec -T postgres psql -U metmal -d metmal`): query dengan `safeDate` + `GREATEST(...) >= hari ini WIB` yang sama dengan route mengembalikan **19 event**. Ini membuktikan sintaks dan filter tanggal pada data nyata, tanpa mutasi.
- [x] Smoke browser (Playwright, REST di-mock): dialog terbuka dari `/events`, URL langganan terisi, tautan Google memakai `webcal://`, unduhan `.ics` tampil, nol console error. Mobile 390 px mode gelap: dialog 358×500, tidak ada overflow horizontal, Escape menutup dialog; dari `/events/:id` tombol "Ikuti semua jadwal" membuka dialog tanpa tombol unduh semua.

Belum dibuktikan (butuh deploy):

- [ ] `GET https://metmal.metmalcommunityspace.web.id/api/v1/calendar.ics` mengembalikan **200** `text/calendar` dari API VPS.
- [ ] Google Calendar benar-benar menerima feed dan menampilkan event (akun uji).

## 5. Urutan deploy

1. **Sebelum deploy SPA**, pastikan `VITE_API_URL` terisi di Vercel **Production dan Preview** (env Vercel berlaku per-environment). Tanpa itu, dialog menghasilkan URL same-origin yang 404; guard di `CalendarSyncDialog` akan menyembunyikan aksi langganan dan menampilkan peringatan, tetapi fitur tidak berguna.
2. Deploy API VPS lebih dulu. `/opt/metmal` **bukan clone Git** (`git rev-parse` gagal), jadi update lewat `scp` dua file: `server/src/routes/public.js` dan `server/src/lib/ics.js`. Repo di-bind-mount read-only ke `/srv/app`, jadi `docker compose restart api` sebenarnya cukup; prosedur repo memakai `docker compose -f /opt/metmal/deploy/vps/docker-compose.yml up -d --force-recreate api`. Jangan lupa `ics.js`; tanpa file itu import route gagal dan API tidak boot.
3. Deploy SPA Vercel.
4. Verifikasi read-only: `curl -I https://metmal.metmalcommunityspace.web.id/api/v1/calendar.ics` → `200` + `content-type: text/calendar`.
5. Cek langganan nyata di Google Calendar (akun uji): "Kalender lain → Dari URL" → tempel URL feed → event tampil. Langkah ini belum dijalankan pada sesi implementasi.