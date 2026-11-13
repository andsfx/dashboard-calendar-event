# Audit 003 — Kartu agenda section "Lokasi Lainnya di Metmal"

- Tanggal: 2026-11-13
- Target: `/events`, section yang dirender di `src/pages/EventsLandingPage.tsx:1019-1050` — `h3` "Lokasi Lainnya di Metmal" (`:1028`), subjudul `{others.length} agenda di {otherVenueSummary}` (`:1032`), badge `<span>` "Diperbarui setiap minggu" (`:1038-1043`), grid `sm:grid-cols-2 lg:grid-cols-4` (`:1045`) berisi `EventRailCard` (`:407-489`).
- Metode: dua fase, keduanya read-only, tanpa perubahan `src/**`. (1) Audit statis kode; line number mengacu working tree saat audit. (2) Pengukuran browser: setiap klaim berlabel `[TERUKUR]` merujuk `reports/area-cards-measure.md` — Chromium 149.0.7827.55 / Playwright 1.61.1, viewport **1440×900** dan **390×844**, `reducedMotion: 'reduce'`, tema terang, DPR 1, REST `/api/v1/**` di-mock (12 kartu: 1 berposter, 1 berulang, 1 tanpa jam, 1 judul 127 karakter). Catatan cakupan: angka `[TERUKUR]` berasal dari viewport **1440** (bukan 1349 seperti screenshot) dengan data mock, jadi yang dikonfirmasi adalah mekanismenya, bukan setiap piksel produksi.
- Verifikasi target: `grep -rn "hasMappedAreas" src` → 0 hasil; `grep -rn 'p className="text-xl font-bold"' src` → 0 hasil. Petunjuk di brief (`hasMappedAreas`, baris 800-900) sudah tidak ada di HEAD; section di screenshot adalah blok `primaryVenue`/`others` (`:944-1050`), dan judul "Lokasi Lainnya" kini `<h3>` (`:1028`).

## Status verifikasi (2026-11-13, sesudah implementasi)

Semua 13 temuan (A-01…A-15) + temuan data A-10/A-11 sudah diimplementasikan dan
diukur ulang di browser. Bukti: `reports/area-cards-measure.md` run 2, run 3, dan
run 4 (tema gelap). Angka kunci sesudah perbaikan:

| Metrik | Sebelum | Sesudah | Verdict |
|---|---|---|---|
| Tinggi kartu per baris | 396,5 / 167 / 144,5 (range 252 px) | **295×12** (1440 & 1024) · **290×12** (390); max−min **0** | PASS |
| Ruang mati simetris | 147 px atas + 147 px bawah | 1 / 20 / 21 px; sisa baris hanya di antara judul dan meta | PASS |
| Chip lipat dua baris | 40 px & 36,56 px | **24 px, 1 baris**, `nowrap` + `shrink-0` | PASS |
| Variasi `top` chip / meta | 103,5 px / 126 px | **0 px / 0 px** tiap baris | PASS |
| Kontras panah | 1,91:1 | **6,04:1** terang · **7,70:1** gelap | PASS |
| Heading | 12 `h3` di dalam `<button>` | `h2` → `h3` (area) → `h4` (kartu); `button h1..h4` = 0 | PASS |
| `jam: '–'` tampil di kartu | tampil (truthy) | `''` — meta tanpa teks; tidak ada U+2013 di body | PASS |
| Roundtrip baca→tulis `jam` | prosa terhapus diam-diam | satu aturan `resolveJam` untuk kedua arah; prosa dipertahankan | PASS (tes roundtrip) |

Gate akhir (2026-11-13): `npx tsc --noEmit` 0 error · `npm run build` hijau ·
`NODE_ENV=test … vitest run --maxWorkers=2` **166 file / 1394 tes / 0 gagal**.
Cakupan sisa yang tidak dikerjakan karena di luar kontrak: (1) rasio poster produksi
nyata dan besar crop-nya, (2) paparan AT hasil hitung nama aksesibel — keduanya tetap
di bagian "Belum terverifikasi" di bawah.

## Ringkasan

Tinggi baris grid ditentukan satu kartu yang kebetulan punya poster: banner `aspect-[4/3]` dirender kondisional (`:414`), tanpa `auto-rows` atau media slot bertinggi tetap (`:1045`). `[TERUKUR]` baris 1 = **396,5 px** vs baris 2 = 167 px vs baris 3 = **144,5 px** (**2,7×**), karena kartu berposter menambah band 229,5 px. Tiga kartu non-poster di baris 1 lalu di-stretch dan menyisakan **147 px di atas + 147 px di bawah** — simetris, bukan di bawah saja — sebab `Button` shadcn membawa `justify-center` (`src/components/shadcn/button.tsx:7`) yang tidak pernah ditimpa di `:412`; akibatnya chip bar dalam satu baris meleset **103,5 px**. Di atas itu, baris chip **melipat dua baris** di ≥1024 px (A-15), lokasi yang sudah disebut subjudul (`:1032`) diulang 12× (`:482`), panah 1,91:1 adalah satu-satunya ikon yang gagal 3:1, dan struktur kartu menaruh `h3`/`div` di dalam `<button>` sehingga section berisi **13 H3** tanpa satu pun H4.

