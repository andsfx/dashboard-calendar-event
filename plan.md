# Plan: Audit + Resume Dashboard Admin — schedule-event-v2

## Intent summary

Audit dashboard admin **Metropolitan Mall Bekasi / schedule-event-v2** via graphify + kode. Temukan progress terhenti. Lanjut sebagai **HTML prototype desktop** (admin ops shell) yang menampilkan status modul, temuan, dan checklist resume — bukan rebuild app React.

| Field | Locked |
|---|---|
| Audience | Admin internal schedule-event |
| Deliverable | Desktop web HTML: shell admin + audit resume |
| Brand | Metmal DESIGN.md (tosca `#00918e`, paper/warm card, Plus Jakarta + system serif) |
| Platform | Desktop web |
| Done means | Satu file HTML interaktif: navigasi modul, status real dari codebase, checklist resume yang bisa di-toggle; siap handoff ke Design mode / implementasi |

---

## 1. Aesthetic goal (Creative Director)

### Apa artinya “bagus” di sini

| Axis | Target |
|---|---|
| Audience | Ops admin mall — butuh scan cepat, bukan marketing polish |
| Goal | Transparansi status modul + prioritas resume kerja terhenti |
| Brand feel | Compact, trusty, tosca structure; warm paper surface (bukan SaaS indigo) |
| Density | Medium-high (data tables, status chips, checklist) |
| Type | Body: Plus Jakarta Sans. Display sparingly: system serif untuk page titles |
| Color | Neutrals 80% + **satu accent tosca** (max 2 visible uses/screen: active nav + 1 CTA) |
| Motion | Minimal: tab switch, row hover 120ms ease-out — no decorative motion |
| Anti-patterns | Purple/indigo gradients · emoji icons · left-border accent cards · invent metrics · Inter/Roboto display · generic “feature 1/2/3” |

### Style direction (locked)

**Metmal admin utility** = tech-utility density + brand tosca/paper dari `DESIGN.md` sumber repo.

Tokens untuk Design mode:

```css
--bg: #fbfaf7;
--surface: #fffdf9;
--surface-warm: #faf6ef;
--fg: #0f172a;
--muted: #64748b;
--border: rgba(15, 23, 42, 0.06);
--accent: #00918e;
--accent-hover: #007a78;
--accent-dark: #00554c;
--success: #059669;
--warn: #d97706;
--danger: #e11d48;
--font-display: "Iowan Old Style", Palatino, Georgia, serif;
--font-body: "Plus Jakarta Sans", "Segoe UI", sans-serif;
--font-mono: ui-monospace, "Cascadia Code", Consolas, monospace;
```

---

## 2. Resource map (dipilih & alasan)

| Resource | Why |
|---|---|
| **graphify** (graphify-out di repo) | God nodes, community Admin Sidebar Nav, Dashboard Admin Route-Based Navigation, PROGRESS SUMMARY |
| **Repo DESIGN.md + tokens.css** | Brand truth — outrank Direction library |
| **dashboardNavigation.tsx / AdminSidebar / App.tsx** | Source of truth modul & routes |
| **DASHBOARD_REFACTOR.md** | Progress nav route-based = **done** |
| **ACTION-PLAN / AUDIT-REPORT / DEPLOYMENT-VERIFICATION** | Debt & stalled security/ops items |
| **Skill creative-director** | Aesthetic bar + anti-slop gate |
| **Skill design-md / brand-guidelines** | Token binding saat generate HTML |
| **Plugin industrial-brutalist-ui / digits-fintech-swiss** | *Skip* — bentrok warm Metmal |
| **MCP charts / 21st.dev** | Optional nanti untuk chart tren; prototype v1 CSS bars cukup |

Tidak butuh form aesthetic lagi — brief + brand sudah cukup.

---

## 3. Temuan audit (graphify + kode)

### 3.1 Yang sudah jalan (jangan ulang)

| Modul | Route | Source | Status |
|---|---|---|---|
| Pusat Komando | `/dashboard` | `CommandCenterSummary`, `DashboardStats` | **Live** |
| Analitik | `/dashboard/analytics` | `AnalyticsDashboard.tsx` | **Live** |
| Jadwal Event | `/dashboard/events` | `DashboardViewsSection` | **Live** |
| Antrian Draft | `/dashboard/drafts` | `AdminDraftSection` | **Live** |
| Tema Tahunan | `/dashboard/themes` | `QuarterTimeline` | **Live** |
| Pendaftaran | `/dashboard/registrations` | `CommunityRegistrationSection` | **Live** |
| Survey Kepuasan | `/dashboard/survey` | `SurveyDashboard` | **Live** |
| Evaluasi Tenant | `/dashboard/tenant-surveys` | `TenantSurveyPage` | **Live** |
| Hasil Evaluasi Tenant | `/tenant-survey-results` | `TenantSurveyResultsPage` | **Live** (standalone) |
| Manajemen Pengguna | `/dashboard/users` | `UserManagement.tsx` | **Live** (superadmin) |
| Log Aktivitas | `/dashboard/activity-log` | `ActivityLog.tsx` | **Live** |
| Konten (Landing / Album / Surat) | modal callbacks | `DashboardModals` | **Live** (bukan route) |
| Route-based sidebar | `AdminSidebar` + `Link` | `DASHBOARD_REFACTOR.md` | **Done** |

