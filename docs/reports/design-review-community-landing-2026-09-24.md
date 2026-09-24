# Design Review — Landing Komunitas `/` (Community Hub)

**Tanggal:** 2026-09-24
**Target:** `src/pages/CommunityLandingPage.tsx` + `src/components/community/*.tsx` + `src/styles/{tokens,theme,gradients,motion,base,typography}.css`
**Metode:** pembacaan sumber (read-only) + pengukuran DOM langsung pada Vite dev `http://localhost:5173` (Chromium headless, viewport 320/375/390/414/768/1280/1440). API dimock lewat `tab.route` sehingga **dua** state terukur: terisi data (6 event, 3 album, 3 area, 3 berita, 3 post IG) dan kosong (`/api/v1/*` → 404 seperti dev tanpa backend).
**Perubahan kode:** tidak ada. Dokumen ini murni penilaian.

> Catatan orisinalitas: penilaian §1 ditulis dari mata sendiri sebelum angka apa pun dikutip. Temuan mesin (detektor) hanya dipakai untuk mengonfirmasi, bukan untuk membentuk verdict.

---

## 1. Design Specificity Verdict

**Verdict: GAGAL — konten spesifik, komposisi tidak.**

Halaman ini punya **bahan** yang sangat milik produk ini, tetapi **susunannya** bisa dipakai utuh oleh kafe, coworking space, atau kampus lain dengan menukar nama merek dan nama fasilitas. Yang membedakan hanya string, bukan struktur.

**Yang benar-benar spesifik (milik produk ini, tidak bisa ditukar):**

| Bukti | Kenapa spesifik |
|---|---|
| `CommunityHero.tsx:134` — `Panggung <strong>Gratis</strong> untuk Komunitas Bekasi` | Menyebut **panggung** (bukan "venue"), **Bekasi** (bukan "kota Anda"). Bentuk fisik venue masuk ke headline. |
| `CommunityFacilities.tsx:6-11` — `Sound System 10K Watt`, `50 Kursi Penonton`, `Area Lantai 3`, `Meja Juri` | Angka dan benda yang hanya masuk akal untuk satu panggung di satu mall: 10.000 watt, 50 kursi, lantai 3, meja juri untuk "audisi atau ujian kenaikan kelas". Tidak ada SaaS yang bisa memakai ini. |
| `CommunityContact.tsx:7-24` — dua nomor WA bernama (`Andy`, `Uca`), `021-8855555 ext 214`, `marketing@malmetropolitan.com` | Nama manusia nyata + nomor ekstensi kantor. Ini kontak operasional mall, bukan `hello@company.com`. |
| `CommunityEventAreas.tsx:124-127` — `Foto Area Event` / `Area di Metropolitan Mall Bekasi` + `Panggung Lantai 3`, `Atrium 2 Lantai Dasar`, `Foodventure Lantai 2` | Kosakata area mall yang nyata (dibuktikan `docs/features/update-fitur-foto-area-event.md:9`: 190+ event produksi tersebar di `Panggung Lt. 3`, `Atrium 2`, `Foodventure`, `Parkir Timur`). |
| `CommunitySteps.tsx:4-7` — `Review Tim Mall`, `Hari H!` | Alur kurasi internal mall, bukan funnel SaaS. |
| `communityStats.ts:43-48` + `COMMUNITY_STAT_LABELS` | Angka diturunkan dari event nyata (`past` / `eo` unik / total), satu kosakata untuk hero, SocialProof, dan `/events`. |

**Yang membuatnya bisa ditukar (kategori-interchangeable):**

1. **Struktur 14 blok yang generik.** Terukur 14 blok top-level, tinggi dokumen **11.248px** di 1280×900:
   `hero → band keunggulan → social proof → agenda → benefits → facilities → areas → steps → FAQ → galeri → berita → banner ajuan → form → kontak → footer`.
   Urutan ini adalah template landing page khas ("hero, trust strip, features, how-it-works, FAQ, testimonial/gallery, form, contact"). Tidak ada satu pun keputusan komposisi yang lahir dari fakta bahwa ini **panggung di lantai 3 sebuah mall**.

2. **Tujuh section berturut-turut memakai pola yang sama:** eyebrow + `h2` 48px + paragraf pengantar, lalu isi. Terukur 10 eyebrow di satu halaman (`Agenda`, `Keuntungan`, `Sponsor & Support`, `Fasilitas`, `Foto Area Event`, `Cara Daftar`, `FAQ`, `Galeri`, `Berita`, `Kontak`) dan **9 `h2` yang semuanya persis 48px/700**. Ritmenya monoton: 1 eyebrow : 1 judul : 1 paragraf : 1 grid. Bandingkan dengan klaim di `docs/AUDIT-design-taste-2026-09-20.md:369-376` bahwa "≥4 keluarga layout" sudah terpenuhi — secara mekanis benar (definition grid vs list vs akordeon), tetapi **pembaca tidak merasakan perbedaan keluarga**: semuanya masih "judul kiri + isi bawah", semua latarnya bergantian krem/putih.

3. **Hero tidak menceritakan mall.** `CommunityHero.tsx:100-107` memasang foto fallback + `brightness(0.35)` + gradient 8-stop + grain `opacity: 0.5; mix-blend-mode: soft-light`. Hasilnya adalah tekstur gelap tosca yang **identik dengan hero fintech mana pun**. Foto mall asli (terukur: `hero-fallback-800.webp`) tenggelam sampai tak terbaca — pada screenshot 1280px yang saya ambil, yang terlihat hanya siluet rak dan orang yang tidak bisa dikenali. Produk ini menjual *"panggung, sound, lighting"* — hero-nya justru tidak memperlihatkan panggung, sound, atau lighting.

4. **Satu-satunya aset yang benar-benar milik mall — foto area — dikubur.** `#areas` adalah section **ketujuh** dari 14, di posisi 4.354px dari atas (39% halaman). Terukur juga: bila admin belum mengisi `areas`, `CommunityEventAreas` mengembalikan `null` (`:120`) dan blok `#areas` menyusut jadi **0px** — jadi anchor `#areas` di nav "Program" (`CommunityLandingPage.tsx:65`) menjadi anchor mati. Satu-satunya bukti visual yang membedakan mall ini dari venue lain adalah juga yang paling rapuh.

5. **Tidak ada satu pun elemen yang mengikat ke Instagram-first audience.** `PRODUCT.md` menulis "Mobile-first: many visitors arrive from Instagram or WhatsApp". Terukur: tombol `Chat via WhatsApp` (`CommunityRegistrationForm.tsx:458-459`) hanya muncul di kolom kiri form, di posisi **79,7%** tinggi halaman. Tidak ada WhatsApp di header, tidak ada di hero, tidak ada di sticky bar mobile (yang isinya hanya `Daftar Event`). Kunjungan dari bio IG mendarat di hero gelap tanpa satu pun jalan keluar yang terasa seperti WhatsApp.

**Kesimpulan:** halaman ini **authored untuk produk ini di level konten, tidak di level desain**. Kalau string diganti, komposisinya bisa dipakai oleh siapa pun. Itu definisi category-interchangeable.

---

## 2. Heuristic Scores

Mode surface: **Persuade** (landing page marketing). Aturan mode mengizinkan heuristik 7 (Flexibility/Efficiency) dan 10 (Help/Documentation) ditandai `n/a`; di sini hanya **#10** yang benar-benar tidak berlaku (tidak ada kebutuhan dokumentasi pada landing page). **#7 tetap saya nilai**, karena halaman ini memang punya keputusan jalur (anchor in-page vs halaman `/daftar`, pemilih tipe sebagai gerbang) yang bisa dinilai. Jadi **9 heuristik dinilai, 1 `n/a`** → maksimum yang berlaku **9 × 4 = 36**.