## Temuan

### A-01 · HIGH · Tinggi baris grid ditentukan poster satu kartu

**Problem.** Kartu merender `<EventPosterBanner>` hanya bila `posterUrl` ada, dan banner itu memakai `aspect-[4/3] w-full` tanpa tinggi maksimum. `[TERUKUR]` pembungkus `div[data-event-poster]` ada di **1 dari 12 kartu**; 11 kartu lain tidak punya node pembungkus sama sekali — jadi ini bukan wrapper kosong yang mereservasi ruang. Penyebabnya dua lapis: (a) band poster 4:3 selebar kolom menambah 229,5 px hanya pada satu kartu, (b) grid memakai `align-items: normal` (stretch) tanpa `grid-auto-rows`, sehingga tiga kartu lain dipaksa setinggi penentu baris.

**Evidence.**
- `src/pages/EventsLandingPage.tsx:414` — `{posterUrl && <EventPosterBanner src={posterUrl} alt={event.acara} />}`
- `src/components/events/EventPosterBanner.tsx:32` — `className={\`relative aspect-[4/3] w-full overflow-hidden bg-[var(--wf-board-2)] ${className}\`}`
- `src/pages/EventsLandingPage.tsx:1045` — `<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">` (tanpa `auto-rows-*`)
- `[TERUKUR]` 1440×900, `getBoundingClientRect().height`: baris 1 = **396,5 px ×4**, baris 2 = **167 px ×4**, baris 3 = **144,5 px ×4**. Tinggi natural per kartu: `144,5 · 144,5 · 144,5 · 396,5 | 128,5 · 144,5 · 167 · 144,5 | 144,5 ×4`.
- `[TERUKUR]` penentu tiap baris: baris 1 = kartu #3 (poster; 396,5 = band 229,5 + isi 165 + border 2); baris 2 = kartu #6 (judul 2 baris; natural 167); baris 3 = tidak ada stretch (semua natural 144,5).
- `[TERUKUR]` pembungkus poster: `aspect-ratio: 4 / 3`, tinggi **229,5 px** pada lebar kartu 306 px; di 390 px lebar isi 356 px → **267 px**. Gambar 900×1200 (3:4 potret) di-`object-cover`, jadi rasio asli poster tidak ikut menambah tinggi — tinggi murni dari kotak 4:3.
- `[TERUKUR]` 390×844: grid 1 kolom, **tanpa** stretch; kartu poster 395,5 px vs kartu isi 128,5-151 px, jadi baris tinggi hanya muncul ≥`sm`.

**Dampak ke pengguna.** `[TERUKUR]` satu kartu berposter membuat barisnya 396,5 px sementara baris normal 144,5 px (**2,7×**), dan 3 kartu di baris itu membawa 252 px ruang mati gabungan (147 atas + 147 bawah masing-masing, A-02). Tinggi halaman bertambah ±252 px untuk 12 agenda, baris 2-3 terdorong keluar layar 900 px, dan grid kehilangan ritme.

**Usulan perbaikan.** Beri setiap kartu **satu media slot bertinggi tetap** (`h-32`, 128 px, dirender tanpa syarat; isi netral bertint kategori + glif bila `posterUrl` kosong), lalu buat blok konten `flex-1` dan baris meta `mt-auto`. Dengan slot yang selalu ada, semua kartu menjadi ≈272 px (128 + 144,5 isi terukur) dan tinggi baris tidak lagi bergantung data; banner `aspect-[4/3]` hilang dari grid.

### A-02 · HIGH · `justify-center` warisan `Button` membuat isi kartu mengambang

**Problem.** Kartu adalah `Button` shadcn. Basisnya membawa `flex items-center justify-center` (`button.tsx:7`). Caller menimpa `flex`, `h-auto`, `gap`, `p`, `whitespace` — beberapa dengan `!` — tetapi **tidak pernah** menulis `justify-*`. `[TERUKUR]` `justify-content` efektif pada kartu memang `center`, dan pada kartu yang lebih pendek dari barisnya sisa ruang dibagi **simetris** atas-bawah, bukan menumpuk di bawah. Ini persis gejala "chip baris 1 mengambang di tengah, baris 2-3 menempel atas".

**Evidence.**
- `src/components/shadcn/button.tsx:7` — `"group/button inline-flex shrink-0 items-center justify-center rounded-lg …"`
- `src/pages/EventsLandingPage.tsx:412` — `"group flex min-w-0 flex-col items-start overflow-hidden … flex! h-auto gap-0! p-0! whitespace-normal! …"` (tidak ada `justify-start`)
- `DESIGN.md:577-583` mendokumentasikan bahwa `cn` pada primitive shadcn tidak saling menghapus kelas varian; penimpaan harus eksplisit.
- `[TERUKUR]` ruang kosong dalam kartu (tepi kartu → anak pertama / anak terakhir → tepi kartu): `#0,#1,#2` = **147 px / 147 px** (isi 142,5 di kotak 394,5 → sisa 252 dibagi 126+126, + padding 20 + border 1). Baris 2: `#4` 40,25/40,25; `#5` 32,25/32,25; `#6` 21/21; `#7` 32,25/32,25. Baris 3: `#8-#11` 21/21 (21 = padding 20 + border 1, artinya tanpa sisa).
- `[TERUKUR]` variasi `top` chip bar **dalam satu baris**: baris 1 = **103,5 px** (657,14 ×3 vs 760,64 pada kartu poster), baris 2 = **19,25 px**, baris 3 = **0**. Variasi `top` blok meta: **126 px** / 19,25 / 0 (baris 1 lebih besar karena judul kartu poster 2 baris = 45 px vs 22,5 px).
- `[TERUKUR]` 390×844: 1 kartu per baris → variasi 0; offset chip 21 px untuk semua kartu non-poster, 288 px untuk kartu poster.

