# Benchmark Platform Event Mall - Global & Gen Z

Riset gabungan untuk dashboard event MMB (Metropolitan Mall Bekasi).
Dikumpulkan 2026-08-21. Semua klaim verified dari URL asli (kecuali ditandai).

Sumber:
- Riset baru: 3 subagent (mall global, SaaS venue, public platform) - 2026-08-21
- Riset lama: 22 mall Indonesia scan + venue SaaS patterns (skill mmb-event-ops, 2026-08-17)
- Tren Gen Z: Guardian/Ipsos Des 2025, Westfield Rise 2025, GWI 2025, PwC 2025, YouGov ID 2024

---

## 1. Kesimpulan utama

**Tidak ada mall di luar Indonesia yang mempublikasikan platform operasional event selengkap MMB**
(draft/publish CRUD, role permission, activity log, generator PDF). Situs publik mall top-end berhenti
di: kalender + halaman detail per event + filter + ticketing (Tickit/bigtix) + tenant portal
(VivoCity, Scentre). MMB secara internal sudah di depan benchmark publik global.

**Satu-satunya produk komersial yang wajib dipantau: Simplaq** - produk operasional event khusus
mall (schedule, vendor management, staff coordination).

---

## 2. Mall global dengan platform event (verified)

### Middle East / UAE
| Mall | URL | Fitur (verified) | Tech |
|---|---|---|---|
| Dubai Mall (Emaar) | thedubaimall.com/en/event-schedule | Event schedule + site search, platform in-house group Emaar | Custom CMS/API (mypage.emaarmalls.com) |
| Mall of the Emirates (MAF) | malloftheemirates.com/en/events | Halaman events, booking lewat app "My City Centre" | Drupal |
| City Walk (Meraas) | citywalk.ae/en/whats-on | What's On + integrasi ticketing Tickit + newsletter | Webflow |
| Dubai Festival City Mall | dubaifestivalcitymall.com | Events/Offers/IMAGINE show | IBM WebSphere (legacy) |

### Singapura
| Mall | URL | Fitur (verified) | Tech |
|---|---|---|---|
| Marina Bay Sands | marinabaysands.com/see-and-do.html | Halaman detail per event + ticketing eksternal (bigtix) | AEM |
| VivoCity (Mapletree) | vivocity.com.sg/whats-on/events | Events + Mall Happenings + **tenant login portal** | Alphapod CMS |
| ION Orchard (CapitaLand) | ionorchard.com/en/events.html | Daftar event gaya poster | AEM |
| Jewel Changi | jewelchangiairport.com | News + ticketing atraksi, bukan platform ops | AEM |

### Malaysia
| Mall | URL | Fitur (verified) | Tech |
|---|---|---|---|
| Pavilion KL | pavilion-kl.com/events | Post event + detail page + wayfinding | WordPress |
| Suria KLCC | suriaklcc.com.my/whats-hot | Feed promo gaya blog, cuma What's On | WordPress |
| LaLaport BBCC (Mitsui) | mitsui-shopping-park.com.my/LaLaportBBCC | News + halaman per event | - |

### Jepang / Korea
| Mall | URL | Fitur (verified) | Tech |
|---|---|---|---|
| Shibuya PARCO | en.shibuya.parco.jp/event | Event & POPUP + **filter kategori** (gallery/event/entertainment) + shop search | - |
| AEON MALL | en.aeonmall.global | Next.js tapi **tanpa kalender event publik** | Next.js |
| Lotte World Tower & Mall | lwt.co.kr/en/event | Daftar event berkategori (filter URL-param), EN/KR | - |
| COEX Center (Starfield) | coexcenter.com/event-calendar | Kalender event + inquiry booking venue | - |

### Amerika Serikat
| Mall | URL | Fitur (verified) | Tech |
|---|---|---|---|
| **Mall of America** | mallofamerica.com/entertainment/events | **Terbaik**: detail page per event (/events/view/37943), filter URL, 9 bahasa, live parking | Drupal |
| Simon (200+ mall) | simon.com/mall/.../news-and-events | Events & News per mall + filter kategori | DatoCMS (headless) |
| American Dream | americandream.com/events/category | Kategori event + ticketing atraksi + booking artis (⚠️ konten bot-walled) | - |
| Tysons (Macerich) | tysonscornercenter.com/Events | Platform integrasi events/directory/movies/offers ("Epicenter") | - |

### UK/Eropa & Australia
| Mall | URL | Fitur (verified) | Tech |
|---|---|---|---|
| Westfield London (URW) | westfield.com/en/united-kingdom/london/events | Events & News filterable + count per centre + akun/app | Contentful |
| URW Westfield Events (B2B) | events.urw.com | Venue pages + sales deck PDF | - |
| Bluewater (Landsec) | bluewater.co.uk/en/whats-on | What's On + listing event/offer/news | - |
| Westfield AU (Scentre, 42 centre) | westfield.com.au/parramatta/event | Events per centre + **detail page per event** | Contentful |
| Scentre Marketing Hub (tenant portal) | scentregroup.com/business-solutions/retail-services/marketing-hub | "Submit campaigns untuk semua digital channel & centres" - portal tenant paling mirip | - |
| Vicinity (The Glen) | theglen.com.au/whats-on | What's On per centre | Storyblok |

