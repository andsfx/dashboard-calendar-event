# Update fitur — Redesign halaman `/events`

> Brief handoff untuk coding agent. Prototype = `jadwal-event.html` (single-file HTML, high-fidelity, interaksi berfungsi). Target = `src/pages/EventsLandingPage.tsx` + komponen turunan. Baca `AGENTS.md`, `DESIGN.md`, `CONTEXT.md`, dan `docs/adr/` sebelum mulai.

## 1. Ringkasan

Mengadopsi bahasa visual dan beberapa refinement interaksi dari prototype ke halaman `/events` yang **sudah ada**. Ini **bukan** greenfield dan **bukan** pemangkasan fitur: `EventsLandingPage.tsx` sudah punya hero poster, statistik live, filter sticky, featured events, grouping per area venue, `CalendarView`, ekspor PDF, dan modal detail. Prototype adalah *north star visual*; halaman existing adalah *baseline fungsional* yang wajib dipertahankan.

**Goal (satu kalimat):** menyatukan arah visual Metmal (paper/tosca/pink, register mono, satu momen hero) ke halaman yang sudah berfungsi, tanpa menurunkan a11y, tanpa menghapus fitur, dan tanpa raw-hex di luar layer token.

## 2. Keputusan desain yang dikunci (dari prototype)

1. **Satu aksen tosca.** Tosca dipakai untuk CTA primer + status "berlangsung" saja. Pink (`--color-brand-secondary-*`) hanya untuk aksen kategori (`CATEGORY_COLORS`). Maksimal **2× aksen per layar**.
2. **Tiga register type** — display = Bricolage Grotesque, body = Geist, meta/angka = Geist Mono. Ketiganya **sudah** self-hosted di `public/fonts/` + `src/styles/fonts.css` (wght 400–700). Tidak ada perubahan font yang dibutuhkan.
3. **Register mono konsisten** — eyebrow, label status, meta tanggal, dan angka besar memakai Geist Mono, UPPERCASE, `letter-spacing >= 0.06em` (prototype memakai 0.08em).
4. **Satu momen visual** — hero split (teks kiri + poster/statistik kanan) dengan countdown live. Tidak ada efek dekoratif lain yang bersaing.
5. **Satu CTA primer per viewport.** Entry point lain (nav, kartu, footer) = `secondary`/`ghost`/text-link, dan copy-nya tidak mengulang kata per kata.

## 3. Mapping token (prototype → repo)

Prototype menulis enam token seed + beberapa turunan di `:root`. Di repo, semua itu sudah ada — **jangan definisikan ulang**, cukup panggil token yang ada. `--wf-*` flip sendiri untuk dark mode (jangan tambah `dark:` untuk peran netral).

| Prototype (`:root`) | Nilai | Token repo | Tailwind v4 |
|---|---|---|---|
| `--bg` | `#f8f7f0` | `--wf-page` | `bg-[var(--wf-page)]` |
| `--surface` | `#fdfcf6` | `--wf-board` | `bg-[var(--wf-board)]` |
| `--fg` | `#16211b` | `--wf-ink` | `text-[var(--wf-ink)]` |
| `--muted` | `#58645a` | `--wf-ink-muted` | `text-[var(--wf-ink-muted)]` |
| `--border` | `#e4dfd2` (prototype) | `--wf-rule` `rgba(22,33,27,.14)` | `border-[var(--wf-rule)]` |
| `--accent` | `#00706e` | `--wf-accent` | `bg-[var(--wf-accent)]` |
| `--accent-ink` | `#ffffff` | `--wf-accent-ink` | `text-[var(--wf-accent-ink)]` |
| `--accent-bright` | `#33bfbc` | `--color-brand-primary-400` | `text-brand-primary-400` |
| `--accent-soft` | tosca 14% | `--wf-accent-soft` `#e6f7f6` | `bg-[var(--wf-accent-soft)]` |
| `--pink` | `#e24378` | `--color-brand-secondary-500` | `bg-brand-secondary-500` |
| `--pink-ink` | `#b02a56` | `--color-brand-secondary-600` (`#c2185b`) | `text-brand-secondary-600` |
| `--live` | `#1d7a4f` | `--wf-live` `#046a4e` | `text-[var(--wf-live)]` |

