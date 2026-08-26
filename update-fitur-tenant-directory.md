# Update Fitur: Direktori Tenant Publik — Rencana Implementasi

Status: RENCANA (belum dieksekusi) · Repo: schedule-event-v2 · 2026-08-26
Sumber domain: `CONTEXT.md` (Fitur Sistem — Publik; Evaluasi Tenant) · Basis data: MID loyalty API (eksternal) · Terkait: `api/tenant-survey.js` (proxy MID), `src/components/survey/TenantSurveyResultsPage.tsx` (roster publik)

## 1. Ringkasan

Kondisi saat ini: data tenant Metropolitan Mall Bekasi (nama, lantai, lot, kategori, logo) **sudah tersedia** via MID loyalty API eksternal `https://apiloyalty.metropolitanland.com/getAllTenants` (`mid-api-key`) dan sudah diproxy `api/tenant-survey.js` (`fetchMidActiveTenants` L87-116). Publik sudah bisa mengaksesnya dalam bentuk terbatas:
- `mode=public&action=tenants` — pencarian minimal 2 huruf, 50 hasil, tanpa PIC (L458-485);
- `mode=public&action=results-roster` — seluruh roster tanpa PIC, rate-limited 12 req/menit/IP (L286-304), dipakai tab "Checklist tenant" di `/tenant-survey-results`.

**Tapi belum ada halaman publik direktori tenant** yang terstruktur (per kategori + pencarian) di Community Hub. Pengunjung web mall tidak punya cara melihat "tenant apa saja yang ada di Metmal" — data sudah ada, tampilannya belum.

Target: halaman publik `/tenants` — daftar tenant dikelompokkan per kategori, dengan pencarian (nama/kategori/lantai) dan kartu berisi logo + kategori + lantai/lot. Tanpa PIC/kontak internal (PII tetap tertutup, konsisten rules `src/components/survey/rules.md`: "PII stripped").

Non-goal: halaman detail per tenant, peta lantai interaktif (roadmap lanjutan — lihat §11), CRUD admin tenant, cache server, kontak/promo per tenant, integrasi program voucher tenant (`draft-voucher-tenant.md` terpisah, keputusan Andy: document-only).

## 2. Evaluasi kandidat (ranking dengan bukti)

| Rank | Kandidat | Bukti domain (dari kode/CONTEXT) | Verdict |
|---|---|---|---|
| **1** | **Direktori Tenant Publik** | Data tenant lengkap (name/floor/lot/category/logo) tersedia via MID API dan **sudah diproxy** publik tanpa PIC (`api/tenant-survey.js` L87-116 `fetchMidActiveTenants`, L286-304 `results-roster`, L458-485 `tenants`). Tipe `TenantRosterItem` sudah ada (`surveysApi.ts` L399). Tidak ada halaman publik direktori → celah nyata. | **PILIH** — domain fit kuat (direktori tenant = fitur standar web mall; mendukung branding Community Hub & materi presentasi GM per CONTEXT.md), risiko kecil (tanpa migrasi DB/RLS baru, reuse proxy MID + rate-limit yang sudah teruji), **tidak tumpang tindih** fitur news/sponsorship/album/registrasi/survey. |
| 2 | Export registrasi event ke CSV/Excel (filter per event) | `community_registrations` **tidak punya kolom `event_id`** — hanya `preferred_date` (migrate/community-registrations.sql L1-13) → premis "filter per event" **tidak cocok schema** (filter yang valid: status/community_type/preferred_date). Export CSV sudah ada untuk Event (`EventTable.tsx` L39-49), Survey Kepuasan (`api/survey.js` L492-524), Evaluasi Tenant (`api/tenant-survey.js` L1256-1283) — registrasi adalah satu-satunya yang belum. | Tidak dipilih — nilai domain internal-ops (kenyamanan admin), overlap dengan fitur **registrasi** yang sudah ada (butuh tombol di `CommunityRegistrationSection`), dan premis filter per event salah untuk schema. |
| 3 | Recap/evaluasi pasca-event (ringkasan survey tenant per event) | **Sudah terimplementasi luas**: `/tenant-survey-results` dengan tab Ringkasan/Checklist/Bagikan/Detail + filter per event + KPI + distribusi + Top Gerai (`TenantSurveyResultsPage.tsx` L339-343, L736-739, L880-912), agregat + PDF export (`tenantSurveyResultsAggregate.ts`, `tenantSurveyResultsPdf.tsx`, `downloadTenantSurveyResultsPdf`), ringkasan per event via RPC `get_tenant_survey_event_summary` (`surveysApi.ts` L338-342), analitik visitor survey + CSV (`SurveyDashboard.tsx` L92-95). | **Tolak** — kandidat ini duplikasi nyata; overlap tinggi dengan fitur **survey** (Evaluasi Tenant), termasuk fitur yang persis diminta (ringkasan hasil survey tenant per event). |
| — | Alternatif lain (d): Executive Event Recap (gabungan event + survey + gallery) | Spek `docs/SPEC.md` §5-6: survey kepuasan & evaluasi tenant sudah punya analitik/export; gallery punya halaman sendiri. Menggabungkan semuanya = scope besar + overlap 3 fitur. | Tolak — sama-sama overlap, risiko lebih besar dari kandidat 1. |

