/**
 * Isi halaman /docs.
 *
 * Satu sumber kebenaran untuk dokumentasi fitur: dipakai halaman /docs dan bisa
 * dibaca ulang oleh tes. Setiap entri harus punya langkah yang benar-benar ada
 * di UI — jangan menambah langkah yang tidak didukung kode. Bila sebuah fitur
 * dinonaktifkan, tandai `status: 'maintenance'` agar halaman jujur.
 */

export type DocAudience =
  | 'Publik'
  | 'Semua pengguna'
  | 'Tenant'
  | 'Viewer'
  | 'Admin'
  | 'Superadmin'
  | 'Demo';

export type DocStatus = 'aktif' | 'maintenance';

export interface DocFeature {
  id: string;
  name: string;
  /** Path URL persis, bila fitur punya rute sendiri. */
  path?: string;
  audience: DocAudience;
  status?: DocStatus;
  /** Satu-dua kalimat: apa fungsinya. */
  summary: string;
  /** Langkah penggunaan berurutan. */
  steps: string[];
  /** Prasyarat / catatan penting. */
  notes?: string[];
}

export interface DocGroup {
  id: string;
  label: string;
  description: string;
  features: DocFeature[];
}

export interface DocSection {
  id: string;
  label: string;
  intro: string;
  groups: DocGroup[];
}