Catatan:
- `--wf-accent` = tosca-700 `#00706e` (bukan `#00918e`). Pakai `--wf-accent` untuk **fill** CTA; brand `#00918e` (`--color-brand-primary-500`) hanya untuk hue kategori/ilustrasi.
- `--wf-rule` adalah `rgba`, bukan hex solid — itu memang garis halus di atas board. Untuk border kontrol yang butuh kontras 3:1, ada `--wf-rule-control #7d847e`.
- Status warna: `STATUS_COLOR` di `src/utils/eventUtils.ts` sudah memetakan `upcoming→amber`, `ongoing→emerald`, `past→slate`. Komponen `ui/StatusBadge` ada. Jangan tulis ulang logika status.

## 4. Typography (sudah ada, jangan ubah)

`src/styles/typography.css` memuat `.ui-eyebrow` / `.ui-caption`; font family sudah dipasang di `fonts.css`. Satu-satunya pekerjaan di sini: pastikan **semua** label uppercase memakai tracking `>= 0.06em` (sebagian kelas `.status` di prototype masih 0.04em sebelum dikoreksi — pastikan tidak ada regresi). Jangan memperkenalkan font baru.

## 5. Map komponen (prototype → source)

| Section prototype | Target repo | Aksi |
|---|---|---|
| Topnav | `src/components/nav/PublicSiteHeader.tsx` | **Tidak ada perubahan.** Header publik sudah berbagi + punya tombol "Menu" untuk mobile. Hamburger di prototype adalah stand-in; jangan menulis ulang header di `pages/*`. |
| Hero split + countdown | `EventsLandingPage.tsx` ~`:283–458` (blok `EventPosterBanner` + statistik) | Adopsi ritme visual hero. Countdown sudah pakai `countdownLabel()` (`:428`); pastikan label target dinamis, tidak ada nama acara hardcoded. |
| Statistik live (6/4/2/5) | `EventsLandingPage.tsx` `liveEvents`/`upcoming`/`ongoing`/`highlight` (`:598–632`) | Angka dihitung dari `events` (bukan karangan). Pertahankan. |
| Filter sticky (`id="filter"`) | `EventsLandingPage.tsx` `:948` | Port perbaikan UX: target sentuh `>= 44px`, state `aria-pressed` jujur terhadap filter aktif. Segmen filter pakai shadcn `toggle-group.tsx` (bukan tombol hand-rolled). **Buka keputusan**: prototype mengganti sentinel `'Semua'` → `'Aktif'` karena "Semua" menyembunyikan status Selesai. Repo konvensi `'Semua'` (AGENTS.md). Jangan ubah diam-diam — konfirmasi ke Andy. |
| Featured events (`id="featured"`) | `EventsLandingPage.tsx` `:1004` + `events/FeaturedEventCard.tsx` / `FeaturedEvents.tsx` | Demote CTA duplikat ke `secondary`; satu CTA primer per viewport. Pastikan poster unik per event (`resolveEventPoster`), tidak ada foto dipakai ganda. |
| Event rail per area | `venueSections` (`:689`) + komponen lokal `EventRailCard` (`EventsLandingPage.tsx` `:414`, dipakai `:1086/:1133/:1158`) | Pertahankan grouping area. Tambah affordance kartu clickable dengan pola **overlay** (AGENTS.md melarang `nested-interactive`): `<div class="relative">` + satu `Button` `absolute inset-0` untuk aksi kartu, tombol aksi di atas (`z-*`). |
| Kalender (`id="calendar"`) | `EventsLandingPage.tsx` `:1190` + `views/CalendarView.tsx` | Port improvement prototype: penanda "hari ini" + judul bulan dinamis mengikuti navigasi. **Verifikasi dulu** apakah `CalendarView` sudah punya keduanya sebelum menambah. |
| CTA band / footer | `EventsLandingPage.tsx` `:1214` | Satu CTA primer; entry point lain secondary/ghost/text-link. |
| Modal detail | `modals/EventDetailModal.tsx` / `onDetail` | Pastikan focus-trap + `aria-hidden` + restore fokus + tutup via Escape/backdrop. CTA di modal beri umpan balik nyata (state konfirmasi), bukan menutup diam-diam. |