Graph communities relevan: Admin Sidebar Nav · Analytics Dashboard · Activity Log · User Management · App Shell Routing · Dashboard Admin - Route-Based Navigation.

### 3.2 Progress terhenti / debt (resume di sini)

| ID | Item | Evidence (patch 2026-07-23 · R1+R7) | Severity | Status | Next action |
|---|---|---|---|---|---|
| R1 | `useDashboardSection` dead + incomplete | **Re-verify HEAD `f115d30`**: path absent in tree; 0 refs in `src/`. Introduced `719246c` | Low | **Fixed** | On `main` |
| R2 | `FeaturedEvents` scroll ke `#views` | **Re-verify** `FeaturedEvents.tsx:134` `navigate('/dashboard/events')`; `scrollIntoView` hits=0 | Low | **Fixed** | On `main` |
| R3 | Logger production sink | **Re-verify** `logger.ts` `__METMAL_ERROR_SINK__` + `reportError`; no empty TODO | Low | **Fixed** | Optional Sentry when DSN |
| R4 | App.tsx monolit route | **Re-verify** `DashboardShell` + `useDashboardHandlers` in HEAD; App ~804 LOC. `f115d30` = `origin/main` | Medium | **Fixed** | On `main` |
| R5 | ACTION-PLAN Phase 1 security | Ops **deferred**. Local dirty `ACTION-PLAN.md` / `improve/*` **not** on remote | **Critical** (ops) | **Deferred** | Reopen: rotate · RLS 1.2 · cache 1.3 |
| R6 | DEPLOYMENT-VERIFICATION stale | **Re-verify** Known Issues: no “55 TS”; SoT `npm run build` | Low | **Fixed** | On `main` |
| R7 | `useDashboardSection` vs actual paths | Dual map gone; SoT `dashboardNavigation` `getDashboardNavGroups` / `getAllowedDashboardPaths` | Low | **Fixed** | On `main` |

### 3.2b Remote HEAD re-verify (2026-07-23)

| Check | Result |
|---|---|
| Local HEAD | `f115d3020b23d700769d9a69735c8755931aeb1f` |
| `origin/main` | **same** (after `fetch`) · branch `main...origin/main` clean for audit commits |
| Graphify | 3330 nodes · 4987 edges · 337 communities · 97% EXTRACTED — **stale** for new symbols (`DashboardShell` / `useDashboardHandlers` not in graph; AST update pending) |
| Dirty local (not audit scope) | `ACTION-PLAN.md`, `improve/*`, PDF utils, pnpm* — leave unstaged |

Patch R1+R7: prefer-delete applied. Nav covers tenant-surveys + `/tenant-survey-results`.

#### R1+R7 path map (re-verify HEAD `f115d30`)

Hook **gone**. SoT only: `src/components/dashboard/dashboardNavigation.tsx` — `getDashboardNavGroups` + `getAllowedDashboardPaths` include tenant-surveys (L90) + `/tenant-survey-results` (L74). Historical dual-map mismatch closed by delete.

### 3.3 Bukan “terhenti UI” (jangan mis-label)

- Type errors 55 di DEPLOYMENT-VERIFICATION: **superseded** oleh AUDIT-REPORT progress (0 type errors) — verifikasi `tsc` di Design/impl mode.
- Console statements: debt tooling, bukan gap modul admin.
- Invented product metrics: **dilarang** di artifact — pakai status label (Live / Stalled / Debt) saja.

---

## 4. PRD prototype HTML (Design mode target)

### 4.1 Users & jobs

| User | Job |
|---|---|
| Admin ops | Scan modul mana live, mana broken link, mana debt |
| Superadmin / PM | Prioritas resume R1–R7 |
| Desainer / agent Design mode | Implement shell yang mirror nav nyata |

### 4.2 Screens (satu file, multi-view)

`admin-dashboard-audit.html` — shell desktop ~1280–1440px:

1. **Sidebar** — mirror grup nav: Ringkasan · Kelola Event · Interaksi · Sistem · Konten  
2. **Top bar** — judul view, role chip “Admin”, dark toggle opsional  
3. **View: Pusat Komando** — kartu modul (status Live/Stalled), attention chips  
4. **View: Audit Resume** (primary new surface) — tabel R1–R7, filter severity, checklist toggle + localStorage  
5. **View stubs per modul** — header + 3–5 baris data **labelled sample** (bukan fake KPI growth) + file source path monospaced  
6. **View: Debt ops** — R5 security callout (honest: verify di repo, bukan fake “fixed”)