**Dampak ke pengguna.** `[TERUKUR]` garis pindai horizontal (chip bar) meleset hingga 103,5 px di baris 1 dan 19,25 px di baris 2, sehingga grid 4 kolom tidak bisa dibaca sebagai tabel; 147 px kosong di atas **dan** bawah tiap kartu terlihat sebagai kartu rusak, bukan padding.

**Usulan perbaikan.** Tambahkan `justify-start!` (dan `items-start!` untuk menutup kolisi yang sama) pada kelas kartu di `:412`, lalu pindahkan pengisi ruang ke dalam: konten `flex-1`, meta `mt-auto` — sehingga semua sisa tinggi jatuh di antara judul dan meta, bukan di luar blok isi.

### A-03 · MEDIUM · Lokasi diulang di 12 kartu padahal subjudul sudah menyebutnya

**Problem.** Section ini dirender **sekali** (bukan per area) dan subjudulnya sudah menyebut venue. Namun setiap kartu tetap merender baris lokasi, dan sumber teksnya dua jenis: nama area terpetakan atau teks bebas `event.lokasi`. Dalam satu grid, granularitasnya bisa berbeda ("Panggung Lt. Dasar, Parkir Timur" vs "Parkir Timur").

**Evidence.**
- `src/pages/EventsLandingPage.tsx:1032` — `{others.length} agenda di {otherVenueSummary}`
- `src/pages/EventsLandingPage.tsx:479-484` — `{event.lokasi && ( … <span className="line-clamp-1">{resolveAreaDisplay(event.areaId, event.lokasi, areas)}</span> …)}`
- `src/utils/areaGrouping.ts:96-106` — `if (a) return a.name; return lokasi;` (dua jenis nilai dalam satu kolom)
- `src/pages/EventsLandingPage.tsx:652` — `const others = [...ordered.slice(1).flatMap(group => group.events), ...unmapped];` (semua area + event tanpa area digabung datar)

**Dampak ke pengguna.** 12× pengulangan teks yang sama menambah ~1 baris meta per kartu tanpa informasi baru, mendorong tinggi kartu, dan justru menyamarkan kasus yang benar-benar butuh lokasi (event tanpa area). Saat ada >1 area, pengguna tidak bisa memastikan area mana yang dimaksud karena teksnya bercampur granularitas.

**Usulan perbaikan.** Hapus baris lokasi dari kartu dan bawa lokasi ke judul grup (lihat "Usulan struktur ulang"), sehingga meta kartu hanya berisi jam.

### A-04 · LOW · Subjudul memotong daftar area di 3 nama, grid tidak memilah sisanya

**Problem.** `otherVenueSummary` mengambil maksimal tiga nama area lalu menambahkan `+N lainnya`, tetapi grid tetap datar. Untuk section dengan >3 area, kartu tidak punya penanda area selain baris lokasi (yang granularitasnya campur, A-03), jadi ringkasan subjudul dan isi grid tidak lagi saling menjelaskan.

**Evidence.**
- `src/pages/EventsLandingPage.tsx:657-663` — `const shownVenueNames = otherVenueAreas.slice(0, 3).map(area => area.name); … ${shownVenueNames.join(', ')}${hiddenVenueCount > 0 ? \` +${hiddenVenueCount} lainnya\` : ''}`

**Dampak ke pengguna.** Pada bucket besar, subjudul menyembunyikan sebagian lokasi sementara kartu tetap tidak dikelompokkan; pengguna kehilangan satu-satunya peta "event ini di mana".

**Usulan perbaikan.** Ganti ringkasan "+N lainnya" dengan pengelompokan per area di dalam grid (satu `<h4>` per area + jumlah), sehingga subjudul cukup menyebut jumlah area.

### A-05 · HIGH · Heading dan `div` dirender di dalam `<button>` (model konten invalid)

**Problem.** Seluruh kartu adalah `<button>`; di dalamnya ada `<div>` (`:415`) dan `<h3>` (`:463`). Model konten `button` hanya *phrasing content*, jadi struktur ini invalid dan, lebih penting, agen bantu (AT) memperlakukan isi tombol sebagai nama tombol — heading kartu tidak punya jaminan muncul sebagai heading. `[TERUKUR]` DOM section memuat **13 `H3`** (1 judul section + 12 judul kartu) dan **tidak ada H4/H5/H6**, jadi 12 heading itu memang ada di DOM tetapi seluruhnya berada di dalam `<button>` dan selevel dengan judul section.