## 6. Interaksi & a11y (refinement yang wajib port)

1. **Countdown label dinamis** — jangan hardcode nama event; `countdownLabel()` (`src/utils/eventDateTime.ts`) sudah menyediakannya.
2. **Focus-trap modal** — WCAG 2.1.2/2.4.3. Komponen shadcn `Dialog` (Radix) sudah menyediakan focus-trap bawaan; pastikan `EventDetailModal` memakainya, bukan `<div>` hand-rolled.
3. **`prefers-reduced-motion`** — nonaktifkan transform/transition GSAP/CSS dan `scroll-behavior: auto` bila user minta reduced motion. Cek `src/styles/motion.css` + `useGsapEntrance`.
4. **Kontras state tidak turun** — hover/focus/active harus mempertahankan atau menaikkan kontras (4.5:1 teks normal, 3:1 teks besar/ikon). Pink `#e24378` di atas board hanya ~3.3:1 → untuk teks kecil pakai `--color-brand-secondary-600`.
5. **Target sentuh `>= 44px`** — tombol segmen filter dan kontrol kalender.
6. **Ring fokus `:focus-visible`** — pakai `ui-focus-ring` yang sudah ada.
7. **Tanpa `scrollIntoView`** — pakai `scrollTo`/anchor natie.

## 7. Do-not-break (daftar "Keep" dari review)

- Disiplin token: nol raw-hex di luar `:root`/`shadcn-theme.css`; jangan modifikasi `theme.css`/`tokens.css` (palet brand).
- Register mono konsisten (eyebrow/status/meta/angka) dengan tracking uppercase.
- Focus-trap + `aria-hidden` + restore fokus pada modal.
- Statistik hero & countdown dihitung dari data nyata.
- Satu aksen tosca; pink hanya hue kategori.

## 8. Constraint repo yang wajib dihormati

- **shadcn/ui untuk semua kontrol** — `Button`, `Input`, `NativeSelect`/`Select`, `Table`, `Empty`, `Dialog`, `Badge`, dst. dari `src/components/shadcn` (import relatif, bukan `@/`). Tidak ada HTML hand-rolled untuk button/card/table/dialog/input/select/textarea/label/badge.
- **`--wf-*` untuk permukaan/teks/garis netral** — tanpa `dark:`; `dark:` hanya untuk scrim `bg-black/…`, warna status, dan hue data-viz. Layer token ada di `shadcn-theme.css`.
- **Jangan bungkus subtree interaktif dalam `RevealSection`** — memindahkan node `.reveal-stage` mencabut fokus tanpa `blur` (bug ketikan hilang; sudah 3× terjadi, ada tes penjaga). Form/input di luar wrapper, judul tetap boleh dianimasikan.
- **Guard `src/index.css` tetap utuh** — `@variant dark`, `@custom-variant data-horizontal`/`data-vertical`, dan semua `@source not`.
- **UI copy & error Bahasa Indonesia.**
- **Import relatif, named export** (file `src/pages/*` pengecualian default-export); alias `@/*` tidak dipakai.
- **Jangan ubah state/data-fetch/hooks/business logic** — refactor markup/komponen saja (kecuali item interaksi yang eksplisit di §6).
- **Jangan tulis ulang `PublicSiteHeader`** di dalam `src/pages/*`.

## 9. Acceptance criteria (P0) + verifikasi

