<div align="center">

# Riset Pembanding Lapangan

### Adakah mall, pusat perbelanjaan, atau venue lain yang punya sistem serupa?

<sub>Riset dilakukan 18 Agustus 2026 · sumber: situs resmi masing-masing venue, dokumen publik, dan repositori open-source</sub>

</div>

---

## Jawaban Singkat

> **Tidak ditemukan satu pun venue yang memiliki sistem setara** — yang menggabungkan kurasi jadwal internal, akuisisi komunitas, etalase publik, dan loop feedback dalam satu produk.
>
> Yang ditemukan adalah **empat pola terpisah**, masing-masing hanya menjawab sepotong dari masalah yang sama.

<div align="center">

| Pola yang ditemukan | Contoh nyata | Menjawab bagian mana? |
|---|---|---|
| **A.** Katalog event CMS | Pakuwon, Summarecon, Metropolitan Mall | Etalase publik saja |
| **B.** Formulir + PDF manual | Holyoke Mall, Mall of America | Akuisisi saja |
| **C.** Platform event open-source | Attendize, Eventyay, Evental | Ticketing peserta saja |
| **D.** Agregator pihak ketiga | jadwalevent.web.id, Goers | Penemuan event saja |

</div>

**Tidak ada satu pun** yang menangani: antrian pra-jadwal, status otomatis, surat resmi, evaluasi tenant, atau hak akses berbasis peran.

---

## Pola A — Mall Indonesia: Katalog Poster, Bukan Sistem

Semua mall besar Indonesia yang diperiksa memiliki halaman event, tapi bentuknya **galeri poster dari CMS** — bukan sistem operasional.

### A1 · Pakuwon Mall Jogja — yang paling matang di kelasnya

<table>
<tr><td width="30%"><b>URL</b></td><td><code>pakuwonmalljogja.com/events</code></td></tr>
<tr><td><b>Yang ada</b></td><td>Filter <i>All / Now / Coming Soon / Previous</i>, rentang tanggal, poster, halaman detail per event, kadang lokasi atrium</td></tr>
<tr><td><b>Yang tidak ada</b></td><td>Jalur pendaftaran komunitas, dashboard operasional, status otomatis, survey, unduh jadwal</td></tr>
</table>

Ini pembanding **terkuat** di Indonesia — struktur "Now / Coming Soon / Previous" mirip konsep status `ongoing / upcoming / past`. Bedanya: di sana kategori itu **diisi manual oleh admin CMS**, di project kita **diturunkan otomatis dari tanggal + jam**. Terlihat sama di layar, sangat berbeda di beban kerja harian.

### A2 · Summarecon Mall Bekasi — kompetitor langsung satu kota

<table>
<tr><td width="30%"><b>URL</b></td><td><code>malbekasi.com/events</code></td></tr>
<tr><td><b>Yang ada</b></td><td>Daftar event dengan rentang tanggal dan deskripsi naratif</td></tr>
<tr><td><b>Yang tidak ada</b></td><td>Sama seperti A1 — murni publikasi satu arah</td></tr>
</table>

### A3 · Metropolitan Mall Bekasi — situs resmi kita sendiri 🔍

Temuan paling relevan untuk presentasi, karena ini **baseline internal**, bukan kompetitor.

<table>
<tr><td width="30%"><b>URL</b></td><td><code>malmetropolitan.com</code> dan <code>/event</code></td></tr>
<tr><td><b>Isi halaman event</b></td><td>Grid gambar promo — <b>tanpa tanggal, tanpa lokasi, tanpa halaman detail</b>. Semua link mengarah ke <code>#</code> (anchor kosong).</td></tr>
<tr><td><b>Sumber gambar</b></td><td><code>apiloyalty.metropolitanland.com/images/event/MB/</code> — nama filenya harfiah <code>WhatsApp Image 2026-08-05 at 15.15.11.jpeg</code></td></tr>
<tr><td><b>Halaman utama</b></td><td>Slider statis + embed feed Instagram</td></tr>
</table>

> **Dua implikasi besar:**
>
> **1. Alur kerja hari ini benar-benar berbasis WhatsApp.** Nama file gambar di server produksi adalah bukti langsung bahwa poster berpindah lewat chat lalu diunggah manual. Ini persis masalah yang diselesaikan project ini — dan bisa ditunjukkan sebagai bukti, bukan asumsi.
>
> **2. Project ini sudah "berbicara" dengan infrastruktur grup.** Situs resmi mengambil aset dari `apiloyalty.metropolitanland.com`, dan project ini mengintegrasikan **MID loyalty API di host yang sama** untuk master data tenant. Artinya ini bukan sistem asing yang berdiri sendiri — melainkan perluasan dari ekosistem Metropolitan Land yang sudah ada.

---

## Pola B — Mall Amerika: Punya Program Komunitas, Prosesnya Manual

Mall di AS justru punya **program komunitas formal** — analog paling dekat dengan Community Hub. Tapi eksekusi teknisnya jauh tertinggal.