**Evidence.**
- `src/pages/EventsLandingPage.tsx:407-413` — `<Button type="button" … className="group flex min-w-0 flex-col …">`
- `src/pages/EventsLandingPage.tsx:415` — `<div className="flex w-full min-w-0 flex-col items-start gap-4 p-5">`
- `src/pages/EventsLandingPage.tsx:463-465` — `<h3 className="line-clamp-2 text-lg font-bold leading-tight …">{event.acara}</h3>`
- `[TERUKUR]` struktur heading section (1440×900): 13 × `H3`, 0 × `H4/H5/H6`, induk `H2` "Mendatang dan berlangsung".

**Dampak ke pengguna.** `[TERUKUR]` daftar heading section berisi 13 `H3` selevel untuk 12 agenda, dan 12 di antaranya berada di dalam kontrol — pembaca layar yang menavigasi per heading tidak mendapat batas grup, sementara validasi HTML gagal (flow content di dalam `button`).

**Usulan perbaikan.** Jadikan akar kartu `<div className="relative …">`, lalu ganti `<h3>` menjadi `<h3><button type="button" className="text-left after:absolute after:inset-0 after:content-['']">` sehingga heading tetap heading, tombol tetap satu-satunya kontrol (area klik selebar kartu), dan tidak ada flow content di dalam `button`.

### A-06 · MEDIUM · Nama aksesibel kartu = seluruh isi kartu; alt poster menduplikasi judul

**Problem.** Karena tidak ada `aria-label`, nama tombol dirangkai dari semua teks turunan: chip tanggal, chip countdown, judul, jam, lokasi — tanpa pemisah semantik. Untuk kartu berposter, `alt={event.acara}` menambahkan judul yang sama sekali lagi.

**Evidence.**
- `src/pages/EventsLandingPage.tsx:407-412` — `<Button type="button" variant="ghost" onClick={() => onDetail(event)} …>` tanpa `aria-label`/`aria-haspopup`
- `src/pages/EventsLandingPage.tsx:414` — `alt={event.acara}`
- `src/pages/EventsLandingPage.tsx:441-442` — `{relLabel ?? event.tanggal}` + `<span className="sr-only">{event.tanggal}</span>`
- `src/pages/EventsLandingPage.tsx:446-450` — chip `{cdLabel}` ("H-23") ikut terbaca sebagai bagian nama tombol

**Dampak ke pengguna.** Pembaca layar mengumumkan string panjang tanpa struktur (mis. "6 DESEMBER 2026 H-23 HelloKiddose 10:00 Panggung Lt. Dasar, Parkir Timur") dan, pada kartu berposter, judul diulang dua kali. Tidak ada `aria-haspopup` meski aksinya membuka dialog (`src/App.tsx:385-390`, `PublicEventDetailModal`), jadi perubahan konteks tidak diumumkan sebagai dialog.

**Usulan perbaikan.** Pasang `aria-label={event.acara}` dan `aria-haspopup="dialog"` pada tombol (sesuai arah A-05), dan set `alt=""` pada banner karena judul sudah menjadi nama kontrol.

### A-07 · MEDIUM · Outline heading: judul area dan judul kartu sama-sama `h3`

**Problem.** Struktur dokumen: `h2` "Mendatang dan berlangsung" (`:950`) → `h3` area (`:1028`) → `h3` kartu (`:463`). Dua level berbeda memakai tag yang sama, sehingga 12 judul kartu tampak bersaudara dengan judul area, bukan turunannya. Petunjuk kuat bahwa ini bukan pilihan sadar: komentar di `:946` menyatakan "venue jadi H3 di bawahnya", tanpa menetapkan level untuk item.

**Evidence.**
- `src/pages/EventsLandingPage.tsx:950` — `<h2 className="font-display text-3xl …">`
- `src/pages/EventsLandingPage.tsx:1028` — `<h3 className="font-display text-xl font-bold …">`
- `src/pages/EventsLandingPage.tsx:463` — `<h3 className="line-clamp-2 text-lg font-bold …">`
- `[TERUKUR]` section memuat **13 `H3`** — satu judul section diikuti 12 judul kartu berurutan tanpa level perantara, **tanpa** `H4`/`H5`/`H6`, di bawah `H2` induk "Mendatang dan berlangsung".

**Dampak ke pengguna.** "Lompat ke heading berikutnya" berhenti di 12 judul kartu tanpa pernah melewati batas grup; orientasi "saya masih di area mana" hilang.

**Usulan perbaikan.** Turunkan judul kartu ke `h4` setelah A-05 (judul area tetap `h3`), sehingga outline: `h2` → `h3` area → `h4` item.

### A-08 · MEDIUM · Panah `→` 1,91:1 adalah satu-satunya petunjuk bahwa kartu bisa diklik

**Problem.** Panah memakai token garis, bukan tinta. Diukur: `--wf-rule-strong` = `rgba(22, 33, 27, 0.3)` di atas `--wf-board` `#fdfcf6` → komposit `#b8bab4` → **1,91:1**, gagal ambang non-teks 3:1 (WCAG 1.4.11) yang juga dirujuk `DESIGN.md:297`. Panah `aria-hidden` (benar), tetapi secara visual ia satu-satunya sinyal affordance kartu — petunjuk lain baru muncul saat hover (`group-hover:translate-x-1`, `hover:shadow`).

