### Lokasi Event (Area Kanonis)

| Istilah | Arti kanonik | Bukan |
|---------|--------------|--------|
| **Area** | Master lokasi kanonis di tabel `event_areas` (id `era_*`, `name` unik case-insensitive). Dirujuk `events.area_id` / `draft_events.area_id` (`ON DELETE SET NULL`). | Teks bebas `lokasi`; kategori event; tenant |
| **Lokasi (teks)** | Kolom `lokasi` pada Event/Draft — teks tampilan warisan (250 event lama). Bila event punya `area_id`, yang ditampilkan adalah **nama Area**, bukan teks ini. | Master lokasi; sumber kebenaran pemisahan |
| **Pemetaan Lokasi** | Panel admin (`EventAreaManagerModal` view `mapping`) untuk memetakan teks `lokasi` lama ke Area kanonis. Dua aksi independen: (1) isi `area_id` — **hanya bila masih kosong**, pemetaan manual tidak ditimpa; (2) **Seragamkan teks** (`targetLokasi`) — menulis ulang `lokasi` ke **semua** Event/Draft berteks sama, termasuk yang sudah punya `area_id`. | Migrasi otomatis; seed area |
| **Section per Lokasi** | Bentuk pemisahan event per Area di `/events` (blok ber-judul area + nav chip) dan di tabel Jadwal Event dashboard (grouping area → bulan). Aktif hanya bila ada Area terpetakan. | Filter lokasi; halaman per area |
| **Lokasi Lainnya / Tanpa lokasi** | Bucket event yang belum punya `area_id`, selalu di akhir urutan. Tidak ada event yang hilang dari daftar. | Area kanonis; error state |

### Akuisisi Sponsor (BARU — konteks terikat Event)

| Istilah | Arti kanonik | Bukan |
|---------|--------------|--------|
| **Proposal Event** | Berkas lampiran sponsor untuk satu Event. **Tepat satu file** (PDF/gambar/DOCX) di-attach ke Event lewat tabel `event_proposals(event_id, file_url, file_name, mime_type)`. 1-to-1 dengan Event via FK. Bukan kolom di EventItem. | Entitas Proposal terpisah dari Event; banyak file per Event; link eksternal Drive tanpa metadata |
| **Proposal Lampiran** | (Istilah dicabut) — Proposal Event = 1 file, bukan koleksi. | Foto gallery Event; GeneratedLetter |
| **Sponsor** | Pihak eksternal (calon/aktual) yang menerima Proposal untuk considered support. Non-login. | EO Penyelenggara Event; PIC; role login apapun |
| **Landing Sponsor** | Halaman publik (no-login) yang menampilkan daftar Event yang punya Proposal + form "Saya tertarik support". | Dashboard admin; Community Hub publik; halaman tenant |
| **Minat Support** | Submit publik non-login dari Landing Sponsor: pilih Event + isi data kontak + pesan. Tercatat sebagai Lead Sponsor (lihat Q selanjutnya). | Community Registration (akuisisi EO/Penyelenggara); login admin |
| **Lead Sponsor** | Catatan Minat Support yang masuk. Status review Staff: `pending` · `contacted` · `agreed` · `declined`. | Community Registration Lead |

### Presentasi Project (Revisi Final — Inovasi Marcomm)

| Istilah | Arti kanonik | Bukan |
|---------|--------------|--------|
| **Presentator** | Marcomm (Marketing Communication) di Metropolitan Mall Bekasi. | Tim engineer atau pimpinan project |
| **Audience Penerima** | General Manager. | Engineer, admin operasional, atau investor |
| **Titik Berat** | Inovasi inisiatif marcomm: presentator yang mendorong perbaikan proses event. | Dokumentasi fitur atau approval pilot |
| **Proyek** | Aplikasi untuk mempercepat/mempermudah staff event Metmal mengelola event; masih terus berkembang. | Produk jadi 100% |
| **Tujuan Deck** | Memberi nilai positif terhadap reputasi marcomm di mata GM sebagai inisiator, bukan sekadar pelapor. | Sekadar laporan kemajuan atau daftar fitur |
| **Positioning** | Inovasi yang mengubah cara kerja operasional event dari manual menjadi terpusat. | Sales pitch produk |
| **Status Proyek** | Jalan terus dan akan berkembang — disajikan sebagai momentum & roadmap, bukan ketidaksempurnaan. | Proyek deadline yang harus "selesai sempurna" |
| **Nilai Marcomm** | Menunjukkan proaktif, kecepatan eksekusi, visi operasional, dan inovasi di luar tugas inti. | Menunjukkan jumlah fitur teknis |
| **Angle Utama** | Inisiatif pribadi → dampak: marcomm mengubah proses manual menjadi terpusat. | Cerita perjalanan atau bukti tim |
| **Framing Berkembang** | Gabungan: fase 1 sudah live · roadmap jelas sebagai bukti kerja serius · GM diajak ikut mengarahkan. | "Belum selesai" sebagai kekurangan |
| **Inisiator** | Andy Safii — Marcomm Metropolitan Mall Bekasi. Dicantumkan di slide pembuka. | Tim engineer atau nama lain |