### SaaS khusus mall
| Produk | Fitur (verified) | Catatan |
|---|---|---|
| **Simplaq** | "Buat jadwal event, kelola info vendor, koordinasi staff" | Produk ops event mall paling mirip MMB |
| Trumba | Kalender + registrasi: search/filter/subscribe/register/ICS | Generic calendar SaaS |
| Localist (Concept3D), Pickspace, WovVTech | Kalender generic / mall-management SaaS | - |

---

## 3. SaaS venue & event management (verified)

### Status penting (perubahan pasar)
- **Ungerboeck rebrand jadi Momentus Technologies** (Jan 2023)
- **Priava diakuisisi Momentus** (Nov 2021)
- **Hubilo diakuisisi Brandlive** (Sep 2025)
- **Taggg BUKAN platform event** - Calendly-style meeting scheduler (red herring, dibuang)

### Perbandingan harga (verified dari halaman pricing resmi)
| Produk | Kategori | Harga | Pattern yang relevan |
|---|---|---|---|
| Skedda | Space booking | $99-349/bulan | **Space entity + kalender per space + konflik prevention** |
| Momentus Booking Bundle | Venue booking | quote | Lifecycle: availability -> hold -> proposal -> approval, anti double-booking |
| Pickspace Marketing Space Manager | Khusus mall | quote | Booking & billing kiosk/signage/event space + kontrak |
| Booking Ninjas mall module | Khusus mall | $1,250-4,000/bulan | Events & promo + booking engine anti-konflik + analytics tenant/traffic |
| Eventbrite | Public/registration | gratis (event gratis), 3.7%+$1.79 (tiket bayar) | Public page + registrasi + analytics |
| Luma | Community | free tier, Plus $59/bln | Approval/token-gated registration (paling murah) |
| Bizzabo | Event platform | $499/user/bln (min 3 user) | - |
| Envoy Premium | Workplace | $362/lokasi/bln | - |
| Planning Pod | Venue | dari ~$149/bln | - |

### Top 5 pattern buat MMB
1. **Skedda** - space entity + double-booking prevention (gap terbesar MMB: lokasi masih free-text)
2. **Pickspace** - booking space mall-native dengan monetisasi
3. **Booking Ninjas** - analog mall-ops terlengkap: events + booking anti-konflik + analytics
4. **Eventbrite** - benchmark public page/registration/analytics
5. **Momentus** - lifecycle booking dengan approval/self-service

---

## 4. Platform publik - fitur yang layak dicopy

### Temuan verified per platform
- **Skiddle**: JSON-LD Event dengan timezone-aware startDate + preset nav "today/this weekend"
- **Eventbrite**: JSON-LD Event + Waitlist + "Remind me" + og:image 940x470 + chip "Going fast/Almost full"
- **Fever**: rating bintang + "From £X" + range tanggal di tiap kartu (edisi London/SG; **edisi Jakarta tidak ada** - 404 verified)
- **GO TOKYO**: preset deep link "What's on Today/Tomorrow/This Weekend"
- **Orchard Road (ORBA)**: digest "What's hot this month" + **member portal untuk tenant kelola listing sendiri** (= alur EO submission/approval)
- **Changi**: tier event members-only (undangan ala RSVP login-gated) + pisah events vs promotions
- **Eventfinda**: form "List your event" -> /add-event submission
- **Visit Seoul**: tab schedule (All/Festivals/Exhibitions) + public API; **tidak punya Event JSON-LD** (gap yang bisa MMB menangkan)
- **Tokyo Cheapo**: range harga/waktu, flag Free, pilihan bintang, URL per tanggal
- **TheSmartLocal**: badge "ONGOING"

### Top 10 fitur untuk dicopy (dengan estimasi effort di React+Supabase)
| # | Fitur | Effort | Sumber |
|---|---|---|---|
| 1 | schema.org/Event JSON-LD (timezone Asia/Jakarta) | murah | Skiddle/Eventbrite - **nol mall Indonesia yang punya** |
| 2 | Date presets + label relatif (Today/Tomorrow/Weekend, chip "Tomorrow"/"+N more") | murah | GO TOKYO/Eventbrite |
| 3 | OG image per event (15:8 / 1200x630 via Vercel OG endpoint) | murah-sedang | Eventbrite/Fever |
| 4 | Badge "Happening now"/ONGOING + countdown | murah | TheSmartLocal/Luma |
| 5 | "Remind me" + ICS/Add-to-calendar (serverless fn, TZID Asia/Jakarta) | murah | Eventbrite/Trumba |
| 6 | Waitlist dengan auto-promote (status enum + Supabase fn) | murah-sedang | Eventbrite/Luma |
| 7 | Sinyal scarcity ("Almost full", capacity bar dari RSVP count) | murah | Eventbrite |
| 8 | Alur EO/tenant submission + approval (/submit-event -> draft -> approve -> notify) | sedang | ORBA/Scentre/Luma |
| 9 | Post-event survey terhubung dashboard (reuse TenantEventSurvey, email setelah endDate) | sedang | - |
| 10 | Public events API / iCal feed; tier members-only | sedang-berat | Visit Seoul/Changi |

