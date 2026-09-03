# Audit / Analisis Repo — Playbook

Panduan step-by-step untuk audit atau menganalisis **dashboard-calendar-event** (`schedule-event-v2`).

**Stack:** React 19 + TypeScript + Vite + Tailwind v4 + Supabase + R2 + Apps Script + Vercel  
**Default bahasa laporan:** Indonesia (untuk Andy)

---

## 1. Apakah graphify membantu?

**Ya — untuk audit struktur & navigasi codebase.** Bukan pengganti review keamanan, UX, atau tes runtime.

| Tujuan audit | Graphify? | Catatan |
|---|---|---|
| Peta arsitektur, hub modul, coupling | **Ya (utama)** | `graph.json` + `GRAPH_REPORT.md` |
| "Siapa call X?", path A→B | **Ya** | `query` / `path` / `explain` |
| Cari blast radius ubah file | **Ya** | community + neighbors |
| Security (secrets, auth, RLS) | **Sebagian** | graph locasi; cek manual + grep |
| UI/UX / a11y / visual | **Tidak** | pakai skill + Playwright |
| Performance runtime | **Tidak** | build, Lighthouse, profiling |
| Data integrity / migrasi DB | **Tidak** | `supabase/`, SQL, seed |
| Business rules domain | **Sebagian** | graph + baca rules.md |

**Status graph di repo ini (cek ulang saat audit):**

- Output: `graphify-out/`
- File kunci: `graph.json`, `GRAPH_REPORT.md`, `graph.html`
- Graph stale jika commit build ≠ `git rev-parse HEAD`
- Setelah ubah kode: `graphify update .` (AST only, no API cost)

---

## 2. Pilih mode audit

Pilih **satu mode utama** biar scope jelas:

| Mode | Kapan | Output |
|---|---|---|
| A. Quick map | Baru buka repo / orientasi | 1 halaman peta modul |
| B. Architecture | Refactor besar, god modules | coupling, hub, boundary |
| C. Feature deep-dive | Fix/fitur di area tertentu | path call, file list, risk |
| D. Security | Auth, env, API, storage | temuan + severity |
| E. UI/UX / a11y | Surface user-facing | checklist + screenshot notes |
| F. Release readiness | Sebelum deploy | build + test + secret scan |
| G. Full audit | Periodik / handoff | gabungan A–F, ringkas |

---

## 3. Preflight (wajib semua mode)

Jalankan di root repo:

```powershell
# 1) Git snapshot
git status -sb
git rev-parse HEAD
git log --oneline -5

# 2) Graph freshness
# Bandingkan HEAD dengan baris "Built from commit" di graphify-out/GRAPH_REPORT.md
# Jika beda → refresh graph

# 3) Graph ada?
Test-Path graphify-out/graph.json

# 4) Env template (jangan baca/commit .env*)
Test-Path .env.example
```

**Refresh graph (jika stale atau belum ada):**

```powershell
# Incremental (disarankan setelah edit kode)
graphify update .

# Full rebuild (hanya jika graph rusak / shrink disengaja)
# /graphify .   ← lewat agent skill, atau pipeline full di skill graphify
```

**Jangan:**

- Commit `graphify-out/` noise (sudah di-gitignore idealnya)
- Paste secret dari `.env` / remote URL ber-credential
- Sentuh `improve/` kecuali audit prototype (baca `improve/AGENTS.md`)

---

## 4. Langkah graphify (inti analisis struktur)

### 4.1 Orientasi cepat

1. Buka `graphify-out/GRAPH_REPORT.md`
2. Catat: **God Nodes**, **Community Hubs**, **Surprising Connections**
3. Opsional: buka `graphify-out/graph.html` di browser

### 4.2 Query terarah (ganti pertanyaan)

```powershell
graphify query "How does authentication work?"
graphify query "Where is tenant survey submitted and stored?"
graphify query "What connects community registration to admin?"
graphify path "App" "supabase"
graphify explain "Event"
```

**Aturan agent (dari AGENTS.md + graphify skill):**

- Pertanyaan codebase → `graphify query` dulu jika `graph.json` ada
- Relasi A↔B → `graphify path "A" "B"`
- Konsep fokus → `graphify explain "X"`
- Jangan baca full `GRAPH_REPORT.md` kecuali butuh overview luas
- Setelah edit kode → `graphify update .`

### 4.3 Template pertanyaan bagus

| Domain | Contoh query |
|---|---|
| Auth | `admin login logout session token` |
| Events | `event create update delete recurrence calendar` |
| Tenant survey | `tenant survey form submit analytics` (baca `src/components/survey/rules.md` dulu) |
| Community | `community registration landing gallery instagram` |
| Storage | `R2 upload delete image photo` |
| API | `api/auth api/survey api/community-registration` |
| Dashboard shell | `App shell sidebar dashboard layout` |

---

## 5. Playbook per mode

### Mode A — Quick map (15–30 menit)

1. Preflight (§3)
2. Baca God Nodes + top communities di `GRAPH_REPORT.md`
3. List folder top-level: `src/`, `api/`, `supabase/`, `e2e/`, `docs/`
4. Tulis 1 halaman:
   - Entry: `src/main.tsx` → `src/App.tsx`
   - Domain utama (events, survey, community, admin, letter)
   - Backend: `api/*` + Supabase