### B1 · Holyoke Mall (Massachusetts) — analog paling mirip yang ditemukan

Halaman `/community` menawarkan ruang **gratis** bagi organisasi nonprofit untuk fundraising dan event di area umum — proposisi nilai yang hampir identik dengan Community Hub kita.

**Alur pendaftarannya:**

```
Baca ketentuan → Unduh "Community Access Application" (PDF)
   → Isi PDF secara manual → Siapkan sertifikat asuransi
   → Siapkan bukti status 501(c)(3) → Unggah balik PDF via form web
   → reCAPTCHA → Submit → tunggu email
```

| Aspek | Holyoke Mall | Project ini |
|---|---|---|
| Form | Gravity Forms (WordPress) + unggah PDF | Form adaptif per jenis organisasi, langsung terstruktur |
| Data masuk ke | Email pengelola | Database + inbox dashboard dengan status review |
| Field kontekstual | Satu form untuk semua | Field berbeda untuk sekolah / kampus / EO / perusahaan / NGO |
| Setelah approve | Manual sepenuhnya | CTA "Buat Draft dari pendaftaran" → masuk antrian jadwal |
| Publikasi hasil | Tidak terhubung | Publish Draft → otomatis muncul di jadwal publik |

### B2 · Mall of America — mall paling terkenal di dunia

Ini perbandingan yang paling mengejutkan dan paling layak masuk slide.

<table>
<tr><td width="32%"><b>Halaman</b></td><td><code>/community/partner/event-request</code></td></tr>
<tr><td><b>Prosesnya</b></td><td>Baca <b>Promotional Events Handbook (PDF)</b> → klik "View Event Application" → diarahkan ke <b>Microsoft Forms</b></td></tr>
<tr><td><b>Menurut handbook</b></td><td>Isi dua halaman terakhir handbook; <b>salinan asli</b> Common Area Application harus dikembalikan <b>dua bulan</b> sebelum tanggal event; seluruh dokumen wajib masuk <b>satu bulan</b> sebelumnya</td></tr>
<tr><td><b>Program musik</b></td><td>"Music in the Mall" — penampilan grup/sekolah satuan <b>sudah tidak dilayani lagi</b>; seluruh komunikasi Community Stage <b>via email</b> ke events@moa.net</td></tr>
</table>

> Mall of America mengelola puluhan event komunitas per tahun dengan **handbook PDF, Microsoft Forms, dokumen fisik, dan email** — lalu akhirnya menutup program penampilan satuan karena volume permintaan.
>
> Ini bukan kritik terhadap mereka; ini menunjukkan bahwa **masalah operasionalnya nyata dan mahal**, dan sejauh riset ini, belum ada yang menyelesaikannya dengan sistem terintegrasi.

---

## Pola C — Open Source: Semua Berkiblat ke Ticketing

| Project | Fokus | Kenapa tidak cocok untuk venue |
|---|---|---|
| **Eventyay** (FOSSASIA) | Ticketing, CFP, speaker, jadwal konferensi, badge, check-in | Model konferensi — peserta, pembicara, sesi. Venue bukan aktor utama |
| **Attendize** (Laravel) | Jual tiket, refund, QR tiket, payment gateway | Seluruh nilainya di transaksi tiket, yang tidak ada di event mall gratis |
| **Evental** | Manajemen event + mobile | Tetap berpusat pada peserta, bukan pemilik tempat |
| **Event-Manager-Dashboard** | CRUD event + checklist tugas | Skala proyek belajar; tanpa role, publik, atau domain |

**Celah yang konsisten:** semuanya memodelkan **penyelenggara → peserta**. Tidak ada yang memodelkan **pemilik venue → penyelenggara pihak ketiga yang mengajukan slot** — yaitu relasi inti operasional mall.

---

## Pola D — Agregator Pihak Ketiga: Gejala dari Masalahnya

Ditemukan situs pihak ketiga yang mengumpulkan jadwal event mall secara manual: `jadwalevent.web.id`, `goersapp.com`, `malbekasi.com`.

> Keberadaan mereka justru **membuktikan** ada permintaan publik atas jadwal event mall yang terstruktur — dan bahwa mall sendiri tidak menyediakannya. Publik terpaksa mengandalkan pihak ketiga yang menyalin ulang informasi dari Instagram.

---

## Peta Celah: Fitur yang Tidak Ditemukan di Mana Pun