---

## 5. Tren mall global di mata Gen Z (verified)

| Data | Angka | Sumber |
|---|---|---|
| Gen Z sering ke mall | 58% | Ipsos via Guardian (Des 2025) |
| Umur 18-34 rutin ke mall | ~2 dari 3 | Empower via Westfield Rise |
| Ke mall buat sosialisasi | 60%+ | Modern Retail |
| Anggap shopping = aktivitas sosial | 42% | Snapchat UK research |
| Pilih pengalaman > barang | 60% | Modern Retail |
| Belanja in-store mingguan | 69% | Empower |
| Bikin konten sosmed di event | 98% | Seeker/experiential marketing |
| Power spending Gen Z 2030 | ~$12 triliun | PwC |
| Pemotongan belanja holiday Gen Z 2025 | 23% | PwC |
| Skeptis "event = profit machine" | 73% | YouGov Indonesia 2024 |
| Mau hadiri brand event (12 bulan) | 58% | YouGov Indonesia 2024 |

Pola: mall = tempat nongkrong + cari pengalaman, bukan cuma belanja. American Dream dan Mall of
America mendatangkan musisi (Jonas Brothers, Hwasa, Taemin). "Shopping should be more and more an
event" - Adam Petrick, CMO American Dream (Guardian, Des 2025).

### Apakah bikin platform event berpengaruh ke Gen Z?

**Ya, tapi bukan platform yang bikin Gen Z datang - platform yang bikin event KETEMU dan KETERUKUR.**

1. **Discovery adalah bottleneck.** Gen Z riset dulu sebelum ke mall (banding harga, cek review,
   buka sosmed - Guardian). Event yang cuma di-poster IG story yang hilang 24 jam tidak ada di
   radar mereka. Platform = sumber kebenaran yang bisa di-share, di-search, muncul di Google.
2. **Loop sosial.** 98% bikin konten di event -> konten itu nge-drive kunjungan berikutnya.
   Halaman event per-URL + OG image = bahan share yang proper (bukan screenshot poster WhatsApp).
3. **Bukti buat manajemen.** Tanpa platform, klaim "event-nya rame" tidak punya bukti. Dengan
   platform: data footfall, attendance, survey - argumen KPI yang sama seperti yang dijual venue
   SaaS (Placer.ai, OAK Events).

**Batasan:** platform tidak menggantikan event yang bagus. Gen Z budget-constrained (potong belanja
23% di 2025) dan 73% skeptis event komersial. Platform menang sebagai alat **memperluas jangkauan
dan membuktikan dampak**, bukan pengganti kualitas event.

---

## 6. Posisi MMB vs lapangan

| Kapabilitas | Mall lain (ID) | Mall global | MMB dashboard |
|---|---|---|---|
| Daftar event publik | semua | semua | ya |
| Detail page per event + URL sendiri | 2 dari 22 | Mall of America, Westfield AU, MBS | **belum** |
| Valid schema.org/Event JSON-LD | 0 dari 22 | sebagian (Skiddle/Eventbrite) | **belum** |
| Public event registration form | 0 dari 22 | beberapa (ticketing) | ya |
| Draft vs Event lifecycle | 0 | jarang publik | ya |
| Role & permission model | 0 | tenant portal (VivoCity/Scentre) | ya |
| Letter/schedule PDF generator | 0 | sales deck (URW B2B) | ya |
| Activity log | 0 | tidak publik | ya |
| Space entity + anti double-booking | 0 | di balik layar (Skedda/BN) | **belum** |
| Survey + evaluasi tenant | 0 | tidak publik | ya |

Kesimpulan: MMB unggul di sisi operasional internal. Yang tertinggal dari benchmark global:
**(1) per-event detail URL, (2) JSON-LD Event, (3) space entity + anti double-booking, (4) fitur
publik discovery (OG image, date presets, ICS, waitlist).**

## 7. Rekomendasi prioritas

1. **Segera (murah)**: JSON-LD Event + detail page per event + OG image - uncontested win SEO,
   nol kompetitor Indonesia yang punya
2. **Segera (murah)**: date presets + badge happening now + ICS add-to-calendar
3. **Sedang**: EO submission + approval workflow (dari Community Hub jadi formal)
4. **Sedang**: space entity (Panggung Lantai 3, Atrium) + deteksi konflik jadwal - gap struktural
   terbesar, unlock KPI attendance vs capacity
5. **Nanti**: waitlist/RSVP publik, survey pasca-event terhubung dashboard, public API