5. Selesai. Tidak perlu deep query kecuali ada hub bingung.

### Mode B — Architecture

1. Preflight + refresh graph
2. God nodes → kandidat "too central"
3. Per community besar: `graphify query` "what belongs in X community"
4. Cek boundary:
   - UI (`src/components`) vs hooks vs `src/lib` vs `api/`
   - Jangan campur secret client/server
5. Catat:
   - Coupling tinggi (banyak edge ke 1 node)
   - Duplikasi (mirip community, 2 implementasi)
   - Dead / orphan (komunitas tipis, file tak terhubung)
6. Output: `reports/architecture-audit-YYYY-MM-DD.md`

### Mode C — Feature deep-dive

1. Tentukan fitur + acceptance criteria
2. **Tenant survey?** Baca `src/components/survey/rules.md` dulu (public form, no login)
3. Graph:

```powershell
graphify query "<feature keywords>"
graphify path "<UI entry>" "<API or store>"
```

4. Baca file dari hasil graph (bukan grepping buta dulu)
5. Trace happy path + error path + authz
6. Risk list: data loss, auth bypass, empty state, mobile
7. Output: daftar file sentuh + risk + test plan

### Mode D — Security (minimal)

**Graphify locasi; verifikasi manual.**

Checklist:

- [ ] Tidak ada service role / R2 secret di client bundle
- [ ] Admin password/token hanya server (`api/`, env server)
- [ ] Apps Script token tidak di frontend
- [ ] Auth routes: `api/auth.js`, `api/admin-login.js`, `api/admin-logout.js`
- [ ] Public endpoints sadar abuse (survey, community registration)
- [ ] `.env*` tidak di-commit; bandingkan key names dengan `.env.example`
- [ ] Remote git URL: jangan copy credential ke docs/output
- [ ] Upload R2: validasi tipe/ukuran + delete path auth

Grep bantu (pola, sesuaikan):

```powershell
# Jangan print nilai secret; hanya lokasi pemakaian nama env
rg -n "SERVICE_ROLE|ADMIN_PASSWORD|R2_|APPS_SCRIPT|SUPABASE" --glob "!node_modules" --glob "!.env*"
```

Output: temuan severity `critical|high|medium|low` + path + fix.

### Mode E — UI/UX / a11y

Graphify **opsional** (cari komponen surface). Utama:

1. Skill: `frontend-design` / `hallmark` / `accessibility` / `ui-ux-pro-max` sesuai butuh
2. Konvensi UI repo: Metmal pastel, data-first, form sectioned, list/table hybrid
3. Surface kritis: dashboard, calendar, tenant survey public, community landing, modals
4. Verifikasi:

```powershell
npm run build
npm run test:e2e
# visual bila surface visual berubah
```

5. A11y: keyboard, focus, contrast, label, dialog semantics → lihat juga `docs/ACCESSIBILITY-AUDIT.md` jika ada

### Mode F — Release readiness

```powershell
git status -sb
npm run build
npm test -- --run
npm run test:e2e
```

Checklist:

- [ ] Build TypeScript + Vite lulus
- [ ] Unit + e2e kritis hijau (atau known-fail terdokumentasi)
- [ ] Tidak ada secret di diff
- [ ] Env production di Vercel lengkap (tanpa paste nilai ke chat)
- [ ] Graph update opsional (bantu audit post-release)

### Mode G — Full audit (1–2 sesi)

Urutan hemat:

1. Preflight + graph refresh  
2. Mode A (map)  
3. Mode B (architecture ringkas)  
4. Mode D (security pass)  
5. Mode C hanya domain berisiko (auth, survey public, upload, admin)  
6. Mode F (verify)  
7. Satu laporan gabungan di `reports/`

---

## 6. Template laporan (salin)

```markdown
# Audit — <mode> — YYYY-MM-DD

## Scope
- Mode:
- Branch / commit:
- Graph commit (jika dipakai):
- Area:

## Metode
- [ ] graphify query/path/explain
- [ ] file read targeted
- [ ] build/test
- [ ] security grep
- [ ] UI/a11y manual

## Temuan
| ID | Severity | Area | Temuan | Evidence (path) | Rekomendasi |
|----|----------|------|--------|-----------------|-------------|
| 1  | high     | auth | ...    | api/...         | ...         |

## God nodes / hubs relevan
- ...

## Risiko sisa
- ...

## Verifikasi dijalankan
- commands + hasil

## Next actions
1.
2.
```

---

## 7. Command cheatsheet

| Aksi | Command |
|---|---|
| Status git | `git status -sb` |
| Commit sekarang | `git rev-parse HEAD` |
| Update graph | `graphify update .` |
| Tanya codebase | `graphify query "<q>"` |
| Path konsep | `graphify path "A" "B"` |
| Jelaskan node | `graphify explain "X"` |
| Dev | `npm run dev` |
| Build | `npm run build` |
| Unit | `npm test` / vitest |
| E2E | `npm run test:e2e` |

