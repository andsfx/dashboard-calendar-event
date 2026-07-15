# DESIGN.md Compliance Plan

> **Status:** Plan only (belum eksekusi fix)  
> **Tanggal audit:** 2026-07-15  
> **Baseline commit surface pass:** `91c60fe` (`fix(ui): warm product dashboard surfaces to Metmal tokens`)  
> **Sumber kebenaran visual:** root [`DESIGN.md`](../DESIGN.md)  
> **Related:** [`DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md), [`AUDIT-PLAYBOOK.md`](./AUDIT-PLAYBOOK.md), [`ACCESSIBILITY-AUDIT.md`](./ACCESSIBILITY-AUDIT.md)

---

## 1. Ringkas

Repo **belum 100%** mengikuti `DESIGN.md`.

| Layer | Status |
|---|---|
| Shared tokens (warna, radius, type, focus util) | Kuat (~90%+) |
| Product warm surfaces (`ui-dashboard-*`) | Kuat pasca `91c60fe` |
| Campaign public (community / events) | Baik–sangat baik |
| Copy Indonesian-first | Lemah di chrome product + events |
| A11y (sidebar, table actions, survey labels) | Partial |
| Brand residual (violet / blue CTA) | Gap high di gallery + letter |

**Skor audit (estimasi, 2026-07-15):**

| Surface | Skor | Catatan |
|---|---:|---|
| Community landing `/` | 86 | Paling dekat DESIGN |
| Events landing `/events` | 78 | Token OK; copy EN |
| Product/admin dashboard | 72 | Surface OK; copy + a11y |
| Public survey (tenant) | 68 | Form a11y mixed |
| Gallery | 62 | Violet CTA + shell dingin |
| Letter viewer publik | 34 | Blue CTA, shell utility |
| **Overall weighted** | **~70** | |

**Target setelah Sprint A (P0–P1):** overall **≥ 80**.

---

## 2. Prinsip (jangan dilanggar saat fix)

1. **Split surface** (`DESIGN.md` L7): public marketing = campaign; admin/product = compact data-first.  
   - Jangan copy hero / `RevealSection` / CTA marketing ke dashboard.
2. **Shared tokens dulu**, bukan one-off hex di JSX.
3. **Indonesian-first** untuk label UI inti; EN hanya term event yang sudah dikenal.
4. **Primary CTA = solid tosca** — bukan orange→violet, bukan blue generik.
5. **Shortest diff** — class/token swap + copy + a11y; no redesign besar tanpa keputusan terpisah.
6. **`improve/`** out of scope (prototype terpisah).

---

## 3. Sudah selesai (jangan ulangi)

Warm product pass (commit `91c60fe`):

- Utilities: `ui-dashboard-page|chrome|surface|panel|card-padded|control|muted|empty-panel`
- Shell: App dashboard, Navbar, AdminSidebar outer
- Views: EventTable, Calendar, Kanban, Timeline, Featured, charts, drafts, analytics
- Admin survey list/page/dashboard, registration section, users, activity
- Modal shells product (event/draft/letter/album/export/login + `ui/Modal`)
- `typography.css` di-import di `index.css`
- Test: `FilterBar.test.tsx` active tab token

---

## 4. Gap backlog

### P0 — Brand residual publik (High / effort XS–S)

| ID | Gap | File | Acceptance |
|---|---|---|---|
| P0-1 | Letter viewer CTA blue + shell utility | `src/components/PublicLetterViewer.tsx` | Page warm paper; primary CTA solid tosca; `ui-focus-ring`; no `bg-blue-600` |
| P0-2 | Gallery header violet gradient CTA | `src/components/GalleryHeader.tsx` | Solid `var(--brand-tosca)` / `ui-btn-primary`; focus ring dark toggle + key links |

### P1 — Product chrome & a11y (High / S–M)

| ID | Gap | File | Acceptance |
|---|---|---|---|
| P1-1 | Nav/H1 English-first | `dashboardNavigation.tsx`, `AdminSidebar.tsx`, `Navbar.tsx`, H1 di `App.tsx`, judul Command Center | Label ID-first (contoh: Pusat Komando, Jadwal Event, Antrian Draft, Analitik, Manajemen Pengguna, Log Aktivitas) |
| P1-2 | AdminSidebar a11y | `AdminSidebar.tsx` | Escape close mobile; `aria-expanded` hamburger; focus-visible semua item; basic focus trap saat open |
| P1-3 | Focus ring actions | `EventTable.tsx` (+ action icon sejenis di Timeline/Calendar close) | Semua kontrol interaktif pakai `ui-focus-ring` atau pola setara |

### P2 — Public polish (Med–High / S–M)

| ID | Gap | File | Acceptance |
|---|---|---|---|
| P2-1 | Events landing copy EN | `EventsLandingPage.tsx` | CTA/nav/section eyebrow ID-first; term EN hanya jika perlu |
| P2-2 | SurveyPage form rules | `SurveyPage.tsx` | Visible labels identity; submit tidak disabled hanya karena invalid (error on submit); disabled hanya saat submitting |
| P2-3 | RevealSection stub | `CommunityRevealPrimitives.tsx` (+ `PublicShared` / `ui/RevealSection` jika relevan) | Contract DESIGN: `reveal-on-scroll` / visible / stage; hormati reduced-motion |
| P2-4 | Gallery card warmth | `GalleryIndexPage.tsx`, `GalleryAlbumPage.tsx`, `CommunityGallery.tsx` | Warm card / soft border; radius selaras campaign di mana masuk akal; lazy + alt tetap |

### P3 — Hygiene (Med–Low / S)

| ID | Gap | File | Acceptance |
|---|---|---|---|
| P3-1 | Local `motion-reduce` | StatCard, FeaturedEvents, Kanban, Timeline, live pulse | `motion-reduce:*` di transform/transition; count-up skip jika reduce |
| P3-2 | CommunityEyebrow tracking | `CommunityRevealPrimitives.tsx` | `tracking-[0.3em]` per DESIGN |
| P3-3 | Dead landing assets | `src/assets/landing/*` | Wire ke surface yang butuh, atau dokumentasi “reserved” / hapus sadar |
| P3-4 | Residual nested putih | modal nested chips/inputs (opsional) | Hanya jika kontras buruk; jangan paksa semua field putih hilang |

### Out of scope (sengaja)

- `improve/**`
- PDF document canvas putih (`ExportPdfModal` preview)
- Redesign full marketing layout dashboard
- Ganti StatCard gradient ke flat tanpa keputusan product terpisah
- E2E visual full suite (opsional setelah Sprint A)

---

## 5. Sprint plan

### Sprint A — Brand + chrome (target skor ≥ 80)

**Urutan eksekusi:**

1. **P0-2** GalleryHeader solid tosca (XS)  
2. **P0-1** PublicLetterViewer brand pass (S)  
3. **P1-1** Indonesian-first nav/H1 (S)  
4. **P1-2** AdminSidebar a11y (M)  
5. **P1-3** EventTable (+sibling) focus rings (S)

**Verify Sprint A:**

```bash
npm run build
npx vitest run
# Manual smoke:
# - /gallery header CTA = tosca solid
# - /letter/:id CTA = tosca, focus ring
# - /dashboard nav labels ID; keyboard Escape sidebar mobile
# - Tab through EventTable actions → visible focus
```

**Definition of Done Sprint A:**

- [ ] Tidak ada CTA violet gradient di gallery header  
- [ ] Tidak ada `bg-blue-600` di PublicLetterViewer  
- [ ] Nav product + H1 utama ID-first  
- [ ] Sidebar mobile: Escape + aria-expanded + focus ring item  
- [ ] Build + unit tests hijau  

### Sprint B — Public polish

1. **P2-1** Events copy ID  
2. **P2-2** SurveyPage form rules  
3. **P2-4** Gallery card warm (tanpa marketing bloat)  
4. **P2-3** RevealSection restore (bisa setelah B1–B2 jika butuh lebih waktu)

**Verify Sprint B:**

```bash
npm run build
npx vitest run
# Manual: /events copy ID; survey submit + labels; /gallery cards warm
# Optional: Playwright visual jika surface visual berubah besar
```

### Sprint C — Hygiene

1. **P3-1** motion-reduce lokal + count-up  
2. **P3-2** eyebrow tracking  
3. **P3-3** assets landing decision  
4. Re-audit skor (explorer/oracle) → update tabel di §1  

---

## 6. Mapping ke DESIGN.md

| DESIGN section | Owner sprint | Catatan |
|---|---|---|
| Color / surfaces / CTA solid tosca | A (P0), tokens existing | Residual violet/blue = P0 |
| Product compact UI | Done surface; A copy/a11y | Jangan campaign scale |
| Landing typography / layout | B events; community already strong | |
| RevealSection / CommunityEyebrow | B–C | Contract component |
| Forms + a11y | A sidebar/table; B SurveyPage | |
| Motion + reduced-motion | C | Global ada; local kurang |
| Copy Indonesian-first | A product; B events | |
| Image guidance | B gallery; community hero OK | |
| QA checklist landing | Manual smoke B | `npm run build` + route checks |

---

## 7. Risiko & mitigasi

| Risiko | Mitigasi |
|---|---|
| Rename nav EN→ID rusak deep link / test string | Cari string di test; update assertion; route path **jangan** diubah |
| Focus trap sidebar terlalu agresif | Trap hanya saat mobile open; restore focus ke hamburger on close |
| Reveal restore regresi LCP/jank mobile | Default reduced-motion off; skeleton stable; test mobile |
| Scope creep “hangatkan semua putih” | Hanya shell/CTA; nested field & PDF canvas boleh putih |

---

## 8. Cara pakai dokumen ini

1. Baca §1–§2 sebelum coding.  
2. Ambil item dari Sprint A berurutan; centang DoD.  
3. Setelah merge: `graphify update .`  
4. Setelah Sprint A/B: update skor di §1 + tanggal.  
5. Jangan commit `.hallmark/` / `graphify-out/` noise.

---

## 9. Log perubahan plan

| Tanggal | Perubahan |
|---|---|
| 2026-07-15 | Plan awal dari deep audit (product 72 / public 68 / overall ~70). Baseline surface warm `91c60fe`. |
| 2026-07-15 | **Sprint A executed:** P0-1, P0-2, P1-1, P1-2, P1-3. See §10. |

---

## 10. Sprint A completion log

| ID | Status | Notes |
|---|---|---|
| P0-2 GalleryHeader solid tosca | Done | `ui-btn-primary`, copy “Jadwal Event”, focus ring dark toggle |
| P0-1 PublicLetterViewer brand | Done | Warm paper, tosca rounded-full CTA, no `bg-blue-600`, focus rings |
| P1-1 Indonesian-first nav/H1 | Done | `dashboardNavigation`, Navbar, AdminSidebar, App H1s, Command Center, admin section titles |
| P1-2 AdminSidebar a11y | Done | Escape close, `aria-expanded`, focus trap mobile, `ui-focus-ring` all items |
| P1-3 EventTable focus rings | Done | Mobile + desktop actions + Ekspor CSV |

**Verify:** `npm run build` pass; `npx vitest run` expected green.

**Next:** Sprint B (events copy, SurveyPage form, gallery cards, RevealSection).