Alasan pemilihan final: **Direktori Tenant Publik** adalah satu-satunya kandidat yang (a) fit domain mall nyata, (b) memakai aset data yang **sudah ada** (MID proxy) sehingga risiko rendah tanpa schema baru, dan (c) tidak menyentuh scope fitur news/sponsorship/album/registrasi/survey — malah memperkuat posisi Community Hub sebagai platform digital mall (angle presentasi GM di `CONTEXT.md`).

## 3. Keputusan desain

| # | Keputusan |
|---|---|
| D1 | **Tidak ada tabel Supabase baru, tidak ada migrasi SQL, tidak ada RLS baru.** Sumber kebenaran tenant = MID API eksternal (single source of truth, sama seperti form survey & roster). |
| D2 | Endpoint publik baru `GET /api/tenant-survey?mode=public&action=directory` — reuse `fetchMidActiveTenants()` + rate limit `enforcePublicResultsRateLimit` (pola `results-roster` L288), output `{ id, name, floor, lot, category, logo }` **tanpa PIC/telp** (pola minimal-fields `handlePublicTenants` L472-476). |
| D3 | Kategori ditampilkan sebagai raw `category` dari MID — **tidak** memakai mapping `apiCategoryToKategori` (`TenantSurveyShared.tsx` L26-...) yang khusus untuk opsi form survey; direktori dan form survey punya kosakata kategori berbeda. |
| D4 | Pencarian client-side (dataset puluhan-ratusan tenant sudah di-fetch penuh; pola input cari roster `TenantSurveyResultsPage.tsx` L774-777). Tanpa dependency baru. |
| D5 | UI publik = file baru `TenantDirectoryPage` pola `NewsIndexPage` (self-fetch, header inline + dark toggle, footer) + route `/tenants` + link "Tenant" di nav landing. |
| D6 | Degradasi MID (timeout 12s, error CONFIG/UPSTREAM, 429) → state error/empty yang ramah ("Direktori tenant sedang tidak tersedia, coba lagi nanti"), pola fallback `fetchPublicTenantRoster` yang return `[]`. **Tanpa cache server** di iterasi ini. |
| D7 | **Tidak ada admin UI** — fitur publik read-only; rantai wiring admin (dashboardNavigation → … → App.tsx) **tidak berubah** (detail §8). Kurasi tenant (sembunyikan/ganti kategori) butuh tabel baru → risiko naik → di luar scope. |
| D8 | Tidak menambah `supabase_realtime`; tidak menyentuh tabel/RLS existing; tidak menyentuh action `tenants`/`results-roster`/`tenant-roster` yang dipakai form survey & hasil evaluasi. |

## 4. Database — TIDAK ADA (dengan alasan)

Tidak ada file `migrate/*.sql` baru. Bukti: folder `migrate/` tidak memiliki tabel tenant (`tenants.sql` tidak ada); semua data tenant berasal dari MID API via `api/tenant-survey.js` (`fetchMidActiveTenants`, L87-116). Opsi tabel cache `tenant_directory_cache` sengaja **ditolak**: menambah migrasi + RLS + risiko staleness, padahal `results-roster` sudah membuktikan pola rate-limit publik tanpa cache cukup untuk traffic halaman ini.

## 5. Server API

### 5.1 `api/tenant-survey.js` — tambah 1 case + 1 handler (tidak menyentuh handler existing)

- Switch publik (dekat L53-60, setelah `results-roster`):

