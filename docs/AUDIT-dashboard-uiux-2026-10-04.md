# Audit UI/UX Dashboard Admin — 2026-10-04

**Scope:** `/dashboard/*` (19 rute) + `/tenant-survey-results`
**Metode:** hibrida — runtime terukur (axe-core, DOM geometry) + pembacaan kode/token
**Commit:** `f11399c` (sebelum fix); fix diterapkan di sesi yang sama
**Harness:** `e2e/audit-dashboard.spec.ts` + `playwright.audit.config.ts` (ter-commit, ADR-006)
**Bukti:** `reports/audit/` (164 JSON + 88 screenshot; gitignored)
**Tujuan:** baseline untuk redesign — peta masalah & utang desain, bukan daftar bug semata

> Catatan gate: `npm run test:a11y` **hanya** menyapu rute publik. Gate a11y admin
> adalah `npm run test:audit:a11y` (axe pada **152 test** = 76 role×rute + 76 tema/viewport;
> 19 rute × 4 role untuk matriks role, 19 rute × 4 kombinasi tema×viewport untuk matriks render).
> Keduanya dilaporkan terpisah di §6.

---

## 1. Ringkasan

| Severity | Ditemukan | Diperbaiki | Sisa |
|----------|-----------|------------|------|
| Critical | 1 kelas (5 tombol) | 5 tombol | 0 |
| Major    | 3 | 3 | 0 |
| Minor / utang desain | 5 | 0 | 5 |

Dashboard admin **kokoh secara struktural**: 19/19 rute punya tepat satu `<h1>` dan
satu landmark `<main>`, **0 luber horizontal** di 1440 & 375 × terang & gelap,
**0 kontrol melipat dua baris**, **0 error konsol** saat render. Temuan yang tersisa
bukan kerusakan, melainkan **utang desain terukur** (lantai tipografi, ukuran kontrol).

**Skor overall (estimasi berbobot): ~78/100.** Setelah fix Critical/Major: **~84/100**.
Sisa utang terkonsentrasi pada *skala* (tipografi & kontrol terlalu kecil), bukan struktur.

---

## 2. Skor per-surface

| # | Surface | Skor | Catatan terukur |
|---|---------|:----:|-----------------|
| 1 | **Shell & chrome** (DashboardShell, AdminSidebar, Navbar, footer) | **9/10** | Skip-link, `inert` drawer, `aria-current`, landmark tunggal; rail nav 231×36 (<44) |
| 2 | **Wayfinding** (nav group, plat lokasi, h1 per halaman) | **8.5/10** | Label & deskripsi konsisten; h1 tunggal per rute |
| 3 | **Views** (tabel/kalender/kanban/timeline) | **8/10** | 0 overflow, 0 wrap; tab view 28px, teks 10–11px |
| 4 | **Forms** (SearchBar, FilterBar, form admin) | **7.5/10** | Label ok; tombol kontrol 26–34px; `aria-label` pada `<div>` (incomplete) |
| 5 | **Modul admin** (drafts, registrations, analytics, users, activity) | **7.5/10** | Badge kontras (fixed); heading-order (fixed); kontrol kecil |
| 6 | **Konten** (landing, galeri, foto-area, surat, berita, sponsorship) | **7/10** | `button-name` tombol ikon galeri (fixed); sisa ukuran kontrol |
| 7 | **Tema Tahunan** (`/dashboard/themes`) | **6 → 8.5/10** | Kontras kartu `opacity-60` + `button-name` (fixed) |
| 8 | **Evaluasi Tenant** (`/dashboard/tenant-surveys`) | **7 → 9/10** | heading-order h1→h3 (fixed) |
| 9 | **Hasil Evaluasi Tenant** (`/tenant-survey-results`) | **8.5/10** | Bersih; teks 10–11px |

---

## 3. Temuan

### Critical — diperbaiki

**C1 · Tombol ikon tanpa nama aksesibel (`button-name`, axe critical)**
5 tombol ikon (Pencil/Trash/X) tidak punya nama — screen reader mengumumkan "tombol" tanpa konteks.