**Evidence.**
- `src/pages/EventsLandingPage.tsx:457-460` — `className="size-4 shrink-0 text-[var(--wf-rule-strong)] transition-transform group-hover:translate-x-1 …" aria-hidden="true"`
- `src/styles/dashboard-wayfinding.css:36` — `--wf-rule-strong: rgba(22, 33, 27, 0.3);` · `:33` — `--wf-board: #fdfcf6;`
- `[TERUKUR]` Chromium 149, tema terang: `svg.lucide-arrow-right` = `rgb(184, 186, 180)` di atas kartu `rgb(253, 252, 246)` → **1,91:1**, gagal ambang ikon/grafis 3:1.
- `[TERUKUR]` pasangan lain di kartu yang sama **lulus**: chip countdown 6,36:1 · chip tanggal 10,03:1 · meta jam/lokasi 6,04:1 · subjudul section 5,78:1. Jadi panah adalah satu-satunya yang gagal — klaim kontras lain tetap ditolak (lihat "Ditolak / diturunkan").

**Dampak ke pengguna.** Petunjuk "ini bisa dibuka" tidak terlihat tanpa hover — di perangkat sentuh tidak ada hover sama sekali; pengguna dengan low vision tidak melihat affordance.

**Usulan perbaikan.** Naikkan panah ke `var(--wf-ink-muted)` (terukur 6,04:1 di board) agar terlihat sebagai ikon, dan biarkan hover hanya menambah translasi.

### A-09 · MEDIUM · Tiga bahasa chip, dua ukuran teks, dua sumber warna

**Problem.** Dalam satu baris chip ada tiga perlakuan berbeda: chip tanggal/berlangsung/recurring (`text-xs`, tint kategori inline `backgroundColor: ${color}15`), chip countdown (`text-[10px]`, `bg-amber-100`/`text-amber-800` hardcoded), dan badge section (`text-xs`, fill aksen solid). Ukuran teks berbeda 2 px di baris yang sama; warna chip countdown tidak mengikuti sistem tint kategori; radius chip `rounded-full` sementara kontrak radius menetapkan chip = `--radius-control`.

**Evidence.**
- `src/pages/EventsLandingPage.tsx:418` — `className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider"` (+ `style` tint kategorial `:420-426`)
- `src/pages/EventsLandingPage.tsx:447` — `className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800 …"`
- `src/pages/EventsLandingPage.tsx:1040` — `className="shrink-0 rounded-full bg-[var(--wf-accent)] px-3 py-1 text-xs font-semibold …"`
- `DESIGN.md:115` — `--radius-control | 0.75rem | Inputs, product buttons, chips`

**Dampak ke pengguna.** Chip countdown tampak lebih kecil/lebih "caps lock" daripada chip tanggal di sebelahnya, sehingga bobot urgensinya turun justru di elemen yang seharusnya mendesak; kolom chip tidak rata secara optik.

**Usulan perbaikan.** Samakan peran chip menjadi satu komponen (satu `text-xs`, satu radius `--radius-control`, satu mekanisme warna: tint kategori untuk tipe event, tint status untuk urgensi) — ukuran dan radius tidak lagi ditentukan per pemakaian.

### A-10 · MEDIUM · `jam` opsional tanpa kontrak format; nilai aneh disimpan dan dirender verbatim

**Problem.** `normalizeJam` hanya menormalkan format yang bisa diparse; string lain dikembalikan apa adanya (`if (!parsed) return raw`), termasuk string kosong-setara seperti `-` atau `–`. Kartu merender `{event.jam}` tanpa placeholder dan **tanpa** fallback: bila kosong, span hilang. Artinya `–` di kartu "HelloKiddose" bukan dirender oleh kode frontend — itu nilai tersimpan. Data seed menunjukkan dua masalah sekaligus: 25/250 baris ber-`jam` kosong, 10 baris berformat tak terbaca (`13.00 WIB`, `11.00 WIB - selesai`, `10.00`, …).

**Evidence.**
- `src/pages/EventsLandingPage.tsx:473-478` — `{event.jam && (<span …><Clock …/>{event.jam}</span>)}`
- `src/utils/eventInput.ts:16-24` — `const parsed = parseTimeRange(raw); if (!parsed) return raw;`
- `src/utils/eventDateTime.ts:37-47` — `parseTimeRange` hanya menerima `HH:MM - HH:MM` (titik dinormalkan)
- `[TERUKUR]` kartu dengan `jam` kosong memang **tidak merender span jam**: blok isi kartu itu 22,5 px lebih pendek (ruang kosong dalam kartu 32,25/32,25 vs 40,25/40,25 pada kartu sebangun di baris yang sama). Ini mengonfirmasi bahwa `–` di screenshot adalah nilai tersimpan, bukan hasil render.
- Hitungan seed (`scripts/migrate/seed/events.json`): 250 baris → 25 `jam` kosong, 10 format tidak cocok regex rentang.

**Dampak ke pengguna.** Baris meta bisa berisi satu karakter tanpa makna (`–`), atau kehilangan jam tanpa penjelasan; countdown untuk baris ber-`jam` tak terbaca jatuh ke jalur "selisih hari kalender" (`eventDateTime.ts:98-102`), sehingga akurasinya berbeda dari kartu lain.

