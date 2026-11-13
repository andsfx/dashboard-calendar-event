# `/events` relayout mengikuti redesign Stitch

Written against: `3856760` (working tree dirty: `anti-slop/`, `docs/examples/`, `redesign/`, `md1.txt`, `md2.txt` tidak terlacak)

## Evidence chain

- Surface: rute publik `/events` → `src/pages/EventsLandingPage.tsx` (1017 baris), dirender melalui `src/App.tsx` dengan props dari `useEvents`/`useAreas`/`useAlbums`.
- Referensi redesign: `redesign/code.html` (1165 baris, HTML + CDN Tailwind) · `redesign/DESIGN.md` (222 baris, frontmatter "Urban Civic Pulse") · `redesign/screen.png`.
- Problem: struktur halaman saat ini menyajikan dataset **dua kali** — rail `EventRailCard` (maks 6 kartu: `railEvents = railRest.slice(0, 6)`, `:488`) lalu `CalendarView` dengan seluruh event (`:926`). Filter `?waktu=`/`?kategori=` hanya menyempitkan rail (`displayFilteredEvents` dipakai di `:804`), tidak pernah menyentuh kalender. Redesign menuntut sebaliknya: satu set kartu per **lokasi/venue**, lalu matriks kalender + agenda terkelompok sebagai pelengkap, dengan filter yang mengendalikan keduanya.
- Design evidence:
  - `redesign/DESIGN.md` — palet (`primary #006769`, `secondary #855300`, `teal-dark #004D4A`, `warm-canvas #FDFCF9`), tipografi Geist, radius kontainer 16px / pill 9999px / tombol 8px, floor sentuh 44px, kartu hero dual-pane dengan blok hitung mundur, kartu list ringkas dengan blok tanggal + chevron, matriks kalender dengan titik status.
  - Repo rules `AGENTS.md`: shadcn wajib di `src/**`; palet brand di `theme.css`/`tokens.css` **tidak** boleh diubah; token `--wf-*` adalah satu palet gelap/terang.
- Owner: `src/pages/EventsLandingPage.tsx` (komposisi halaman), `src/components/views/CalendarView.tsx` (kalender publik), `src/styles/dashboard-wayfinding.css` (token `--wf-*`), `src/components/shadcn/*` (primitif).
- Scope dan permukaan yang terpengaruh: `/events` saja. Header/footer publik (`PublicSiteHeader`) **tidak** berubah. Kalender dashboard (`dashboard/DashboardCalendarView`) tidak tersentuh.
- Uncertainty: `redesign/DESIGN.md` adalah palet baru (teal `#006769` + amber `#855300` + canvas `#fdfcff`), sedangkan aturan repo melarang mengganti palet brand. Rencana ini memetakan **struktur dan ritme layout** redesign ke token `--wf-*` yang sudah ada, bukan menyalin hex-nya. Bila user memang ingin palet Stitch masuk, itu keputusan terpisah yang harus lewat `theme.css` + `DESIGN.md` root, dan rencana ini berhenti.

## Design decision

Relayout `/events` dari "rail dua-baris + kalender terpisah" menjadi satu alur tunggal yang mengikuti `redesign/code.html`:

1. **Hero** dua kolom — kiri: eyebrow, `h1`, subjudul, tiga kartu metrik (Total/Berlangsung/Mendatang), baris aksi (`Kalender lengkap`, `Daftar ikut acara`, `Unduh brosur PDF`), catatan highlight. Kanan: kartu hero event terpilih dengan poster, chip status, chip kategori, **blok hitung mundur empat sel (Hari/Jam/Menit/Detik)** — menggantikan `CountdownCell` tiga sel + label Inggris "Countdown" yang sekarang ada di `HighlightEventCard` (`:145-157`, `:283`).
2. **Strip filter lengket** (`sticky top-16`) berisi tab waktu (Semua/Hari ini/Besok/Akhir pekan ini), kolom cari, dan chip kategori. Nilai filter tetap diturunkan dari `?waktu=`/`?kategori=` supaya URL masih bisa dibagikan, dan **kini juga menyaring kalender**. Kolom cari belum ada di implementasi relayout pertama — dikerjakan pada update 2026-11-12 (lihat bagian Update di bawah).
3. **Section per lokasi** — `groupEventsByArea` sudah ada (`src/utils/areaGrouping.ts:59`); ubah penyajiannya dari judul `<p className="text-xl font-bold">` (`:846`) menjadi heading seksi sungguhan + grid kartu, dengan heading "Panggung Funworld Lt. 3" bergaya `headline-md` dan kartu dua kolom.
4. **Bagian "Jadwal lengkap"** — layout 12 kolom: kiri 4 kolom berisi matriks kalender ringkas (sticky di `top` di bawah strip), kanan 8 kolom berisi roster agenda terkelompok (Rangkaian Acara / Acara Mendatang / Arsip Selesai) dengan bilah rekap bulanan di dasar.