- [ ] Build bersih: `npm run build` (tsc + vite).
- [ ] Unit: `NODE_ENV=test npx vitest run --maxWorkers=2` hijau (jangan ubah tes agar lolos).
- [ ] A11y: `npm run test:a11y` (playwright axe) — gunakan `--workers=1` bila OOM; 0 pelanggaran `color-contrast` (mode gelap + terang).
- [ ] Satu CTA primer per viewport; tidak ada foto event yang dipakai ganda.
- [ ] Semua label uppercase tracking `>= 0.06em`; target sentuh `>= 44px`.
- [ ] Modal: focus-trap + `aria-hidden` + restore fokus; CTA modal memberi umpan balik.
- [ ] Countdown label dinamis; kalender menampilkan "hari ini" + judul bulan dinamis.
- [ ] Tidak ada raw-hex baru di luar layer token; palet brand tidak diubah.
- [ ] Smoke nyata di layar yang berubah (dev server + browser) — perubahan UI belum terverifikasi sebelum dilihat.

**Keputusan terbuka untuk Andy** (jangan diputuskan sendiri): sentinel filter `'Semua'` vs `'Aktif'` (§5), dan apakah status `Selesai` perlu diurutkan descending (terbaru dulu).

## 10. Referensi

- Prototype: `jadwal-event.html` (workspace ini) — visual north star.
- `src/pages/EventsLandingPage.tsx` — baseline fungsional (jangan hapus fitur).
- `src/styles/dashboard-wayfinding.css` (`--wf-*`), `theme.css` (`--color-brand-*`), `typography.css`, `fonts.css`.
- `src/utils/eventUtils.ts` (`STATUS_LABEL`, `STATUS_COLOR`, `CATEGORY_COLORS`, `collapseRecurringSeries`), `eventDateTime.ts` (`countdownLabel`), `eventPoster.ts` (`resolveEventPoster`).
- `src/components/events/*`, `src/components/views/CalendarView.tsx`, `src/components/nav/PublicSiteHeader.tsx`.
- `AGENTS.md` §"UI Rules (shadcn/ui)" dan §"Code Conventions" — otoritas untuk pola implementasi.

## 11. Hasil implementasi (2026-11-21)

Status: **SELESAI untuk permukaan `/events`** (SPA, tanpa perubahan API/skema). Sumber visual yang tersedia di workspace: `New folder/code.html` + `New folder/screen.png` (ekspor Stitch) — file `jadwal-event.html` yang disebut di atas tidak ada; struktur Stitch sudah diport pada 2026-11-12 (`design-plans/2026-11-12-events-page-relayout-from-stitch.md`), jadi batch ini adalah refinement bahasa visual + perbaikan a11y, bukan relayout ulang.

### Keputusan yang diminta ke Andy (§9)

| Pertanyaan | Jawaban |
|---|---|
| Sentinel filter waktu | **`Aktif`** (bukan `Semua`) — halaman memang hanya memuat event yang belum selesai, jadi "Semua" menjanjikan arsip yang tidak dirender |
| Arsip `Selesai` diurutkan descending | **Tidak berlaku** — `/events` sengaja membuang event `past` (`EventsLandingPage.tsx` `liveEvents`, dijaga `EventsLandingPage.scope.test.tsx`), jadi tidak ada daftar arsip yang bisa diurutkan |

### Yang berubah