export const DOC_SECTIONS: DocSection[] = [
  {
    id: 'mulai',
    label: 'Mulai dari sini',
    intro:
      'Cara masuk ke dashboard, peran akun, dan hal yang berlaku di semua halaman. Bila kamu hanya ingin mengikuti acara atau mengisi form sebagai pengunjung, langsung saja ke bagian "Panduan pengunjung" di bawah.',
    groups: [
      {
        id: 'akses',
        label: 'Akses dan peran',
        description: 'Siapa yang bisa membuka apa, dari pengunjung sampai superadmin.',
        features: [
          {
            id: 'login-admin',
            name: 'Masuk dashboard',
            path: '/dashboard',
            audience: 'Semua pengguna',
            summary:
              'Gerbang masuk dashboard. Tanpa sesi admin, setiap alamat /dashboard/* menampilkan halaman login.',
            steps: [
              'Buka /dashboard.',
              'Isi Email dan Password (ikon mata untuk melihat sandi).',
              'Klik "Masuk sebagai admin".',
              'Bila kredensial salah, muncul pesan galat dan kartu bergetar. Periksa ulang.',
            ],
            notes: [
              'Sesi disimpan sebagai cookie HttpOnly, jadi aman dari pembacaan JavaScript.',
              'Setelah masuk, kamu diarahkan ke halaman pertama yang boleh kamu buka sesuai peran.',
            ],
          },
          {
            id: 'peran',
            name: 'Peran akun',
            audience: 'Semua pengguna',
            summary:
              'Enam peran menentukan apa yang terlihat dan boleh diubah. Rail kiri hanya menampilkan menu yang izinnya menyala. Setiap halaman memeriksa izin sebelum menampilkan tombol aksi.',
            steps: [
              'Superadmin: seluruh dashboard termasuk Manajemen pengguna; satu-satunya peran yang bisa mengelola akun.',
              'Admin: seluruh dashboard kecuali Manajemen pengguna.',
              'Viewer: mode hanya-lihat. Membuka Pusat komando, Analitik, Jadwal event, Pendaftaran, dan Survei kepuasan tanpa tombol tambah/ubah/hapus.',
              'Demo: melihat seluruh permukaan dashboard (semua menu tampil) dengan semua aksi mutasi disembunyikan.',
              'EO Tenant: hanya modul Evaluasi tenant, dan hanya data miliknya sendiri.',
              'Tenant Relation: diarahkan langsung ke Hasil evaluasi tenant, di luar dashboard.',
            ],
            notes: [
              'Hierarki peran: superadmin > admin > viewer > EO Tenant / Tenant Relation.',
              'Peran diatur lewat Manajemen pengguna oleh superadmin.',
              'Setelah masuk, kamu diarahkan ke halaman pertama yang boleh kamu buka sesuai peran.',
            ],
          },
          {
            id: 'peran-viewer',
            name: 'Mode viewer (hanya lihat)',
            audience: 'Viewer',
            summary:
              'Peran Viewer untuk staf yang perlu memantau tanpa mengubah apa pun. Tombol mutasi disembunyikan sepenuhnya, bukan sekadar dinonaktifkan.',
            steps: [
              'Masuk dengan akun berperan Viewer; kamu diarahkan ke Pusat komando.',
              'Rail kiri hanya menampilkan: Pusat komando, Insight cerdas, Analitik, Jadwal event, Pendaftaran, Kolaborasi tenant, Partisipasi tenant, dan Survei kepuasan.',
              'Jadwal event tampil dalam mode Tabel saja. Tab Kalender dan Kanban disembunyikan karena keduanya khusus pengubah event.',
              'Klik baris atau kartu untuk membaca detail; tombol Tambah, Ubah, dan Hapus tidak dirender.',
              'Di Pendaftaran, detail pendaftar bisa dibuka, tetapi tombol Setujui, Tolak, dan Buat draf tidak ada.',
              'Di Kolaborasi tenant dan Partisipasi tenant, antrean dan kartu pengajuan bisa dibaca lengkap, tetapi tombol status, koreksi isian, dan hapus tidak dirender.',
              'Di Survei kepuasan, angka dan respons bisa dibaca, tetapi toggle aktif/nonaktif survei tidak tersedia.',
              'Ekspor jadwal ke PDF tetap bisa dilakukan.',
            ],
            notes: [
              'Event berstatus draf tidak ikut tampil di Jadwal event karena Viewer tidak punya izin jadwal internal.',
              'Menu Antrian draf, Tema tahunan, Pameran dan aktivasi, Manajemen pengguna, Log aktivitas, dan seluruh grup Konten disembunyikan.',
              'Server ikut menolak aksi tulis akun baca-saja dengan pesan "Akun baca-saja hanya dapat melihat data".',
            ],
          },
          {
            id: 'peran-demo',
            name: 'Mode demo',
            audience: 'Demo',
            summary:
              'Peran Demo memperlihatkan seluruh dashboard tanpa bisa mengubah apa pun, cocok untuk presentasi atau uji coba.',
            steps: [
              'Masuk dengan akun Demo; seluruh menu rail tampil, termasuk Konten dan Manajemen pengguna.',
              'Telusuri semua halaman; setiap tombol aksi (Tambah, Ubah, Hapus, Terbitkan, Setujui) tidak dirender.',
              'Buka Antrian draf, Tema tahunan, Pameran, Manajemen pengguna, dan Konten untuk melihat tampilannya.',
              'Ekspor PDF dan CSV tetap tersedia.',
            ],
            notes: [
              'Server juga menolak aksi tulis akun baca-saja, demo, maupun viewer dengan pesan "Akun baca-saja hanya dapat melihat data". Jadi bukan hanya tampilan yang disembunyikan.',
              'Email pengguna ditampilkan dalam bentuk tersamarkan.',
            ],
          },
          {
            id: 'peran-tenant',
            name: 'Akun tenant (penyelenggara event dan relasi tenant)',
            audience: 'Tenant',
            summary:
              'Dua peran untuk tenant: EO Tenant mengisi penilaian mandiri, Tenant Relation membaca agregat hasil evaluasi.',
            steps: [
              'EO Tenant: setelah masuk diarahkan ke Evaluasi tenant; hanya bisa melihat dan mengisi data gerainya sendiri.',
              'EO Tenant tidak melihat tombol tinjauan atau hapus, juga tidak melihat pengaturan survei milik admin.',
              'Tenant Relation: diarahkan langsung ke Hasil evaluasi tenant di /tenant-survei-results, di luar dashboard.',
              'Tenant Relation hanya melihat respons berstatus terkirim atau ditinjau, dengan data pribadi disamarkan.',
              'Tenant Relation dapat mengekspor hasil ke PDF.',
            ],
            notes: [
              'Seluruh alamat /dashboard/* otomatis dialihkan keluar untuk Tenant Relation.',
              'Data tiap tenant dibatasi di sisi server, bukan hanya di tampilan.',
            ],
          },
          {
            id: 'tema',
            name: 'Mode terang dan gelap',
            audience: 'Semua pengguna',
            summary: 'Setiap permukaan punya tombol tema; pilihan tersimpan di perangkat kamu.',
            steps: [
              'Cari tombol bulan/matahari di kanan atas (navbar) atau di dasar rail (dashboard).',
              'Klik untuk berganti antara mode terang dan gelap.',
              'Preferensi tersimpan otomatis dan dipakai lagi pada kunjungan berikutnya.',
            ],
          },
        ],
      },
      {
        id: 'orientasi-pengunjung',
        label: 'Untuk pengunjung dan tenant',
        description: 'Panduan singkat bila kamu datang sebagai pengunjung, komunitas, brand, atau tenant.',
        features: [
          {
            id: 'panduan-pengunjung',
            name: 'Panduan cepat pengunjung',
            audience: 'Publik',
            summary:
              'Halaman publik tidak memerlukan akun. Semua yang di bawah ini bisa dibuka langsung dari beranda tanpa login.',
            steps: [
              'Lihat acara yang sedang dan akan berlangsung di /events, bisa disaring per waktu atau dicari lewat kata kunci.',
              'Buka kartu acara untuk detail lengkap, lalu tambahkan ke kalender atau bagikan lewat WhatsApp.',
              'Telusuri dokumentasi acara di /gallery dan kabar terbaru di /news.',
              'Cari tenant di /tenants atau organisasi yang pernah tampil di /community.',
              'Ingin mengadakan acara? Isi pendaftaran di /daftar atau ajukan langsung di /ajukan-event.',
              'Punya brand atau komunitas? Tawarkan dukungan di /sponsor atau ikut kolaborasi di /pameran.',
              'Punya tenant di mall? Ajukan event kerja sama di /kolaborasi-tenant, atau ikut memeriahkan event yang sudah terjadwal lewat booth terbuka dan voucher di /partisipasi-tenant.',
              'Untuk acara yang sudah lewat, bagikan penilaian lewat survei kepuasan.',
            ],
            notes: [
              'Tidak ada satu pun halaman di panduan ini yang meminta login.',
              'Isi form kamu hanya dipakai tim Marcomm untuk menindaklanjuti, sesuai catatan di tiap form.',
            ],
          },
          {
            id: 'panduan-tenant',
            name: 'Panduan cepat tenant',
            audience: 'Tenant',
            summary:
              'Sebagai tenant, kamu mengisi penilaian mandiri dampak event terhadap tenant, dan punya dua kanal pengajuan: event kerja sama dan partisipasi booth atau voucher. Semua bisa dibuka lewat tautan atau kode QR tanpa login.',
            steps: [
              'Buka /tenant-survei, lalu cari event yang kamu ikuti berdasarkan nama, lokasi, atau penyelenggara.',
              'Klik baris event untuk mulai mengisi.',
              'Bagian 1: pilih tenant kamu dari daftar (lokasi dan kategori terisi otomatis), lengkapi PIC bila perlu.',
              'Bagian 2: pilih kenaikan kunjungan dan penjualan tenant kamu.',
              'Bagian 3: tulis umpan balik, lalu kirim.',
              'Ingin mengadakan event kerja sama? Ajukan di /kolaborasi-tenant; lampiran proposal (PDF, Word, atau gambar PNG/JPEG) bersifat opsional.',
              'Ingin ikut memeriahkan event yang sudah terjadwal? Ajukan booth terbuka atau voucher di /partisipasi-tenant, lalu simpan kode pengajuan (format TPR-XXXXXX) untuk memantau statusnya.',
              'Bila kamu juga menerima tautan hasil, buka /tenant-survei-results untuk membaca agregatnya.',
            ],
            notes: [
              'Nama tenant harus dipilih dari daftar, bukan diketik bebas.',
              'Satu perangkat hanya bisa mengisi sekali per event.',
              'Survei hanya terbuka untuk event yang sudah diaktifkan admin; bila daftar kosong, hubungi tim mall.',
              'Pengajuan booth/voucher hanya terbuka untuk event yang belum mulai; pengajuan ditutup paling lambat H-1 sebelum event berjalan.',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'dashboard',
    label: 'Dashboard admin',
    intro:
      'Pusat kerja harian tim. Rail di kiri mengelompokkan modul menjadi Ringkasan, Kelola event, Interaksi, Sistem, dan Konten.',
    groups: [
      {
        id: 'ringkasan',
        label: 'Ringkasan',
        description: 'Keadaan hari ini, analisis otomatis, dan hasil evaluasi.',
        features: [
          {
            id: 'pusat-komando',
            name: 'Pusat komando',
            path: '/dashboard',
            audience: 'Admin',
            summary:
              'Halaman pendarat setelah masuk, disusun sebagai papan triage: strip status antrian, register "Perlu tindakan", band "Hari ini di mall", lalu direktori "Semua modul". Analitik eksplorasi ada di Analitik; jadwal lengkap ada di Jadwal event.',
            steps: [
              'Buka Pusat komando dari grup Ringkasan.',
              'Baca strip status: angka antrian yang menunggu keputusan memimpin; "Sedang berlangsung" dan "Akan datang" di bawahnya; "Total acara" dan "Selesai" sebagai baris rujukan.',
              'Buka register "Perlu tindakan": hanya modul yang menunggu keputusan manusia, masing-masing dengan jumlah antrian, keadaannya, dan aksinya.',
              'Lihat band "Hari ini di mall": event yang sedang berlangsung dan yang berikutnya; klik barisnya untuk detail.',
              'Telusuri register "Semua modul" (dikelompokkan per grup) bila perlu menuju modul lain; baris dengan titik penuh berarti modul itu punya antrian yang menunggu keputusan.',
              'Untuk jadwal lengkap dengan saringan dan pemilih tampilan, pakai "Buka Jadwal event"; untuk tren dan statistik, buka Analitik.',
            ],
            notes: [
              'Bila draf gagal dimuat, baris Antrian draf tampil tanpa angka dan dengan pesan galat yang menyebut sebabnya. Antrean yang tak terbaca tidak pernah ditampilkan sebagai kosong.',
              'Jumlah antrian hanya ditulis di strip status (total) dan di register "Perlu tindakan" (per modul). Baris direktori tidak membawa angka.',
            ],
          },
          {
            id: 'insight-cerdas',
            name: 'Insight cerdas',
            path: '/dashboard/insights',
            audience: 'Admin',
            summary:
              'Analisis otomatis dari data event dan modul lain: potensi bentrok jadwal, kelengkapan event terdekat, jeda kosong, lonjakan pendaftaran, tren rating tenant, dan antrian yang menunggu. Tiap insight membawa tombol tindak lanjut ke halaman yang tepat.',
            steps: [
              'Buka Insight cerdas dari grup Ringkasan.',
              'Baca daftar insight: tiap baris memuat tingkat kepentingan, judul, kalimat penjelas, dan angka pendukungnya bila ada.',
              'Saring menurut tingkat kepentingan lewat tombol berpenghitung (Semua, dan tingkat di bawahnya); angka di tombol menunjukkan berapa insight pada tingkat itu.',
              'Klik tombol tindak lanjut pada sebuah insight. Kamu berpindah ke halaman modulnya dengan filter yang sudah terpasang.',
              'Klik "Sembunyikan" pada insight yang tidak relevan; ia tersimpan sebagai tersembunyi di perangkat kamu.',
              'Klik "Tampilkan N yang disembunyikan" untuk mengembalikannya.',
              'Klik "Salin ringkasan" untuk menyalin teks siap tempel ke pesan atau rapat.',
            ],
            notes: [
              'Tombol tindak lanjut yang mengarah ke halaman yang tidak boleh kamu buka otomatis tidak ditampilkan.',
              'Blok "Ringkasan AI" bersifat opsional: bila tidak aktif atau gagal, blok itu hilang tanpa pesan galat dan daftar insight tetap utuh.',
              'Insight yang tingkatnya tersembunyi tetap bisa dipulihkan; jumlah yang disembunyikan selalu ditulis di tombolnya.',
            ],
          },
          {
            id: 'analitik',
            name: 'Analitik',
            path: '/dashboard/analytics',
            audience: 'Admin',
            summary:
              'Insight event dan venue: tren bulanan, perbandingan tahun ke tahun, kategori terpopuler, model event, top lokasi, dan jam tersibuk.',
            steps: [
              'Buka Analitik dari grup Ringkasan.',
              'Baca kartu ringkasan periode (total event, event per bulan, kategori aktif, lokasi dipakai).',
              'Telusuri grafik tren bulanan dan perbandingan tahun ke tahun.',
              'Baca breakdown kategori, model event, top lokasi, dan distribusi jam.',
            ],
            notes: ['Halaman ini murni membaca: tidak ada aksi yang mengubah data.'],
          },
          {
            id: 'hasil-evaluasi-tenant',
            name: 'Hasil evaluasi tenant',
            path: '/tenant-survey-results',
            audience: 'Admin',
            summary:
              'Agregat penilaian mandiri tenant dalam empat tab: Ringkasan, Daftar periksa, Bagikan, dan Detail. Ada panduan membaca hasil di dalamnya.',
            steps: [
              'Buka Hasil evaluasi tenant dari grup Ringkasan.',
              'Pilih event pada filter agar angka terhitung untuk event yang benar.',
              'Tab Ringkasan: baca KPI, sebaran kunjungan, penjualan, kategori, zona, Tenant teratas, dan tren.',
              'Tab Checklist: lihat tenant mana yang sudah dan belum mengisi.',
              'Tab Bagikan: salin tautan atau tampilkan QR untuk disebar ke tenant.',
              'Tab Detail: baca umpan balik dan tabel respons; klik "Ekspor PDF" bila berwenang.',
            ],
            notes: ['Ekspor PDF hanya aktif untuk akun dengan izin ekspor analitik tenant.'],
          },
        ],
      },
      {
        id: 'kelola-event',
        label: 'Kelola event',
        description: 'Jadwal, draf, tema, dan pameran.',
        features: [
          {
            id: 'jadwal-event',
            name: 'Jadwal event',
            path: '/dashboard/events',
            audience: 'Admin',
            summary:
              'Mengelola seluruh event dalam empat tampilan: Tabel, Kalender, Kanban, dan Timeline, lengkap dengan filter dan pencarian.',
            steps: [
              'Buka Jadwal event dari rail.',
              'Pilih tampilan lewat sakelar di kanan atas panel.',
              'Saring dengan kotak cari dan bilah filter: status, kategori, prioritas, dan bulan.',
              'Klik baris atau kartu untuk membuka Detail event.',
              'Klik "Tambah" untuk membuat event baru, atau ikon ubah/hapus pada baris.',
              'Klik "Unduh PDF" untuk mengekspor jadwal yang sedang tampil.',
            ],
            notes: [
              'Tampilan Kalender dan Kanban hanya tersedia untuk akun yang boleh mengubah event.',
              'Tampilan Kalender punya lima mode: Bulan, Minggu, Hari, Agenda, dan Linimasa, dengan navigasi periode dan panel hari yang bisa dibuka dari grid.',
            ],
          },
          {
            id: 'antrian-draft',
            name: 'Antrian draf',
            path: '/dashboard/drafts',
            audience: 'Admin',
            summary:
              'Draf adalah calon event sebelum resmi. Halaman ini mengelola antrean aktif, riwayat, progres, dan penerbitan draf menjadi event.',
            steps: [
              'Buka Antrian draf.',
              'Klik "Tambah draf event" atau ikon ubah pada baris untuk mengisi detail.',
              'Ubah progres: Draf, Konfirmasi, atau Batal.',
              'Setelah progres "Konfirmasi", klik "Terbitkan" untuk menjadikannya event.',
              'Buka panel Riwayat draf untuk melihat arsip dan memulihkan draf yang terhapus.',
              'Gunakan tautan WhatsApp untuk menindaklanjuti PIC.',
            ],
            notes: [
              'Tombol "Terbitkan" hanya aktif bila progres bernilai Konfirmasi.',
              'Pendaftaran yang disetujui tidak otomatis menjadi draf. Pembuatannya sengaja manual.',
            ],
          },
          {
            id: 'tema-tahunan',
            name: 'Tema tahunan',
            path: '/dashboard/themes',
            audience: 'Admin',
            summary:
              'Payung tema tahunan dengan rentang tanggal dan warna. Tema tampil sebagai timeline dan mengelompokkan album galeri.',
            steps: [
              'Buka Tema tahunan.',
              'Klik "Tambah tema".',
              'Isi Nama Tema, Tanggal Mulai, Tanggal Selesai, dan pilih Warna.',
              'Simpan.',
              'Untuk mengubah atau menghapus, pakai ikon pensil/hapus pada kartu tema.',
            ],
            notes: ['Tanggal selesai harus sama atau setelah tanggal mulai.'],
          },
          {
            id: 'pameran',
            name: 'Pameran dan aktivasi',
            path: '/dashboard/exhibitions',
            audience: 'Admin',
            summary:
              'Mengelola pameran Casual Leasing, menautkan event sebagai agenda aktivasi, dan meninjau pengajuan kolaborasi brand/EO.',
            steps: [
              'Buka Pameran dan aktivasi.',
              'Isi form "Pameran baru": nama, tema, lokasi, periode, PIC, brief, publikasi, dan opsi menerima pengajuan.',
              'Simpan, lalu klik "Kelola" pada daftar untuk membuka detail.',
              'Tautkan event dalam periode pameran lewat dropdown + "Tautkan"; lepas dengan "Lepas".',
              'Tinjau "Pengajuan kolaborasi" dengan mengubah statusnya: Menunggu, Dihubungi, Disetujui, atau Ditolak.',
            ],
            notes: ['Hanya event dalam rentang tanggal pameran yang bisa ditautkan.'],
          },
        ],
      },
      {
        id: 'interaksi',
        label: 'Interaksi',
        description: 'Pendaftaran, pengajuan tenant, dan survei dari publik.',
        features: [
          {
            id: 'pendaftaran',
            name: 'Pendaftaran',
            path: '/dashboard/registrations',
            audience: 'Admin',
            summary:
              'Antrean pendaftaran organisasi dari halaman publik: tinjau detail, ubah status, kirim WhatsApp, dan buat draf dari pendaftaran.',
            steps: [
              'Buka Pendaftaran.',
              'Saring dengan tab status (Semua, Menunggu, Ditinjau, Disetujui, Ditolak) dan filter tipe organisasi.',
              'Klik baris untuk membuka Detail pendaftaran.',
              'Isi Catatan Admin bila perlu.',
              'Klik "Tandai ditinjau", "Setujui", atau "Tolak".',
              'Pilih template WhatsApp lalu kirim, atau (bila disetujui) klik "Buat draf dari pendaftaran".',
            ],
            notes: [
              'Menyetujui pendaftaran tidak otomatis membuat draf atau event.',
              'Viewer hanya dapat melihat, tidak mengubah status.',
            ],
          },
          {
            id: 'survey-kepuasan',
            name: 'Survei kepuasan',
            path: '/dashboard/survey',
            audience: 'Admin',
            summary:
              'Mengelola survei kepuasan pengunjung dan penyelenggara per event: statistik, NPS, respons terbaru, aktif atau nonaktif, tautan, dan ekspor CSV.',
            steps: [
              'Buka Survei kepuasan.',
              'Baca kartu statistik, rata-rata rating, dan NPS.',
              'Pada bagian "Kelola survei per event", cari event yang dituju.',
              'Nyalakan atau matikan survei dengan tombol sakelar.',
              'Klik "Link" untuk menyalin URL form; klik "CSV" untuk mengunduh data.',
              'Saring respons terbaru menurut rentang tanggal bila perlu.',
            ],
            notes: ['Survei hanya masuk akal untuk event yang sedang atau sudah berlangsung.'],
          },
          {
            id: 'evaluasi-tenant',
            name: 'Evaluasi tenant',
            path: '/dashboard/tenant-surveys',
            audience: 'Admin',
            summary:
              'Mengelola penilaian mandiri tenant per event: daftar respons, detail, tinjauan, kelola tautan dan kode QR, ekspor CSV, dan tab Analitik.',
            steps: [
              'Buka Evaluasi tenant.',
              'Tab "Penilaian mandiri": saring status/event/kategori dan cari tenant.',
              'Klik baris untuk membuka Detail, lalu "Tinjauan" dengan catatan atau "Hapus".',
              'Buka bagian "Kelola penilaian mandiri per event" untuk menyalakan toggle, menyalin tautan, menampilkan QR, atau mengekspor CSV.',
              'Tab "Analitik": pilih event untuk melihat agregatnya.',
            ],
            notes: [
              'Secara bawaan survei tenant nonaktif; nyalakan dulu agar formulir publik terbuka.',
              'Menu ini disembunyikan untuk peran Tenant Relation.',
            ],
          },
          {
            id: 'kolaborasi-tenant-admin',
            name: 'Kolaborasi tenant',
            path: '/dashboard/tenant-proposals',
            audience: 'Admin',
            summary:
              'Antrean pengajuan event kerja sama dari tenant: tinjau isian, hubungi tenant, lalu Setujui atau Tolak. Menyetujui tidak membuat event baru.',
            steps: [
              'Buka Kolaborasi tenant dari grup Interaksi.',
              'Baca baris hitungan di kanan judul: berapa pengajuan yang menunggu tinjauan dari totalnya.',
              'Saring antrean lewat chip status: Semua, Menunggu, Dihubungi, Disetujui, atau Ditolak. Klik chip yang sedang aktif untuk kembali ke Semua.',
              'Tiap kartu menampilkan ringkasan dulu. Isinya identitas tenant, kunci status, judul dan jenis event, jadwal, area, pengunjung, kontak PIC (tautan telepon dan email), serta lampiran beserta tipe dan ukurannya.',
              'Klik "Lihat detail lengkap" untuk membuka deskripsi, kebutuhan fasilitas, dan ruang tinjauan; klik "Sembunyikan detail" untuk menutupnya lagi.',
              'Isi "Catatan internal" bila perlu, lalu klik status baru (Menunggu, Dihubungi, Disetujui, atau Ditolak).',
              'Menyetujui atau menolak lewat dialog konfirmasi; Dihubungi dan kembali ke Menunggu langsung tersimpan tanpa konfirmasi.',
              'Hapus pengajuan lewat ikon hapus pada kartu bila memang tidak diperlukan lagi.',
            ],
            notes: [
              'Kolom Catatan internal tidak pernah dibaca tenant; hanya untuk tim.',
              'Pengajuan yang disetujui tidak otomatis menjadi Draf atau Event; buat Draf secara manual bila sudah pasti dijadwalkan.',
              'Baris hitungan tetap menghitung seluruh pengajuan, bukan hasil saringan, karena angkanya menjawab "berapa pekerjaan yang tersisa".',
              'Bila gagal memuat, banner galat menyediakan tombol "Coba lagi".',
              'Akun Viewer dan Demo dapat membuka halaman ini untuk melihat; seluruh tombol yang mengubah data tidak dirender, dan server menolak aksinya.',
            ],
          },
          {
            id: 'partisipasi-tenant-admin',
            name: 'Partisipasi tenant',
            path: '/dashboard/tenant-participations',
            audience: 'Admin',
            summary:
              'Antrean pengajuan booth terbuka dan voucher tenant untuk event yang sudah terjadwal. Partisipasi yang disetujui tampil di halaman detail event publik.',
            steps: [
              'Buka Partisipasi tenant dari grup Interaksi.',
              'Baca baris hitungan di kanan judul: berapa pengajuan yang menunggu tinjauan dari totalnya.',
              'Saring antrean lewat chip status (Semua, Menunggu, Dihubungi, Disetujui, Ditolak). Ikon info di ujung baris chip menjelaskan arti tiap status.',
              'Tiap kartu menampilkan ringkasan. Isinya nama dan unit tenant, kategori, kode pengajuan, dan asal data tenant (ID gerai atau "diisi manual"). Ada juga status, judul event beserta pill jenis (Open booth, Voucher, atau Booth + voucher), baris area/booth/voucher, kontak PIC, dan tautan lampiran bila ada.',
              'Klik "Lihat detail lengkap" untuk membuka isian booth dan voucher, koreksi isian, catatan internal, dan tombol status.',
              'Bila isian tenant perlu diperbaiki, buka "Koreksi isian tenant". Hanya field yang kamu ubah yang dikirim ke server, jadi perubahan staf lain pada field berbeda tidak tertimpa. Status pengajuan juga tidak ikut berubah.',
              'Isi "Catatan internal" bila perlu, lalu klik status baru; menyetujui atau menolak lewat dialog konfirmasi.',
              'Hapus pengajuan lewat tombol Hapus pada kartu bila memang tidak diperlukan lagi.',
            ],
            notes: [
              'Disetujui berarti booth atau voucher tenant tampil di halaman detail event publik; tenant memantau statusnya sendiri lewat kode pengajuan dan nomor telepon.',
              'Partisipasi yang disetujui tidak membuat event baru; event tujuannya sudah terjadwal sebelumnya.',
              'Kebutuhan fasilitas dan skema booth bersifat internal dan tidak pernah tampil di halaman publik.',
              'Isi dropdown form publik diatur lewat tombol "Kelola opsi"; lihat fitur "Kelola opsi formulir partisipasi".',
              'Akun Viewer dan Demo dapat membuka halaman ini untuk melihat; tombol yang mengubah data tidak dirender dan server menolak aksinya.',
            ],
          },
          {
            id: 'kelola-opsi-partisipasi',
            name: 'Kelola opsi formulir partisipasi',
            path: '/dashboard/tenant-participations',
            audience: 'Admin',
            summary:
              'Mengatur pilihan dropdown yang tersedia di form partisipasi tenant: skema booth, ukuran booth, jenis voucher, dan format voucher.',
            steps: [
              'Buka Partisipasi tenant, lalu klik "Kelola opsi" di kanan judul.',
              'Telusuri daftar opsi per kelompok; tiap baris menampilkan label, slug, urutan, dan sakelar Aktif.',
              'Ubah label atau urutan tampil langsung di barisnya, lalu klik "Simpan" pada baris itu. Label dan urutan dikirim sebagai satu perubahan.',
              'Matikan atau nyalakan opsi dengan sakelar; opsi nonaktif tidak lagi muncul untuk pengajuan baru, tetapi pengajuan yang sudah masuk tidak berubah.',
              'Tambah opsi baru lewat bagian "Tambah opsi": isi Value (slug huruf kecil/angka/tanda hubung/garis bawah) dan Label tampil, lalu simpan.',
              'Hapus opsi lewat ikon hapus di barisnya, dengan dialog konfirmasi.',
            ],
            notes: [
              'Urutan tampil memakai angka lebih kecil lebih dulu; angka yang sama diurutkan menurut label.',
              'Nilai lama yang opsinya sudah dimatikan tetap tampil sebagai "(nonaktif)" atau "(tidak tersedia lagi)" di antrean dan halaman publik. Dengan begitu data lama tidak pernah tampil kosong.',
              'Tombol ini hanya untuk akun yang boleh mengubah data; akun baca-saja tetap melihat panduan "Kelola opsi" tetapi tidak tombolnya.',
            ],
          },
        ],
      },
      {
        id: 'sistem',
        label: 'Sistem',
        description: 'Pengguna dan jejak audit.',
        features: [
          {
            id: 'manajemen-pengguna',
            name: 'Manajemen pengguna',
            path: '/dashboard/users',
            audience: 'Superadmin',
            summary:
              'Mengelola akun dan peran: undang lewat email atau buat manual, ubah, serta aktif/nonaktifkan.',
            steps: [
              'Buka Manajemen pengguna.',
              'Klik "Invite" untuk mengirim undangan email, atau "Buat manual" untuk membuat dengan sandi.',
              'Isi email, nama tampilan, dan peran (sertakan nama organisasi bila peran EO Tenant).',
              'Kirim atau buat akun.',
              'Ubah pengguna lewat ikon pensil; aktif/nonaktifkan dengan toggle.',
            ],
            notes: [
              'Hanya superadmin yang dapat membuka halaman ini.',
              'Akun sendiri tidak bisa diubah perannya atau dinonaktifkan, untuk mencegah superadmin terakhir terkunci.',
            ],
          },
          {
            id: 'log-aktivitas',
            name: 'Log aktivitas',
            path: '/dashboard/activity-log',
            audience: 'Admin',
            summary:
              'Jejak audit semua aksi sistem (buat, ubah, hapus, login, logout, undang) dengan detail ringkas dan paginasi.',
            steps: [
              'Buka Log aktivitas.',
              'Saring menurut Aksi, Tipe resource, dan rentang tanggal.',
              'Klik "Atur ulang" untuk membersihkan filter.',
              'Berpindah halaman dengan tombol Sebelumnya dan Berikutnya.',
            ],
            notes: ['Filter tanggal mengikuti zona waktu Asia/Jakarta.'],
          },
        ],
      },
      {
        id: 'konten',
        label: 'Konten',
        description: 'Modul yang mengatur tampilan situs publik.',
        features: [
          {
            id: 'konten-landing',
            name: 'Halaman landing',
            path: '/dashboard/content/landing',
            audience: 'Admin',
            summary:
              'Mengatur gambar hero dan tiga URL post Instagram yang tampil di halaman landing publik.',
            steps: [
              'Buka Halaman landing.',
              'Unggah foto hero (JPG/PNG/WebP, maksimal 10MB), atau ganti/hapus foto yang ada.',
              'Isi hingga tiga URL Post Instagram (harus dari domain instagram.com).',
              'Klik "Sinkron dan simpan unggahan Instagram" untuk menyimpan gambar ke cache.',
              'Klik "Simpan".',
            ],
            notes: ['Unggahan berkas memerlukan penyimpanan objek yang sudah dikonfigurasi.'],
          },
          {
            id: 'konten-galeri',
            name: 'Galeri album',
            path: '/dashboard/content/galeri',
            audience: 'Admin',
            summary:
              'Mengelola album foto: buat/hapus album, unggah foto, tetapkan cover, dan tautkan ke event serta tema.',
            steps: [
              'Buka Galeri album.',
              'Buat album baru: isi nama, deskripsi, tanggal, event (opsional), lokasi, dan tema (opsional).',
              'Simpan.',
              'Buka detail album, lalu unggah foto dengan seret dan lepas (maksimal 20 foto, 10MB per foto).',
              'Tetapkan salah satu foto sebagai cover; hapus album bila perlu dengan konfirmasi.',
            ],
            notes: ['Bila cover belum ditetapkan, foto pertama otomatis dipakai sebagai cover.'],
          },
          {
            id: 'konten-foto-area',
            name: 'Foto area event',
            path: '/dashboard/content/foto-area',
            audience: 'Admin',
            summary:
              'Mengelola master area, yaitu lokasi kanonis, beserta foto representatif. Panel Pemetaan lokasi dipakai untuk merapikan teks lokasi lama.',
            steps: [
              'Buka Foto area event.',
              'Klik "Tambah area baru", isi Nama Area (wajib) dan Deskripsi, lalu klik "Buat area".',
              'Ubah urutan dengan panah naik/turun, sembunyikan/tampilkan dengan ikon mata, atau ubah lewat ikon pensil.',
              'Klik kartu area untuk membuka detail dan mengunggah foto area.',
              'Buka panel "Pemetaan lokasi" untuk memetakan teks lokasi lama ke area kanonis, lalu klik "Terapkan pemetaan".',
            ],
            notes: [
              'Pemetaan hanya mengisi event yang belum punya area; pemetaan manual sebelumnya tidak ditimpa.',
              'Centang "Seragamkan teks lokasi" bila ejaan lama juga ingin diganti.',
            ],
          },
          {
            id: 'konten-surat',
            name: 'Buat surat',
            path: '/dashboard/content/surat',
            audience: 'Admin',
            summary:
              'Workspace surat lokal-first: buka langsung siap isi, opsional isi dari event, terbitkan ke server, lalu bagikan tautan publik.',
            steps: [
              'Buka Buat surat dari grup Konten. Workspace langsung terbuka pada pasangan SKE/SIK yang siap diisi.',
              'Isi dari event (opsional): pilih event agar nomor, tanggal, dan data penerima terisi otomatis.',
              'Klik "Terbitkan" untuk menulis surat ke server beserta snapshot PDF-nya.',
              'Klik "Bagikan" untuk menyalin tautan publik surat yang sudah terbit.',
            ],
            notes: [
              'Riwayat surat tersimpan lokal di peramban; ada ekspor/impor backup JSON.',
              'Nomor surat disarankan otomatis dan tetap bisa diubah manual.',
              'Surat yang sudah terbit tetap bisa dibuka lewat tautan publiknya.',
            ],
          },
          {
            id: 'konten-berita',
            name: 'Berita',
            path: '/dashboard/content/berita',
            audience: 'Admin',
            summary:
              'Menulis artikel berita: judul, ringkasan, isi, penulis, dan cover. Sekaligus mengatur status terbit atau draf.',
            steps: [
              'Buka Berita.',
              'Klik "Buat artikel baru".',
              'Isi Judul (wajib), Ringkasan, Isi, dan Penulis.',
              'Unggah cover bila ada.',
              'Simpan, lalu ubah status Terbit/Draf dari daftar; hapus dengan konfirmasi bila perlu.',
            ],
            notes: ['Judul wajib diisi; ukuran cover maksimal 10MB.'],
          },
          {
            id: 'konten-sponsorship',
            name: 'Sponsorship',
            path: '/dashboard/content/sponsorship',
            audience: 'Admin',
            summary:
              'Mengunggah satu berkas proposal per event dan mengelola status minat support yang masuk dari halaman publik.',
            steps: [
              'Buka Sponsorship.',
              'Tab "Proposal event": klik Upload/Ganti untuk melampirkan proposal (PDF, gambar, atau DOCX, maksimal 20MB) per event.',
              'Tab "Minat dukungan": lihat lead yang masuk dari halaman /sponsor.',
              'Ubah status lead: Menunggu, Dihubungi, Sepakat, atau Menolak; hapus bila perlu.',
            ],
            notes: ['Lead muncul setelah pengunjung mengirim form Minat dukungan di halaman /sponsor.'],
          },
        ],
      },
    ],
  },
  {
    id: 'publik',
    label: 'Halaman publik',
    intro:
      'Permukaan tanpa login untuk pengunjung, komunitas, brand, dan tenant. Tidak ada satu pun halaman di bagian ini yang meminta akun. Semuanya bisa dibuka langsung dari beranda, tautan WhatsApp, atau kode QR.',
    groups: [
      {
        id: 'jelajah',
        label: 'Jelajahi dan jadwal',
        description: 'Halaman untuk melihat acara dan dokumentasinya.',
        features: [
          {
            id: 'beranda',
            name: 'Beranda komunitas',
            path: '/',
            audience: 'Publik',
            summary:
              'Halaman kampanye utama untuk komunitas. Halaman ini menawarkan tempat dan fasilitas gratis, membuktikannya lewat event dan galeri, lalu mengarahkan ke pendaftaran.',
            steps: [
              'Buka /.',
              'Gunakan navigasi utama: Event dan Program (Keuntungan, Area dan fasilitas, Cara Daftar, FAQ). Ada juga Jelajahi (Galeri, Berita, Tenant, Kolaborasi tenant, Booth dan voucher tenant, Pameran, Sponsor, Dokumentasi) dan Kontak.',
              'Baca bagian agenda untuk event bulan ini, lalu klik kartu untuk membuka detailnya.',
              'Lihat daftar fasilitas yang disediakan (panggung, sound system 10K watt, lighting, 50 kursi, area lantai 3, meja juri).',
              'Klik kartu area pada bagian "Area di Metropolitan Mall Bekasi" untuk melihat fotonya.',
              'Baca 4 langkah kerja sama dan 6 pertanyaan yang sering diajukan.',
              'Gulir ke bagian pendaftaran dan isi formnya, atau klik "Ajukan event" untuk mengajukan lewat halaman khusus.',
            ],
            notes: [
              'Agenda di beranda menampilkan maksimal 3 event pada bulan berjalan; event yang sedang berlangsung selalu ikut tampil.',
              'Tombol "Daftar event" dan "Cek event" mengarah ke pendaftaran dan jadwal lengkap.',
            ],
          },
          {
            id: 'jadwal-event-publik',
            name: 'Jadwal event',
            path: '/events',
            audience: 'Publik',
            summary:
              'Acara yang belum selesai dalam kartu sorotan, rail per area, dan kalender bulanan. Filter dan pencarian bisa dibagikan lewat URL.',
            steps: [
              'Buka /events.',
              'Lihat kartu sorotan beserta hitungan waktu (hari, jam, menit, detik) menuju acara.',
              'Klik chip waktu ("Hari ini", "Besok", atau "Akhir pekan ini") untuk menyaring.',
              'Ketik di kotak cari untuk menyaring nama acara, lokasi, atau keterangan (tersimpan sebagai ?q= dan ikut menyaring kalender).',
              'Klik kartu event untuk membuka detailnya, atau lihat "Jadwal lengkap" di kalender bulanan.',
              'Klik "Unduh PDF" untuk mengunduh jadwal, atau "Ajukan event" untuk mengajukan acara kamu sendiri.',
            ],
            notes: [
              'Filter tersimpan di alamat halaman (mis. ?waktu=hari-ini atau ?q=bazar), jadi bisa disalin dan dibagikan. Mengubah filter tidak menambah riwayat tombol Back.',
              'Filter dan pencarian menyaring daftar sorotan sekaligus kalender dan agenda bulanan.',
              'Halaman hanya menampilkan acara yang belum selesai. Acara berstatus selesai tidak pernah muncul di kartu, kalender, rekap bulanan, maupun ekspor PDF.',
              'Event berstatus draf tidak pernah ikut tampil.',
            ],
          },
          {
            id: 'detail-event',
            name: 'Detail event',
            path: '/events/:id',
            audience: 'Publik',
            summary:
              'Halaman detail event yang bisa dibagikan. Isinya info lengkap, galeri foto, tombol kalender, section "Tenant di event ini", dan ajakan mengisi survei untuk event yang sudah lewat.',
            steps: [
              'Buka tautan /events/:id.',
              'Baca informasi: tanggal, waktu, lokasi, penyelenggara, dan keterangan.',
              'Klik "Bagikan lewat WhatsApp" untuk mengirim ke orang lain, atau "Salin tautan" (tombol berubah menjadi "Tautan tersalin").',
              'Untuk acara yang belum lewat, klik "Google Calendar" atau "Unduh .ics" untuk menyimpan tanggalnya.',
              'Lihat galeri foto acara bila ada.',
              'Bila ada tenant yang berpartisipasi, baca section "Tenant di event ini": booth dan voucher yang sudah disetujui beserta ketentuannya.',
              'Untuk event yang sudah lewat, klik "Isi survei kepuasan" untuk memberi penilaian.',
            ],
            notes: [
              'Tombol kalender disembunyikan untuk event yang sudah lewat; sebaliknya, ajakan survei hanya muncul untuk event yang sudah lewat.',
              'Event berstatus draf tidak pernah tampil di halaman publik.',
              'Section "Tenant di event ini" hanya memuat partisipasi yang sudah disetujui tim; kebutuhan fasilitas dan skema booth bersifat internal dan tidak ikut tampil.',
              'Tenant yang ingin ikut memeriahkan event bisa menekan CTA "Punya tenant di Metropolitan Mall?" di section itu; event tujuannya langsung terpilih di form.',
            ],
          },
          {
            id: 'galeri-publik',
            name: 'Galeri event',
            path: '/gallery',
            audience: 'Publik',
            summary:
              'Album foto event yang dikelompokkan per Tema tahunan, dengan opsi mengekspor album ke PDF.',
            steps: [
              'Buka /gallery.',
              'Telusuri album berdasarkan tema tahunan; album di luar tema masuk ke grup "Lainnya".',
              'Klik album untuk membuka detailnya.',
              'Klik "Ekspor PDF" → pilih mode "Berdasarkan tanggal" atau "Berdasarkan tema" → "Pratinjau PDF" → "Unduh PDF".',
            ],
            notes: [
              'Ekspor selalu dua langkah: lihat pratinjau dulu, baru unduh.',
              'Tombol "Ekspor PDF" hanya muncul bila sudah ada album.',
            ],
          },
          {
            id: 'detail-album',
            name: 'Detail album',
            path: '/gallery/:slug',
            audience: 'Publik',
            summary:
              'Grid foto satu album dengan penampil besar (lightbox) yang bisa dinavigasi dengan keyboard.',
            steps: [
              'Buka album dari /gallery.',
              'Klik sebuah foto untuk membukanya di lightbox.',
              'Gunakan tombol sebelumnya/berikutnya atau tombol panah kiri/kanan pada keyboard.',
              'Tekan Escape untuk menutup; klik area gelap juga menutup.',
            ],
            notes: [
              'Lightbox menahan fokus keyboard di dalamnya selama terbuka, dan mengunci gulir halaman.',
              'Tombol sebelumnya/berikutnya muncul bila album berisi lebih dari satu foto.',
            ],
          },
          {
            id: 'berita-publik',
            name: 'Berita',
            path: '/news',
            audience: 'Publik',
            summary: 'Daftar artikel berita dan halaman baca artikel lengkap.',
            steps: [
              'Buka /news.',
              'Klik kartu artikel untuk membaca.',
              'Klik "Kembali ke berita" untuk kembali ke daftar.',
            ],
            notes: [
              'Hanya artikel berstatus terbit yang tampil.',
              'Isi artikel ditampilkan apa adanya, jadi perpindahan baris dari penulis tetap terjaga.',
            ],
          },
        ],
      },
      {
        id: 'mitra',
        label: 'Mitra dan direktori',
        description: 'Peluang kerja sama dan informasi venue.',
        features: [
          {
            id: 'sponsor-publik',
            name: 'Sponsorship',
            path: '/sponsor',
            audience: 'Publik',
            summary:
              'Menampilkan event yang punya proposal sponsor dan menerima pernyataan minat support dari brand atau tenant.',
            steps: [
              'Buka /sponsor.',
              'Lihat kartu event, lalu klik "Lihat proposal" untuk membuka berkasnya di tab baru.',
              'Klik "Saya tertarik dukungan": form di bawah akan terisi otomatis dengan event tersebut.',
              'Lengkapi form: Pilih Event, Nama Brand/Perusahaan, Nama PIC, dan Nomor WhatsApp (wajib); Email dan Pesan opsional.',
              'Klik "Kirim minat dukungan", lalu lihat konfirmasi "Minat dukungan terkirim!".',
              'Untuk event lain, klik "Kirim minat dukungan lain" untuk mengosongkan form.',
            ],
            notes: [
              'Form hanya muncul bila ada event dengan proposal sponsor; bila belum ada, halaman hanya menampilkan keterangan kosong.',
              'Nama brand/perusahaan dibatasi 200 karakter; nomor WhatsApp dan email divalidasi sebelum dikirim.',
              'Tim akan menghubungi kamu dalam 5 hari kerja.',
            ],
          },
          {
            id: 'pameran-publik',
            name: 'Pameran dan kolaborasi',
            path: '/pameran',
            audience: 'Publik',
            summary:
              'Daftar pameran yang sedang dibuka beserta detailnya: tema, periode, lokasi, brief, dan agenda aktivasi. Di sana ada form pengajuan kolaborasi.',
            steps: [
              'Buka /pameran.',
              'Klik "Ajukan kolaborasi" (bila pameran menerima pengajuan) atau "Lihat detail".',
              'Di halaman detail, baca bagian "Yang kami cari" dan "Agenda aktivasi".',
              'Isi form "Ajukan kolaborasi": Nama brand/EO, Jenis organisasi, Bentuk kontribusi, Nama PIC, Nomor WhatsApp, Email, dan Konsep kontribusi.',
              'Klik "Kirim pengajuan" dan lihat konfirmasi bahwa pengajuan diterima untuk ditinjau.',
            ],
            notes: [
              'Yang wajib: nama brand/EO (minimal 3 karakter), nama PIC (minimal 3 karakter), dan nomor WhatsApp.',
              'Konsep kontribusi wajib minimal 10 karakter bila bentuk kontribusinya bukan sekadar booth.',
              'Bila pameran tidak menerima pengajuan, form diganti pesan penutupan.',
              'Pengajuan belum berarti dikonfirmasi; tim akan menghubungi kamu.',
            ],
          },
          {
            id: 'tenant-directory',
            name: 'Direktori tenant',
            path: '/tenants',
            audience: 'Publik',
            summary:
              'Daftar tenant dengan pencarian dan filter kategori, beserta statistik jumlah tenant dan kategori.',
            steps: [
              'Buka /tenants.',
              'Ketik di kotak cari untuk menyaring berdasarkan nama, kategori, atau lantai.',
              'Klik pill kategori untuk memfilter (tombol "Semua" mengembalikan seluruh daftar).',
              'Lihat kartu tenant: logo, kategori, dan lantai/lot.',
            ],
            notes: [
              'Pencarian dan filter di halaman ini tidak tersimpan di alamat halaman, jadi tidak bisa dibagikan lewat URL.',
              'Logo tenant yang gagal dimuat otomatis diganti ikon.',
            ],
          },
          {
            id: 'komunitas-directory',
            name: 'Direktori komunitas',
            path: '/community',
            audience: 'Publik',
            summary:
              'Organisasi dan komunitas yang pernah mengadakan acara, dikelompokkan per tipe dengan statistik acara.',
            steps: [
              'Buka /community.',
              'Baca statistik: jumlah Organisasi, Total acara, dan Acara Mendatang.',
              'Cari nama komunitas atau EO di kotak pencarian.',
              'Filter lewat pill tipe organisasi, yang menampilkan jumlah per tipe.',
              'Klik tautan "Profil Instagram" pada kartu bila tersedia.',
            ],
            notes: [
              'Pencarian mencocokkan nama organisasi dan tipe, bukan deskripsi.',
              'Organisasi diurutkan berdasarkan jumlah acara, lalu nama, dan dikelompokkan per tipe.',
            ],
          },
        ],
      },
      {
        id: 'partisipasi',
        label: 'Partisipasi',
        description: 'Formulir pendaftaran, pengajuan, dan survei.',
        features: [
          {
            id: 'daftar',
            name: 'Pendaftaran organisasi',
            path: '/daftar',
            audience: 'Publik',
            summary:
              'Halaman pendaftaran mandiri untuk EO, sekolah, kampus, perusahaan, komunitas, atau instansi. Cocok dibagikan lewat bio, WhatsApp, atau QR.',
            steps: [
              'Buka /daftar.',
              'Langkah 1: pilih tipe organisasi dari 8 pilihan: Komunitas, Sekolah/Universitas, Perusahaan, Event Organizer, Organisasi Kampus, Instansi Pemerintah, NGO/Yayasan, atau Lainnya.',
              'Setelah tipe dipilih, form lengkap muncul; isi bidang khusus sesuai tipe (mis. Tipe Komunitas untuk komunitas, Jenjang Pendidikan untuk sekolah).',
              'Isi Nama Komunitas/Organisasi (minimal 3 karakter), Nama PIC, dan Nomor WhatsApp (wajib); Email, Instagram, Preferensi tanggal, dan Deskripsi opsional.',
              'Lampirkan proposal atau company profile (PDF/Word, maksimal 20MB) bila ada.',
              'Klik "Kirim pendaftaran" dan lihat konfirmasi "Pendaftaran terkirim!".',
            ],
            notes: [
              'Yang wajib: tipe organisasi, nama organisasi, nama PIC, dan nomor WhatsApp.',
              'Lampiran harus berformat PDF atau Word (doc/docx) dan tidak melebihi 20MB; berkas diunggah sebelum pendaftaran dikirim.',
              'Preferensi tanggal tidak bisa diisi dengan tanggal yang sudah lewat.',
              'Pendaftaran masuk ke antrian Pendaftaran di dashboard admin, dan tidak otomatis menjadi event.',
            ],
          },
          {
            id: 'ajukan-event',
            name: 'Pengajuan event',
            path: '/ajukan-event',
            audience: 'Publik',
            summary:
              'Form pengajuan event untuk EO dan komunitas. Kiriman masuk ke antrian Draf dashboard tanpa perlu login.',
            steps: [
              'Buka /ajukan-event.',
              'Isi Nama Acara (maksimal 120 karakter) dan Tanggal Mulai (wajib).',
              'Lengkapi Tanggal Selesai, Jam, Lokasi, Kategori, dan Keterangan bila perlu.',
              'Isi Nama Organisasi/EO, Nama PIC, dan No. HP/WhatsApp (wajib).',
              'Klik "Kirim pengajuan" dan lihat konfirmasi "Pengajuan terkirim!".',
            ],
            notes: [
              'Tanggal Selesai tidak boleh lebih awal dari Tanggal Mulai.',
              'Form dilengkapi penyaring anti-spam otomatis (honeypot), jadi tidak perlu diisi manual.',
              'Pengajuan tidak langsung menjadi event; admin meninjaunya dulu di Antrian draf.',
            ],
          },
          {
            id: 'kolaborasi-tenant',
            name: 'Kolaborasi tenant',
            path: '/kolaborasi-tenant',
            audience: 'Tenant',
            summary:
              'Halaman pengajuan event kerja sama untuk tenant Metropolitan Mall Bekasi, dengan lampiran proposal opsional.',
            steps: [
              'Buka /kolaborasi-tenant.',
              'Bagian Data Tenant: cari Nama Tenant dari daftar master mall (wajib); nomor unit dan kategori terisi otomatis. Bila tenant kamu belum terdaftar, klik "Tenant saya belum ada di daftar" untuk mengisi manual.',
              'Bagian PIC: isi Nama PIC dan Nomor WhatsApp (wajib), lengkapi Email bila perlu.',
              'Bagian Rencana Event: isi Judul Event, Jenis Kegiatan, Deskripsi Kegiatan (wajib), serta Tanggal Mulai (wajib).',
              'Isi Tanggal Selesai bila kegiatan lebih dari sehari, Area yang diinginkan, Perkiraan Pengunjung, dan Kebutuhan Fasilitas.',
              'Lampirkan proposal (PDF/Word, atau gambar PNG/JPEG, maksimal 20MB) bila konsepnya sudah tertulis.',
              'Klik "Kirim pengajuan" dan lihat konfirmasi bahwa pengajuan masuk antrean tinjauan.',
            ],
            notes: [
              'Yang wajib: nama tenant, nama PIC, nomor WhatsApp, judul event, deskripsi (minimal 10 karakter), dan tanggal mulai.',
              'Memilih tenant dari daftar master mall membuat pengajuan bisa ditelusuri ke data gerai yang benar; pengajuan yang diisi manual ditandai "diisi manual" di antrean dashboard.',
              'Tanggal mulai tidak boleh di masa lalu; tanggal selesai tidak boleh sebelum tanggal mulai dan boleh dikosongkan untuk kegiatan sehari.',
              'Ajukan minimal dua pekan sebelum tanggal rencana agar penjadwalan dan perizinan sempat diproses.',
              'Pengajuan ditinjau lewat modul Kolaborasi tenant di dashboard; menyetujui pengajuan tidak otomatis membuat event.',
            ],
          },
          {
            id: 'partisipasi-tenant',
            name: 'Booth dan voucher tenant',
            path: '/partisipasi-tenant',
            audience: 'Tenant',
            summary:
              'Halaman pengajuan partisipasi tenant pada event yang sudah terjadwal: booth terbuka, voucher untuk pengunjung, atau keduanya, dengan pemantauan status lewat kode pengajuan.',
            steps: [
              'Buka /partisipasi-tenant, atau klik "Punya tenant di Metropolitan Mall?" pada halaman detail event (event tujuan langsung terpilih).',
              'Bagian Event Tujuan: pilih event yang belum berjalan dari daftar.',
              'Bagian Jenis Partisipasi: pilih Open booth, Voucher, atau Keduanya.',
              'Bagian Data Tenant: pilih tenant dari daftar master, atau klik "Tenant saya belum ada di daftar" untuk mengisi manual.',
              'Bagian PIC: isi Nama PIC dan Nomor WhatsApp (wajib); nomor ini juga dipakai untuk memeriksa status.',
              'Bila memilih booth: isi Area, Mulai Booth, dan Produk atau Jasa (wajib), lengkapi ukuran, skema, dan kebutuhan fasilitas bila perlu.',
              'Bila memilih voucher: isi Ketentuan Voucher (wajib), pilih jenis dan format, serta kuota bila dibatasi.',
              'Klik "Kirim pengajuan", lalu salin kode pengajuan (format TPR-XXXXXX) yang muncul.',
              'Pantau statusnya di panel "Cek status pengajuan" dengan kode dan nomor telepon yang sama.',
            ],
            notes: [
              'Pengajuan hanya terbuka untuk event yang belum mulai, dan ditutup paling lambat H-1 sebelum event berjalan.',
              'Setelah event dipilih, Area booth dan Selesai Booth terisi otomatis dari lokasi dan tanggal event; sesuaikan bila perlu.',
              'Pilihan pada dropdown (ukuran booth, skema, jenis dan format voucher) diatur tim mall; bila ada opsi yang kamu butuhkan tidak ada, hubungi tim mall.',
              'Kode pengajuan ditampilkan sekali setelah kirim; simpan atau salin sebelum meninggalkan halaman.',
              'Partisipasi yang disetujui tampil di halaman detail event publik (booth dan voucher beserta ketentuannya).',
              'Menyetujui partisipasi tidak membuat event baru; event tujuannya sudah terjadwal sebelumnya.',
            ],
          },
          {
            id: 'survey-publik',
            name: 'Survei kepuasan',
            path: '/survey/:eventId',
            audience: 'Publik',
            summary:
              'Form kepuasan pengunjung dan penyelenggara: penilaian pengelola mall dan penyelenggara event, dengan pencegahan pengisian ganda.',
            steps: [
              'Buka tautan survei yang dibagikan (tautan bisa memuat ?type=penyelenggara atau ?type=public untuk memilih peran lebih dulu).',
              'Pilih peran: "Penyelenggara event" (saya EO/panitia) atau "Peserta dan pengunjung".',
              'Beri penilaian 1–10 untuk 4 aspek pengelola tempat: Kebersihan dan fasilitas, Pelayanan staf, Koordinasi dan komunikasi, dan Keamanan.',
              'Bila mengisi sebagai peserta, beri juga penilaian untuk 5 aspek penyelenggara: Kualitas acara, Organisasi dan kelancaran, Pelayanan panitia, Kesesuaian promosi, dan Rekomendasi.',
              'Isi komentar dan data diri bila berkenan (keduanya opsional).',
              'Klik "Kirim survei" dan lihat halaman terima kasih.',
            ],
            notes: [
              'Semua aspek penilaian wajib diisi sebelum tombol kirim aktif.',
              'Satu perangkat hanya dapat mengisi sekali untuk setiap event.',
              'Data diri bersifat opsional; identitas boleh dikosongkan.',
            ],
          },
          {
            id: 'evaluasi-tenant-publik',
            name: 'Evaluasi tenant',
            path: '/tenant-survey',
            audience: 'Tenant',
            summary:
              'Tenant memilih event yang diikuti, lalu mengisi penilaian mandiri anonim tentang kunjungan, penjualan, dan umpan balik.',
            steps: [
              'Buka /tenant-survei.',
              'Cari event berdasarkan nama, lokasi, atau penyelenggara (minimal 2 huruf), lalu klik baris event.',
              'Bagian 1 (Informasi tenant): pilih Nama Tenant dari daftar (lokasi dan kategori terisi otomatis), lengkapi PIC bila perlu.',
              'Bagian 2 (Evaluasi kunjungan dan penjualan): pilih kenaikan kunjungan pengunjung dan kenaikan penjualan.',
              'Bagian 3 (Umpan balik): tulis kesan atau saran kamu (opsional).',
              'Klik "Kirim survei" dan lihat konfirmasi "Survei terkirim!".',
            ],
            notes: [
              'Nama tenant harus dipilih dari daftar, bukan diketik bebas.',
              'Lima field wajib: nama tenant, zona, kategori, kenaikan kunjungan, dan kenaikan penjualan.',
              'Satu perangkat hanya dapat mengisi sekali untuk setiap event.',
              'Bila daftar kosong, berarti admin belum menyalakan survei untuk event mana pun.',
            ],
          },
        ],
      },
      {
        id: 'lainnya',
        label: 'Lainnya',
        description: 'Dokumen yang dibagikan dan halaman galat.',
        features: [
          {
            id: 'viewer-surat',
            name: 'Viewer surat',
            path: '/letter/:id',
            audience: 'Publik',
            summary:
              'Menampilkan surat konfirmasi event secara langsung di peramban, dengan tombol unduh.',
            steps: [
              'Buka tautan surat yang dibagikan.',
              'Lihat dokumen surat secara langsung di dalam halaman.',
              'Klik "Unduh PDF" untuk menyimpannya ke perangkat.',
            ],
            notes: [
              'Hanya surat berstatus aktif yang bisa dibuka lewat tautan ini.',
              'Unduhan membuat ulang berkas PDF dari data surat, jadi selalu sesuai isi terbaru.',
            ],
          },
          {
            id: 'halaman-404',
            name: 'Halaman tidak ditemukan',
            audience: 'Publik',
            summary: 'Muncul untuk alamat yang tidak dikenal, agar tidak ada halaman kosong.',
            steps: ['Buka alamat yang tidak dikenal.', 'Klik "Kembali ke beranda" untuk lanjut menjelajah.'],
          },
        ],
      },
    ],
  },
  {
    id: 'lintas',
    label: 'Fitur lintas halaman',
    intro:
      'Kemampuan yang muncul di banyak halaman sekaligus, bukan satu rute tersendiri, dari tombol tema sampai berbagi tautan.',
    groups: [
      {
        id: 'lintas-publik',
        label: 'Untuk semua pengunjung',
        description: 'Hal yang bisa dipakai siapa saja di hampir setiap halaman publik.',
        features: [
          {
            id: 'mode-tema-publik',
            name: 'Mode terang dan gelap',
            audience: 'Publik',
            summary:
              'Hampir setiap halaman publik punya tombol tema di kanan atas (ikon bulan/matahari).',
            steps: [
              'Cari tombol bulan atau matahari di sudut kanan atas halaman.',
              'Klik untuk berganti antara mode terang dan gelap.',
              'Preferensi tersimpan di perangkat dan dipakai lagi pada kunjungan berikutnya.',
            ],
          },
          {
            id: 'bagikan-tautan',
            name: 'Berbagi tautan',
            audience: 'Publik',
            summary:
              'Detail event bisa dibagikan lewat WhatsApp atau disalin tautannya; sebagian filter juga bisa dibagikan lewat URL.',
            steps: [
              'Di halaman detail event, klik "Bagikan lewat WhatsApp" untuk membuka WhatsApp dengan pesan terisi.',
              'Atau klik "Salin tautan"; tombol berubah menjadi "Tautan tersalin" sebagai tanda berhasil.',
              'Di /events, filter yang sedang aktif ikut tersimpan di alamat halaman, jadi tautannya bisa disalin dan dibagikan.',
            ],
          },
          {
            id: 'ekspor-pdf-publik',
            name: 'Ekspor PDF',
            audience: 'Publik',
            summary:
              'Tiga permukaan bisa menghasilkan PDF: jadwal event, album galeri, dan hasil evaluasi tenant. Sebelum berkas dibuat, kamu memilih dulu bagian dokumen dan cakupan itemnya.',
            steps: [
              'Jadwal event: klik "Unduh PDF" di /events. Pilih periode (Semua / Hari ini / Minggu ini / Bulan / Tahun / Tema / Rentang khusus), lalu centang event yang ingin diekspor.',
              'Filter dan pencarian yang sedang aktif di /events (?waktu= atau ?q=) ikut menyaring ekspor, jadi yang masuk dokumen hanya acara yang tampil di daftar.',
              'Acara yang sudah selesai tidak ikut ekspor karena halaman tidak menampilkannya.',
              'Bila halaman sedang difilter, dialog menampilkan sakelar "Abaikan filter halaman". Nyalakan untuk menawarkan seluruh acara; mis. saat halaman difilter "Hari ini" tetapi kamu ingin rekap satu tema penuh.',
              'Jadwal event (dashboard): tombol "Unduh PDF" yang sama ada di tampilan Jadwal event; daftar draf tidak pernah ikut karena draf selalu dibuang dari dokumen.',
              'Album galeri: klik "Ekspor PDF" di /gallery, pilih periode dan album (mode "Berdasarkan tema" menyaring album per tema lebih dulu). Lalu klik "Pratinjau PDF" dan "Unduh PDF".',
              'Hasil evaluasi tenant: klik "Ekspor PDF" di /tenant-survei-results bila akun kamu berwenang; halaman ini sudah punya filter per event sendiri.',
              'Pada tiap dialog, tentukan bagian dokumen yang disertakan (mis. Ringkasan, Tabel Jadwal). Bagian bertanda "Selalu disertakan" tidak bisa dimatikan.',
            ],
            notes: [
              'Ekspor album galeri selalu dua langkah: pratinjau dulu, baru unduh.',
              'Pilihan event disimpan per periode: ganti periode berarti semua event pada periode itu terpilih, dan kembali ke periode sebelumnya memulihkan centang kamu.',
              'Daftar Bulan dan Tahun hanya memuat periode yang ada datanya.',
              'Preset tema menyaring event menurut rentang tanggal tema, bukan kolom tema, karena tabel event tidak menyimpan tema. Cara ini sama dengan pemasangan album ke tema di /gallery.',
              'Preset tema hanya muncul bila ada tema tahunan yang sudah dibuat.',
              'Event multi-hari disaring lewat rentang, bukan tanggal mulai; event 31 Agustus sampai 2 September tetap ikut ekspor bulan September.',
              'Tombol unduh mati bila tidak ada item atau bagian yang dipilih.',
            ],
          },
          {
            id: 'pengisian-ganda',
            name: 'Pencegahan pengisian ganda',
            audience: 'Publik',
            summary:
              'Survei kepuasan dan evaluasi tenant membatasi satu pengisian per perangkat untuk setiap event.',
            steps: [
              'Isi survei seperti biasa dan kirim.',
              'Bila mencoba mengisi lagi di perangkat yang sama, muncul pesan "Kamu sudah mengisi survei".',
              'Hubungi tim mall bila kamu perlu memperbaiki data yang sudah dikirim.',
            ],
            notes: [
              'Pembatasan memakai penanda perangkat, jadi mengisi dari perangkat berbeda tetap dimungkinkan.',
              'Survei tenant hanya terbuka untuk event yang sudah diaktifkan admin.',
            ],
          },
        ],
      },
      {
        id: 'lintas-halaman',
        label: 'Kemampuan admin',
        description: 'Ekspor, QR, dan hal yang dipakai berulang oleh pengelola.',
        features: [
          {
            id: 'export-csv',
            name: 'Ekspor CSV',
            audience: 'Admin',
            summary: 'Data mentah survei dan evaluasi tenant dapat diunduh sebagai CSV per event.',
            steps: [
              'Buka Survei kepuasan atau Evaluasi tenant.',
              'Cari event yang dituju pada daftar kelola per event.',
              'Klik "CSV" untuk mengunduh datanya.',
            ],
            notes: ['Ekspor CSV memerlukan sesi login.'],
          },
          {
            id: 'qr-code',
            name: 'Kode QR',
            audience: 'Admin',
            summary:
              'QR dibuat otomatis untuk survei dan evaluasi tenant, bisa diunduh sebagai PNG atau disalin tautannya.',
            steps: [
              'Buka panel kelola survei atau evaluasi tenant, atau detail event.',
              'Klik aksi QR pada event yang dituju.',
              'Unduh PNG untuk dicetak, atau salin tautannya untuk dibagikan.',
            ],
          },
          {
            id: 'whatsapp-template',
            name: 'Template WhatsApp',
            audience: 'Admin',
            summary:
              'Pesan siap kirim untuk menindaklanjuti pendaftar dan draf, agar komunikasi konsisten.',
            steps: [
              'Buka Detail pendaftaran atau tabel Antrian draf.',
              'Pilih template pesan (Ditinjau, Disetujui, Ditolak, atau Kustom).',
              'Klik "Kirim via WhatsApp": aplikasi WhatsApp terbuka dengan pesan terisi.',
            ],
          },
          {
            id: 'event-multihari',
            name: 'Event multi-hari dan berulang',
            audience: 'Admin',
            summary:
              'Event bisa berlangsung beberapa hari dengan jam berbeda tiap hari, atau berulang mengikuti pola mingguan/bulanan.',
            steps: [
              'Saat membuat atau mengubah event, aktifkan opsi multi-hari.',
              'Isi jam untuk setiap tanggal bila jamnya berbeda.',
              'Untuk event berulang, pilih pola pengulangan dan tanggal akhirnya.',
              'Saat menghapus, pilih antara menghapus satu kejadian saja atau seluruh rangkaian.',
            ],
            notes: ['Kalender menampilkan event multi-hari sebagai rentang, bukan satu titik.'],
          },
          {
            id: 'konflik-area',
            name: 'Deteksi konflik area',
            audience: 'Admin',
            summary:
              'Peringatan otomatis saat sebuah area sudah dipakai event lain pada rentang tanggal yang sama.',
            steps: [
              'Isi lokasi dan tanggal saat membuat atau mengubah event.',
              'Bila area sudah terpakai pada rentang yang sama, muncul peringatan konflik.',
              'Ubah area atau tanggal, atau lanjutkan bila memang disengaja.',
            ],
          },
        ],
      },
    ],
  },
];

/** Semua fitur dalam satu daftar datar — dipakai untuk pencarian dan tes. */
export const DOC_FEATURES: DocFeature[] = DOC_SECTIONS.flatMap(section =>
  section.groups.flatMap(group => group.features),
);