Prinsip yang menahan skala: **jangan menambah bagian baru yang butuh data baru.** Setiap bagian di atas memetakan ke data yang sudah ada (`events`, `holidays`, `areas`, `albums`, `themes`). Yang berubah adalah susunan dan kendali filter, bukan permukaan data.

## Reuse

- `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` — `src/components/shadcn/tabs.tsx` (wajib untuk mode switch Daftar/Kalender bila dipakai; Radix sudah memberi roving tabindex + panah).
- `Button`, `Input`, `Badge`, `Card`, `Empty`, `Skeleton` — `src/components/shadcn/*`.
- Token `--wf-page`, `--wf-board`, `--wf-board-2`, `--wf-ink`, `--wf-ink-muted`, `--wf-rule`, `--wf-rule-strong`, `--wf-accent`, `--wf-accent-ink`, `--wf-live` (hijau berlangsung), `--wf-action` (amber mendatang), `--wf-danger` — `src/styles/dashboard-wayfinding.css`. **Tidak ada hex baru di komponen.**
- Radius: `--radius-campaign-card`, `--radius-card-lg`, `--radius-control` — `src/styles/theme.css`.
- `.ui-focus-ring`, `.touch-target`, `.touch-target-hit`, `.ui-eyebrow`, `.ui-text-muted`, `.ui-text-secondary` — `src/styles/utilities.css`, `typography.css`, `accessibility.css`.
- Helper data yang sudah ada: `collapseRecurringSeries`, `groupEventsByArea`, `resolveEventPoster`, `relativeDayLabel`, `countdownLabel`, `getTodayIsoLocal`, `getTomorrowIsoLocal`, `getWeekendWindow`, `eventOverlapsWindow`, `formatIsoId`, `isRecurringEvent`.
- Exemplar komposisi: `src/pages/TenantCollaborationPage.tsx:314-322` (judul dianimasikan, form di luar `RevealSection`), `src/components/events/EventTable.tsx` (pola `Table`), `src/components/survey/TenantSurveyList.tsx` (pola `Empty`).

Primitif baru: **tidak perlu.** Semua komponen yang dibutuhkan sudah ada.

## Changes

1. `src/pages/EventsLandingPage.tsx`
   - Change:
     - **Ganti `CountdownCell` 3 sel menjadi 4 sel (Hari/Jam/Menit/Detik)** dan ubah `getCountdown` (`:76-87`) agar mengembalikan `{ days, hours, minutes, seconds }`. Interval detik hanya saat hero visible; hentikan saat `document.hidden` agar tidak membakar CPU di tab latar.
     - **Hapus label Inggris "Countdown"** (`:283`) → "Hitung mundur acara" (R-16: chrome berbahasa Indonesia).
     - **Satukan sumber data tampilan**: teruskan `displayFilteredEvents` (bukan `events`) ke `CalendarView` di `:926`.
     - **Section per lokasi sebagai heading nyata**: `<p className="text-xl font-bold">` (`:846`) → `<h2>`/`<h3>` ber-semantik dengan kelas `font-display text-2xl font-bold`.
     - **Tambah `scroll-margin-top`** pada `#featured`, `#calendar`, `#filter`, dan `#lokasi-*` sebesar tinggi stack lengket terukur (header 64px + strip ~69px ≈ `8.5rem`), menggantikan `scroll-mt-28` yang sekarang kurang 21px terhadap strip lengket baru.
     - **Strip filter lengket** dibungkus `sticky top-16 z-30` dengan latar `bg-[var(--wf-page)]` + garis bawah; isi tab waktu memakai `Button` `aria-pressed` yang sudah ada (jangan tulis ulang).
     - **Bilah rekap bulanan** di dasar `#calendar`: tiga angka (Berlangsung/Mendatang/Selesai) diturunkan dari `displayFilteredEvents` bulan yang sedang ditampilkan kalender.
   - Preserve: `id="featured"`, `[data-event-poster]` di dalam kartu rail, teks "Event Rail" pada `poster.test.tsx:60,84`, satu `<h1>` nyata, tepat satu kecocokan nama seri di dalam `#featured` (`recurring.test.tsx:49`), `aria-pressed` pada chip filter, seluruh alur ekspor PDF (`useExportScope`, `PdfExportOptionsModal`, `ExportScopePicker`).
   - Verify: `npm run build` bersih; tiga tes `EventsLandingPage.*.test.tsx` lulus; `/events` di browser 1440px dan 390px tanpa error konsol; chip filter mengubah **baik** daftar maupun kalender.