- **Register mono** (§2.3/§4): eyebrow, label status, meta tanggal/jam, angka besar, chip kartu, header kalender, dan hitungan agenda memakai `font-mono` + UPPERCASE + tracking `0.08–0.14em`. `tracking-wider` (0.05em) dan `tracking-wide` (0.025em) di permukaan ini diganti — dua nilai itu di bawah ambang 0.06em.
- **Filter waktu**: empat tombol `aria-pressed` diganti satu `ToggleGroup` (Radix, `type="single"`) — `radiogroup`/`radio` dengan `aria-checked`, roving tabindex, panah keyboard. Label sentinel → `Aktif`. Semua segmen `min-h-11` (44px) dan aktif memakai `--wf-accent`/`--wf-accent-ink` (5.9:1 terang, 8.5:1 gelap).
- **Satu CTA primer per viewport**: "Kalender lengkap" di hero, "Sinkron kalender"/"Unduh brosur PDF"/"Daftar ikut acara" jadi outline; primary hero dipegang "Lihat detail event" di kartu sorotan. Band bawah tetap satu primary dengan copy berbeda ("Daftarkan organisasi", bukan "Daftar event" yang sudah dipakai header).
- **Target sentuh 44px**: segmen filter, sel hari kalender (`h-11`), tombol bulan sebelumnya/berikutnya (`min-h-11 min-w-11`), input cari dan tombol hapusnya, serta anchor in-page.
- **Modal detail**: ditambah aksi nyata "Tambah ke kalender" (unduh `.ics` lewat `buildIcsBlob`/`downloadBlob`) dengan konfirmasi label + `role="status"` — bukan tombol yang menutup diam-diam. Fokus kini **kembali ke elemen pembuka**: `ModalWrapper` mencatat `document.activeElement` di layout effect dan memulihkannya lewat `onCloseAutoFocus`, karena Radix hanya memfokuskan `Dialog.Trigger` yang tidak dipakai (modal dibuka lewat state). `PublicEventDetailModal` juga tidak lagi mencabut dialog pada commit yang sama saat `isOpen` jadi false.
- **Tipografi/aksen**: kartu statistik hero memakai token status (`--wf-live`, `--wf-action`) alih-alih pasangan `emerald/amber` + `dark:`; hover CTA solid memakai `--wf-accent-hover` (bukan `--wf-page` yang membuat label 1.07:1).
- **Nav mobile**: hanya anchor in-page (`Sorotan`, `Kalender`); tujuan rute sudah ada di panel menu header sehingga tidak didaftar dua kali di satu layar.
- **Poster unik per halaman**: `resolveUniqueCardPosters` mendeduplikasi URL poster mengikuti urutan render nyata (hero dulu, lalu Area Utama, lalu "Lokasi Lainnya"). Event yang URL-nya sudah dipakai dirender tanpa banner (placeholder bertint kategori tetap tampil), kartu dan hitungan **tidak** berkurang. Sebelumnya event sorotan muncul lagi di blok venue dengan foto yang sama.
- **Kalender**: penanda "hari ini" (ring `--wf-accent`) dan judul bulan dinamis sudah ada sebelum batch ini — diverifikasi, bukan ditambah ulang. Sel hari kini 44px dan header memakai register mono.

### Yang sengaja **tidak** diubah

- **Kartu rail**: pola klik sudah memakai satu kontrol (`h4 > button` dengan overlay `after:inset-0`) dan dijaga `EventsLandingPage.structure.test.tsx`; menambah `Button absolute inset-0` seperti saran brief akan membuat dua kontrol per kartu.
- **Palet**: tidak ada hex baru di luar layer token; `CATEGORY_COLORS`/`darkenChipText` tetap sebagai hue kategori (data-viz).
- **Header publik**: tidak disentuh.

### Verifikasi

- `npx tsc --noEmit` → 0 error · `npm run build` → hijau (`[assert-lazy-entry-chunks] ok`).
- `NODE_ENV=test npx vitest run --maxWorkers=2` → **180 file / 1496 tes lulus**, termasuk berkas baru `EventsLandingPage.filter.test.tsx` (radiogroup, sentinel, URL), `EventDetailModal.calendar.test.tsx` (unduhan + umpan balik), tes pemulihan fokus di `ModalWrapper.test.tsx`, dan tes deduplikasi poster di `EventsLandingPage.poster.test.tsx`.
- Axe (tag `wcag2a/wcag2aa/wcag21a/wcag21aa/wcag22aa/best-practice`) pada `/events` di 320/390/768/1280 × terang/gelap: **0 pelanggaran**, 1 `incomplete` (pemeriksaan kontras pada node yang tidak bisa diukur axe, sama seperti baseline).
- Smoke browser (Playwright + REST di-mock): tanpa overflow horizontal di 320/390/768/1280; segmen filter 44px; satu primary per viewport; modal: fokus masuk dialog, Escape menutup, fokus kembali ke tombol "Lihat detail event", `.ics` terunduh dan label berubah.