| # | Heuristic | Skor | Key issue |
|---|---|---|---|
| 1 | Visibility of System Status | **3** | Skeleton lengkap untuk agenda/galeri/berita/area (`CommunityUpcomingEvents.tsx:76-104`, `CommunityGallery.tsx:18-43`, `CommunityNews.tsx:16-35`), `aria-busy` benar, countdown live di-tick 60 detik (`:108-113`). Dikurangi: badge hero menampilkan `0+ Event Terlaksana` saat `stats` undefined (`CommunityHero.tsx:122-123`) — bukan skeleton, tapi angka nol yang terlihat seperti fakta. |
| 2 | Match System / Real World | **4** | Kosakata operasional mall dipakai konsisten: `Panggung`, `Backdrop`, `Meja Juri`, `Review Tim Mall`, `Hari H!`, `PIC`. Format tanggal Indonesia (`CommunityUpcomingEvents.tsx:230`), `Intl.NumberFormat('id-ID')` (`countFormat.ts`). Ini heuristik terkuat di halaman. |
| 3 | User Control and Freedom | **3** | FAQ bisa dibuka-tutup dan default sudah terbuka satu (`CommunityFAQ.tsx:17`); Escape menutup nav mobile + fokus balik ke tombol (`CommunityLandingPage.tsx:146-153, 111-114`); `prefers-reduced-motion` dihormati (`useScrollReveal.ts:9-12`). Dikurangi: step 2 form bisa dibatalkan (`CommunityRegistrationForm.tsx:266-275`) tapi **tidak ada cara mengosongkan form** selain mengirimnya. |
| 4 | Consistency and Standards | **2** | Dua sistem fokus berbeda hidup berdampingan (§6 P1-2). Radius form memakai `rounded-2xl` (24px) padahal `DESIGN.md` menetapkan `--radius-control` 12px (§8). Empty state menyebut "Hubungi Kami" → `#contact` (`CommunityUpcomingEvents.tsx:17-22`) sementara CTA primer halaman bernama "Daftar Event" → `/daftar` — dua kosakata untuk satu niat. |
| 5 | Error Prevention | **1** | **Temuan terburuk di halaman.** `noValidate` (`CommunityRegistrationForm.tsx:252`) mematikan validasi browser, tetapi validator sendiri (`:125-167`) hanya memeriksa `organizationType`, `organizationName`, `pic`, `phone`, `email`, `instagram`. Field yang ditandai `required` di UI — `Tipe Komunitas` (`TypeSpecificFields.tsx:71`), `Jenjang Pendidikan` (`:80`), `Industri` (`:90`), `Spesialisasi` (`:99`), `Nama Universitas` (`:108`), `Departemen` (`:118`), `Bidang Fokus` (`:126`), `Tipe Organisasi` (`:135`) — **tidak pernah divalidasi**. Terbukti empiris: saya isi nama komunitas + PIC + WhatsApp, biarkan `Tipe Komunitas *` kosong, klik `Kirim Pendaftaran` → form **lolos validasi klien**, `POST /registrations` terkirim, lalu gagal di jaringan dengan pesan `"Gagal mengirim pendaftaran. Coba lagi nanti."` Tidak ada `aria-invalid`, tidak ada `aria-describedby`, tidak ada penanda error di select mana pun. Untuk pengguna, ini adalah kegagalan yang tidak bisa diperbaiki: pesan menyalahkan jaringan, padahal yang kurang adalah field yang dia tidak tahu wajib. |
| 6 | Recognition Rather Than Recall | **3** | Panduan pengisian 3 langkah di kolom kiri (`CommunityRegistrationForm.tsx:463-481`) + 3 jaminan bercentang (`:483-501`). Dikurangi: badge hero dan band social proof memakai metrik yang sama dengan label sama (§6 P2-2), sehingga pembaca harus mengingat apakah "3+" tadi sudah lewat atau belum. |
| 7 | Flexibility and Efficiency | **2** | Dua jalur masuk: `#register` in-page (skip-link `CommunityLandingPage.tsx:173-179`) dan `/daftar` (halaman khusus). Nav dikelompokkan 4 entri dari 11 link (`:62-87`) — perbaikan nyata. Dikurangi: dari hero ke field pertama butuh **2 interaksi wajib** (pilih tipe organisasi dulu, baru form muncul — `CommunityRegistrationForm.tsx:247`), dan tidak ada default. |
| 8 | Aesthetic and Minimalist Design | **2** | Terukur 33 elemen interaktif (26 di `main`, 9 di header, 1 di footer) untuk satu tujuan konversi. Label `Daftar Event` didefinisikan di 5 tempat (`CommunityLandingPage.tsx:227` header, `:295` panel mobile, `:370` sticky bar, `:384` footer, `CommunityHero.tsx:148` hero); ditambah `Lihat Semua …` 3× (event/galeri/berita), `Follow @metmalbekasi`, 3 kartu IG, `Lihat Peluang Sponsor`, `Ajukan Event`. `PRODUCT.md` anti-reference #3 secara eksplisit melarang "cluttered event posters with too many competing CTAs" — halaman ini punya masalah yang sama dalam bentuk yang lebih rapi. |
| 9 | Error Recovery | **2** | Pesan error generik dan **tidak bisa ditindak**: `"Gagal mengirim pendaftaran. Coba lagi nanti."` (`CommunityRegistrationForm.tsx:214`). Tidak ada retry yang mempertahankan isi form (isi form memang dipertahankan di state, tapi tidak ada indikasi itu), tidak ada nomor WA sebagai jalur cadangan, tidak ada pembeda antara error jaringan dan error validasi server. Upload lampiran punya pesan spesifik (`:77, :82`) — bukti tim ini bisa menulis pesan bagus ketika mau. |
| 10 | Help and Documentation | **n/a** | Persuade surface; bantuan kontekstual ada (panduan form, FAQ), tidak ada kebutuhan dokumentasi terpisah. |
| **Total** | | **22/36** | **Acceptable — perlu kerja signifikan** |

**Catatan skor:** #5 = 1 dan #9 = 2 adalah satu akar masalah (validasi tidak menutup field yang ia sendiri tandai wajib), bukan dua masalah terpisah. Kalau diperbaiki bersama, total naik ke ±26/36.

---

## 3. Cognitive Load

### Checklist

| Item | Status | Bukti |
|---|---|---|
| Satu tujuan per layar | **Gagal di hero** | Hero berisi 16 elemen teks terukur (`0+ Event Terlaksana`, h1 + `<strong>Gratis</strong>`, subteks, 2 CTA, `JADWAL TERDEKAT`, `LIVE`, 3 nilai metrik, 3 label metrik, `SEDANG & AKAN BERLANGSUNG`, daftar event, catatan kosong) — sementara `docs/AUDIT-design-taste-2026-09-20.md:261-291` mencatat gate "hero stack max 4 elemen teks" dan menyatakan M1 **FIXED** dengan "`#hero` sekarang 4 elemen teks". Perbaikan 2026-09-22 (hero dua kolom + papan data) mengembalikan 12 elemen baru ke dalam hero. Gate itu sekarang gagal lagi. |
| Progressive disclosure | **Lulus** | Form menyembunyikan field sampai tipe organisasi dipilih (`CommunityRegistrationForm.tsx:247, 263`); FAQ tertutup kecuali satu. |
| Grouping yang jelas | **Sebagian** | `CommunityFacilities` memakai definition grid 2 kolom (`:41`) — pairing label/nilai struktural, bagus. Tapi `CommunityBenefits` mencampur satu item sponsor (`:46-61`) ke dalam daftar 3 keuntungan dengan gaya baris yang identik, sehingga "Dukungan Sponsorship" terbaca sebagai keuntungan ke-4, bukan jalur berbeda. |
| Beban pilihan di titik keputusan | **Gagal** | Lihat di bawah. |
| Tidak ada elemen dekoratif yang menuntut perhatian | **Gagal** | Grain `opacity: 0.5` + `mix-blend-mode: soft-light` menutupi seluruh hero (`gradients.css:40-43`); titik `LIVE` berdenyut `animate-pulse` permanen (`CommunityHero.tsx:170`); `animate-ping` pada chip status event berlangsung (`CommunityUpcomingEvents.tsx:155`). Tiga animasi berkelanjutan di layar pertama. |
| Angka/taksonomi konsisten | **Gagal** | §6 P2-2. |

### Decision point dengan >4 opsi terlihat

**1. Pemilih tipe organisasi — 8 opsi sekaligus.** `OrganizationTypeSelector.tsx:19-28` merender 8 tombol radio dalam grid `grid-cols-2 sm:grid-cols-4`. Terukur di 390px: 8 kartu masing-masing **153×127–143px**, dua kolom, memakan ±1.100px tinggi sebelum satu field pun terlihat. Ini adalah **gerbang wajib** ke seluruh form (`CommunityRegistrationForm.tsx:247`: `showForm = !!form.organizationType`). Pengguna dari Instagram harus melewati 8 pilihan sebelum bisa menulis satu kata.

**2. Nav "Jelajahi" — 6 item.** `CommunityLandingPage.tsx:72-83` menaruh `Galeri`, `Berita`, `Tenant`, `Pameran`, `Sponsor`, `Dokumentasi` dalam satu dropdown. Dua di antaranya (`Tenant`, `Dokumentasi`) adalah tujuan yang sama sekali berbeda niat dari "Jelajahi event komunitas".

**3. Daftar event "lainnya" di agenda — 2 kartu + poster + countdown + CTA.** Terukur di mobile 390px: `#upcoming-events` setinggi **1.058px** di 1280px dan satu kartu utamanya saja sudah memuat chip status, `h2` 36px, 3 pill metadata, paragraf 3 baris, judul countdown, 3 pill angka, dan tombol — semuanya di dalam satu `<button>` (lihat §6 P1-1).

