# Tone of Voice: Metropolitan Mall Bekasi

Status: draf untuk disetujui Andy · 2026-11-21
Dasar: kode produksi (`src/pages`, `src/components`), `CONTEXT.md`, `PRODUCT.md`, `DESIGN.md` bagian Copy Style.
Semua klaim di bawah punya rujukan `path:line`. Yang tidak punya rujukan ditandai `[ASUMSI]`.

## 0. Ringkasan

1. Satu mall, tiga register: publik persuasif, dashboard operasional, dokumen resmi.
2. Bahasa Indonesia adalah kerangka kalimat. Istilah Inggris hanya untuk kosakata event dan daftar baku produk.
3. Sapaan: "kamu" dan akhiran "-mu" di publik dan survei anonim. Dashboard tanpa sapaan untuk semua role. Surat resmi tanpa pronomina orang kedua.
4. Gaya percakapan berhenti di headline dan subjudul pemasaran. Form, validasi, error, dashboard, dan surat memakai bahasa baku.
5. Satu label tombol menunjuk satu rute. "Daftar event" tidak boleh dipakai untuk mengajukan event.
6. Klaim tanpa biaya sewa menyertakan syarat (review tim, kecocokan konsep, ketersediaan jadwal) pada penyebutan mandiri pertama.
7. Format tanggal: "21 November 2026" di kalimat publik dan surat, "21 Nov 2026" di tabel dan riwayat dashboard.

## 1. Karakter suara

- Tiga kata sifat: terbuka, lugas, terukur.
- Posisi: kami pengelola ruang acara yang jelas soal fasilitas, syarat, dan tindak lanjut. Bukan agen promosi yang mengumbar janji.
- Identitas yang tidak bisa ditukar logo: tawaran konkret (venue, sound system, lighting, promosi tanpa biaya sewa), tenggat 5 hari kerja (`src/pages/SponsorLandingPage.tsx:237`), dan penyebutan komunitas Bekasi (`src/components/community/CommunityHero.tsx:144`).
- Uji generik: ganti "Metmal Bekasi" dengan nama mall lain. Kalimat "Gampang banget, cuma 4 langkah" (`CommunitySteps.tsx:16`) dan "Semua udah disiapin" (`CommunityFacilities.tsx:30`) tetap masuk. Keduanya bukan pembeda, jadi jangan dipakai sebagai contoh identitas.

## 2. Tiga register

| Register | Tujuan pembaca | Panjang kalimat | Sapaan | Formalitas | Yang dilarang |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **Publik persuasif** (hero, benefit, langkah, fasilitas, banner, IG/WA) | Memahami tawaran, lalu memilih jalur yang benar (Daftar event, Ajukan event, Kolaborasi tenant, Partisipasi tenant, Sponsor) | 6 sampai 14 kata | "kamu", "-mu" | Santai terukur | Janji gratis tanpa syarat, jargon pemasaran, label tombol yang menunjuk jalur lain |
| **Dashboard operasional** (Pusat Komando, Antrian Draft, form, validasi, error) | Memproses jadwal, pendaftaran, survei, dan data tanpa hambatan | 5 sampai 12 kata, maksimal 2 klausa | Tanpa sapaan | Netral fungsional | Slang ("nggak", "udah", "banget"), maaf berlebihan, kode error teknis, "kamu" |
| **Dokumen resmi** (surat, korespondensi legal) | Menerima keputusan resmi atas nama pengelola mall | 12 sampai 22 kata, struktur baku | Tanpa pronomina orang kedua | Formal korporat | Sapaan "kamu", singkatan tidak baku, bahasa promosi |

Catatan register dashboard: sebelas string "kamu" sudah dihapus pada 2026-11-21. Tiga di Pusat Komando (`CommandCenterDirectory.tsx:80`, `CommandCenterSummary.tsx:67`, `DashboardStats.tsx:105`), dua error ekspor CSV di `SurveyDashboard.tsx:133`, dan `:139`, tiga di `TenantSurveyPage.tsx:296`, `:370`, `:376`, tiga di `TenantSurveyForm.tsx:282`, `:477`, `:545`. Dashboard kini nol sapaan orang kedua. Template balasan WhatsApp di `CommunityRegistrationDetailModal.tsx:25` memakai naskah netral: "Halo {PIC}" lalu kalimat tanpa pronomina orang kedua.