2. `src/components/views/CalendarView.tsx`
   - Change: tetap menerima `events` yang sudah tersaring — **tidak ada perubahan API**. Hanya tambahkan kelas `scroll-mt` pada wrapper suface bila dipakai sebagai anchor; tidak ada perubahan logika.
   - Preserve: perilaku navigasi bulan, pemilihan tanggal, dan `onDetail`.
   - Verify: tes `src/components/views/__tests__/CalendarView*` (bila ada) lulus; smoke bulan sebelumnya/berikutnya.

3. `src/pages/EventsLandingPage.tsx` — hero kanan
   - Change: `HighlightEventCard` (`:158-311`) diberi blok hitung mundur 4 sel bergaya redesign (kotak `bg-[var(--wf-board-2)]` radius `--radius-control`, angka `font-display tabular-nums text-[var(--wf-live)]` saat berlangsung, `--wf-action` saat mendatang). Chip status tetap memakai `--wf-live`/`--wf-action` — **bukan** hex Stitch.
   - Preserve: pemilihan hero (poster dulu, lalu prioritas/tanggal), CTA detail, aksesibilitas `aria-live` pada hitung mundur (bila ada) agar tidak berisik pembaca layar.
   - Verify: hitung mundur bergerak tiap detik tanpa `act()` warning di tes; `poster.test.tsx:81-88` (hero memilih yang ber-poster) tetap lulus.

## Scope

- Inherit: rute `/events` saja. Karena `EventsLandingPage` satu-satunya pemanggil `CalendarView` dengan `variant="public"`, perubahan kelas tidak bocor ke dashboard.
- Verify: `src/pages/__tests__/EventsLandingPage.export.test.tsx`, `.poster.test.tsx`, `.recurring.test.tsx`; tes `src/utils/__tests__` untuk helper tanggal bila `getCountdown` diubah.
- Exclude: palet Stitch (`#006769` dkk) — tidak masuk `theme.css`/`tokens.css`; `PublicSiteHeader` dan `publicNav.ts`; halaman `/gallery`, `/news`, `/sponsor`; `improve/` sandbox.

## Validation

- Product: membuka `/events` dan melihat satu alur: hero → filter → kartu per lokasi → kalender + agenda; memfilter "Hari ini" mengubah daftar **dan** titik kalender.
- Interface: 390px (satu kolom, strip filter bisa digeser horizontal, kalender tidak meluber), 768px, 1440px. Mode gelap dan terang. Tidak ada overflow horizontal. Semua target sentuh ≥44px.
- System: `Tabs` dipakai untuk mode switch (bila dipertahankan) — bukan `role="tablist"` hand-rolled; `Empty` untuk keadaan kosong; `Table` tidak relevan di sini.
- Repository: `npm run build` → 0 error · `NODE_ENV=test npx vitest run --maxWorkers=2` → seluruh 159 file / 1334+ tes lulus.

## Stop conditions

- Stop if token `--wf-*` tidak dapat mengekspresikan kontras status (mis. chip amber di atas `--wf-board-2` di bawah 4.5:1) — laporkan angkanya, jangan tambal dengan hex baru.
- Stop if `collapseRecurringSeries` + filter berbasis tanggal saling bertabrakan sehingga kartu seri hilang dari lokasi padahal kemunculannya cocok.
- Stop if relayout memaksa perubahan props `EventsLandingPage` (mis. butuh data baru) — berarti bagian itu di luar sumber data yang ada dan harus dikonfirmasi.

## Design documentation

