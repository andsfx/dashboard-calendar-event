# Update Fitur: Halaman Publik Pendaftaran Organisasi (/daftar)

Status: EKSEKUSI · Repo: schedule-event-v2 · 2026-08-28

## 1. Ringkasan

Form pendaftaran organisasi (EO, sekolah, komunitas, kampus, perusahaan, instansi, NGO) saat ini hanya bisa diakses menembus landing `/community` (section `#register`, embed panjang) atau `/events` (embed di bawah halaman event). Marcomm butuh satu URL khusus yang bisa dibagikan langsung (bio Instagram, WA blast, QR di mall) untuk mengumpulkan database organisasi.

Target: halaman publik `/daftar` yang membungkus form pendaftaran yang **sudah ada** (`RegistrationForm` di `src/components/community/CommunityRegistrationForm.tsx`) — tanpa form baru, tanpa endpoint baru, tanpa perubahan DB.

## 2. Keputusan desain

| # | Keputusan |
|---|---|
| D1 | **Reuse `RegistrationForm` apa adanya** — selector 8 tipe organisasi, `TypeSpecificFields`, validasi (`validatePhone`/`validateEmail`/`validateInstagram`), submit `submitCommunityRegistration` → `POST /api/community-registration` (sudah zod + sanitize + rate-limit + RLS public-INSERT). Nol logika baru. |
| D2 | Halaman shell pola `TenantDirectoryPage`/`CommunityDirectoryPage` (self-contained, header inline + dark toggle + tombol Kembali, `ui-dashboard-page`). |
| D3 | Route `/daftar` di `src/App.tsx`, lazy + named-export adapter sesuai konvensi routing. Entry form tetap dua: landing `/community` tetap embed section `#register` (CTA anchor in-page, konteks storytelling); `/events` **tidak lagi embed form** — semua CTA `#register` diganti `Link` ke `/daftar` dan embed diganti band CTA ringkas, sehingga bundle `/events` juga ikut meringan. Halaman `/daftar` untuk distribusi link langsung (bio IG, WA, QR) dengan copy fokus database Marcomm. |
| D4 | Tidak ada perubahan DB/migrasi. Data tetap masuk `community_registrations` dan muncul di dashboard Registrasi (review admin → status approved → direktori). |

## 3. Non-goal

- Form/endpoint/tabel baru; perubahan alur approve admin; PII baru; perubahan copy form.
- Menghapus embed form di `/community` (tetap dipakai konteks storytelling landing). Catatan revisi D3: `/events` tidak lagi embed form — semua CTA-nya diarahkan ke `/daftar`.

## 4. File
- Baru: `src/components/RegistrationPage.tsx`
- Edit: `src/App.tsx` (lazy import + route `/daftar` dengan props dark), `src/components/EventsLandingPage.tsx` (4 anchor `#register` → `Link to="/daftar"`, embed form → band CTA, import `CommunityRegistrationForm` dihapus), `src/components/community/CommunityRegistrationForm.tsx` (`RegistrationForm` di-export)
- Dok: `update-fitur-halaman-daftar.md` (file ini)

## 5. Verifikasi

- `npm run build` (tsc + vite) hijau.
- Vitest: `CommunityRegistrationForm.test.tsx` tetap hijau (form tidak berubah).
- Smoke browser: `/daftar` render, selector tipe → field muncul, submit dummy error-handled, dark mode toggle, tombol Kembali.