```js
case 'directory': return await handlePublicDirectory(req, res);
```

- Handler baru `handlePublicDirectory` (pola `handlePublicResultsRoster` L286-304):

```js
async function handlePublicDirectory(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });
  // MID upstream mahal — rate limit sama dengan results-roster
  if (!enforcePublicResultsRateLimit(req, res, 'directory', 12, 60_000)) return;
  try {
    const tenants = await fetchMidActiveTenants(); // { id, name, floor, lot, category, logo }, tanpa PIC
    tenants.sort((a, b) => a.name.localeCompare(b.name, 'id'));
    return res.json({ success: true, tenants, total: tenants.length });
  } catch (err) {
    console.error('[tenant-survey/public/directory]', err);
    if (err?.code === 'CONFIG') return res.status(500).json({ success: false, error: 'Konfigurasi server tidak lengkap' });
    if (err?.code === 'UPSTREAM') return res.status(502).json({ success: false, error: 'Layanan data tenant sedang bermasalah' });
    return res.status(500).json({ success: false, error: 'Gagal mengambil direktori tenant' });
  }
}
```

### 5.2 `api/_lib/schemas.js` — TIDAK ADA perubahan

`tenant-survey.js` **tidak** memakai `ACTION_SCHEMAS` zod (itu milik `supabase-admin.js`); validasi endpoint ini cukup via query param `mode`/`action` (pola semua action publik di file yang sama). Menambahkan schema zod di `supabase-admin.js` justru salah tempat — fitur ini publik anon, bukan admin action.

## 6. Client API — `src/utils/api/surveysApi.ts`

Pola: `fetchPublicTenantRoster` (L409-416) yang sudah ada.

```ts
/** Direktori tenant publik — MID proxy, tanpa PIC/telp. 429/error → [] (degradasi UI). */
export async function fetchPublicTenantDirectory(): Promise<TenantRosterItem[]> {
  try {
    const res = await fetch('/api/tenant-survey?mode=public&action=directory');
    if (res.status === 429) return [];
    if (res.ok) { const json = await res.json(); if (json.success && Array.isArray(json.tenants)) return json.tenants as TenantRosterItem[]; }
  } catch {}
  return [];
}
```

### 6.1 `src/utils/supabaseApi.ts` — tambah re-export

Blok tenant survey (L72-77) tambah:

```ts
fetchPublicTenantDirectory,
```

## 7. Tipe — `src/types.ts` TIDAK BERUBAH

Shape direktori = `TenantRosterItem { id; name; floor; lot; category; logo }` yang **sudah ada** di `src/utils/api/surveysApi.ts` (L399) dan sudah dipakai publik (`results-roster`). Tidak perlu tipe baru di `src/types.ts` — hindari duplikasi (pola jenis tipe API-scoped di `surveysApi.ts`).

## 8. Admin UI — rantai wiring: TIDAK BERUBAH (per-file)

Fitur ini publik read-only; tidak ada modal admin, tidak ada state baru, tidak ada item navigasi dashboard. Status per file rantai (template `update-fitur-sponsorship.md` §7.2):

| File rantai | Perubahan |
|---|---|
| `src/components/dashboard/dashboardNavigation.tsx` | Tidak ada (tidak ada item nav/icon/callback baru) |
| `src/components/dashboard/AdminSidebar.tsx` | Tidak ada |
| `src/components/dashboard/DashboardShell.tsx` | Tidak ada |
| `src/components/dashboard/DashboardPage.tsx` | Tidak ada |
| `src/components/dashboard/DashboardModals.tsx` | Tidak ada |
| `src/hooks/useSiteSettingsHandlers.ts` | Tidak ada |
| `src/hooks/useDashboardHandlers.ts` | Tidak ada |
| `src/App.tsx` | **Ya, tapi sisi publik** (route + lazy import, §9.3) — bukan rantai admin |

Catatan: bila nanti dibutuhkan kurasi admin (sembunyikan tenant, rename kategori), itu memerlukan tabel Supabase baru + modal + rantai di atas — sengaja ditunda agar risiko tetap kecil (D7).

## 9. Publik UI

### 9.1 File baru `src/components/TenantDirectoryPage.tsx` — pola `NewsIndexPage`