### 4.3 Layout structure

```
┌────────────┬──────────────────────────────────────┐
│ Brand      │ Topbar: title · severity filter       │
│ Sidebar    ├──────────────────────────────────────┤
│ nav groups │ Main: command cards OR resume table  │
│            │ OR module stub content               │
│ Footer     │                                      │
│ role/user  │                                      │
└────────────┴──────────────────────────────────────┘
```

- Sidebar fixed 256px; main `margin-left`  
- Cards: warm surface, soft shadow, **no** left color border  
- Icons: monoline SVG stroke 1.6–1.8, `currentColor`  
- Status chips: Live=emerald · Stalled=amber · Debt=rose · Done=slate  

### 4.4 Interaction rules

- Nav click → switch view (no full reload); persist last view di `localStorage`  
- Checklist resume: toggle done/undone → persist `od-admin-audit-checklist`  
- Filter severity: All / Critical / Medium / Low  
- Hover card: border tosca soft + shadow raised  
- Keyboard: focus ring tosca; no `scrollIntoView`  

### 4.5 Content model (data in-file)

```ts
type ModuleStatus = 'live' | 'stalled' | 'debt' | 'modal';
type Module = { id, label, route, group, status, sourceFiles[], notes }
type ResumeItem = { id, title, severity, evidence, nextAction, done: boolean }
```

Seed dari tabel §3 — **jangan** isi angka event/revenue palsu.

### 4.6 Acceptance checks (Design mode)

- [ ] File: `admin-dashboard-audit.html` standalone  
- [ ] Tokens Metmal di `:root`; 0 indigo default  
- [ ] Sidebar groups match `getDashboardNavGroups`  
- [ ] Semua modul §3.1 muncul dengan status  
- [ ] Semua R1–R7 di checklist, toggle + localStorage  
- [ ] `data-od-id` pada region/nav/cards  
- [ ] Desktop first; no horizontal overflow 1280px  
- [ ] Copy bahasa Indonesia (admin voice)  
- [ ] Critique axes ≥ 4 (clarity, hierarchy, type, brand; motion optional)  

---

## 5. Out of scope (explicit)

- Edit kode React di `D:\Andy\Antigravity\schedule-event-v2` (read-only context)  
- Implement Sentry / rotate secrets  
- Multi-file screen split (kecuali user minta)  
- Mobile redesign  

---

## 6. Open questions / TODO editor

- [x] **R5 UI:** 1 callout Critical di Resume (bukan panel Ops terpisah).  
- [x] **Dark mode:** light only (admin paper).  
- [x] **R2 di repo React:** di luar scope HTML — butuh permission eksplisit untuk edit linked folder.  
- [x] **Polish pass §4.3 icon stroke:** deviated from plan `1.6–1.8` → `1.4` (cleaner at 15px in high-density shell). CD-approved.  
- [x] **Dep map SVG (Analitik view):** added post-ship — bipartite source→module graph, hover-highlight, 0 library deps.  
- [x] **Accessibility fix:** `<main>` landmark, `scope="col"` on all `<th>`, contrast repair (`#94a3b8`→`var(--muted)`), Indonesian table headers.  
- [x] **Typography fix:** `font-weight:510`→`500` (invalid PJS weight), `#475569`→`var(--muted)`, 9px→10px mini-labels.  
- [x] **Empty state contextual icons:** checkmark for success, search for filter-miss.  
- [x] **Spacing rhythm:** tightened audit resume meta→progress gap 18px→12px.

---

## 7. Critique criteria (post-generate)

| Axis | Pass bar |
|---|---|
| Clarity | 5s: admin tahu apa yang stalled |
| Hierarchy | Resume table > decorative chrome |
| Typography | Caps tracking ≥ 0.06em; display negative track |
| Motion | Functional only |
| Brand | Tosca + paper; pink max 1 signal/region |

Target critique score ≥ 4 sebelum stop refine.

---

## Status

**SHIPPED + POLISHED (prototype HTML)** — `admin-dashboard-audit.html` live.

Design workflow: **closed** · 2026-07-23 · Creative Director sign-off.