**Usulan perbaikan.** Tegakkan format di input (`normalizeJam` menolak nilai yang tidak bisa diparse, bukan menyimpannya) dan beri satu representasi kosong di kartu: sembunyikan baris meta jam bila tidak ada, jangan pernah menampilkan placeholder karakter.

### A-11 · MEDIUM · Kartu berulang tidak menunjukkan kemunculan berikutnya; label hari bisa basi

**Problem.** Untuk seri berulang, chip tanggal diganti label jadwal dan **tanggal kemunculan wakil seri tidak dirender sama sekali**; countdown juga dimatikan. Label hari diambil dari kolom tersimpan `day` lebih dulu, padahal `day` hanya diisi bila kosong (`normalized.day || derived.day`) sehingga jadwal yang diubah bisa mempertahankan hari lama sementara `dateStr` sudah pindah.

**Evidence.**
- `src/pages/EventsLandingPage.tsx:433-437` — `isRecurring ? (<><Repeat …/>{recurringScheduleLabel(event)}</>)`
- `src/pages/EventsLandingPage.tsx:402-403` — `relLabel`/`cdLabel` digerbangi `!isRecurring`
- `src/utils/eventUtils.ts:436-443` — `event.day || (() => { … DAY_NAMES[d.getDay()] … })()`
- `src/utils/eventInput.ts:53` — `normalized.day = normalized.day || derived.day;`

**Dampak ke pengguna.** "SETIAP HARI SELASA" tidak memberi tahu kapan kelas berikutnya; pengguna harus membuka detail untuk tahu tanggal. Bila `day` basi, label bisa menyebut hari yang salah — kesalahan yang tidak bisa dideteksi pengguna karena tanggalnya tidak ditampilkan.

**Usulan perbaikan.** Turunkan hari dari `dateStr` saja (buang prioritas `event.day`), dan tampilkan tanggal kemunculan berikutnya di chip: `Setiap hari Selasa · 17 Nov`.

### A-12 · LOW · Glif kategori bergeser antar kartu karena `justify-between` dengan jumlah anak berbeda

**Problem.** Baris chip memakai `justify-between`. Jumlah anaknya bervariasi 3 atau 4 (chip countdown hanya ada pada sebagian kartu). Saat countdown tidak ada, glif kategori terdorong dari posisi kanan ke tengah, sehingga kolom ikon tidak lurus antar kartu dalam satu baris.

**Evidence.**
- `src/pages/EventsLandingPage.tsx:416` — `<div className="flex w-full items-center justify-between gap-3">`
- Anak: chip tanggal (`:417`), `{cdLabel && …}` (`:446`), `<CategoryGlyph>` (`:456`), `<ArrowRight>` (`:457`)

**Dampak ke pengguna.** Ikon kategori — satu-satunya pembeda jenis event yang tersisa setelah judul — muncul di posisi berbeda per kartu, sehingga sulit dipindai.

**Usulan perbaikan.** Ganti `justify-between` dengan susunan slot tetap: chip tanggal, `ml-auto` untuk zona kanan berisi countdown + glif + panah, sehingga glif dan panah selalu menempel kanan.

### A-13 · LOW · Radius kartu landing memakai token panel admin

**Problem.** Kartu memakai `rounded-[var(--radius-card-lg)]`, yang di tabel token dialokasikan untuk "Admin panels / larger product cards", sedangkan kartu campaign/landing ditetapkan `--radius-campaign-card`. Section ini adalah permukaan publik (halaman `/events`, `h2` selebar landing).

**Evidence.**
- `src/pages/EventsLandingPage.tsx:412` — `rounded-[var(--radius-card-lg)] border border-[var(--border-subtle)] …` (diulang sebagai `rounded-[var(--radius-card-lg)]!`)
- `DESIGN.md:117` — `--radius-card-lg | 1.5rem | Admin panels / larger product cards`
- `DESIGN.md:234` — `radius: var(--radius-campaign-card) (2rem)` untuk kartu campaign/landing

**Dampak ke pengguna.** Netral secara fungsi; efeknya hanya ketidaksamaan bahasa bentuk dengan kartu hero di halaman yang sama (`:849` memakai `--radius-campaign-card`).

**Usulan perbaikan.** Pilih satu token peran "kartu publik" dan pakai di kedua tempat (hero + rail).

### A-14 · MEDIUM · Lompatan 2 → 4 kolom di 1024 px tanpa tahap, tanpa penyesuaian tipografi

**Problem.** Grid `sm:grid-cols-2 lg:grid-cols-4` melompat dari 2 ke 4 kolom tepat di 1024 px. Pada 1024 px kartu tinggal 232 px, judul tetap `text-lg` (18 px) dengan `line-clamp-2`, dan seluruh konsekuensi A-01/A-02 (band poster 174 px, ruang mati 174-196 px/kartu) ikut mengecil tetapi tetap ada. Di 390 px satu kolom: band poster terukur **267 px** (bukan 4:3 dari poster asli), sehingga `object-cover` memotong isi poster yang bukan 4:3.