- Props `{ isDark: boolean; onToggleDark: () => void }`.
- Self-fetch `fetchPublicTenantDirectory()` (useEffect mount); state `tenants, isLoading, fetchError, query, activeCategory`.
- Header inline pola `NewsIndexPage` (logo `mallLogo` + label "Direktori Tenant" + tombol Kembali `window.history.length > 1 ? back() : '/'` + dark toggle).
- Hero ringkas: "Direktori Tenant Metropolitan Mall Bekasi" + stats kecil (total tenant, jumlah kategori unik).
- Toolbar: input pencarian (filter `name`/`category`/`floor`, case-insensitive) + pill kategori (unique `category` di-sort, "Semua" + tiap kategori).
- Grid kartu tenant: logo (`t.logo`, `img` dengan fallback icon `<Store />`), nama, badge kategori, lantai/lot (icon `MapPin`). Tanpa link detail (non-goal).
- Empty state: "Belum ada data tenant." / hasil filter kosong: "Tidak ada tenant cocok."
- Error state MID/429: "Direktori tenant sedang tidak tersedia. Coba lagi nanti." (degradasi D6).
- Footer `© {new Date().getFullYear()} Metropolitan Mall Bekasi — Metland Coloring Life`.

### 9.2 `src/components/CommunityLandingPage.tsx`

- `NAV_ITEMS` (L50-58): tambah `{ href: '/tenants', label: 'Tenant' }` setelah `{ href: '#news', label: 'Berita' }`. Nav dirender sebagai `<a href={item.href}>` (L141-149) — href non-hash sudah didukung (navigasi penuh), pola sama dengan link eksternal/route lain.

### 9.3 Route — `src/App.tsx`

- Lazy import (pola L24-30):

```tsx
const TenantDirectoryPage = lazy(() => import('./components/TenantDirectoryPage').then(m => ({ default: m.TenantDirectoryPage })));
```

- Route setelah blok `/sponsor` (L328-333):

```tsx
<Route path="/tenants" element={
  <Suspense fallback={<DashboardSkeleton isAdmin={false} />}>
    <TenantDirectoryPage isDark={isDark} onToggleDark={toggleDark} />
  </Suspense>
} />
```

## 10. Verifikasi (saat eksekusi nanti)

1. `npm run build` — tsc + vite, 0 error.
2. API manual: `GET /api/tenant-survey?mode=public&action=directory` → 200 `{ success, tenants, total }`, setiap item HANYA `{ id, name, floor, lot, category, logo }` (tidak ada PIC/telp); >12 req/menit/IP → 429; `MID_API_KEY` tidak diset → 500 graceful (bukan crash).
3. Publik: `/tenants` tampil daftar per kategori; pencarian nama/lantai/kategori berfungsi; kartu logo tampil (fallback icon bila logo kosong); footer + dark toggle OK; tidak ada data kontak/PIC bocor.
4. Landing: nav "Tenant" menuju `/tenants` (desktop + mobile).
5. Non-regresi: combobox pilih gerai di form survey (`action=tenants`), tab Checklist di `/tenant-survey-results` (`action=results-roster`), dan export CSV (`action=export`) tetap berfungsi — tidak ada yang disentuh.
6. Unit: `npx vitest run --dir src --maxWorkers=2` — tidak regresi (fitur UI publik diverifikasi via browser; tidak ada unit test baru wajib).

## 11. Catatan implementasi

- `fetchMidActiveTenants()` (`api/tenant-survey.js` L87-116) — reuse, tidak duplikat; sudah strip PIC dan handle timeout 12s + kode error `CONFIG`/`UPSTREAM`.
- `enforcePublicResultsRateLimit` — reuse helper `api/_lib/rateLimit.js`; bucket baru `'directory'` (angka 12/60s mengikuti `results-roster` karena MID upstream mahal).
- `TenantRosterItem` (`src/utils/api/surveysApi.ts` L399) — reuse tipe; tidak tambah di `src/types.ts`.
- `fetchPublicTenantRoster` (L409-416) — pola fungsi baru `fetchPublicTenantDirectory`.
- TIDAK ada migrasi SQL, TIDAK ada perubahan RLS/`supabase_realtime`, TIDAK menyentuh `draft-voucher-tenant.md` (voucher = document-only, keputusan Andy).
- Roadmap lanjutan (di luar scope): peta lantai interaktif dari field `floor`/`lot`, cache `tenant_directory_cache`, kurasi admin kategori — masing-masing perlu desain sendiri.