---

## 4. Emotional Journey

**Peak (tertinggi): hero, tapi puncaknya salah tempat.** Yang paling berkesan di halaman ini bukan tawaran gratisnya — melainkan **papan data realtime** di kolom kanan (`CommunityHero.tsx:160-236`). Panel kaca dengan 3 metrik + daftar agenda adalah bagian paling hidup dan paling "ini sistem nyata" di seluruh halaman. Masalahnya: saat data kosong (kondisi dev/normal tanpa backend) panel itu menampilkan **`—`, `—`, `—`** (terukur) di bawah label `LIVE` yang berdenyut hijau. Puncak emosional pertama pengguna adalah tiga garis datar di bawah klaim "Live". Ironi yang tidak disengaja: `CommunityHero.tsx:171` menyatakan status `Live` secara hardcode, tanpa syarat apa pun — ia hidup bahkan ketika tidak ada satu pun event berlangsung (`Sedang berlangsung: —`).

**Valley (terendah) #1 — validasi form.** Sudah dijelaskan di §2 #5. Ini valley paling dalam karena terjadi **tepat di momen keputusan tertinggi** dan pengguna tidak punya cara memperbaiki selain menebak.

**Valley #2 — blok 3.400px antara agenda dan cara daftar.** Urutan `#upcoming-events` (1.058px) → `#benefits` (1.037px) → `#facilities` (946px) → `#areas` (889px) → `#how` (684px) berarti pengguna yang sudah yakin mendaftar setelah melihat agenda harus melewati **±4.600px** sebelum menemukan langkah-langkahnya. Form pendaftaran baru muncul di **79,7%** tinggi halaman (terukur: `#register` top 7.131px dari 8.943px). `PRODUCT.md` strategic principle #1 adalah "Conversion first: every section should move users toward registration" — halaman ini menaruh konversi di ujung paling jauh.

**Reassurance di momen berisiko (submit form).** Ada dan cukup baik di kolom kiri: 3 jaminan bercentang (`CommunityRegistrationForm.tsx:480-498` — "Pendaftaran direview oleh tim kami", "Fasilitas 100% gratis", "Terbuka untuk semua jenis komunitas") + catatan privasi (`:431`). Tapi jaminan itu **tidak ikut ke layar form**: di 1280px, form ada di kolom kanan dan jaminan di kolom kiri, jadi saat pengguna menggulir ke tombol kirim, jaminannya sudah di atas. Dan setelah submit, halaman sukses (`:220-243`) hanya menawarkan `Daftar {typeLabel} Lain` + link IG — tidak ada nomor WA untuk menyusul, padahal `PRODUCT.md` Main User Journey #5 berbunyi "User receives success state and **follows Instagram or waits for follow-up**".

**Peak-end.** Akhir halaman adalah `#contact` (blok gelap tosca) lalu footer minimalis satu link. Secara emosional endingnya **tenang dan rapi** — tapi juga generik: footer hanya berisi logo + `Daftar Event` + copyright (terukur: 1 link, 0 heading). Tidak ada Instagram, tidak ada jam operasional mall, tidak ada alamat. Untuk mall yang menjual kehadiran fisik, footer tanpa alamat adalah kesempatan yang hilang.

---

## 5. Strengths

**1. Kosakata operasional yang jujur dan spesifik (`CommunityFacilities.tsx:5-12`, `CommunitySteps.tsx:3-8`, `communityStats.ts:43-48`).**
"Sound System 10K Watt", "50 Kursi Penonton", "Meja Juri … untuk kompetisi, audisi, atau ujian kenaikan kelas", "Review Tim Mall", "Hari H!". Ini bukan copy template — ini deskripsi barang yang benar-benar ada di lantai 3. Kekuatannya diperkuat oleh `communityStats.ts` yang memusatkan kosakata statistik di satu file dengan alasan yang didokumentasikan (komentar `:24-29` menjelaskan mengapa `organizers` dibaca dari `eo`, bukan `pic` — karena produksi mengirim `pic: null`). Ini kelas dokumentasi keputusan yang jarang.

**2. Aksesibilitas keyboard di pemilih tipe organisasi benar-benar dikerjakan (`OrganizationTypeSelector.tsx:36-58, 78-112`).**
Radio semantik sungguhan (`role="radiogroup"` + `role="radio"` + `aria-checked`), roving tabindex (`tabIndex={isSelected || … ? 0 : -1}`, terukur: opsi pertama `tabindex=0`, tujuh sisanya `-1`), navigasi Arrow/Home/End dengan `preventDefault`, dan fokus dipindah lewat `requestAnimationFrame` ke elemen nyata. `DESIGN.md` meminta "real radio semantics or correct `radiogroup`/`radio` ARIA with keyboard support" — ini dipenuhi, bukan diklaim.

**3. Disiplin kontras di permukaan kaca hero di atas foto nyata.**
Saya ukur piksel latar langsung di bawah tiap elemen hero (bukan menghitung dari spesifikasi) di 1280px:

| Elemen | Piksel latar terukur | Rasio |
|---|---|---|
| `h1` putih | `rgb(12,21,22)` | **18,51:1** |
| `h1` `<strong>` tosca-300 `#66cfcd` | `rgb(12,21,22)` | **10,02:1** |
| subteks putih/80 | `rgb(24,27,24)` | **11,38:1** |
| label panel putih/70 | `rgb(37,44,48)` | **7,76:1** |
| nilai metrik putih | `rgb(54,63,74)` | **10,68:1** |
| label metrik putih/70 | `rgb(54,63,74)` | **6,18:1** |
| badge putih/85 | `rgb(65,71,66)` | **7,42:1** |
| CTA `Daftar Event` putih di `#007a78` | — | **5,18:1** |

Semua lolos AA dengan margin besar, **di atas foto mall yang terang** — bukan di atas gradient yang dikira-kira. Ini kerja yang benar.

---

## 6. Priority Issues

### P0 — Validasi form tidak menutup field yang ia sendiri tandai wajib

**What.** `CommunityRegistrationForm.tsx:252` memasang `noValidate`, sehingga validasi browser mati. Validator `:125-167` hanya memeriksa `organizationType`, `organizationName`, `pic`, `phone`, `email`, `instagram`. Delapan field bertanda `*` dari `TypeSpecificFields.tsx:71, 80, 90, 99, 108, 118, 126, 135` tidak pernah diperiksa. `SelectField`/`TextField` (`:30-31, 45-46`) menuliskan atribut `required` HTML, tetapi `noValidate` membuatnya tidak berefek; dan keduanya tidak menerima prop error, jadi tidak ada `aria-invalid`/`aria-describedby`/pesan field-level untuk field mana pun di `TypeSpecificFields`.

**Why it matters.** Terbukti empiris (Chromium, 1280px): isi `Nama Komunitas` + `Nama PIC` + `Nomor WhatsApp`, biarkan `Tipe Komunitas *` kosong, klik `Kirim Pendaftaran` → validator lolos, request terkirim, gagal di jaringan, muncul `"Gagal mengirim pendaftaran. Coba lagi nanti."` Pengguna melihat pesan yang menyalahkan jaringan untuk masalah yang bisa dia perbaiki dalam 2 detik. Tidak ada penanda visual di field mana pun. Ini langsung melawan `PRODUCT.md` Success Signal "Fewer confused or incomplete form submissions" dan strategic principle #3 "Trust through clarity", serta `DESIGN.md` Forms ("use field-specific errors", "include `aria-invalid` and `aria-describedby` when invalid").

**Fix.** Tambahkan validasi untuk setiap field bertanda `*` di `TypeSpecificFields` (select kosong = error), dan alirkan `errors` + `aria-invalid`/`aria-describedby` ke `SelectField`/`TextField`/`NumberField` seperti yang sudah dilakukan field umum. Sertakan validasi ini di `handleSubmit` sebelum `submitCommunityRegistration`. Alternatif yang lebih murah dan tetap benar: hapus `noValidate` untuk field `required` HTML dan sisakan validator kustom untuk pesan Indonesia — tetapi jangan biarkan keduanya setengah jalan seperti sekarang.

**Suggested command.** `$impeccable harden` (fokus: state error form, validasi field bertanda wajib, pesan error yang actionable).

---

### P1 — Dua sistem fokus berbeda dalam satu halaman; yang lebih sering dipakai gagal kontras non-teks

**What.** Dua token fokus hidup berdampingan:
- `ui-focus-ring` (`utilities.css:1-5`) → `--tw-ring-color: var(--brand-tosca)` = `#00918e`. Dipakai di header, hero, form, FAQ, pemilih organisasi (`CommunityLandingPage.tsx:27`, `CommunityFAQ.tsx:14`, `CommunityRegistrationForm.tsx:38`).
- Ring ad-hoc `focus-visible:ring-[var(--brand-tosca-soft)]` = `#33a8a5`. Dipakai di `CommunityGallery.tsx:8`, `CommunityNews.tsx:9`, `CommunityUpcomingEvents.tsx:149, 234, 263`, `CommunityBenefits.tsx:57`, `CommunityRegistrationForm.tsx:244`.