| Kapabilitas | Pakuwon | Summarecon | Metmal (situs resmi) | Holyoke | Mall of America | OSS ticketing | **Project ini** |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Katalog event publik | ✅ | ✅ | ⚠️ poster saja | ❌ | ⚠️ | ✅ | **✅** |
| Detail event terstruktur | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | **✅** |
| Pendaftaran komunitas online | ❌ | ❌ | ❌ | ⚠️ PDF | ⚠️ MS Forms | ❌ | **✅** |
| Form adaptif per jenis organisasi | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **✅** |
| Antrian pra-jadwal internal | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **✅** |
| Status otomatis dari tanggal | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ | **✅** |
| Dashboard operasional multi-view | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ | **✅** |
| Hak akses berbasis peran | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | **✅** |
| Generator surat resmi | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **✅** |
| Unduh jadwal PDF | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **✅** |
| Survey pengunjung + QR | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ | **✅** |
| Evaluasi tenant + analitik | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | **✅** |
| Integrasi master data tenant | ❌ | ❌ | ⚠️ aset saja | ❌ | ❌ | ❌ | **✅** |

<sub>✅ ada · ⚠️ sebagian / manual · ❌ tidak ditemukan</sub>

**Lima kapabilitas berikut tidak ditemukan di satu pun pembanding:** antrian pra-jadwal, status otomatis, generator surat resmi, unduh jadwal PDF, dan evaluasi tenant.

---

## Batas Riset Ini

Kejujuran metodologis — penting jika ada yang bertanya saat presentasi.

1. **Riset ini hanya melihat permukaan publik.** Mall besar sangat mungkin punya sistem operasional internal (SAP, Yardi, atau tools kustom) yang tidak terlihat dari luar. Ketiadaan bukti publik bukan bukti ketiadaan.
2. **Sampelnya terbatas** pada mall Indonesia besar, dua mall AS dengan program komunitas, dan project open-source populer — bukan sensus menyeluruh.
3. **Klaim yang aman diucapkan:** *"tidak ditemukan pembanding publik yang setara"* — bukan *"tidak ada yang pernah membuat ini"*.
4. Yang justru menguatkan: **permukaan publik adalah bagian dari produk ini**. Kalaupun mall lain punya sistem internal, mereka tetap tidak punya Community Hub dan jadwal publik terstruktur yang bisa dilihat siapa pun.

---

## Talking Points untuk Presentasi

<table>
<tr><td width="6%" valign="top"><b>1</b></td><td valign="top"><b>"Mall paling terkenal di dunia masih pakai Microsoft Forms."</b><br/>Mall of America mengelola puluhan event komunitas per tahun lewat handbook PDF, MS Forms, dan dokumen fisik dua bulan sebelum acara.</td></tr>
<tr><td valign="top"><b>2</b></td><td valign="top"><b>"Nama file di server kita sendiri adalah <code>WhatsApp Image ....jpeg</code>."</b><br/>Bukti langsung, bukan asumsi, bahwa alur kerja hari ini berbasis chat manual.</td></tr>
<tr><td valign="top"><b>3</b></td><td valign="top"><b>"Pembanding terbaik di Indonesia berhenti di katalog poster."</b><br/>Pakuwon punya Now/Coming Soon/Previous — tapi diisi manual, tanpa jalur pendaftaran, tanpa operasional.</td></tr>
<tr><td valign="top"><b>4</b></td><td valign="top"><b>"Yang open-source semuanya jualan tiket."</b><br/>Eventyay dan Attendize memodelkan penyelenggara→peserta. Tidak ada yang memodelkan venue→penyelenggara.</td></tr>
<tr><td valign="top"><b>5</b></td><td valign="top"><b>"Ada orang lain yang menyalin jadwal event kita secara manual."</b><br/>Agregator pihak ketiga membuktikan permintaan publiknya nyata dan belum terlayani.</td></tr>
<tr><td valign="top"><b>6</b></td><td valign="top"><b>"Ini bukan sistem asing — ia menyambung ke API grup yang sudah ada."</b><br/>Integrasi MID loyalty API di host yang sama dengan yang dipakai situs resmi.</td></tr>
</table>

---

## Daftar Sumber

| Sumber | URL |
|---|---|
| Metropolitan Mall Bekasi (situs resmi) | https://malmetropolitan.com/event |
| Pakuwon Mall Jogja — Events | https://pakuwonmalljogja.com/events |
| Pakuwon Mall Solo Baru | https://pakuwonmallsolo.com/ |
| Summarecon Mall Bekasi — Events | https://www.malbekasi.com/events |
| Holyoke Mall — Community | https://www.holyokemall.com/community/ |
| Mall of America — Event Requests | https://www.mallofamerica.com/community/partner/event-request |
| Mall of America — Promotional Events Handbook | https://mallofamerica.com/sites/default/files/2023-05/Promotional%20Events%20Handbook.pdf |
| Mall of America — Music in the Mall | https://www.mallofamerica.com/mitm |
| Eventyay (FOSSASIA) | https://github.com/fossasia/eventyay |
| Attendize | https://github.com/Attendize/Attendize |
| Evental | https://github.com/eventalapp/evental |
| Agregator jadwal event | https://jadwalevent.web.id/ · https://www.goersapp.com/ |

<div align="center">
<sub>Dokumen pendamping: <a href="./PRESENTASI.md">PRESENTASI.md</a> — slide 12–15 merangkum temuan ini.</sub>
</div>