**Evidence.**
- `src/pages/EventsLandingPage.tsx:1045` — `grid gap-4 sm:grid-cols-2 lg:grid-cols-4`
- `src/pages/EventsLandingPage.tsx:463` — `text-lg font-bold leading-tight` (tanpa varian breakpoint)
- `src/components/events/EventPosterBanner.tsx:37` — `className="h-full w-full object-cover"`
- Aritmetika 1024 px: kartu 232 px; 390 px: kartu 358 px, lebar isi 356 px → poster **267 px** (lihat A-01).

**Dampak ke pengguna.** Di 1024-1200 px (laptop kecil, tablet lanskap) 4 kolom memaksa judul 2 baris hampir di semua kartu, sehingga setiap baris menjadi tidak rata dan tinggi total membengkak.

**Usulan perbaikan.** Tambahkan tahap `md:grid-cols-3` (atau tunda `lg:grid-cols-4` ke `xl`) dan turunkan judul kartu ke `text-base sm:text-lg`.

### A-15 · HIGH · Baris chip melipat jadi dua baris di ≥1024 px (flex-shrink menekan chip)

**Problem.** Chip bar memakai `justify-between gap-3` dengan 3-4 anak, sedangkan chip tanggal dan chip countdown tidak diberi `whitespace-nowrap`/`shrink-0`. Begitu 4 kolom aktif (≥1024 px), lebar isi kartu (266 px pada 1440) sama dengan total kebutuhan anak-anaknya, sehingga `flex-shrink` menekan kedua chip dan teksnya terlipat: chip tanggal pecah "20 NOVEMBER" / "2026" (tinggi 40 px) dan chip countdown pecah "H-" / "6" (tinggi 36,56 px). Di 390 px keduanya kembali satu baris karena kartu selebar 358 px.

**Evidence.**
- `src/pages/EventsLandingPage.tsx:416` — `<div className="flex w-full items-center justify-between gap-3">`
- `src/pages/EventsLandingPage.tsx:418` — `className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider"` (tanpa `whitespace-nowrap`/`shrink-0`)
- `src/pages/EventsLandingPage.tsx:447` — `className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800 …"`
- `src/pages/EventsLandingPage.tsx:412` — `whitespace-normal!` pada akar kartu menonaktifkan `whitespace-nowrap` bawaan `Button` (`button.tsx:7`), jadi tidak ada lapisan yang mencegah lipatan.
- `[TERUKUR]` 1440×900: chip tanggal **40 px** (2 baris), chip countdown **36,56 px** (2 baris); total lebar 4 anak + `gap-3` ≈ **266 px** = lebar isi kartu (kartu 306 − padding 40). Di 390×844: chip tanggal **24 px**, countdown **22,28 px** (satu baris).

**Dampak ke pengguna.** Baris chip di kartu tampak bertumpuk dan tingginya berbeda-beda antar kartu (36,56 vs 40 vs 22,28 px), memperbesar kesan tidak sejajar; "20 NOVEMBER" dan "2026" terbaca sebagai dua nilai berbeda, dan "H-" terpisah dari angkanya sehingga makna "H-6" hilang.

**Usulan perbaikan.** Tetapkan baris chip sebagai **satu baris yang tidak boleh melipat**: `whitespace-nowrap` pada kedua chip, `shrink-0` pada chip + glif + panah, format tanggal dipendekkan (`20 Nov 2026`, tanpa ikon jam), dan zona kanan (countdown + glif + panah) dipindah ke `ml-auto` — sehingga chip tidak pernah dibagi `flex-shrink`.

## Ditolak / diturunkan