## 3. Lima jalur publik dan labelnya

Setiap jalur punya tombol sendiri. Menukar label di antara baris tabel ini adalah cacat fungsional, bukan pilihan gaya.

| Rute | Label | Isi | Konsekuensi |
| :---- | :---- | :---- | :---- |
| `/daftar` | Daftar event | Registrasi komunitas atau organisasi (`src/pages/RegistrationPage.tsx:34`) | Masuk antrean review admin, bukan pengajuan event |
| `/ajukan-event` | Ajukan event | Pengajuan event oleh EO atau komunitas (`src/pages/EventSubmissionPage.tsx:210`) | Sukses: "Event … sudah masuk antrean tinjauan" (`:179`) |
| `/kolaborasi-tenant` | Kolaborasi tenant | Pengajuan event baru oleh tenant | Menyetujui tidak membuat Draft otomatis (ADR 003) |
| `/partisipasi-tenant` | Booth dan voucher | Open booth atau voucher tenant | Satu-satunya jalur yang menerbitkan kode pengajuan `TPR-XXXXXX` (`TenantParticipationPage.tsx:947`) |
| `/sponsor` | Sponsor | Minat support atas Proposal Event yang dilampirkan pada Event | Tindak lanjut 5 hari kerja (`SponsorLandingPage.tsx:246`) |

Label diambil dari `src/components/nav/publicNav.ts:15-48`.

## 4. Aturan operasional

- **Sapaan.** "kamu" dan akhiran "-mu" untuk halaman publik dan survei anonim (`SurveySuccess.tsx:30`, `TenantSurveyPublicPage.tsx:335`, `TenantSurveyEventPicker.tsx:98`, `EventSubmissionPage.tsx:212`). Dashboard tanpa sapaan, termasuk untuk tenant yang login dan untuk modul survei admin (`SurveyDashboard`, `TenantSurveyPage`, `TenantSurveyForm`). Surat memakai "Kepada Yth," dan nama atau jabatan, tanpa pronomina orang kedua.
- **Batas informalitas.** "nggak" dan "udah" hanya di headline dan subjudul pemasaran. "banget" dihapus; kuota per halaman tidak bisa diukur, jadi jangan dipakai sebagai aturan. Form, validasi, error, dashboard, dan surat memakai bahasa baku.
- **Istilah Inggris.** Diizinkan hanya untuk daftar baku: Draft, Tenant, Area, Open booth, Lead Sponsor, Proposal Event, venue, sound system, lighting. Kata kerja dan status tetap Indonesia. Kata "field" pada validasi survei (`TenantSurveyPublicPage.tsx:725`) diganti "kolom".
- **Kapitalisasi.** Nama modul dan entitas memakai Title Case mengikuti `CONTEXT.md`: Pusat Komando, Antrian Draft, Jadwal Event, Insight Cerdas. Label navigasi, tombol, dan judul halaman memakai sentence case mengikuti `publicNav.ts`: "Jadwal event", "Daftar event". Satu string tidak memakai dua gaya sekaligus.
- **Panjang.** Maksimal 14 kata di layar publik dan 12 kata di label, validasi, serta error dashboard. Satu pesan error maksimal dua kalimat pendek.
- **Angka.** Angka Arab. "5 hari kerja" untuk tenggat. Format kode `TPR-XXXXXX`.
- **Tanggal.** Kalimat publik, surat, dan berita memakai bulan penuh: "21 November 2026" (`src/components/community/CommunityNews.tsx:13`). Tabel, riwayat, dan modal memakai bulan singkat: "21 Nov 2026" (`src/utils/draftUtils.ts:56`, `src/components/modals/NewsManagerModal.tsx:182`, `src/components/letters/LetterHistoryList.tsx:28`).

## 5. Leksikon

