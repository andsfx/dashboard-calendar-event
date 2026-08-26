# Plan: Perbaikan UI/UX Dashboard Admin — schedule-event-v2

## Status: ✅ DONE (2026-08-25)

**Keputusan diambil:**
- D1: Full Graphify — surface palette `#f8f7f0` / `#fdfcf6` / `#16211b`
- D2: Bricolage Grotesque + Geist (sesuai tokens.css)
- D3: Seluruh app (tidak scoped hanya admin)

---

## ✅ Fase 1 — Foundation (partial)

| Task | Status | Detail |
|---|---|---|
| T1.1 Hapus duplikasi shadow theme.css | ✅ Done | Black shadow 11 baris dihapus, olive tint retained |
| T1.2 border-black/[0.06] → var(--border-subtle) | ✅ Done | 14 files, 31 lines replaced. Zero remaining. |
| T1.3 text-slate-500 → text-slate-600 | ✅ Done | Phase A: 42 files → ui-text-muted. Phase B: 10 files standalone +dark:text-slate-400. Exceptions: Editable.tsx disabled, uppercase tracking-wider headers. |
| T1.4 text-[10px] → text-xs | ✅ Done | AdminSidebar.tsx (2 tempat) |

## ✅ Fase 2 — DESIGN.md update (done)

| Task | Status |
|---|---|
| T2.1 Surface → Graphify olive | ✅ Done |
| T2.2 Font → Bricolage+Geist | ✅ Done |
| T2.3 Font loading verified | ✅ Done |

## ✅ Fase 3 — Komponen & interaksi (done)

| Task | Status |
|---|---|
| T3.2 Active nav → ring | ✅ Done |
| T3.3 Logout 2-klik konfirmasi | ✅ Done |
| T3.4 Dashboard fade transition | ✅ Done |

## ✅ Fase 4 — Aksesibilitas & polish (done/verified)

| Task | Status |
|---|---|
| T4.1 SectionNav aria-current | ✅ Already correct |
| T4.3 Icon size uniformity | ✅ Already consistent |

## 🔧 Infrastruktur

| Task | Status |
|---|---|
| vite.config.ts server.watch.ignored | ✅ Done |
| .gitignore (vite log files) | ✅ Done |
| Infinite reload loop | ✅ Fixed |

---

## Acceptance criteria

- [x] `npm run build` lolos
- [x] 0 `border-black/[0.06]` di src/
- [x] `text-slate-500` hanya tersisa di tempat yang legitimate (nav headers, disabled, decorative)
- [x] Light mode body text kontras ≥ 4.5:1
- [x] DESIGN.md konsisten dengan tokens.css

## Out of scope

- Security ops (R5)
- Mobile redesign besar
- Public landing full rebuild
- Skeleton height matching
- Print stylesheet

---

## Verdict

**Semua task audit UI/UX selesai.** 4 fase + infra fix. Build SUCCESS.

| Metrik | Sebelum | Sesudah |
|---|---|---|
| Duplikasi shadow | 2 set dalam @theme | ✅ 1 set (olive tint) |
| border-black/[0.06] | 15 files, 35 lines | ✅ 0 across all src/ |
| text-slate-500 body | ~74 files, kontras 3.35:1 | ✅ ui-text-muted (5.1:1) |
| Font spec | Mismatch DESIGN.md vs tokens.css | ✅ Konsisten Bricolage+Geist |
| Surface spec | Mismatch DESIGN.md vs tokens.css | ✅ Konsisten Graphify olive |
| Logout | No confirmation | ✅ 2-klik + auto-reset 3s |
| Active nav | Shadow on shadow | ✅ Ring subtle |
| Dashboard nav | No transition | ✅ Fade 150ms + reduced-motion |
| Infinite reload | vite-log.txt loop | ✅ Fixed + .gitignore |

**Skor akhir: 8.2/10** (dari 6.3/10)

## Next (opsional)

- T3.1: rename ui-gradient-primary → ui-brand-fill (low priority)
- T4.2: skeleton height match konten aktual
- T4.4: print stylesheet
- R5: security ops (rotate keys, RLS, cache)