### Fitur Sistem (fakta konten, untuk materi penjelasan bila dibutuhkan)

| Istilah | Arti kanonik |
|---------|--------------|
| **Dashboard Group** | Kelompok navigasi admin: Ringkasan · Kelola Event · Interaksi · Sistem · Konten. |
| **Ringkasan** | Pusat Komando, Insight Cerdas, Analitik, Hasil Evaluasi Tenant. |
| **Kelola Event** | Jadwal Event, Antrian Draft, Tema Tahunan, Pameran & Aktivasi — tampilan Event Tabel/Kalender/Kanban/Timeline. |
| **Interaksi** | Pendaftaran, Kolaborasi Tenant, Partisipasi Tenant, Survey Kepuasan, Evaluasi Tenant. |
| **Sistem** | Manajemen Pengguna, Log Aktivitas. |
| **Konten** | Halaman Landing, Galeri Album, Foto Area Event, Buat Surat, Berita, Sponsorship. |
| **Publik** | Landing event, Galeri album, Surat, Survey, Pendaftaran Sponsor/Community. |
| **Alur Draft** | Siklus draft: buat → review → publish → pulihkan. |
| **Role Akses** | Hierarki superadmin → admin → viewer → eo_tenant/tenant_relation. |

### Navigasi Dashboard

| Istilah | Arti kanonik | Bukan |
|---------|--------------|-------|
| **Baris Modul** | Satu baris direktori di register "Semua modul" Pusat Komando: nama modul dan satu kalimat "modul ini untuk apa". Tanpa angka. | Panel antrian; baris menu rail; tombol aksi |
| **Register "Perlu tindakan"** | Daftar di Pusat Komando yang hanya memuat modul yang menunggu keputusan manusia, masing-masing dengan jumlah antrian, keadaannya, dan aksinya. | Register "Semua modul"; bilah peringatan |
| **Register "Semua modul"** | Direktori tujuan di Pusat Komando, dikelompokkan per Dashboard Group. Hanya memuat modul yang diizinkan Role Akses, dan tidak membawa angka antrian. | Navigasi rail; halaman modul; daftar menu |

### Akuisisi Tenant (dua kanal terpisah)

| Istilah | Arti kanonik | Bukan |
|---------|--------------|-------|
| **Kolaborasi Tenant** | Kanal pengajuan **event baru** oleh tenant: halaman publik `/kolaborasi-tenant` → tabel `tenant_event_proposals` → antrean `/dashboard/tenant-proposals`. Menyetujui **tidak** membuat Event/Draft (ADR 003). | Partisipasi Tenant; pameran; pendaftaran komunitas |
| **Partisipasi Tenant** | Kanal tenant ikut serta pada **event yang sudah terjadwal**: halaman publik `/partisipasi-tenant` → tabel `tenant_participations` → antrean `/dashboard/tenant-participations`. Dua bentuk: open booth dan voucher. | Kolaborasi Tenant; tiket masuk; voucher penukaran |
| **Open booth** | Bentuk partisipasi: tenant berjualan/promosi di area event pada rentang booth yang disetujui. | Pameran Casual Leasing; penyewaan tenant tetap |
| **Voucher tenant** | Bentuk partisipasi: penawaran/diskon tenant untuk pengunjung event, dengan ketentuan bebas teks, jenis, format, dan kuota opsional. Pencatatan penukaran **bukan** lingkup sistem ini. | Kode voucher unik sekali pakai; loyalty voucher MID |
| **Kode pengajuan (TPR)** | Kode `TPR-XXXXXX` yang ditampilkan sekali setelah submit partisipasi; dipakai tenant memeriksa status bersama nomor teleponnya. | ID baris di database; nomor tiket antrean |
| **Opsi form partisipasi** | Pilihan dropdown form publik (skema booth, ukuran booth, jenis voucher, format voucher) yang dikelola admin lewat modal "Kelola opsi"; opsi nonaktif tidak ditawarkan ke pengajuan baru. | Enum bebas di kode; label form survey |
| **Insight Cerdas** | Halaman `/dashboard/insights`: analisis otomatis dari data event & modul lain, tiap insight membawa tombol tindak lanjut berfilter. Ringkasan AI opsional di atasnya. | Pusat Komando (triage); Analitik (eksplorasi data) |