| Pakai | Jangan pakai | Alasan |
| :---- | :---- | :---- |
| Daftar event | Daftar Sekarang, Gabung | Satu label konversi, satu rute. |
| Ajukan event | Kirim proposal, Ajukan acara | Membedakan jalur `/ajukan-event` dari `/daftar`. |
| Berlangsung | Live | Status jadwal publik hanya tiga label resmi (`StatusBadge.tsx:13`). |
| Mendatang | Segera Hadir, Upcoming | Sama. |
| Selesai | Berakhir, Done | Sama. |
| Pusat Komando | Command Center, Dashboard Utama | Nama modul baku (`CONTEXT.md`). |
| Antrian Draft | Draft Queue, Daftar Konsep | Nama modul baku. |
| Insight Cerdas | Smart Analytics, Laporan Pintar | Nama fitur baku. |
| Proposal Event | Deck Acara, Brief Event | Lampiran sponsor, satu file per Event (`CONTEXT.md`). |
| Kode pengajuan (TPR) | ID Tiket, Nomor Referensi | Hanya terbit dari Partisipasi Tenant, bukan dari pengajuan event atau sponsor. |
| Kolaborasi tenant, Partisipasi tenant | Kerja Sama Toko, Promo Tenant | Istilah operasional baku. |
| Open booth, Lead Sponsor | Stan terbuka, Sponsor utama | Istilah baku, ditulis apa adanya. |
| Area | Zona, Spot | Master lokasi kanonis (`CONTEXT.md`). |
| Tanpa biaya sewa, dengan syarat review tim, konsep, dan jadwal | Gratis 100% tanpa syarat | Klaim gratis wajib menyebut syaratnya. |

## 6. Tiga larangan keras

1. **Dilarang:** "Venue gratis tanpa syarat, langsung dapat panggung untuk semua acara!"
   **Pengganti:** "Venue, sound system, lighting, dan promosi dibantu tanpa biaya sewa, dengan review tim, kecocokan konsep, dan ketersediaan jadwal."
2. **Dilarang:** "Mohon maaf sebesar-besarnya atas ketidaknyamanannya, terjadi Error 500."
   **Pengganti:** "Gagal memuat data event. Periksa koneksi, lalu coba lagi." (`src/hooks/useEvents.ts:126`)
3. **Dilarang:** "Yuk gabung di acara Live kami dan Daftar Sekarang sebelum kehabisan!"
   **Pengganti:** "Punya acara di Bekasi? Cek Jadwal event, lalu ajukan lewat Ajukan event. Untuk ikut event yang sudah terjadwal, buka Booth dan voucher."

## 7. Contoh per surface

| Surface | Generik (salah) | Versi kita (benar) | Alasan |
| :---- | :---- | :---- | :---- |
| CTA | Daftar Sekarang | Daftar event | Satu label, satu rute. |
| CTA pengajuan | Daftar event | Ajukan event | "Daftar event" membuka registrasi komunitas, bukan pengajuan event. |
| Judul section | Program Kerja Sama Mall | Kolaborasi tenant dan partisipasi tenant | Istilah baku, masing-masing satu rute. |
| Empty state koleksi kosong | Data masih kosong. | Belum ada draft event aktif. | Objek dan keadaan disebut (`DraftQueueTable.tsx:25`). |
| Empty state filter tanpa hasil | Tidak ada data. | Tidak ada acara yang cocok. Ubah filter atau kata kunci. | Hasil filter nol dibedakan dari koleksi kosong (`EventTable.tsx:159`). |
| Error | Terjadi kesalahan server (503). | Gagal memuat data event. Periksa koneksi, lalu coba lagi. | Sebut yang gagal dan langkah perbaikan, tanpa kode. |
| Sukses pengajuan event | Form berhasil dikirim, terima kasih! | Event "Bazar Kopi" sudah masuk antrean tinjauan. | Memakai naskah nyata (`EventSubmissionPage.tsx:179`). |
| Sukses partisipasi tenant | Terima kasih, pengajuan diterima. | Pengajuanmu sudah terkirim. Simpan kode pengajuan TPR-XXXXXX untuk memantau status. | Kode hanya terbit di jalur ini (`TenantParticipationPage.tsx:463`). |
| Label form | Jenis Sponsor & Booth | Layanan yang diminati: Open booth atau voucher | Satu pertanyaan, satu daftar baku. |
| Badge status | Live, Segera Hadir | Berlangsung, Mendatang, Selesai | Tiga label resmi. |
| Ajakan WA/IG | Mau panggung gratis tanpa ribet? Klik link ini! | Punya ide acara di Bekasi? Ajukan lewat Ajukan event. Venue dan lighting dibantu tanpa biaya sewa, dengan review tim dan ketersediaan jadwal. | Jalur benar, syarat ikut. |
| Surat resmi | Halo rekan, pengajuan acara kamu sudah oke ya. | Kepada Yth, Bapak/Ibu Penanggung Jawab. Menindaklanjuti pengajuan event tanggal 21 November 2026, kami sampaikan bahwa jadwal dan Area tersedia. Hormat kami, | Register formal, tanpa pronomina orang kedua. |

