# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Execution plan doc** (`docs/PLAN_2026-09-17_15-30.md`) — mencatat dua fase audit: Impeccable a11y contrast + Hallmark anti-pattern.

### Fixed
- **Aksesibilitas — kontras ikon pada tint background** (`babe937`): ikon `*‑500` diganti ke `*‑700` (amber, primary, red) di `ToastContainer.tsx`, `EventAreaManagerModal.tsx`; teks placeholder `SearchBar.tsx` dari `slate‑500` ke `slate‑600`.
- **Aksesibilitas — kelas mati** (`babe937`): `.landing‑grid` dihapus dari `motion.css` (tidak terpakai).
- **UI — bare `transition` pada permukaan publik** (`50317ba`): 8 lokasi di `FeaturedEvents`, `CommunityEventAreas`, `CommunityBenefits`, `CommunityUpcomingEvents` diganti ke `transition‑shadow`, `transition‑colors`, atau `transition‑transform` agar ring fokus tidak ikut teranimasi.
- **Aksesibilitas — skip link tidak fokusable** (`1931ed4`): 13 `<main id="konten-utama">` publik kini punya `tabIndex={-1}` agar skip link benar-benar memindahkan fokus (bug yang sama sudah difix di dashboard). Target `#calendar` dan `#register` juga dibuat fokusable. `ExhibitionsLandingPage` kini punya skip link.
- **Aksesibilitas — tombol terlalu kecil** (`1931ed4`): tombol clear `SearchBar` dan tombol naik/turun `EventAreaManagerModal` diperbesar ke target 28×28px (WCAG 2.5.8). Tombol reorder kini juga punya `aria-label` (sebelumnya hanya `title`).
- **Layar putih di produksi** (`5ec459a`): `ErrorBoundary` yang sudah ada ternyata tidak pernah di-import — error runtime apa pun membuat React meng-unmount seluruh tree tanpa UI pemulihan. Kini `<App />` dibungkus `ErrorBoundary`. Ditambah listener `vite:preloadError` untuk memulihkan kegagalan muat chunk basi setelah deploy (HTML ter-cache di edge menunjuk hash aset lama).
- **Crash `EventTable` saat `areaId` menunjuk area tak dikenal** (`1fadac8`): akar penyebab layar putih `/dashboard` setelah login. `areaMap.get(areaKey)!.name` melempar `TypeError` bila ada event dengan `areaId` yang tidak ada di daftar `areas` (area dihapus/nonaktif). `areaId` tak ter-resolve kini diperlakukan sebagai `__unmapped__` → tampil "Tanpa lokasi". Ditambah test regresi.

### Changed
- **Stamp `tokens.css`** (`50317ba`): `custom (Graphify‑tosca)` → `custom (Metmal tosca/pink warm paper)`; tambahan baris `design‑system: DESIGN.md (root)` untuk mencegah drift audit berikutnya.