1. **"Judul 'Lokasi Lainnya' berulang per area"** — ditolak. Section dirender sekali dengan satu grid (`:1045`); `others` menggabungkan semua area non-primer + event tanpa area (`:652`). `hasMappedAreas` dan `<p className="text-xl font-bold">` sudah tidak ada di HEAD (grep 0 hasil), jadi temuan **011** di `anti-slop/audit-002-2026-11-12.md:29` sudah tertutup oleh `<h3>` (`:1028`) — yang tersisa hanya masalah level heading (A-07), bukan lagi `<p>`.
2. **"Kartu berulang tetap menampilkan countdown H-2"** — ditolak secara kode. `cdLabel` digerbangi `!isRecurring` (`:403`) dan `isRecurring` adalah variabel yang sama yang memilih chip jadwal (`:401`, `:433`), jadi satu kartu tidak mungkin menampilkan keduanya. Kemungkinan besar chip `H-2` milik kartu **sebelahnya** yang terdorong ke kanan oleh `justify-between` (`:416`) sehingga terbaca menyatu — ini masuk A-12, bukan bug data.
3. **"H-23 tidak konsisten dengan 6 Desember 2026"** — ditolak. 2026-12-06 − 23 hari = 2026-11-13 (hari ini), dan `countdownLabel` memakai selisih hari kalender dari jam mulai (`src/utils/eventDateTime.ts:94-115`). Konsisten.
4. **"Jumlah kartu tidak cocok dengan subjudul"** — ditolak. Subjudul memakai `others.length` (`:1032`) dan grid memetakan `others` (`:1046-1048`); 12 = 12. Angka itu memang benar.
5. **"Chip berwarna per kategori"** — ditolak. Tint kategorial adalah kontrak, dan teks chip di-*darken* khusus agar lolos AA (`darkenChipText`, `:136-161`). Dihitung untuk tosca: `#00554c` di atas wash 8% `#e8f3ed` = **7,69:1**; `[TERUKUR]` pada kategori "Umum" di Chromium: **10,03:1**.
6. **"Chip countdown kuning gagal kontras"** — ditolak. `amber-800` di atas `amber-100` = **6,37:1** dihitung, `[TERUKUR]` **6,36:1** di Chromium (AA normal text lulus). Yang bermasalah ukuran/perannya, bukan kontrasnya (A-09).
7. **"Teks meta terlalu pudar"** — ditolak. `--wf-ink-muted` `#58645a` di atas `--wf-board` `#fdfcf6` = **6,04:1** (`[TERUKUR]` sama persis di Chromium).
8. **"Chip/panah target sentuh terlalu kecil"** — ditolak. Chip dan panah bukan kontrol (tidak ada `onClick`, `aria-hidden` pada glif & panah); ukurannya 16×16 px (panah) dan 49,4-55,5 × 36,56 px (`[TERUKUR]`, chip countdown), tetapi itu tidak menimbulkan target sentuh karena tidak dapat ditekan. Satu-satunya target adalah kartu utuh — `[TERUKUR]` 306 × 144,5 px di 1440 dan 358 × 128,5-395,5 px di 390.
9. **"Panah harus punya label aksesibel"** — ditolak. `aria-hidden="true"` (`:459`) sudah benar karena kartu adalah satu tombol; memperbaikinya = memperbaiki affordance visual (A-08), bukan label.
10. **"Hover elevation melanggar kontrak"** — ditolak. `DESIGN.md:238` mengizinkan elevation saat hover hanya untuk elemen yang klikabel; kartu memang tombol, dan `motion-reduce:transform-none` tersedia (`:458`).
11. **"Kode merender `–` saat jam kosong"** — ditolak. Tidak ada placeholder di `EventRailCard`: span jam hanya dirender bila `event.jam` truthy (`:473`). Karakter itu berasal dari nilai tersimpan (A-10).

## Belum terverifikasi

`[TERUKUR]` — butir 1, 2, 3, 5, 7, 8 dari versi sebelumnya sudah terjawab oleh `reports/area-cards-measure.md` (Chromium 149, 1440×900 & 390×844, tema terang): tinggi kartu per baris, ruang kosong 147/147, `justify-content: center` efektif, kontras kelima pasangan, tinggi di 390 + nol overflow horizontal, dan 4 kartu per baris di ≥1024.

Yang masih terbuka:

1. **Rasio poster produksi nyata dan besar crop-nya.** Data ukur memakai SVG mock 900×1200 (3:4), jadi yang terbukti hanya bahwa tinggi band berasal dari kotak 4:3 — bukan berapa bagian poster asli "Bekasi Metland Run For Fun Series 6" yang terpotong `object-cover`.
2. **Nama aksesibel tombol hasil hitung AT** (panjang string, duplikasi judul pada kartu berposter) dan apakah 12 `h3` di dalam `<button>` benar-benar muncul sebagai heading pada pembaca layar (DOM sudah terukur: 13 `H3`; paparan AT-nya belum).

## Usulan struktur ulang section

1. **Satu `h2` untuk seluruh daftar** ("Mendatang dan berlangsung"), section "Lokasi Lainnya" tidak menambah level baru selain grup area.
2. **Kelompokkan per area di dalam section**, bukan grid datar: `<h4>` = nama area + jumlah ("Panggung Lt. Dasar, Parkir Timur · 12 agenda"), grid 4 kolom di bawahnya. Subjudul section cukup menyebut jumlah area ("12 agenda di 2 lokasi lain"), bukan daftar nama yang terpotong.
3. **Kartu: satu tinggi baku.** Media slot `h-32` (128 px) selalu dirender (placeholder netral bila tanpa poster), `justify-start`, konten `flex-1`, meta `mt-auto`. Poster tidak lagi bisa menaikkan tinggi baris; semua kartu ≈272 px.
4. **Meta kartu = jam saja.** Lokasi pindah ke judul grup; chip tanggal tetap titik pindai pertama di posisi yang sama untuk semua kartu.
5. **Satu komponen chip, satu baris tanpa lipatan**: `text-xs`, `--radius-control`, `whitespace-nowrap` + `shrink-0`, warna dari kategori (tipe event) atau status (urgensi) — bukan dua font-size dalam satu baris, bukan amber hardcoded, dan tidak pernah dibagi `flex-shrink` seperti A-15.
6. **Keadaan data kosong eksplisit.** Jam tidak ada → meta jam hilang sepenuhnya (bukan `–`); poster tidak ada → slot placeholder bertint kategori.
7. **Akar kartu `<div>` + satu tombol di dalam `h3`** dengan area klik selebar kartu, `aria-label` = nama event, `alt=""` pada banner, `aria-haspopup="dialog"` karena aksi membuka modal detail.
8. **Badge "Diperbarui setiap minggu" turun tingkat**: jadikan caption abu di bawah subjudul, bukan pil aksen solid yang bersaing dengan CTA hero (`:788`) dan badge "Area Utama" (`:1007-1009`) yang memakai fill identik.