Terukur saat Tab melalui halaman: 11 stop pertama memakai `#00918e` (`ringVar: "#00918e"`), lalu mulai dari kartu agenda berubah jadi `#33a8a5` (`ringVar: "#33a8a5"`). Kontras ring vs latar: `#33a8a5` = **2,88:1** vs putih, **2,68:1** vs paper, **2,80:1** vs card — semuanya **gagal** ambang 3:1 untuk indikator fokus (WCAG 2.2 SC 1.4.11). `#00918e` = 3,86/3,59/3,76 — lulus. `utilities.css:3` bahkan mencatat alasannya: *"tosca #00918e — kontras 3.86:1 vs putih (tosca-soft hanya 2.88:1, gagal non-teks 3:1)"* — dan nilai yang diketahui gagal itu tetap dipakai di 6 tempat.

**Why it matters.** Pengguna keyboard kehilangan jejak posisi tepat di area konten utama (agenda, galeri, berita) — persis di bagian yang paling padat kartu. `DESIGN.md` menyatakan "Focus: `--focus-ring-color`: tosca" dan "Focus ring (always tosca)" secara eksplisit di tabel allow/deny pink; aturan ini dilanggar ke arah soft-tosca, bukan ke arah pink, tapi efeknya sama: indikator fokus tidak terlihat.

**Fix.** Ganti keenam pemakaian `focus-visible:ring-[var(--brand-tosca-soft)]` menjadi `ui-focus-ring` (atau `--brand-tosca`). Satu token fokus untuk seluruh halaman.

**Suggested command.** `$impeccable audit` (fokus: indikator fokus & kontras non-teks), lalu `$impeccable polish`.

---

### P1 — `--ease-out-expo` tidak pernah didefinisikan: 26 pemakaian jatuh ke `ease` bawaan

**What.** Token `--ease-out-expo` dipakai **26 kali** di `motion.css` (baris 10, 11, 18, 19, 49, 50, 56, 57, 64, 65, 79, 108, 126, 169, 213, 214, 223, 224, 240) dan `animations.css`, tetapi **tidak didefinisikan di mana pun** di `src/`. Definisi satu-satunya adalah `--transition-timing-function-ease-out-expo` di `theme.css:175` — nama berbeda. Terukur di DOM: `getComputedStyle(document.documentElement).getPropertyValue('--ease-out-expo')` → `""` (kosong), di dev **dan** di CSS hasil build (`dist/assets/index-*.css`: 19 pemakaian `var(--ease-out-expo)`, 0 definisi). Karena itu seluruh transisi `motion.css` ter-resolve ke `ease` bawaan.

Riwayatnya jelas: `git log -S"--ease-out-expo:" -- src/styles/tokens.css` menunjukkan token itu ditambahkan di `3e0ce5f` lalu **dihapus** di `3227917` (`feat(landing): hero full-height + token lift #48`), tanpa memperbarui 26 pemakaian di `motion.css`.

**Why it matters.** `DESIGN.md` menetapkan `--ease-out-expo` = `cubic-bezier(0.22, 1, 0.36, 1)` sebagai kurva standar reveal/modal/toast, dan token itu ada di tabel "Token Reference" sebagai bagian dari sistem. Yang terjadi sekarang: reveal section, entrance hero, panel modal, toast, panel FAQ, dan panel dropdown nav semuanya memakai `ease` generik. Terukur: `.nav-dropdown-panel` → `animation-timing-function: ease` (bukan `ease-out-expo`); `.faq-panel` → `transition-timing-function: ease`; `.reveal-stage` → `ease`. Jadi klaim "reveal-on-scroll for section entrance (`--ease-out-expo`)" di `DESIGN.md` **tidak benar untuk halaman ini**, dan `CommunityRevealPrimitives.tsx:57-61` (yang berkomentar soal konsistensi 0,3em eyebrow) menunjukkan tim peduli pada detail sekecil ini — token yang 26× dipakai hilang tanpa jejak.

**Fix.** Tambahkan `--ease-out-expo: cubic-bezier(0.22, 1, 0.36, 1);` ke `:root` di `tokens.css` (satu baris, mengembalikan apa yang dihapus di `3227917`), atau ganti 26 pemakaian ke `--transition-timing-function-ease-out-expo`. Tambahkan assertion di `src/utils/__tests__/heroContrast.test.ts` (yang sudah membaca `gradients.css`/`tokens.css` sebagai teks) bahwa setiap `var(--x)` yang dipakai di `motion.css` punya definisi.

**Suggested command.** `$impeccable animate` (fokus: kurva easing yang konsisten dan benar-benar ter-resolve).

---

### P2 — Badge hero dan band social proof menampilkan angka kembar; `0+` saat data belum ada

**What.** `CommunityHero.tsx:119-125` menampilkan `${formatCount(completed)}+ ${COMMUNITY_STAT_LABELS.completed}`. `CommunitySocialProof.tsx:20-21, 40-55` menampilkan `totalCompleted`, `totalOrganizers`, `totalEvents` — metrik pertama **identik** dengan badge hero, dengan label yang sama dari `COMMUNITY_STAT_LABELS`. Keduanya juga sama-sama punya `aria-live="polite"` (`CommunityHero.tsx:119`, `CommunitySocialProof.tsx:44`). Terukur di 1280×900: badge hero `3+ Event Terlaksana` di `top: 246`, band social proof `3+ Event Terlaksana` di `top: 1177`. Jarak 892px — jadi tidak bersamaan dalam satu viewport, tetapi **masih dalam satu gulir pertama** dan pasti terbaca sebagai pengulangan.

Saat `stats` undefined (dev tanpa backend, atau sebelum fetch selesai): badge menampilkan **`0+ Event Terlaksana`** dan ketiga angka social proof menampilkan **`-`**. `0+` adalah klaim yang salah secara faktual (bukan "belum dimuat", tapi "nol event pernah terlaksana"). Komentar di `communityStats.test.tsx:11-14` menunjukkan tim ini pernah serius soal angka yang tampak bertentangan — tapi `0+` adalah versi baru dari masalah yang sama.

**Why it matters.** `PRODUCT.md` strategic principle #2 "Proof before form: show real events, gallery, stats" — angka yang muncul dua kali lebih lemah dari angka yang muncul sekali, dan angka `0+` **menghancurkan** bukti itu di detik pertama. `CommunityHero.tsx:120-121` sudah punya skeleton untuk kondisi `loading`, tapi `loading` dihitung sebagai `isLoading || stats === undefined` (`:39`) — jadi skeleton seharusnya muncul; yang bocor adalah ketika `stats` ada tapi `completed: 0` (produksi nyata sebelum event pertama) — saat itu `0+` adalah angka jujur tapi tetap buruk sebagai pembuka.

**Fix.** (a) Hapus metrik `completed` dari salah satu tempat — pertahankan di social proof (yang menyajikan konteks lengkap 3 angka), dan ganti badge hero menjadi proposisi, bukan angka (mis. `Venue & sound gratis`). (b) Ketika `completed === 0`, jangan tampilkan `0+`; tampilkan skeleton atau label tanpa angka.

**Suggested command.** `$impeccable clarify` (fokus: copy statistik & konsistensi klaim di hero vs band kepercayaan).

---

### P2 — Footer dan kontak tidak memberi jalan pulang; sticky bar mobile menutupi copyright