- Setelah diterima dan tervalidasi: catat di `docs/DESIGN-SYSTEM.md` bahwa `/events` memakai pola "venue-first, kalender sebagai pelengkap", dan tambahkan catatan di `DESIGN.md` bahwa palet Stitch (`redesign/DESIGN.md`) **belum** diadopsi; hex `#006769`/`#855300` dipetakan ke `--wf-accent`/`--wf-action`.

## Pemetaan aset redesign → repo

Redesign memakai dependensi CDN yang **tidak boleh** disalin apa adanya:

| Di `redesign/code.html` | Di repo ini |
|---|---|
| `cdn.tailwindcss.com` + `tailwind.config` inline | Tailwind v4 lewat Vite; token `@theme` di `src/styles/theme.css`. Jangan tambah konfigurasi CDN. |
| `Material Symbols Outlined` (`<span class="material-symbols-outlined">`) | `lucide-react`, sudah diimpor di `:21`. Padanan: `calendar_month`→`CalendarDays`, `schedule`→`Clock`, `pin_drop`/`location_on`→`MapPin`, `arrow_forward`/`chevron_right`→`ArrowRight`/`ChevronRight`, `search`→`Search`, `close`→`X`, `download_for_offline`→`Download`, `verified_user`→`ShieldCheck`, `layers`→`Layers`, `group`→`Users`, `mosque`/`music_note`→`Landmark`/`Music`. |
| `Geist` dari Google Fonts | `--font-family-body` (Geist) dan `--font-family-display` (Bricolage Grotesque) sudah self-hosted di `theme.css:82-84`. Redesign memakai Geist 700 untuk `h1`; halaman kini memakai Bricolage di `h1` — pertahankan Bricolage (`DESIGN.md` root menetapkannya). |
| Foto `lh3.googleusercontent.com/aida-public/...` | Poster event nyata lewat `resolveEventPoster`; jangan salin URL placeholder. |
| `#006769`, `#855300`, `#004D4A`, `#fdfcff` | `--wf-accent` (`#00706e`), `--wf-action` (`#9a4a06`), `--wf-board`/`--wf-page`. Selisih hue kecil; token repo menang. |
| Kelas `px-margin`, `pt-space-xl`, `gap-gutter`, `text-headline-md` | Skala Tailwind v4 repo: `px-4 sm:px-6`, `py-12 sm:py-16 lg:py-24`, `gap-4`, `text-2xl`/`text-3xl`. Jangan buat token spasi baru. |

## Update 2026-11-12 — gap Stitch yang dikerjakan

Bagian ini dicatat sebelum verifikasi gerbang selesai: angka tinggi strip dan hasil tes dikonfirmasi ulang setelah worker implementasi melapor. Perubahan menyentuh `src/pages/EventsLandingPage.tsx` dan `src/styles/utilities.css`.

1. **Search input pada strip filter** — param URL `q`; input memakai debounce 300 ms dan menulis URL lewat replace-navigation (tidak menambah entri riwayat). Placeholder `Cari nama lomba, workshop, kajian...`. Pencocokan case-insensitive pada nama acara, lokasi, dan keterangan, digabung AND dengan filter waktu + kategori, sehingga daftar kartu dan kalender memakai set yang sama. Query ikut masuk scope ekspor PDF. Tombol hapus hanya tampil saat input terisi.

2. **Chip kategori** — baris chip menjadi `flex-nowrap overflow-x-auto` dengan utilitas `.no-scrollbar` di `src/styles/utilities.css`; tiap chip `shrink-0 whitespace-nowrap`. Tinggi strip pada 390px turun dari ~141px ke ≤115px. Offset anchor `.events-page section[id]{scroll-margin-top:13rem}` tidak berubah dan tetap aman untuk kasus terburuk.

3. **Struktur per-venue ala Stitch di dalam `#featured`** — H2 "Mendatang dan berlangsung" dipertahankan. Blok venue pertama (area dengan `sort_order` terkecil yang punya event) dirender sebagai H3 + badge "Area Utama" + grid `md:grid-cols-2`. Blok "Lokasi Lainnya di Metmal" memakai grid `sm:grid-cols-2 lg:grid-cols-4`. Event tanpa area masuk ke Lokasi Lainnya; venue tanpa event dilewati (tidak jadi heading kosong). Bila `/areas` kosong, jatuh ke grid merged.

4. **Tetap tidak diport** — tidak ada sumber data nyata di repo untuk: peta lokasi, arsip acara selesai sebagai tabel, agregat peserta ("+450 peserta"), dan fixture angka 283/0/11.