## 8. Pola mikro

1. **Tombol:** kata kerja Indonesia + objek baku. Satu label menunjuk satu rute.
2. **Empty state koleksi kosong:** "Belum ada [objek baku] di [nama modul]. [Langkah berikutnya]."
3. **Empty state filter tanpa hasil:** "Tidak ada [objek] yang cocok. [Ubah filter atau kata kunci]."
4. **Error:** "Gagal [tindakan] [objek]. [Langkah perbaikan konkret]."
5. **Sukses:** "[Objek] berhasil [status]. [Langkah berikut atau tenggat]."
6. **Validasi:** "Lengkapi [n] kolom wajib lagi untuk [tindakan]" atau "Mohon perbaiki [n] kesalahan: [rincian]".

## 9. Checklist review

1. Tidak ada em dash, dan tidak ada "solusi", "terbaik", "seamless", "powerful".
2. CTA konversi utama ditulis persis "Daftar event"; pengajuan event memakai "Ajukan event".
3. Klaim tanpa biaya sewa menyebut review tim, konsep, atau jadwal.
4. Sapaan sesuai surface: "kamu" di publik, tanpa sapaan di dashboard, tanpa pronomina di surat.
5. Tidak ada "nggak", "udah", atau "banget" di form, validasi, error, dashboard, atau surat.
6. Tidak ada "kamu" di string dashboard mana pun, termasuk Survei kepuasan, Tenant Self-Assessment, dan form tenant survey admin.
7. Istilah produk memakai ejaan baku: Pusat Komando, Antrian Draft, Jadwal Event (entitas), Jadwal event (label navigasi).
8. Status jadwal publik hanya Berlangsung, Mendatang, Selesai.
9. Pesan error menyebut bagian yang gagal dan langkah perbaikan, tanpa kode teknis dan tanpa permintaan maaf berlebihan.
10. Kode pengajuan hanya disebut di jalur Partisipasi tenant, dan Proposal Event hanya untuk lampiran sponsor.
11. Tidak ada angka penonton, nama tenant, testimoni, atau fasilitas di luar data nyata.

## 10. Keputusan yang butuh persetujuan

| Pertanyaan | Rekomendasi | Risiko kalau salah |
| :---- | :---- | :---- |
| 1. "nggak" dan "udah" dipertahankan di headline publik atau diganti baku? | Pertahankan di headline dan subjudul pemasaran saja; hapus "banget". | Terlalu santai melemahkan kredibilitas di mata perusahaan dan instansi; terlalu kaku menjauhkan komunitas IG/WA. |
| 2. Navigasi "Jadwal event" atau entitas "Jadwal Event"? | Pertahankan pembagian: Title Case untuk entitas, sentence case untuk label. | Menyeragamkan ke Title Case membuat nav campur gaya ("Jadwal Event, Galeri, Berita"). |
| 3. Kata "field" diganti "kolom" sekarang? | Ya, di teks yang dibaca pendaftar. | Pendaftar non-teknis membaca istilah asing di tengah kalimat Indonesia. |
| 4. Kapan memakai Metmal Bekasi, Metropolitan Mall Bekasi, dan PT. Metropolitan Land Tbk.? | Metmal Bekasi untuk publik dan sosial; Metropolitan Mall Bekasi untuk profil resmi; PT. Metropolitan Land Tbk. hanya untuk surat dan legal. | Salah entitas membuka celah legal di surat atau terasa birokratis di media sosial. |

## 11. Asumsi

- `[ASUMSI]` Staf Marcomm dan tenant berbagi dashboard yang sama.
- `[ASUMSI]` Belum ada naskah pesan IG/WA yang live; contoh diturunkan dari banner dan tawaran inti.
- `[ASUMSI]` Template WhatsApp pada `CommunityRegistrationDetailModal.tsx:25` sudah dibersihkan dari pronomina orang kedua pada 2026-11-21. Nada "Halo {PIC}" dipertahankan karena nama PIC organisasi eksternal tetap disapa langsung.