**What.** Footer (terukur) berisi **1 link** (`Daftar Event`) + copyright + logo. Tidak ada Instagram (padahal IG adalah jalur follow-up resmi di `PRODUCT.md` Main User Journey #5), tidak ada WhatsApp, tidak ada alamat, tidak ada jam operasional — semua itu hanya ada di `#contact`, 1.500px di atasnya, dan hanya jam kantor (`CommunityContact.tsx:40-41`: "Senin - Jumat, jam kerja").

Terukur di 390×844 saat digulir ke dasar halaman: sticky bar (`CommunityLandingPage.tsx:366-377`, `top: 775`, tinggi 69px) **menutupi** paragraf copyright (`top: 760`, `bottom: 780` → `copyCovered: true`). Penyebabnya `main` hanya punya `pb-20` (80px, `:320`) sementara sticky bar setinggi 69px + safe-area, dan `footer` adalah sibling `main`, bukan di dalamnya — jadi padding itu tidak melindungi footer.

**Why it matters.** Pengguna yang sampai di ujung halaman (artinya: tertarik) menemukan satu-satunya jalan keluar adalah tombol yang sama yang sudah ia lihat 5 kali, dan copyright-nya tertutup. Untuk mall, footer tanpa alamat/IG adalah pemborosan konteks yang sudah terbangun. `PRODUCT.md` anti-reference tidak menyebut ini, tapi "Mobile-first: many visitors arrive from Instagram or WhatsApp" mengimplikasikan jalur balik ke kedua kanal itu harus hadir.

**Fix.** (a) Tambah Instagram + WhatsApp + alamat singkat ke footer; (b) pindahkan `pb-20` ke wrapper yang mencakup footer, atau beri `footer` sendiri `pb-[max(5rem,env(safe-area-inset-bottom))]` di `sm:hidden`.

**Suggested command.** `$impeccable layout` (fokus: ritme akhir halaman, ruang aman sticky bar) → `$impeccable clarify`.

---

## 7. Persona Red Flags

### Casey — pengguna mobile-only (datang dari bio Instagram)

- **Tidak ada WhatsApp di header.** Terukur di 390px: header hanya berisi logo, toggle tema, dan tombol hamburger. `Jadwal Event` dan `Daftar Event` keduanya `display: none` di bawah `sm:`. Jadi di 390px, **satu-satunya CTA di header adalah menu**. Satu-satunya jalan ke WhatsApp adalah `Chat via WhatsApp` (`CommunityRegistrationForm.tsx:458-459`) di posisi 79,7% tinggi halaman — dan itu pun 18px tinggi (terukur: `Chat via WhatsApp` w×h = 128×18), jauh di bawah 44px target sentuh.
- **Hero mengonsumsi 100% viewport tanpa jalan keluar.** Terukur di 390×844: `#hero` = 844px = `100svh`. Konten hero berakhir di `bottom: 724` (fraksi 0,858). Di 320×568, konten hero berakhir di `bottom: 744` dari tinggi hero 842 (fraksi **0,884**) — artinya pengguna iPhone SE / Android kecil **tidak melihat CTA sekunder** (`Cek Event`, `top: 532, bottom: 586` di viewport 568) dan panel data baru mulai di `y: 618` — di luar layar. Yang ia lihat: badge, headline 3 baris, subteks, satu tombol.
- **Delapan kartu tipe organisasi sebelum bisa mengetik.** Terukur: 8 kartu @153×127–143px di 390px = ±1.100px gulir sebelum field pertama.
- **Sticky bar hanya menawarkan satu hal.** `CommunityLandingPage.tsx:366-377`: satu tombol `Daftar Event`, penuh lebar, muncul setelah sentinel. Tidak ada WhatsApp, tidak ada telepon. Bagi pengguna yang belum yakin, satu-satunya opsi adalah tombol terbesar di layar.
- **Copyright tertutup sticky bar** (§6 P2-2, terukur `copyCovered: true`).

### Sam — bergantung pada pembaca layar / keyboard

- **Form gagal memberi tahu apa yang salah.** Delapan field bertanda `*` tidak punya `aria-invalid`, `aria-describedby`, atau pesan error (§6 P0). Pembaca layar mengumumkan `required` dari HTML (`TypeSpecificFields.tsx:31, 46`) tetapi `noValidate` membuat persyaratan itu tidak ditegakkan — jadi pengguna mendengar "wajib" pada 8 field, menekan kirim, dan mendapat satu `role="alert"` yang berbunyi "Gagal mengirim pendaftaran. Coba lagi nanti." tanpa menyebut field mana.
- **Indikator fokus menghilang di area konten.** Terukur: ring berubah dari `#00918e` ke `#33a8a5` (2,88:1 vs putih) mulai dari kartu agenda — di bawah ambang 3:1 (§6 P1-1).
- **Struktur heading justru bersih.** Terukur: 30 heading, satu `h1`, **nol** lompatan level (`jumps: []`), dan itu dikunci oleh test `CommunityLandingHeadings.test.tsx`. Ini kerja yang benar dan layak disebut.
- **`aria-live` ganda.** Badge hero dan band social proof keduanya `aria-live="polite"` dan keduanya mengumumkan angka yang sama — pembaca layar mendengar "3+ Event Terlaksana" dua kali dalam satu gulir.
- **Empty state hero tidak diumumkan dengan benar.** `—` (em-dash) sebagai nilai metrik dibacakan sebagai "em dash" — tidak ada teks alternatif seperti "belum ada data".

### Jordan — pengunjung pertama, tidak tahu apa itu Metmal Community

- **Hero tidak memperlihatkan apa yang dijual.** Foto mall `brightness(0.35)` + gradient 8-stop + grain 50% (`CommunityHero.tsx:100-107`, `gradients.css:9-24` untuk stops, `:40-43` untuk grain). Terukur dari screenshot 1280px: yang terlihat adalah tekstur gelap tosca; rak dan orang di foto tidak dapat dikenali. Untuk tawaran "panggung, sound, lighting", tidak ada panggung/sound/lighting yang terlihat.
- **Panel data realtime menampilkan `—` di bawah label `LIVE` yang berdenyut.** `CommunityHero.tsx:171` menulis `Live` secara hardcode; `:182` menampilkan `—` ketika `metric.value === 0`. Jordan melihat lampu hijau berdenyut di sebelah tiga garis datar.
- **Tidak ada penjelasan singkat "apa itu Metmal Community".** `PRODUCT.md` Landing Page Message menyarankan satu kalimat penuh ("Bawa komunitasmu tampil di Metropolitan Mall Bekasi — venue, sound, lighting, dan promosi dibantu tanpa biaya"); halaman langsung ke badge → headline → subteks 12 kata → 2 tombol. Tidak ada satu kalimat yang menjawab "ini apa, untuk siapa, kenapa gratis". Terukur, satu-satunya kualifikasi proses di seluruh halaman adalah `CommunitySteps.tsx:5` ("Tim kami meninjau proposal kamu") dan `CommunityFAQ.tsx:8` — tidak ada di hero, tidak di dekat CTA. Tidak ada peringatan ketersediaan jadwal di dekat tombol mana pun.
- **Arah pertama yang ia lihat setelah hero adalah band 3 keunggulan** (`CommunityHero.tsx:240-262`: `100% Gratis`, `Sound 10K Watt`, `Terbuka untuk Semua`) — bagus, tapi di 390px ia harus menggulir melewati hero 844px dulu.

### Alex — power user (EO / marcomm sekolah yang sudah tahu mau apa)

- **Tidak ada jalan pintas.** Dari hero ke field pertama: klik `Daftar Event` → gulir 8 kartu → klik tipe → baru field muncul. Tidak ada `#register` anchor langsung dari header (nav "Program" → `Cara Daftar` → `#how`, bukan `#register`). Skip-link `Langsung ke form pendaftaran` ada (`CommunityLandingPage.tsx:173-179`) tapi hanya terlihat saat fokus keyboard.
- **Tidak ada nomor WA/telepon di mana pun di paruh atas halaman.** Terukur: `wa.me/6281318534823` pertama muncul di `CommunityRegistrationForm.tsx:458` (79,7%), dan di `CommunityUpcomingEvents.tsx:17-22` sebagai CTA empty-state (yang tidak tampil bila ada event).
- **Tidak ada indikasi waktu proses di dekat CTA.** `PRODUCT.md` Tone merekomendasikan literal "Tim kami akan menghubungi PIC dalam 5 hari kerja". Terukur: string itu **tidak ada** di seluruh halaman komunitas (grep `src/`: hanya ada di `SponsorLandingPage.tsx:258, 269` dan `featureDocs.ts:721`). Halaman komunitas hanya bilang "secepatnya" (`CommunityRegistrationForm.tsx:454`) dan "untuk diskusi jadwal" (`CommunityFAQ.tsx:8`).
- **Form tidak bisa disimpan/di-draft.** 8 kartu + hingga 6 field + upload 20MB dalam satu sesi; tidak ada autosave, tidak ada indikasi progres.

---

## 8. Minor Observations

1. **Radius form memakai 24px, bukan `--radius-control` (12px).** Terukur: `#reg-org-name` → `border-radius: 24px`; `#ts-community-type` → `24px`. Sumbernya `rounded-2xl` di `CommunityRegistrationForm.tsx:244, 397, 416`. `DESIGN.md` "Token Reference → Radius" menetapkan `--radius-control` = `0.75rem` untuk "Inputs, product buttons, chips", dan "Forms" menutup dengan "use `--radius-control` on inputs and product buttons". `tokens.css:56` mendefinisikan token itu; halaman tidak memakainya. Kartu pemilih tipe organisasi juga `rounded-2xl` (`OrganizationTypeSelector.tsx:88`) — 24px untuk kontrol.

2. **Kartu konten non-kampanye memakai 24px, sementara kartu kampanye 32px, dalam satu halaman.** Terukur: `#how li` (step) = 32px, `#faq .ui-campaign-card` = 32px, `#areas figure` = 32px, kartu utama agenda = 32px — **tetapi** `#gallery a` = 24px, `#news a` = 24px, `#contact a` = 24px, `#areas aside .grid > div` = 24px. `DESIGN.md` "Cards → Campaign / landing: radius `var(--radius-campaign-card)` (`2rem`)". Galeri dan berita adalah kartu kampanye; keduanya 24px.

3. **`rounded-full` untuk tombol submit (`CommunityRegistrationForm.tsx:435`) sesuai DESIGN.md ("rounded full"), tetapi input di sebelahnya 24px** — menciptakan satu form dengan dua bahasa bentuk.

4. **Panel data hero memakai radius kampanye 32px (`CommunityHero.tsx:163`) dengan latar `bg-white/10` + `backdrop-blur-md`.** `DESIGN.md` Motion rules: "Heavy blur/glow decoration should be hidden or reduced on small screens." Terukur di 390px: `backdrop-filter: blur(12px)` tetap aktif, dan `site-grain` tetap `opacity: 0.5; mix-blend-mode: soft-light`. Tidak ada varian mobile.

5. **`animate-[fadeIn_0.3s_ease]` menunjuk keyframe yang tidak ada.** `CommunityRegistrationForm.tsx:264` memakai `fadeIn` (camelCase). Terukur: `animation-name: fadeIn` ter-resolve, tetapi daftar keyframe di halaman hanya memuat `fade-in` (kebab) — `fadeIn` tidak ada. Penyebabnya `animations.css` (yang mendefinisikan `@keyframes fadeIn` di `:7`) **tidak diimpor** oleh `src/index.css` (import: tailwind, fonts, theme, tokens, base, typography, gradients, utilities, dashboard-wayfinding, motion, accessibility). Jadi animasi kemunculan step-2 form tidak pernah berjalan — form muncul begitu saja. Hal yang sama berlaku untuk `mobile.css` dan `performance.css`: ketiganya tidak diimpor dan tidak ada di DOM (terukur: `hasMobileInputRule: false`, `hasAnimationsCss: false`, `hasPerfCss: false`). Efek samping: aturan `input[type="text"] { font-size: 16px }` di `mobile.css:34-40` — pencegah zoom-on-focus iOS — tidak aktif, dan terukur `#reg-org-name` = **14px**.

6. **Em-dash `—` masih ter-render di hero.** `CommunityHero.tsx:182` (`metric.value > 0 ? formatCount(metric.value) : '—'`). Terukur di DOM: satu `<p>` berisi tepat `—`. Ini persis kategori yang dinyatakan **FIXED** di `docs/AUDIT-design-taste-2026-09-20.md:194-200` ("D. User-visible sebagai nilai kosong … `CommunitySocialProof.tsx:21` … (dirender di beranda)") — `CommunitySocialProof.tsx:21` memang sudah diperbaiki ke `'-'`, tetapi `CommunityHero.tsx:182` adalah instance baru yang diperkenalkan belakangan (`git log -S` → `ffec492 feat(landing): hero dua kolom sejajar dengan papan data realtime`, 2026-09-22) dan tidak tertangkap gate mana pun.

7. **`#areas` jadi blok 0px saat admin belum mengisi area.** `CommunityEventAreas.tsx:118` (`if (!isLoading && empty) return null`). Terukur: blok `#areas` = 0px. `CommunityLandingPage.tsx:326-332` sudah menyadari ini dan memasang wrapper ber-`id` sebagai jaring pengaman — wrapper itu bekerja (anchor tidak mati), tetapi pengguna yang mengklik "Area & Fasilitas" dari nav akan **mendarat di udara**: section berikutnya (`#how`) muncul tanpa konteks apa pun bahwa area memang belum tersedia.

8. **`#contact` adalah blok gelap tunggal di tengah halaman terang, dan kartunya putih.** Terukur di mode gelap: section pakai `bg-gradient-reasoning-tosca` (radial tosca + linear `#004a48 → #001a18`), tetapi kartu kontaknya `dark:bg-slate-800` = `rgb(45,56,47)` dengan `border: rgb(74,85,76)` — jadi di mode gelap blok gelap berisi kartu lebih terang, di mode terang blok gelap berisi kartu putih. `docs/AUDIT-design-taste-2026-09-20.md:796-847` (m8) menilai ini "N/A (allowed exception)" sebagai satu color-block. Saya setuju dengan penilaian itu; yang saya catat adalah konsekuensi mode gelapnya: blok ini sekarang menjadi transisi `slate-950 → #001a18 → slate-950` yang nyaris tak terlihat, sehingga "color block" yang jadi alasan pengecualian itu hilang di mode gelap.

9. **Tidak ada `loading="lazy"` pada gambar hero** (benar, ini LCP — `CommunityHero.tsx:104` memakai `fetchPriority="high"` + `decoding="async"` + `sizes="100vw"` + `srcSet` 2 entri). Terukur di 390px: `currentSrc = hero-fallback-800.webp`. Bagus. Tetapi poster agenda (`CommunityUpcomingEvents.tsx:216-220`) memuat `mainEvent.posterUrl` **tanpa** `srcSet` dan tanpa `thumbUrl()`, sementara cover album/berita/area semuanya lewat `thumbUrl()`. Poster adalah gambar terbesar kedua di halaman setelah hero.

10. **CTA `Lihat Detail Event` adalah `<span>` di dalam `<button>`, bukan link.** `CommunityUpcomingEvents.tsx:203-205`: seluruh kartu adalah `<button>` yang membuka modal detail (`onDetail`). Akibatnya event tidak punya URL shareable dari halaman ini — padahal `docs/features/update-fitur-halaman-detail-event.md:9` mencatat bahwa justru ketiadaan URL per-event adalah masalah yang fitur itu selesaikan, dan route `/events/:id` sudah ada (`App.tsx:312`). Jadi `/` adalah satu-satunya permukaan yang masih menahan event di dalam modal.

11. **Nama tombol di kartu utama agenda adalah seluruh isi kartu.** Terukur: `innerText` tombol = 241 karakter ("EVENT BERIKUTNYA Festival Musik Komunitas Bekasi 29 September 2026 10:00 - 12:00 Panggung Lt. 3 Konser komunitas musik lokal …"). Untuk pembaca layar, ini satu tombol raksasa tanpa nama yang berguna. `CommunityEventAreas.tsx:69` justru sudah menyelesaikan pola yang sama dengan benar (`aria-label={\`Lihat ${photoCount} foto ${area.name}\`}`) — perbaikan yang jelas dan murah.

12. **`Sponsor & Support` adalah label campur bahasa di section berbahasa Indonesia** (`CommunityBenefits.tsx:52`), tepat di samping `Keuntungan` (`:36`). `PRODUCT.md` Tone menyarankan menghindari "mixed English/Indonesian in one label", dan `DESIGN.md` Copy Style menempatkan `Looking for Sponsor & Support` di daftar Avoid. Label lain di halaman ini disiplin: `Fasilitas`, `Cara Daftar`, `Berita`, `Galeri`, `Kontak` — semuanya Indonesia.

13. **`Countdown menuju event` + `Live` + `Follow @metmalbekasi` adalah sisa kosakata Inggris yang bisa diterima sebagai istilah event**, tetapi `LIVE` berdenyut permanen pada panel yang datanya kosong (§4) adalah kasus berbeda: itu klaim status, bukan istilah.

14. **Dua h1-level heading di satu halaman?** Tidak — terukur tepat 1 `h1`. Namun `CommunityUpcomingEvents.tsx:161` merender nama event sebagai `<h2>` **di dalam** section yang juga punya `<h2>` sendiri (`:118`), sehingga outline punya dua `h2` bertingkat sama dalam satu section (terukur: `Agenda event` lalu nama event keduanya `h2`). Test heading-order lolos karena levelnya sama, tetapi hierarki visualnya (48px vs 36px) menyiratkan subordinasi yang tidak ada di semantik.

15. **`CommunityRegistrationSection.tsx` (komponen admin, 245 baris) ada di folder `components/community/` bersama komponen publik** dan diimpor oleh daftar komponen yang direview. Isinya memakai token `--wf-*` (bahasa papan admin, `:14-46`). Ini bukan masalah halaman `/`, hanya catatan bahwa folder `community/` mencampur register publik dan admin — berlawanan dengan pemisahan yang dinyatakan `DESIGN.md` ("Public marketing surfaces … Admin/product surfaces …").

---

## 9. Questions to Consider

1. **Kalau hero hanya boleh punya 4 elemen teks (aturan yang halaman ini sendiri pernah penuhi), mana yang bertahan?** Saat ini ada 16. Panel data realtime adalah yang paling hidup — tapi juga yang menampilkan `—` di bawah lampu `LIVE`. Apakah papan data itu lebih baik naik ke posisi section kedua (setelah band keunggulan), sehingga hero kembali jadi proposisi murni?

2. **Apa yang membuat foto panggung lantai 3 terlihat seperti panggung lantai 3?** Sekarang `brightness(0.35)` + grain 50% membuatnya jadi tekstur abstrak. Jika hero benar-benar memperlihatkan panggung, sound system, dan kursi penonton — aset yang sudah dimiliki dan sudah punya galeri area sendiri — apakah headline masih perlu mengatakan "Panggung Gratis"?

3. **Kalau validasi form menutup 8 field bertanda wajib, berapa banyak pendaftaran gagal yang hilang?** Sekarang pengguna mengirim, gagal, dan diberi tahu "coba lagi nanti" untuk sesuatu yang bisa ia perbaiki. Apakah ini akar dari Success Signal "Fewer confused or incomplete form submissions" yang belum tercapai?

4. **Kenapa bukti visual paling milik produk ini (foto area) ada di posisi ke-7 dari 14?** Kalau section itu dipindahkan tepat setelah hero — menggantikan band social proof yang mengulang angka hero — apakah pengunjung dari Instagram lebih cepat memahami "ini panggungnya, ini suasananya"?

5. **Kalau 26 pemakaian `--ease-out-expo` semuanya jatuh ke `ease` selama ini, apakah ada orang yang akan menyadarinya jika tokennya tidak pernah dikembalikan?** Jika jawabannya tidak, mungkin pertanyaan sebenarnya adalah: berapa banyak token di `tokens.css` yang tidak punya konsumen sama sekali, dan berapa banyak `var()` di `motion.css` yang tidak punya definisi?

6. **Apakah footer mall boleh tidak punya alamat?** Ini venue fisik di Bekasi yang menjual kehadiran orang. Satu baris alamat + jam operasional + Instagram di footer akan lebih berguna daripada pengulangan `Daftar Event` yang keenam.

---

## Lampiran — Divergensi eksplisit vs `PRODUCT.md` dan `DESIGN.md`

### vs `PRODUCT.md`

| Klausa | Status | Bukti |
|---|---|---|
| Landing Page Message: "venue, sound, lighting, dan promosi dibantu tanpa biaya" | **Sebagian** | Hero hanya menyebut "Venue, sound system, dan lighting" (`CommunityHero.tsx:140`); **promosi tidak ada di hero**. Promosi baru muncul sebagai benefit ke-1 di `#benefits` (`CommunityBenefits.tsx:8-10`), 2.372px dari atas. |
| Qualifier: "Registrations are reviewed by the mall team" | **Terpenuhi tapi jauh dari CTA** | `CommunitySteps.tsx:5`, `CommunityRegistrationForm.tsx:484`. Tidak ada di hero, tidak ada di dekat tombol kirim. |
| Qualifier: "Availability depends on schedule, concept, and operational fit" | **Hilang di dekat CTA** | Hanya `CommunityFAQ.tsx:9` ("Tim kami akan cek ketersediaan"), di posisi 5.927px dari atas. Secara urutan ia memang **sebelum** form (7.131px) — jadi `PRODUCT.md` journey #3 "reviews benefits, facilities, steps, proof" terpenuhi. Yang hilang: tidak ada peringatan ketersediaan di hero, di header CTA, atau di samping tombol kirim — tempat keputusan diambil. |
| Qualifier: "Facilities depend on event needs and approval" | **Hilang** | Grep `src/components/community/` untuk klaim bersyarat fasilitas: tidak ada. `CommunityFacilities.tsx:33` justru menyatakan tanpa syarat: "semua fasilitas siap pakai tanpa biaya sewa". |
| Tone: gunakan "Ajukan Kolaborasi" | **Tidak dipakai di `/`** | Halaman memakai `Ajukan Event` (`CommunityLandingPage.tsx:355-358`). "Ajukan Kolaborasi" hanya ada di `/pameran` (`ExhibitionsLandingPage.tsx:162, 218`). `PRODUCT.md` menaruh "Ajukan Kolaborasi" di daftar "Use:" pada bagian Tone; `DESIGN.md` Copy Style tidak menyebutnya, jadi ini divergensi vs `PRODUCT.md` saja. |
| Tone: "Tim kami akan menghubungi PIC dalam 5 hari kerja" | **Tidak ada** | Grep: string hanya di `SponsorLandingPage.tsx:258, 269` + `featureDocs.ts:721`. `/` hanya bilang "secepatnya". |
| Tone: hindari "generic SaaS wording" | **Sebagian gagal** | `Daftarkan Komunitas Kamu` (`CommunityRegistrationForm.tsx:451`), `Galeri`/`Berita`/`Fasilitas` (bagus), tetapi `Keuntungan` + `Sponsor & Support` + `JADWAL TERDEKAT`/`LIVE` bercampur. |
| Strategic #1: Conversion first — setiap section menggerakkan ke registrasi | **Gagal secara posisi** | Form di 79,7% tinggi halaman. Section `#benefits`, `#facilities`, `#areas`, `#how`, `#faq`, `#gallery`, `#news` semuanya **tidak punya CTA ke `/daftar`**. CTA non-konversi (galeri/berita/IG/sponsor) lebih banyak dari CTA konversi. |
| Strategic #2: Proof before form | **Terpenuhi** | Agenda, galeri, berita, area semua sebelum form. |
| Strategic #3: Trust through clarity — free/support claims jelas dengan proses & kondisi | **Gagal** | Tiga qualifier dari brief hilang (§ di atas). Klaim "100% gratis" diulang ≥4× tanpa syarat. |
| Strategic #4: Accessible by default | **Sebagian** | Keyboard nav, heading order, reduced-motion, skip-link, label form semuanya benar. Gagal di: indikator fokus 2,88:1 (§6 P1-1) dan field wajib tanpa `aria-invalid` (§6 P0). |
| Strategic #6: Mobile-first (dari IG/WA) | **Gagal** | Tidak ada WA di header/hero/sticky bar; hero mengonsumsi 100svh; `Chat via WhatsApp` di 79,7%. |
| Strategic #7: Reusable craft — primitif bersama | **Sebagian** | `RevealSection` + `CommunityEyebrow` dipakai konsisten (10 eyebrow, semua `tracking-[0.3em]` — `CommunityRevealPrimitives.tsx:57-61`). Tetapi `focusRing` didefinisikan ulang sebagai string lokal di 3 file (`CommunityGallery.tsx:8`, `CommunityNews.tsx:9`, `CommunityFAQ.tsx:14`, `CommunityContact.tsx:4`) dengan nilai berbeda dari `ui-focus-ring`. |
| Anti-ref #1: generic AI SaaS landing pages | **Risiko tinggi** | Hero gelap + gradient tosca + grain + panel kaca + badge pill + 2 CTA + 3 metrik + trust band = template SaaS 2024. Satu-satunya penawar adalah isi teksnya. |
| Anti-ref #3: cluttered event posters, too many competing CTAs | **Terpenuhi sebagian** | 33 elemen interaktif; label `Daftar Event` di 5 tempat, `Lihat Semua …` 3×, plus IG/sponsor/ajukan. Lebih rapi dari poster, tapi jumlah niatnya sama banyak. |
| Anti-ref #4: admin dashboards disguised as marketing pages | **Aman** | Tidak ada tabel/chart/KPI grid. Panel hero adalah satu-satunya elemen data, dan ia bergaya kaca campaign, bukan papan admin. |

### vs `DESIGN.md`

| Aturan | Status | Bukti |
|---|---|---|
| Color: pink secondary hanya chip/badge, maks 1 sinyal per region | **Lulus** | Grep warna pink di `/`: hanya `#upcoming-events` (dari `CATEGORY_COLORS.Konser = '#e24378'`, data) dan `#register` (dari `OrganizationTypeSelector.tsx:15, 100` untuk tile Perusahaan/EO/Instansi). Terukur: 3 dari 8 tile memakai tone pink (`Perusahaan`, `Event Organizer`, `Instansi Pemerintah`) — itu **3 sinyal pink dalam satu region** (grid pemilih organisasi), melewati cap "at most one pink signal per viewport region". Namun karena ini mengkodekan kategori (data), ia masuk pengecualian data-viz. **Catatan, bukan pelanggaran.** |
| Color: `bg-[var(--brand-tosca)]` (500) dilarang di belakang teks | **Lulus** | Grep `bg-[var(--brand-tosca)]` di community: 0 hit. Semua permukaan berteks memakai `--brand-tosca-600` (terukur `rgb(0,122,120)`, 5,18:1). |
| Color: `--brand-tosca-soft` (#33a8a5) tidak dipakai untuk teks kecil di terang | **Lulus** | `#33a8a5` hanya dipakai sebagai `dark:text-*` dan sebagai **focus ring** — dan di sana ia gagal ambang non-teks (§6 P1-1). |
| Focus: "always tosca" | **Gagal** | 6 pemakaian `--brand-tosca-soft` sebagai ring (§6 P1-1), kontras 2,88:1. |
| Radius: `--radius-control` (12px) untuk input & product buttons | **Gagal** | Terukur input/select = 24px (`CommunityRegistrationForm.tsx:244, 397, 416`). Tombol submit `rounded-full` (sesuai DESIGN.md). |
| Radius: `--radius-campaign-card` (32px) untuk kartu landing | **Sebagian** | Steps/FAQ/areas/agenda = 32px; galeri/berita/kontak = 24px. |
| Typography: eyebrow uppercase, `text-[11px]`, `tracking-[0.3em]`, tosca | **Lulus** | Terukur 10 eyebrow, semua 11px / `letter-spacing: 3.3px` (0,3em) / warna `rgb(0,85,76)` (8,13:1) atau `text-white/80` di permukaan gelap. |
| Typography: section H2 `text-4xl`–`sm:text-5xl` | **Lulus** | Terukur 9 `h2` semua 48px. |
| Typography: hero H1 extra-bold, tight leading | **Lulus** | Terukur 60px/63px (leading 1,05), `font-weight: 800`, font `Bricolage Grotesque`. |
| Typography: Display = Bricolage Grotesque | **Lulus, dengan satu lubang** | `h1`/`h2` = Bricolage (via `base.css:26-27`). **Tetapi `h3` di seluruh halaman = Geist** (terukur: `Dukungan Sponsorship`, `Promosi & Marketing`, `Panggung & Backdrop`, `Daftar & Kirim`, `WhatsApp Andy` — semuanya Geist), kecuali `CommunityLandingPage.tsx:349` (`Punya ide event?`). `DESIGN.md` menetapkan Display untuk hierarki, dan `CommunityEventAreas.tsx:125` + `CommunityLandingPage.tsx:349` membuktikan `font-display` bisa dipasang pada `h3` — jadi ketidakkonsistenan ini pilihan, bukan keterbatasan. |
| Layout: `max-w-7xl` untuk section landing luas | **Lulus** | Semua section; `#faq` memakai `max-w-5xl` sesuai aturan "FAQ/content-heavy". |
| Layout: ritme vertikal `py-16 sm:py-24 lg:py-32` | **Lulus** | Terukur `padding-top: 128px` di 9 section. |
| Layout: anchor + `scroll-mt-28` | **Lulus** | `base.css:5-10` (`scroll-margin-top: 6rem`, `#register` 6,5rem) + `CommunityLandingPage.tsx:329` (`scroll-mt-28`). |
| Motion: reveal-on-scroll dengan `--ease-out-expo` | **Gagal** | Token tidak terdefinisi; 26 pemakaian jatuh ke `ease` (§6 P1-2). |
| Motion: `motion-reduce:*` pada transisi lokal | **Lulus** | Terukur `motion.css:249-289` menetralkan semua animasi bernama + `[class*="animate-pulse"]`; `CommunityHero.tsx:121, 170, 186`, `CommunityGallery.tsx:139`, `CommunityEventAreas.tsx:49` semuanya memasang `motion-reduce:*`. |
| Motion: hindari animasi kontinu di mobile; blur/glow dikurangi di layar kecil | **Gagal** | Terukur di 390px: `backdrop-filter: blur(12px)` tetap; `site-grain` tetap `opacity: 0.5`; `animate-pulse` pada dot LIVE; `animate-ping` pada chip event berlangsung (`CommunityUpcomingEvents.tsx:155`). Tiga animasi kontinu + dua blur. |
| Components: RevealSection preserve `reveal-on-scroll`/`reveal-visible`/`reveal-stage`, `intensity`, `as`, skeleton, reduced-motion | **Lulus** | `CommunityRevealPrimitives.tsx:14-44` — semua properti ada dan terpakai. |
| Components: CommunityEyebrow | **Lulus** | `CommunityRevealPrimitives.tsx:61-68`. |
| Components: CTA primary rounded full, solid tosca-600, no gradient | **Lulus** | Terukur semua CTA konversi: `#007a78` + putih, `border-radius: 9999px`. |
| Cards: `border-slate-200/50` atau `--border-subtle` | **Lulus** | Semua kartu memakai `var(--border-subtle)` atau `border-black/5`. |
| Cards: `--shadow-card-soft` di rest, raised saat hover hanya bila clickable | **Sebagian** | `#areas figure` pakai `shadow-[var(--shadow-card-soft)]` (benar). `#how li` pakai `.ui-campaign-card` (benar). Tetapi `#gallery a`/`#news a` pakai `shadow-sm` + `hover:shadow-lg` (Tailwind, bukan token); `#contact a` pakai `shadow-[0_8px_20px_rgba(15,23,42,0.03)]` (nilai ad-hoc). |
| Forms: visible labels, field-specific errors, `aria-invalid`+`aria-describedby`, no disabled primary submit unless submitting | **Gagal sebagian** | Label terlihat ✓; submit hanya disabled saat `submitting` ✓ (`CommunityRegistrationForm.tsx:434`); field-specific error + `aria-invalid` ✓ untuk 6 field umum (`:293, 315, 333, 352, 369`) — **tetapi 8 field wajib dari `TypeSpecificFields` tidak punya satu pun dari ini** (§6 P0). |
| Forms: option cards single-choice harus radio semantics + keyboard | **Lulus** | `OrganizationTypeSelector.tsx:78-112`. |
| Image Guidance: hero srcSet + `sizes="100vw"` + `fetchPriority="high"` hanya untuk LCP + `decoding="async"` | **Lulus** | Terukur: `sizes="100vw"`, `fetchpriority="high"`, `decoding="async"`, `srcSet` 2 entri, `currentSrc = hero-fallback-800.webp`. |
| Image Guidance: gallery/social proof lazy-load + alt bermakna + skeleton stabil | **Lulus** | Semua `loading="lazy"`, `alt` = nama album/area/judul, skeleton dengan tinggi tetap (`CommunityGallery.tsx:18-43`). |
| Dark Mode: slate-950/900/800, tosca-400 teks di gelap, pink sparse, hindari teks putih opacity rendah untuk konten kritis | **Lulus** | Terukur: `--section-alt` di-override ke `rgba(255,255,255,0.04)` (`tokens.css:74`) sehingga 4 section ber-`section-alt` jadi gelap, bukan krem; kartu kampanye `#1a241e`; eyebrow `brand-primary-400` via `.ui-eyebrow`. Satu catatan: `#contact` (blok gradient gelap) di mode gelap menjadi nyaris tak terbedakan dari halaman — bukan pelanggaran kontras, tapi kehilangan fungsi "color block". |
| Copy Style: Indonesia-first, hindari "Contact Us"/"Looking for Sponsor & Support"/"Lihat Benefits" | **Sebagian** | `Kontak` ✓ (bukan "Contact Us"), `Keuntungan` ✓ (bukan "Lihat Benefits"). **Tetapi `Sponsor & Support`** (`CommunityBenefits.tsx:52`) adalah bentuk yang persis ada di daftar Avoid ("Looking for Sponsor & Support"). |

---

## Ringkasan eksekutif

Halaman ini **tidak** generic-AI-SaaS di level konten: kosakata fasilitas, kontak manusia, alur kurasi mall, dan kosakata area adalah milik produk ini dan tidak bisa dipindahkan. Ia **generic di level komposisi**: 14 blok template, 9 `h2` yang identik, 7 section dengan pola eyebrow→judul→paragraf→grid, hero yang menyembunyikan satu-satunya aset visual mall, dan satu-satunya bukti visual khas mall (foto area) di posisi ke-7.

Tiga temuan yang paling perlu ditindak, berurutan: **(1)** validasi form tidak menutup 8 field bertanda wajib dan pesan errornya menyalahkan jaringan — ini menyakiti tepat di momen paling berharga; **(2)** token `--ease-out-expo` hilang sejak commit `3227917`, membuat 26 transisi jatuh ke `ease` dan klaim motion `DESIGN.md` tidak benar untuk halaman ini; **(3)** indikator fokus bercabang dua, dan cabang yang lebih sering dipakai (6 file) gagal ambang kontras non-teks 3:1.

Kontras teks hero di atas foto nyata **lulus dengan margin besar** (6,18:1–18,51:1 terukur dari piksel), struktur heading **nol lompatan**, keyboard nav pemilih organisasi **benar secara ARIA**, dan `prefers-reduced-motion` **dihormati**. Fondasinya bagus; yang kurang adalah keberanian komposisi dan ketelitian di dua titik yang paling menentukan konversi.