| Berkas | Tombol | Fix |
|--------|--------|-----|
| `src/components/views/QuarterTimeline.tsx:154-155` | Ubah/Hapus kartu tema | `aria-label={\`Ubah/Hapus tema ${theme.name}\`}` |
| `src/components/modals/AlbumManagerModal.tsx:553` | Hapus album | `aria-label={\`Hapus album ${album.name}\`}` |
| `src/components/modals/AlbumManagerModal.tsx:605` | Hapus foto | `aria-label="Hapus foto"` |
| `src/components/modals/AlbumManagerModal.tsx:701` | Hapus berkas upload | `aria-label="Hapus berkas"` |

Bukti: `reports/audit/dashboard-themes--superadmin.json`, `dashboard-content-galeri--superadmin.json`.

### Major — diperbaiki

**M1 · Kontras kartu tema gagal AA (`color-contrast`, serious)**
`QuarterTimeline.tsx:137-138` memakai `opacity-60` (tema lampau) / `opacity-85` (mendatang)
pada seluruh kartu. Opasitas meredupkan **teks dan latar bersamaan**, menurunkan rasio
teks 10–12px di bawah 4.5:1 (mis. `#586056` pada latar tergelapkan). Tema "aktif" (opacity 100)
lulus — jadi masalahnya spesifik pada state non-aktif.
**Fix:** buang `opacity-60`/`opacity-85`; bedakan state lewat border/elemen, bukan peredupan teks.

**M2 · Badge "Nonaktif" gagal AA (`color-contrast`, serious)**
`UserManagement.tsx:224`: `text-red-600` di `bg-red-100` ≈ **3.96:1** (butuh 4.5:1, teks 10px).
**Fix:** `text-red-800` (≈5.9:1). Varian gelap sudah aman.

**M3 · Lompatan heading h1→h3 (`heading-order`, moderate)**
`TenantSurveyPage.tsx:1076`: `<h3>` "Kelola Self-Assessment per Event" tanpa `<h2>` pendahulu
(di bawah `<h1>` "Evaluasi Tenant"). Karena **semua** rute `/dashboard/*` untuk `eo_tenant`
di-*redirect* ke `/dashboard/tenant-surveys`, satu cacat ini menjalar ke 14 rute × 1 role.
**Fix:** `<h3>` → `<h2>`.

### Minor / utang desain — backlog redesign

| # | Temuan | Ukuran | Rekomendasi |
|---|--------|--------|-------------|
| m1 | **Target sentuh kecil** | Rail nav 231×36; tombol ikon 28×28/36×36; tab view 74×28; **beberapa kontrol <24px**: 94×16, 52×23, 20×20, input 13×13, tombol pill ×22 | Naikkan ke ≥44px pada permukaan sentuh; **triage elemen <24px** (WCAG 2.5.8) — sebagian mungkin pengecualian sah (inline/space), **belum diverifikasi** |
| m2 | **Lantai tipografi <12px** (DESIGN menyebut lantai 12px) | ±1.278 node-instance lintas run (terhitung ganda antar viewport/tema): 9px×48, 10px×290, 11px×940 | Tetapkan skala tipografi min 12px; audit ulang label mikro |
| m3 | `aria-label` pada elemen generik (`aria-prohibited-attr`, axe *incomplete*) | `PriorityBadge` `<span aria-label>`, `FilterBar.tsx:249` `<div aria-label="Filter aktif">` | Hapus aria-label redundan, atau beri `role`/`aria-labelledby` yang sah |
| m4 | **Batas design-system**: dashboard memakai token `--wf-*` sendiri (kontras terukur, terdokumentasi) terpisah dari `--brand-*` publik | `src/styles/dashboard-wayfinding.css` | Sadari saat redesign: dua sistem token paralel |
| m5 | 16 hex hardcoded (palet kategori & tema) | `CategoryBadge`, `AnnualThemeCrudModal`, `KanbanView` | Pindahkan ke token bila palet distandarkan |

---

## 4. Yang sudah kuat (jangan dirusak redesign)

- **Struktur**: satu `<h1>` + satu landmark `<main>` di 19/19 rute; `<nav>` ada (topbar + rail). Catatan: footer halaman adalah elemen di **dalam** `<main>` (bukan landmark `contentinfo`), dan header memakai `<nav>` (bukan `banner`) — bukan pelanggaran axe, tapi dicatat untuk redesign.
- **Overflow**: 0 luber horizontal di 1440 & 375, terang & gelap (88 run pengukuran: 76 tema×viewport + 12 state).
- **Affordance**: 0 kontrol melipat dua baris (`reports/audit`).
- **Chrome a11y**: skip-link, `inert` pada drawer mobile tertutup, `aria-current="page"`, `aria-expanded` toggle menu.
- **Empty/error state**: ter-render eksplisit ("Antrian kosong", "Belum ada event", "…gagal dimuat") tanpa overflow/console error — bukan disembunyikan.
- **Token kontras**: `--wf-accent` dkk. sudah dipilih dengan kontras terukur (komentar di `dashboard-wayfinding.css`).