---

## 8. Area sensitif repo ini

| Area | Path petunjuk | Catatan |
|---|---|---|
| App shell | `src/App.tsx`, `src/main.tsx` | entry |
| Events / calendar | `src/components`, `src/hooks`, `src/utils` | core product |
| Tenant survey | `src/components/survey/`, `api/tenant-survey.js`, `api/survey.js` | **public, no login** — baca `rules.md` |
| Community | community components + `api/community-registration.js` | landing + form |
| Auth admin | `api/auth.js`, `api/admin-login.js`, `api/admin-logout.js` | server-side |
| Storage | `api/r2-upload.js`, `api/r2-delete.js` | secrets server |
| Supabase admin | `api/supabase-admin.js` | service role risk |
| Prototype | `improve/` | terpisah; `improve/AGENTS.md` |
| Draft UI | `drafts/` | bukan production default |

---

## 9. Kapan **jangan** andalkan graphify

- Graph stale (commit beda) dan kamu tidak update dulu  
- Butuh bukti runtime (race, network, RLS live)  
- Audit visual/pixel  
- Keputusan product ("fitur ini perlu ada?")  
- Edge LLM-inferred (confidence rendah) — selalu verifikasi di source

---

## 10. Alur agent (ringkas untuk AI / OpenCode)

```
1. Preflight git + graph freshness
2. Jika graph stale → graphify update .
3. Mode A: GRAPH_REPORT god nodes + hubs
4. Mode C/B: graphify query/path sebelum grep luas
5. Baca file dari hasil graph
6. Security: checklist Mode D (tanpa print secret)
7. Verify: npm run build (+ test relevan)
8. Tulis laporan singkat di reports/ atau chat
9. Setelah code change: graphify update .
```

**Skill terkait:** `graphify` (wajib untuk map), `accessibility` (a11y), `frontend-design`/`hallmark` (UI), `verification-planning` (perubahan berisiko), `simplify` (pasca-refactor).

---

## 11. Jawaban cepat

**Q: Pakai graphify untuk audit repo ini?**  
**A: Ya.** Graph sudah dibangun (~3k nodes). Pakai untuk peta, coupling, deep-dive fitur. Lengkapi dengan security checklist, build/test, dan audit UI terpisah.

**Q: File ini untuk apa?**  
**A: Rules + step-by-step** supaya audit berulang konsisten, hemat token, dan tidak skip area sensitif.

**Q: Bedanya mode A–G vs loop harian?**  
**A:** Mode A–G = pilih *scope sesi audit*. Loop §12 = jalur *satu bug* (locate → fix → verify → close). Pakai keduanya: triage pilih mode, lalu jalanin 7 step.

---

## 12. Daily bug fix loop (7 steps)

Jalur harian audit → analisa → fix. **Tidak mengganti** mode A–G; melengkapi.  
One-pager mirror (Open Design / handoff): `bug-fix-workflow.md`.

| # | Name | Action |
|---|---|---|
| **1** | **Preflight** | `git status -sb` · `git rev-parse HEAD` · bandingkan “Built from commit” di `graphify-out/GRAPH_REPORT.md`. Stale → `graphify update .`. Env: nama key dari `.env.example` saja — jangan paste secret. |
| **2** | **Triage** | Symptom → mode: **C** area bug · **D** security · **E** UI/a11y · **F** release. (A map / B arch / G full = bukan default bug path.) |
| **3** | **Locate** | `graphify query "…"` lalu `graphify path "UI" "API/store"` → baca SoT file dulu; hindari grep buta full repo. Tenant survey → `src/components/survey/rules.md` dulu. |
| **4** | **Blast** | Neighbors / community SoT → risk list (authz, data loss, empty state, mobile, public abuse). Catat sentuhan god node (`EventItem`, auth, `App`). |
| **5** | **Fix** | Patch terkecil. Jangan sentuh `improve/` kecuali disengaja. No secret di client. Prefer modul SoT (mis. `dashboardNavigation.tsx`). |
| **6** | **Verify** | Selalu `npm run build`. Logic → unit/vitest target. UI/flow → `npm run test:e2e` (atau headed). Gagal → fix lagi, jangan skip gate. |
| **7** | **Close** | Temuan: severity · path · status (`fixed` / `deferred` / `wontfix`) · evidence. Opsional `graphify update .` setelah edit struktural. |

### Triage cepat (ulang dari §5)

| Symptom | Mode |
|---|---|
| Fitur rusak / data salah / crash area dikenal | **C** |
| Auth, env, secret, API publik abuse | **D** |
| Layout, a11y, visual regression | **E** |
| “Aman deploy?” | **F** |
| Baru buka repo / hilang di struktur | **A** lalu **C** |

### Finding stub (step 7)

```markdown
### [ID] <title>
- Severity: critical | high | medium | low
- Status: fixed | deferred | wontfix
- Mode: C | D | E | F
- Path: `path/to/file`
- Evidence: …
- Verify: commands + result
- Next: …
```

Default simpan: chat ringkas, atau `reports/bug-YYYY-MM-DD.md` (sesuaikan konvensi tim).

