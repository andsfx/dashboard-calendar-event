# Pusat Komando memakai Grid Kartu Modul, bukan register datar

## Status

accepted (2026-10-04)

## Konteks

Pusat Komando (`/dashboard`) dulu dibuka dengan **enam kartu metrik berukuran
sama**. Pola itu sengaja dibuang (2026-09-22) karena membuat modul kritis dan
modul pasif terbaca setara; penggantinya adalah **register datar** "Semua
Modul" — satu daftar baris tautan di bawah strip status dan di atas analitik.

Register datar itu benar secara hierarki, tetapi terbaca sebagai **daftar menu
navigasi**, bukan sebagai panel dashboard. Permintaan produk (2026-10-04):
Pusat Komando harus terasa seperti dashboard pada umumnya — panel/card — bukan
navigation.

## Keputusan

Register datar "Semua Modul" diganti **Grid Kartu Modul** di Pusat Komando:

- Grid dikelompokkan per **Dashboard Group** yang sama dengan rail
  (Ringkasan · Kelola Event · Interaksi · Sistem · Konten), dan **hanya memuat
  modul yang diizinkan Role Akses** — gate identik dengan rail
  (`canViewSettings` / `canViewSponsorship`); modul Konten tidak bocor ke role
  yang tidak berhak, dan "Buat Surat" tetap bertanda maintenance.
- Tiap kartu: ikon + judul + **angka yang sudah tersedia** + subtitle + penanda
  **Perlu tindakan** (aksen warna **dan** teks; kartu ber-perhatian tampil lebih
  dulu di grupnya). Tidak ada angka/visual baru — modul tanpa metrik tampil
  tanpa angka.
- Kartu "Pusat Komando" dibuang dari grid (tidak menaut ke halaman sendiri).
- Klik kartu = **navigasi ke rute modul** seperti sebelumnya; drill-down tetap.
- Yang tidak berubah: strip status di atas, analitik di bawah, dan 18 rute
  admin lain tetap halaman seperti semula. Perubahan hanya di Pusat Komando.

Istilah kanonis dicatat di `CONTEXT.md` → **Kartu Modul** / **Grid Kartu Modul**.

## Alternatif yang ditolak

- **Pertahankan register datar** — paling murah, tetapi tidak menjawab
  permintaan "panel, bukan navigation".
- **Seluruh Pusat Komando jadi satu grid kartu** (strip status & grafik
  dilebur) — paling "dashboard", tetapi membalik kontrak arah secara penuh dan
  berisiko menghapus hierarki antrian yang sudah dijaga.
- **Panel melebar di tempat (in-place drill-down)** — lebih terasa dashboard,
  tetapi menduplikasi kontrol modul dan menuntut keputusan kedalaman tampilan
  yang tidak diambil.
- **Semua kartu wajib berangka/visual** — menuntut endpoint/agregasi baru dan
  berisiko menampilkan angka tak terverifikasi.

## Konsekuensi

- Pusat Komando kini direktori modul penuh yang mencerminkan rail — enam modul
  Konten yang sebelumnya tidak ada di register ikut tampil (sesuai izin role).
- Hierarki yang dijaga sejak 2026-09-22 dipertahankan lewat **urutan** (strip
  status di atas, analitik di bawah) dan penanda "Perlu tindakan" di dalam
  grid; yang berubah adalah bentuk register-nya, bukan komposisi halaman.
- Sumber kartu tetap satu fungsi (`getCommandCenterCards`); ia daftar terpisah
  dari rail (`getDashboardNavGroups`), dan yang disamakan hanyalah **predicate
  izin** — jadi grid tidak dapat menampilkan modul yang tidak boleh dibuka role,
  tetapi tidak diklaim berbagi sumber dengan rail.
- Grid Kartu Modul memakai konstanta urutan grupnya sendiri
  (`DASHBOARD_GROUP_ORDER`); rail tetap memakai label literalnya. Keduanya
  menyebut lima grup yang sama, tetapi tidak ada satu sumber urutan bersama.