---

## 5. Metode & cakupan

| Dimensi | Cakupan |
|---------|---------|
| Rute | 19 (`/dashboard` + insights, analytics, events, drafts, themes, exhibitions, registrations, survey, tenant-surveys, users, activity-log, 6 konten) + `/tenant-survey-results` |
| Role | superadmin · viewer · eo_tenant · tenant_relation |
| Viewport | 1440 (desktop) · 375 (HP) |
| Tema | terang & gelap (disemai via `localStorage['theme']`) |
| State | kaya (data mock) · empty · error |
| Alat | axe-core 4.13 (`wcag2a/2aa/21a/21aa/22aa/best-practice`), `getBoundingClientRect`, `getComputedStyle`, Range client-rects, kontras terhitung |

**Cara menjalankan ulang (reproduksi):**

```bash
npm run test:audit        # seluruh matriks (164 test) → tulis reports/audit/
npm run test:audit:a11y   # GATE axe admin saja (152 test)
npm run test:a11y         # gate a11y PUBLIK (terpisah, rute komunitas)
```

Data di-*mock* via `e2e/audit-dashboard.config.ts` (bentuk row DB mentah: `date_start`, `cover_photo_url`, `mall_avg.overall`, …) — **tanpa backend/seed**. Fixture yang salah bentuk sempat memicu crash palsu (`QuarterTimeline.formatDate`, `SurveyDashboard.RatingBar`) di iterasi awal; sudah dikoreksi dan crash tidak lagi muncul (`consoleErrors: []`).

**Yang TIDAK dicakup** (keputusan scope): modal terbuka, halaman login, permukaan publik.

---

## 6. Verifikasi dijalankan

| Gate | Hasil |
|------|-------|
| `npm run build` (tsc + vite) | ✅ lulus |
| `NODE_ENV=test npx vitest run` | ✅ **711/711** (94 file) |
| `npm run test:audit:a11y` (gate axe **admin**) | ✅ **152/152** (76 role×rute + 76 tema×viewport) |
| `npm run test:a11y` (gate a11y **publik**) | ⚠️ **31/32** — 1 pre-existing |

**Kegagalan publik (di luar scope, pre-existing):** `/events` @1280px **mode gelap** —
`color-contrast` 5 node (`text-slate-500` `#586056` di latar gelap = 2.54:1). Berkasnya
`src/pages/EventsLandingPage.tsx` (permukaan **publik**), **tidak disentuh** sesi ini —
tidak ada berkas yang diubah di `git diff` menyentuh rute publik. Ini **utang publik
terpisah** untuk ditriase sendiri; jangan diklaim hijau.

---

## 7. Aksi berikutnya

1. **Triage utang desain** (m1–m5) ke tiket `docs/tickets/` sebelum redesign.
2. **Redesign shell/navigasi**: prioritaskan skala kontrol (m1) & tipografi (m2) — dua akar utang terbesar.
3. **Satukan atau dokumentasikan** batas token `--wf-*` vs `--brand-*` (m4).
4. **Triase utang publik `/events` dark** (§6) sebagai item terpisah.
5. **Jadikan `npm run test:audit:a11y` gate tetap** untuk perubahan dashboard (harness sudah ter-commit, ADR-006).

---

## 8. Artefak

| Artefak | Lokasi |
|---------|--------|
| Harness audit (spec + config + measure) | `e2e/audit-dashboard.spec.ts`, `e2e/audit-dashboard.config.ts`, `e2e/audit-dashboard.measure.ts` |
| Config Playwright audit | `playwright.audit.config.ts` (port 5175, tanpa reuse server) |
| Script | `package.json` → `test:audit`, `test:audit:a11y` |
| Keputusan | `docs/adr/006-audit-harness-dashboard-di-commit.md` |
| Bukti terukur | `reports/audit/*.json` + `*.png` (gitignored) |