| Closure item | Verdict |
|---|---|
| Prototype HTML | ✅ Shipped · 1349 lines · single-file |
| Design token system | ✅ 18 CSS vars, all consumed via `var(--)` |
| Anti-slop gates | ✅ 58/58 Hallmark slop test pass |
| Critique threshold | ✅ 8.7/10 (`critique.json`) · pre-emit ≥ 4 on all axes |
| Polish items | ✅ 10 fixes applied post-ship (contrast, a11y, typography, spacing, icons) |
| Dep map | ✅ SVG source→module graph added to Analitik |
| R1–R4, R6–R7 | ✅ Code-scope audit closed on `main` (`f115d30`) |
| R5 (security ops) | ⏸ Deferred by user — reopen on deploy window |
| plan.md | ✅ Updated to reflect current artifact state |

| Acceptance §4.6 | Status |
|---|---|---|
| Standalone HTML | ✅ |
| Metmal tokens, 0 indigo | ✅ |
| Sidebar mirror `getDashboardNavGroups` | ✅ (+ Konten + Hasil Evaluasi Tenant + Audit) |
| Modul §3.1 + status | ✅ 12 live |
| R1–R7 checklist + localStorage | ✅ key `od-admin-audit-checklist` |
| `data-od-id` regions | ✅ |
| Desktop first | ✅ |
| Copy ID | ✅ |
| Critique ≥ 4 | ✅ 8.7/10 (`critique.json`) · Hallmark pre-emit: P4 H4 E4 S5 R4 V4 |
| Icon stroke §4.3 | ⚠️ 1.4 (deviation approved — 1.6+ heavy at 15px) |
| Accessibility | ✅ `<main>` landmark · scope=col · contrast · Indonesian headers |
| Dep map (post-plan) | ✅ SVG bipartite graph in Analitik view |

### Verifikasi kode (graphify + repo, 2026-07-23 · R3+R5 patch)

| ID | Re-check | Result |
|---|---|---|
| R1 | `useDashboardSection.ts` deleted · 0 remaining imports di `src/` | **Fixed** |
| R2 | `FeaturedEvents.tsx:134` `navigate('/dashboard/events')` | **Fixed** — main `src/` |
| R3 | `logger.ts` prod sink `__METMAL_ERROR_SINK__` + `reportError` | **Fixed** |
| R4 | `DashboardShell` + `useDashboardHandlers` · App ~851 LOC | **Fixed** · handlers `f115d30` pushed |
| R5 | code harden OK · ops rotate/RLS/cache **deferred** (user skip) | **Deferred** |
| R6 | `DEPLOYMENT-VERIFICATION.md` Known Issues refreshed | **Fixed** |
| R7 | dual path map removed; nav SoT | **Fixed** |

**R3 applied:** documented prod error sink, no new deps.  
**R5 deferred:** code harden kept; ops rotate/RLS/cache **skipped by user** 2026-07-23 — not fake-fixed.  
**R1+R7 applied:** deleted dead hook. Worktree `security-p0/` out of main tree.  
**R6 applied:** stale “55 TS errors” removed; gate = `npm run build`.  
**R4 applied:** `DashboardShell.tsx` chrome + `useDashboardHandlers.ts` (modal/CRUD handlers). Handlers commit `f115d30` pushed.

## Next (ops / impl)

1. ~~**R2** (1-line navigate)~~ ✅ Done.
2. ~~**R1/R7** delete dead hook~~ ✅ Done 2026-07-23.
3. ~~**R3** logger prod sink~~ ✅ Done 2026-07-23.
4. ~~**R6** doc refresh~~ ✅ Done 2026-07-23.
5. ⏸ **R5 ops deferred** (user skip): rotate keys · RLS 1.2 · vercel cache 1.3 — reopen on deploy window.
6. ~~**R4** extract `DashboardShell`~~ ✅ Done 2026-07-23.
7. ~~**R4 residual** `useDashboardHandlers`~~ ✅ Done 2026-07-23 · `f115d30` pushed.
8. Code-scope audit **closed** (R5 ops parked).

### Commit 2026-07-23 — chrome audit **pushed**

- **Hash:** `719246c` (rebased from `2afcd58`) — `fix(dashboard): close audit items R1–R4, R3, R6, R7`
- **+288 / −183** · 8 files
- **In commit:** App · DashboardShell · logger · delete useDashboardSection · FeaturedEvents · DASHBOARD_REFACTOR · DEPLOYMENT-VERIFICATION · logger.selfcheck

### Commit 2026-07-23 — handlers extract **pushed**

- **Hash:** `f115d30` — `refactor(dashboard): extract useDashboardHandlers from App`
- **+633 / −415** · 3 files · `main` = `origin/main`
- **Remote:** https://github.com/andsfx/dashboard-calendar-event (`719246c..f115d30`)
- **In commit only:** `src/hooks/useDashboardHandlers.ts` · `src/App.tsx` · `DASHBOARD_REFACTOR.md`
- **Out of commit (constraint):** ACTION-PLAN · improve/* · PDF WIP · .claude · pnpm* · R5 ops

Opsional next: PDF handoff · reopen R5 ops.
