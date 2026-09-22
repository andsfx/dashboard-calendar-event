/**
 * Isi halaman /docs.
 *
 * Satu sumber kebenaran untuk dokumentasi fitur: dipakai halaman /docs dan bisa
 * dibaca ulang oleh tes. Setiap entri harus punya langkah yang benar-benar ada
 * di UI — jangan menambah langkah yang tidak didukung kode. Bila sebuah fitur
 * dinonaktifkan, tandai `status: 'maintenance'` agar halaman jujur.
 */

export type DocAudience = 'Publik' | 'Semua pengguna' | 'Admin' | 'Superadmin' | 'Tenant';

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
    label: 'Mulai dari Sini',
    intro: 'Cara masuk ke dashboard, peran akun, dan hal yang berlaku di semua halaman.',
    groups: [
      {
        id: 'akses',
        label: 'Akses & Peran',
        description: 'Siapa yang bisa membuka apa.',
        features: [
          {
            id: 'login-admin',
            name: 'Masuk Dashboard',
            path: '/dashboard',
            audience: 'Semua pengguna',
            summary:
              'Gerbang masuk dashboard. Tanpa sesi admin, setiap alamat /dashboard/* menampilkan halaman login.',
            steps: [
              'Buka /dashboard.',
              'Isi Email dan Password (ikon mata untuk melihat sandi).',
              'Klik "Masuk sebagai Admin".',
              'Bila kredensial salah, muncul pesan galat dan kartu bergetar — periksa ulang.',
            ],
            notes: [
              'Sesi disimpan sebagai cookie HttpOnly, jadi aman dari pembacaan JavaScript.',
              'Setelah masuk, Anda diarahkan ke halaman pertama yang boleh Anda buka sesuai peran.',
            ],
          },
          {
            id: 'peran',
            name: 'Peran Akun',
            audience: 'Superadmin',
            summary:
              'Enam peran menentukan apa yang terlihat dan boleh diubah. Rail hanya menampilkan menu yang izinnya menyala.',
            steps: [
              'Superadmin — seluruh dashboard termasuk Manajemen Pengguna.',
              'Admin — seluruh dashboard kecuali Manajemen Pengguna.',
              'Viewer — melihat dashboard (pendaftaran, survey, analitik) tanpa mengubah data.',
              'Demo — melihat seluruh permukaan dashboard, semua aksi mutasi disembunyikan.',
              'EO Tenant — terbatas pada Evaluasi Tenant.',
              'Tenant Relation — diarahkan ke Hasil Evaluasi Tenant.',
            ],
            notes: ['Peran diatur lewat Manajemen Pengguna oleh superadmin.'],
          },
          {
            id: 'tema',
            name: 'Mode Terang & Gelap',
            audience: 'Semua pengguna',
            summary: 'Setiap permukaan punya tombol tema; pilihan tersimpan di perangkat Anda.',
            steps: [
              'Cari tombol bulan/matahari di kanan atas (navbar) atau di dasar rail (dashboard).',
              'Klik untuk berganti antara mode terang dan gelap.',
              'Preferensi tersimpan otomatis dan dipakai lagi pada kunjungan berikutnya.',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'dashboard',
    label: 'Dashboard Admin',
    intro:
      'Pusat kerja harian tim. Rail di kiri mengelompokkan modul menjadi Ringkasan, Kelola Event, Interaksi, Sistem, dan Konten.',
    groups: [
      {
        id: 'ringkasan',
        label: 'Ringkasan',
        description: 'Keadaan hari ini dan hasil evaluasi.',
        features: [
          {
            id: 'pusat-komando',
            name: 'Pusat Komando',
            path: '/dashboard',
            audience: 'Admin',
            summary:
              'Halaman pendarat setelah masuk, disusun seperti Corporate Overview: kartu metrik, grafik kategori/utilisasi area, tren bulanan, tabel area tersibuk, bilah peringatan antrian, lalu register semua modul.',
            steps: [
              'Buka Pusat Komando dari grup Ringkasan.',
              'Baca kartu metrik: total, berlangsung, akan datang, selesai, menunggu publikasi, pendaftaran, serta kelengkapan poster dan PIC.',
              'Lihat grafik "Event per kategori", "Tren event per bulan", dan "Event per area".',
              'Telusuri tabel "Area paling sering dipakai" untuk melihat area tersibuk dan mana yang dipakai sekarang.',
              'Bila ada antrian, bilah peringatan di bawah menautkan langsung ke pendaftaran.',
              'Klik baris modul pada register "Semua Modul" untuk menuju halamannya.',
            ],
            notes: ['Bila draft gagal dimuat, angkanya ditampilkan sebagai "—" dengan pesan galat.'],
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
            notes: ['Halaman ini murni membaca — tidak ada aksi yang mengubah data.'],
          },
          {
            id: 'hasil-evaluasi-tenant',
            name: 'Hasil Evaluasi Tenant',
            path: '/tenant-survey-results',
            audience: 'Admin',
            summary:
              'Agregat self-assessment tenant dalam empat tab: Ringkasan, Checklist, Bagikan, dan Detail, dengan panduan membaca hasil.',
            steps: [
              'Buka Hasil Evaluasi Tenant dari grup Ringkasan.',
              'Pilih event pada filter agar angka terhitung untuk event yang benar.',
              'Tab Ringkasan — baca KPI, distribusi traffic/sales/kategori/zona, Top Gerai, dan tren.',
              'Tab Checklist — lihat tenant mana yang sudah dan belum mengisi.',
              'Tab Bagikan — salin tautan atau tampilkan QR untuk disebar ke tenant.',
              'Tab Detail — baca umpan balik dan tabel respons; klik "Export PDF" bila berwenang.',
            ],
            notes: ['Export PDF hanya aktif untuk akun dengan izin ekspor analitik tenant.'],
          },
        ],
      },
      {
        id: 'kelola-event',
        label: 'Kelola Event',
        description: 'Jadwal, draft, tema, dan pameran.',
        features: [
          {
            id: 'jadwal-event',
            name: 'Jadwal Event',
            path: '/dashboard/events',
            audience: 'Admin',
            summary:
              'Mengelola seluruh event dalam empat tampilan: Tabel, Kalender, Kanban, dan Timeline, lengkap dengan filter dan pencarian.',
            steps: [
              'Buka Jadwal Event dari rail.',
              'Pilih tampilan lewat sakelar di kanan atas panel.',
              'Saring dengan kotak cari dan bilah filter: status, kategori, prioritas, dan bulan.',
              'Klik baris atau kartu untuk membuka Detail event.',
              'Klik "Tambah" untuk membuat event baru, atau ikon ubah/hapus pada baris.',
              'Klik "Unduh PDF" untuk mengekspor jadwal yang sedang tampil.',
            ],
            notes: [
              'Tampilan Kalender dan Kanban hanya tersedia untuk akun yang boleh mengubah event.',
              'Tampilan Kalender punya lima mode: Bulan, Minggu, Hari, Agenda, dan Linimasa — dengan navigasi periode dan panel hari yang bisa dibuka dari grid.',
            ],
          },
          {
            id: 'antrian-draft',
            name: 'Antrian Draft',
            path: '/dashboard/drafts',
            audience: 'Admin',
            summary:
              'Draft adalah calon event sebelum resmi. Halaman ini mengelola antrian aktif, riwayat, progress, dan penerbitan draft menjadi event.',
            steps: [
              'Buka Antrian Draft.',
              'Klik "Tambah Draft Event" atau ikon ubah pada baris untuk mengisi detail.',
              'Ubah progress: Draft, Konfirmasi, atau Batal.',
              'Setelah progress "Konfirmasi", klik "Terbitkan" untuk menjadikannya event.',
              'Buka panel Riwayat Draft untuk melihat arsip dan memulihkan draft yang terhapus.',
              'Gunakan tautan WhatsApp untuk menindaklanjuti PIC.',
            ],
            notes: [
              'Tombol "Terbitkan" hanya aktif bila progress bernilai Konfirmasi.',
              'Pendaftaran yang disetujui tidak otomatis menjadi draft — pembuatannya sengaja manual.',
            ],
          },
          {
            id: 'tema-tahunan',
            name: 'Tema Tahunan',
            path: '/dashboard/themes',
            audience: 'Admin',
            summary:
              'Payung tema tahunan dengan rentang tanggal dan warna. Tema tampil sebagai timeline dan mengelompokkan album galeri.',
            steps: [
              'Buka Tema Tahunan.',
              'Klik "Tambah Tema".',
              'Isi Nama Tema, Tanggal Mulai, Tanggal Selesai, dan pilih Warna.',
              'Simpan.',
              'Untuk mengubah atau menghapus, pakai ikon pensil/hapus pada kartu tema.',
            ],
            notes: ['Tanggal selesai harus sama atau setelah tanggal mulai.'],
          },
          {
            id: 'pameran',
            name: 'Pameran & Aktivasi',
            path: '/dashboard/exhibitions',
            audience: 'Admin',
            summary:
              'Mengelola pameran Casual Leasing, menautkan event sebagai agenda aktivasi, dan meninjau pengajuan kolaborasi brand/EO.',
            steps: [
              'Buka Pameran & Aktivasi.',
              'Isi form "Pameran Baru": nama, tema, lokasi, periode, PIC, brief, publikasi, dan opsi menerima pengajuan.',
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
        description: 'Pendaftaran dan survey dari publik.',
        features: [
          {
            id: 'pendaftaran',
            name: 'Pendaftaran',
            path: '/dashboard/registrations',
            audience: 'Admin',
            summary:
              'Antrian pendaftaran organisasi dari halaman publik: tinjau detail, ubah status, kirim WhatsApp, dan buat draft dari pendaftaran.',
            steps: [
              'Buka Pendaftaran.',
              'Saring dengan tab status (Semua, Menunggu, Direview, Disetujui, Ditolak) dan filter tipe organisasi.',
              'Klik baris untuk membuka Detail Pendaftaran.',
              'Isi Catatan Admin bila perlu.',
              'Klik "Tandai Direview", "Setujui", atau "Tolak".',
              'Pilih template WhatsApp lalu kirim, atau (bila disetujui) klik "Buat Draft dari pendaftaran".',
            ],
            notes: [
              'Menyetujui pendaftaran tidak otomatis membuat draft atau event.',
              'Viewer hanya dapat melihat, tidak mengubah status.',
            ],
          },
          {
            id: 'survey-kepuasan',
            name: 'Survey Kepuasan',
            path: '/dashboard/survey',
            audience: 'Admin',
            summary:
              'Mengelola survey kepuasan pengunjung dan organizer per event: statistik, NPS, respons terbaru, aktif/nonaktif, tautan, dan ekspor CSV.',
            steps: [
              'Buka Survey Kepuasan.',
              'Baca kartu statistik, rata-rata rating, dan NPS.',
              'Pada bagian "Kelola Survey per Event", cari event yang dituju.',
              'Nyalakan atau matikan survey dengan tombol toggle.',
              'Klik "Link" untuk menyalin URL form; klik "CSV" untuk mengunduh data.',
              'Saring respons terbaru menurut rentang tanggal bila perlu.',
            ],
            notes: ['Survey hanya masuk akal untuk event yang sedang atau sudah berlangsung.'],
          },
          {
            id: 'evaluasi-tenant',
            name: 'Evaluasi Tenant',
            path: '/dashboard/tenant-surveys',
            audience: 'Admin',
            summary:
              'Mengelola self-assessment tenant per event: daftar respons, detail, review, kelola tautan/QR, ekspor CSV, dan tab Analytics.',
            steps: [
              'Buka Evaluasi Tenant.',
              'Tab "Self-Assessment" — saring status/event/kategori dan cari gerai.',
              'Klik baris untuk membuka Detail, lalu "Review" dengan catatan atau "Hapus".',
              'Buka bagian "Kelola Self-Assessment per Event" untuk menyalakan toggle, menyalin tautan, menampilkan QR, atau mengekspor CSV.',
              'Tab "Analytics" — pilih event untuk melihat agregatnya.',
            ],
            notes: [
              'Secara bawaan survey tenant nonaktif; nyalakan dulu agar form publik terbuka.',
              'Menu ini disembunyikan untuk peran Tenant Relation.',
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
            name: 'Manajemen Pengguna',
            path: '/dashboard/users',
            audience: 'Superadmin',
            summary:
              'Mengelola akun dan peran: undang lewat email atau buat manual, ubah, serta aktif/nonaktifkan.',
            steps: [
              'Buka Manajemen Pengguna.',
              'Klik "Invite" untuk mengirim undangan email, atau "Buat Manual" untuk membuat dengan sandi.',
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
            name: 'Log Aktivitas',
            path: '/dashboard/activity-log',
            audience: 'Admin',
            summary:
              'Jejak audit semua aksi sistem (buat, ubah, hapus, login, logout, undang) dengan detail ringkas dan paginasi.',
            steps: [
              'Buka Log Aktivitas.',
              'Saring menurut Aksi, Tipe resource, dan rentang tanggal.',
              'Klik "Atur Ulang" untuk membersihkan filter.',
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
            name: 'Halaman Landing',
            path: '/dashboard/content/landing',
            audience: 'Admin',
            summary:
              'Mengatur gambar hero dan tiga URL post Instagram yang tampil di halaman landing publik.',
            steps: [
              'Buka Halaman Landing.',
              'Unggah foto hero (JPG/PNG/WebP, maksimal 10MB), atau ganti/hapus foto yang ada.',
              'Isi hingga tiga URL Post Instagram (harus dari domain instagram.com).',
              'Klik "Sync & Cache Instagram Posts" untuk menyimpan gambar ke cache.',
              'Klik "Simpan".',
            ],
            notes: ['Unggahan berkas memerlukan penyimpanan objek yang sudah dikonfigurasi.'],
          },
          {
            id: 'konten-galeri',
            name: 'Galeri Album',
            path: '/dashboard/content/galeri',
            audience: 'Admin',
            summary:
              'Mengelola album foto — buat/hapus album, unggah foto, tetapkan cover, dan tautkan ke event serta tema.',
            steps: [
              'Buka Galeri Album.',
              'Buat album baru: isi nama, deskripsi, tanggal, event (opsional), lokasi, dan tema (opsional).',
              'Simpan.',
              'Buka detail album, lalu unggah foto dengan drag & drop (maksimal 20 foto, 10MB per foto).',
              'Tetapkan salah satu foto sebagai cover; hapus album bila perlu dengan konfirmasi.',
            ],
            notes: ['Bila cover belum ditetapkan, foto pertama otomatis dipakai sebagai cover.'],
          },
          {
            id: 'konten-foto-area',
            name: 'Foto Area Event',
            path: '/dashboard/content/foto-area',
            audience: 'Admin',
            summary:
              'Mengelola master Area (lokasi kanonis) beserta foto representatif, plus panel Pemetaan Lokasi untuk merapikan teks lokasi lama.',
            steps: [
              'Buka Foto Area Event.',
              'Klik "Tambah Area Baru", isi Nama Area (wajib) dan Deskripsi, lalu klik "Buat Area".',
              'Ubah urutan dengan panah naik/turun, sembunyikan/tampilkan dengan ikon mata, atau ubah lewat ikon pensil.',
              'Klik kartu area untuk membuka detail dan mengunggah foto area.',
              'Buka panel "Pemetaan Lokasi" untuk memetakan teks lokasi lama ke area kanonis, lalu klik "Terapkan Pemetaan".',
            ],
            notes: [
              'Pemetaan hanya mengisi event yang belum punya area; pemetaan manual sebelumnya tidak ditimpa.',
              'Centang "Seragamkan teks lokasi" bila ejaan lama juga ingin diganti.',
            ],
          },
          {
            id: 'konten-surat',
            name: 'Buat Surat',
            path: '/dashboard/content/surat',
            audience: 'Admin',
            status: 'maintenance',
            summary:
              'Sedang diperbaiki. Generator surat ditutup sementara karena dokumen yang dihasilkan belum konsisten untuk semua jenis event.',
            steps: [
              'Buka Buat Surat dari grup Konten.',
              'Halaman menampilkan status "Sedang Diperbaiki" beserta alasannya.',
              'Untuk kebutuhan surat yang mendesak, hubungi tim administrasi mall secara langsung.',
            ],
            notes: [
              'Surat yang sudah pernah dibuat masih bisa dibuka lewat tautan publiknya.',
              'Menu di rail menampilkan penanda agar tidak dikira rusak.',
            ],
          },
          {
            id: 'konten-berita',
            name: 'Berita',
            path: '/dashboard/content/berita',
            audience: 'Admin',
            summary:
              'Menulis artikel berita — judul, ringkasan, isi, penulis, dan cover — serta mengatur status terbit atau draft.',
            steps: [
              'Buka Berita.',
              'Klik "Buat Artikel Baru".',
              'Isi Judul (wajib), Ringkasan, Isi, dan Penulis.',
              'Unggah cover bila ada.',
              'Simpan, lalu ubah status Terbit/Draft dari daftar; hapus dengan konfirmasi bila perlu.',
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
              'Tab "Proposal Event" — klik Upload/Ganti untuk melampirkan proposal (PDF, gambar, atau DOCX, maksimal 20MB) per event.',
              'Tab "Minat Support" — lihat lead yang masuk dari halaman /sponsor.',
              'Ubah status lead: Menunggu, Dihubungi, Sepakat, atau Menolak; hapus bila perlu.',
            ],
            notes: ['Lead muncul setelah pengunjung mengirim form Minat Support di halaman /sponsor.'],
          },
        ],
      },
    ],
  },
  {
    id: 'publik',
    label: 'Halaman Publik',
    intro:
      'Permukaan tanpa login untuk pengunjung, tenant, dan mitra. Semua halaman di bawah ini dapat dibuka siapa saja.',
    groups: [
      {
        id: 'jelajah',
        label: 'Jelajahi & Jadwal',
        description: 'Halaman untuk melihat acara dan venue.',
        features: [
          {
            id: 'beranda',
            name: 'Beranda Komunitas',
            path: '/',
            audience: 'Publik',
            summary:
              'Halaman kampanye utama: menawarkan venue dan fasilitas untuk komunitas, membuktikan lewat event serta galeri, dan mengarahkan ke pendaftaran.',
            steps: [
              'Buka /.',
              'Telusuri navigasi: Event, Program (Keuntungan, Area & Fasilitas, Cara Daftar, FAQ), Jelajahi (Galeri, Berita, Tenant, Pameran, Sponsor), dan Kontak.',
              'Lihat Agenda event, lalu klik kartu untuk membuka detail.',
              'Gulir ke bagian pendaftaran dan isi formnya.',
              'Atau klik "Ajukan Event" untuk mengajukan event lewat halaman khusus.',
            ],
          },
          {
            id: 'jadwal-event-publik',
            name: 'Jadwal Event',
            path: '/events',
            audience: 'Publik',
            summary:
              'Event yang sedang berlangsung dan akan datang dalam sorotan, rail per area, dan kalender bulanan. Filter bisa dibagikan lewat URL.',
            steps: [
              'Buka /events.',
              'Lihat kartu sorotan beserta hitungan waktu.',
              'Klik chip waktu (Hari Ini, Besok, Akhir Pekan Ini) atau chip kategori untuk menyaring.',
              'Klik kartu event untuk membuka detailnya.',
              'Klik "Unduh PDF" untuk jadwal, atau "Kalender" untuk tampilan bulanan.',
            ],
            notes: [
              'Filter tersimpan di alamat halaman (mis. ?waktu=hari-ini atau ?kategori=…), jadi bisa disalin dan dibagikan.',
            ],
          },
          {
            id: 'detail-event',
            name: 'Detail Event',
            path: '/events/:id',
            audience: 'Publik',
            summary:
              'Halaman detail event yang bisa dibagikan, berisi info lengkap, galeri foto, tombol kalender, dan ajakan mengisi survey untuk event yang sudah lewat.',
            steps: [
              'Buka tautan /events/:id.',
              'Baca informasi: tanggal, waktu, lokasi, penyelenggara, dan keterangan.',
              'Bagikan lewat WhatsApp atau klik "Salin link".',
              'Tambahkan ke Google Calendar atau unduh berkas .ics.',
              'Untuk event yang sudah lewat, klik "Isi Survey Kepuasan".',
            ],
            notes: ['Event berstatus draft tidak pernah tampil di halaman publik.'],
          },
          {
            id: 'galeri-publik',
            name: 'Galeri Album',
            path: '/gallery',
            audience: 'Publik',
            summary:
              'Album foto event yang dikelompokkan per Tema Tahunan, dengan opsi mengekspor album ke PDF.',
            steps: [
              'Buka /gallery.',
              'Telusuri album berdasarkan tema tahunan.',
              'Klik album untuk membuka detailnya.',
              'Klik "Export PDF" → pilih mode (tanggal atau tema) → "Preview PDF" → "Download PDF".',
            ],
          },
          {
            id: 'detail-album',
            name: 'Detail Album',
            path: '/gallery/:slug',
            audience: 'Publik',
            summary: 'Grid foto satu album dengan penampil besar (lightbox) yang bisa dinavigasi keyboard.',
            steps: [
              'Buka album dari /gallery.',
              'Klik sebuah foto untuk membukanya di lightbox.',
              'Gunakan tombol sebelumnya/berikutnya atau tombol panah.',
              'Tekan Escape untuk menutup.',
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
              'Klik "Kembali ke Berita" untuk kembali ke daftar.',
            ],
          },
        ],
      },
      {
        id: 'mitra',
        label: 'Mitra & Direktori',
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
              'Lihat kartu event, lalu klik "Lihat Proposal" untuk membuka berkasnya.',
              'Klik "Saya Tertarik Support" — event akan terisi otomatis.',
              'Lengkapi form: event (wajib), nama brand/perusahaan, nama PIC, dan nomor WhatsApp (wajib); email dan pesan opsional.',
              'Kirim, lalu lihat konfirmasi; Anda bisa mengirim minat untuk event lain.',
            ],
            notes: ['Email dan nomor telepon divalidasi sebelum dikirim.'],
          },
          {
            id: 'pameran-publik',
            name: 'Pameran & Kolaborasi',
            path: '/pameran',
            audience: 'Publik',
            summary:
              'Daftar pameran yang sedang dibuka beserta detailnya — tema, periode, lokasi, brief, dan agenda aktivasi — dengan form pengajuan kolaborasi.',
            steps: [
              'Buka /pameran.',
              'Klik "Ajukan Kolaborasi" atau "Lihat Detail".',
              'Baca bagian "Yang Kami Cari" dan "Agenda Aktivasi".',
              'Isi form Ajukan Kolaborasi: nama brand/EO, PIC, WhatsApp, dan konsep kontribusi.',
              'Kirim — muncul konfirmasi bahwa pengajuan diterima untuk ditinjau.',
            ],
            notes: [
              'Bila pameran tidak menerima pengajuan, form diganti pesan penutupan.',
              'Pengajuan belum berarti dikonfirmasi; tim akan menghubungi Anda.',
            ],
          },
          {
            id: 'tenant-directory',
            name: 'Direktori Tenant',
            path: '/tenants',
            audience: 'Publik',
            summary: 'Daftar gerai dengan pencarian dan filter kategori, beserta statistik jumlah tenant.',
            steps: [
              'Buka /tenants.',
              'Ketik di kotak cari untuk menyaring nama, kategori, atau lantai.',
              'Klik pill kategori untuk memfilter.',
              'Lihat kartu tenant: logo, kategori, dan lantai/lot.',
            ],
          },
          {
            id: 'komunitas-directory',
            name: 'Direktori Komunitas',
            path: '/community',
            audience: 'Publik',
            summary:
              'Organisasi dan komunitas yang pernah menggelar acara, dikelompokkan per tipe dengan statistik acara.',
            steps: [
              'Buka /community.',
              'Baca statistik: jumlah organisasi, total acara, dan acara mendatang.',
              'Cari nama komunitas atau EO.',
              'Filter lewat pill kategori.',
              'Klik tautan organisasi bila tersedia.',
            ],
          },
        ],
      },
      {
        id: 'partisipasi',
        label: 'Partisipasi',
        description: 'Form pendaftaran, pengajuan, dan survey.',
        features: [
          {
            id: 'daftar',
            name: 'Pendaftaran Organisasi',
            path: '/daftar',
            audience: 'Publik',
            summary:
              'Halaman pendaftaran mandiri untuk EO, sekolah, kampus, perusahaan, komunitas, atau instansi. Cocok dibagikan lewat bio, WhatsApp, atau QR.',
            steps: [
              'Buka /daftar.',
              'Pilih tipe organisasi.',
              'Isi nama organisasi, PIC, dan nomor WhatsApp (wajib); email, Instagram, deskripsi, dan tanggal preferensi opsional.',
              'Lampirkan proposal atau company profile (PDF/Word, maksimal 20MB) bila ada.',
              'Klik "Kirim Pendaftaran" dan lihat konfirmasi.',
            ],
            notes: [
              'Minimal yang wajib: tipe organisasi, nama organisasi, PIC, dan nomor WhatsApp.',
              'Pendaftaran masuk ke antrian Pendaftaran di dashboard admin.',
            ],
          },
          {
            id: 'ajukan-event',
            name: 'Pengajuan Event',
            path: '/ajukan-event',
            audience: 'Publik',
            summary:
              'Form pengajuan event untuk EO dan komunitas. Kiriman masuk ke antrian Draft dashboard tanpa perlu login.',
            steps: [
              'Buka /ajukan-event.',
              'Isi Nama Acara dan Tanggal Mulai (wajib).',
              'Lengkapi Tanggal Selesai, Jam, Lokasi, Kategori, dan Keterangan bila perlu.',
              'Isi Nama Organisasi/EO, Nama PIC, dan No. HP/WhatsApp (wajib).',
              'Klik "Kirim Pengajuan" dan lihat konfirmasi.',
            ],
            notes: [
              'Form dilengkapi penyaring anti-spam otomatis, jadi tidak perlu diisi manual.',
              'Pengajuan tidak langsung menjadi event — admin meninjaunya dulu di Antrian Draft.',
            ],
          },
          {
            id: 'survey-publik',
            name: 'Survey Kepuasan',
            path: '/survey/:eventId',
            audience: 'Publik',
            summary:
              'Form kepuasan pengunjung dan organizer: penilaian pengelola mall dan penyelenggara event, dengan pencegahan pengisian ganda.',
            steps: [
              'Buka tautan survey yang dibagikan.',
              'Pilih peran: "Penyelenggara Event" atau "Peserta/Pengunjung".',
              'Beri penilaian untuk setiap aspek pengelolaan tempat.',
              'Bila peserta, beri juga penilaian untuk penyelenggara event.',
              'Isi komentar dan data diri bila berkenan.',
              'Klik "Kirim Survey" dan lihat halaman terima kasih.',
            ],
            notes: ['Satu perangkat hanya dapat mengisi sekali untuk setiap event.'],
          },
          {
            id: 'evaluasi-tenant-publik',
            name: 'Evaluasi Tenant',
            path: '/tenant-survey',
            audience: 'Tenant',
            summary:
              'Tenant memilih event yang diikuti, lalu mengisi self-assessment anonim tentang traffic, penjualan, dan umpan balik.',
            steps: [
              'Buka /tenant-survey.',
              'Cari event berdasarkan nama, lokasi, atau penyelenggara.',
              'Klik baris event untuk mulai mengisi.',
              'Bagian 1 — pilih gerai Anda dari daftar (lokasi dan kategori terisi otomatis), lengkapi bila perlu.',
              'Bagian 2 — pilih kenaikan traffic dan penjualan.',
              'Bagian 3 — tulis umpan balik, lalu klik "Kirim Survey".',
            ],
            notes: [
              'Gerai harus dipilih dari daftar, bukan diketik bebas.',
              'Satu perangkat hanya dapat mengisi sekali untuk setiap event.',
              'Bila daftar kosong, berarti admin belum menyalakan survey untuk event mana pun.',
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
            name: 'Viewer Surat',
            path: '/letter/:id',
            audience: 'Publik',
            summary: 'Menampilkan surat konfirmasi event secara langsung di peramban, dengan tombol unduh.',
            steps: [
              'Buka tautan surat yang dibagikan.',
              'Lihat dokumen surat secara langsung.',
              'Klik "Unduh PDF" untuk menyimpannya.',
            ],
            notes: ['Hanya surat berstatus aktif yang bisa dibuka lewat tautan ini.'],
          },
          {
            id: 'halaman-404',
            name: 'Halaman Tidak Ditemukan',
            audience: 'Publik',
            summary: 'Muncul untuk alamat yang tidak dikenal, agar tidak ada halaman kosong.',
            steps: ['Buka alamat yang tidak dikenal.', 'Klik "Kembali ke Beranda".'],
          },
        ],
      },
    ],
  },
  {
    id: 'lintas',
    label: 'Fitur Lintas Halaman',
    intro: 'Kemampuan yang muncul di banyak halaman sekaligus, bukan satu rute tersendiri.',
    groups: [
      {
        id: 'lintas-halaman',
        label: 'Kemampuan Bersama',
        description: 'Ekspor, QR, dan hal yang dipakai berulang.',
        features: [
          {
            id: 'export-pdf',
            name: 'Ekspor PDF',
            audience: 'Publik',
            summary:
              'Tiga permukaan bisa menghasilkan PDF: jadwal event, album galeri, dan hasil evaluasi tenant.',
            steps: [
              'Jadwal event — klik "Unduh PDF" di /events atau /dashboard/events untuk mengekspor daftar yang sedang tampil.',
              'Album galeri — klik "Export PDF" di /gallery, pilih mode tanggal atau tema, lalu unduh.',
              'Hasil evaluasi tenant — klik "Export PDF" di /tenant-survey-results bila akun Anda berwenang.',
            ],
          },
          {
            id: 'export-csv',
            name: 'Ekspor CSV',
            audience: 'Admin',
            summary: 'Data mentah survey dan evaluasi tenant dapat diunduh sebagai CSV per event.',
            steps: [
              'Buka Survey Kepuasan atau Evaluasi Tenant.',
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
              'QR dibuat otomatis untuk survey dan evaluasi tenant, bisa diunduh sebagai PNG atau disalin tautannya.',
            steps: [
              'Buka panel kelola survey atau evaluasi tenant, atau detail event.',
              'Klik aksi QR pada event yang dituju.',
              'Unduh PNG untuk dicetak, atau salin tautannya untuk dibagikan.',
            ],
          },
          {
            id: 'whatsapp-template',
            name: 'Template WhatsApp',
            audience: 'Admin',
            summary:
              'Pesan siap kirim untuk menindaklanjuti pendaftar dan draft, agar komunikasi konsisten.',
            steps: [
              'Buka Detail Pendaftaran atau tabel Antrian Draft.',
              'Pilih template pesan (Direview, Disetujui, Ditolak, atau Kustom).',
              'Klik "Kirim via WhatsApp" — aplikasi WhatsApp terbuka dengan pesan terisi.',
            ],
          },
          {
            id: 'event-multihari',
            name: 'Event Multi-hari & Berulang',
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
            name: 'Deteksi Konflik Area',
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
