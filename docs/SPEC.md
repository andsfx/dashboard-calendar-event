# SPEC — Dashboard Calendar Event

Domain + product spec. Source: `CONTEXT.md` + `docs/adr/*`.  
Pipeline: grill-with-docs → **to-spec (this)** → [to-tickets](tickets/README.md) → implement.

**Not:** UI pixel spec, API OpenAPI, or implementation plan.  
**Is:** behavior, rules, actors, acceptance criteria per context — ticket-ready.

Glossary terms in **bold** match `CONTEXT.md`. Code identifiers in `backticks`.

---

## 1. Product

| | |
|--|--|
| **Name** | Dashboard Calendar Event |
| **Site** | Metropolitan Mall Bekasi (single mall) |
| **Job utama** | Operasional jadwal event mall |
| **Satelit** | Akuisisi lead, feedback, aset (gallery/surat), akses |

### 1.1 Goals

1. Admin kelola **Draft** (antrian) dan **Event** (jadwal resmi) tanpa campur istilah.
2. Publik lihat jadwal/community/gallery/survey tanpa login; tanpa data internal Draft / Event `draft`.
3. Role login (`UserRole`) membatasi surface dashboard secara konsisten.
4. Feedback terpisah: **Survey Kepuasan** vs **Evaluasi Tenant**.

### 1.2 Non-goals (explicit)

- Multi-mall / multi-site data model
- Approve **Community Registration** → auto **Draft** / **Event** ([ADR 003](adr/003-registration-not-auto-draft.md))
- Status Event sebagai workflow manual murni ([ADR 002](adr/002-event-status-from-dates.md))
- Samakan field **EO** Event dengan role `eo_tenant`
- Satu entitas payung “Survey” untuk kepuasan + tenant

---

## 2. Actors & capability

| Aktor | Auth | Boleh (ringkas) | Tidak |
|-------|------|-----------------|--------|
| **superadmin** | login | Semua **admin** + kelola user/permission | — |
| **admin** | login | CRUD Event/Draft/Tema; review Registration; survey config; settings; activity log; export | User management (kecuali superadmin) |
| **viewer** | login | Lihat dashboard (registrasi, survey, export); read-only | Edit/delete Event/Draft; manage users/themes/settings |
| **eo_tenant** | login | Surface Evaluasi Tenant / self-assessment terbatas | Operasional Event penuh; TR analytics penuh (kecuali diizinkan permission) |
| **tenant_relation** | login | Hasil Evaluasi Tenant (analytics/export) | Edit Event/Draft; operasional penuh |
| **Pendaftar** | non-login | Submit Community Registration | Dashboard; ubah status registration |
| **Publik** | non-login | Community Hub, gallery, Event publik, isi Survey Kepuasan | Draft; Event status `draft`; admin surfaces |

**Permission source of truth (produk):** capability matrix di spek ini.  
**Implementasi acuan:** `usePermission` / `UserRole` — jika bentrok, update kode atau ADR, jangan diam-diam beda dari spek.

### 2.1 Capability matrix (dashboard)

| Capability | superadmin | admin | viewer | eo_tenant | tenant_relation |
|------------|:----------:|:-----:|:------:|:---------:|:---------------:|
| View dashboard shell | ✓ | ✓ | ✓ | ✓* | ✓* |
| Edit/delete Event & Draft | ✓ | ✓ | — | — | — |
| Manage Tema Tahunan | ✓ | ✓ | — | — | — |
| View/review Registration | ✓ | ✓ | view | — | — |
| Survey Kepuasan config/results | ✓ | ✓ | view | view* | — |
| Evaluasi Tenant submit/own | ✓ | ✓ | — | ✓ | — |
| Evaluasi Tenant results/export | ✓ | ✓ | — | — | ✓ |
| Manage settings (landing/album) | ✓ | ✓ | — | — | — |
| Manage users | ✓ | — | — | — | — |
| Activity log | ✓ | ✓ | — | — | — |

\* default landing/path boleh beda per role (`eo_tenant` → tenant surveys; `tenant_relation` → hasil evaluasi).

---

## 3. Context: Jadwal Event

### 3.1 Entities

#### Event

Jadwal resmi. Sumber kebenaran tampilan kalender operasional setelah ada di sistem sebagai Event.

| Field domain | Wajib | Catatan |
|--------------|:-----:|---------|
| id | ✓ | |
| nama acara (`acara`) | ✓ | |
| tanggal mulai (`dateStr`) | ✓ | ISO date `YYYY-MM-DD` |
| tanggal selesai (`dateEnd`) | multi_day | ≥ dateStr |
| jam / dayTimeSlots | | string rentang atau per-hari |
| lokasi | | |
| EO, PIC, phone | | EO=organisasi; PIC=orang |
| keterangan | | |
| kategori(s) | | multi-label; auto-detect OK |
| prioritas | | high/medium/low |
| model kerja sama | | free/bayar/support + nominal/notes |
| bentuk waktu | ✓ | single \| multi_day \| recurring |
| recurrenceGroupId | recurring | shared series id |
| sourceDraftId | | set jika dari Publish Draft |
| posterUrl | | opsional promo |
| status (cache) | | **derived** — lihat 3.3 |

#### Draft

Antrian pra-jadwal. Bukan Event.

| Field domain | Wajib | Catatan |
|--------------|:-----:|---------|
| id | ✓ | |
| field jadwal mirip Event | | acara, tanggal, EO, PIC, dll. |
| progress | ✓ | draft \| confirm \| cancel |
| published | ✓ | bool; true setelah spawn Event |
| publishedAt | | saat publish |
| internalNote | | hanya internal antrian |
| deleted / deletedAt | | soft-delete antrian |

### 3.2 Rules — Draft vs Event ([ADR 001](adr/001-draft-event-dual-entity.md))

1. Draft dan Event **dua entitas**. Tidak promote “satu baris jadi Event”.
2. **Publish Draft:**
   - Buat **Event** baru (atau set occurrence recurring sesuai aturan bentuk waktu).
   - Set Event.`sourceDraftId` = Draft.id bila applicable.
   - Set Draft.`published` = true, `publishedAt` = now.
   - Draft **tetap** di antrian sebagai arsip (boleh filter published).
3. Setelah publish, edit operasional default di **Event**. Draft arsip **tidak** wajib mirror.
4. Progress Draft ≠ Status Event. `confirm` ≠ `published`.
5. Publik dan non-admin **tidak** melihat Draft; **tidak** melihat Event dengan status internal `draft`.

### 3.3 Rules — Status Event ([ADR 002](adr/002-event-status-from-dates.md))

1. Status operasional publik: `upcoming` | `ongoing` | `past`.
2. **Derivasi** dari tanggal vs “hari ini” (timezone operasional mall — default Asia/Jakarta kecuali config bilang lain):
   - **single:** bandingkan `dateStr` dengan hari ini.
   - **multi_day:** `ongoing` jika hari ini ∈ [dateStr, dateEnd]; `upcoming` jika hari ini < dateStr; `past` jika hari ini > dateEnd.
   - **recurring:** tiap occurrence Event dihitung sendiri; series tidak punya satu status global.
3. Field `status` di storage = cache opsional; recompute harus ikut aturan di atas.
4. Status Event `draft` (jika ada di data) = internal/legacy; exclude dari surface publik.

### 3.4 Rules — Bentuk waktu

| Type | Aturan |
|------|--------|
| `single` | Satu `dateStr`; tanpa `dateEnd` wajib |
| `multi_day` | `dateEnd` ≥ `dateStr`; `dayTimeSlots` opsional per hari |
| `recurring` | Rule frekuensi + `endDate`; generate occurrences berbagi `recurrenceGroupId`; hapus series = aksi terpisah dari hapus satu occurrence |

### 3.5 Tema Tahunan & Libur

- **Tema Tahunan:** rentang tanggal + nama + warna; payung visual timeline; bukan Event.
- **Libur:** `libur_nasional` | `cuti_bersama`; tampil di kalender; bukan Event dibatalkan.
- Hanya **admin** / **superadmin** yang manage Tema (viewer baca bila surface expose).

### 3.6 Views (operasional)

| View | Siapa | Isi |
|------|-------|-----|
| Table | admin+; publik subset | list Event (filter status/kategori/prioritas/bulan/search) |
| Calendar | admin+ (publik: policy existing — calendar tab admin-oriented) | monthly + multi-day bars |
| Kanban | admin+ | kolom by status derived |
| Timeline | admin+ / publik policy | garis waktu |

Filter **draft** (antrian) hanya di surface Antrian Draft, bukan kanban Event publik.

### 3.7 Acceptance — Jadwal Event

- [ ] Admin buat Draft tanpa membuat Event.
- [ ] Admin set progress Draft ke confirm/cancel tanpa mengubah kalender Event.
- [ ] Publish Draft menghasilkan Event terlihat di view operasional; Draft `published=true` masih di antrian.
- [ ] Event dari publish punya jejak ke Draft (`sourceDraftId`) bila diimplementasi.
- [ ] Ubah tanggal Event → status upcoming/ongoing/past berubah sesuai aturan 3.3 tanpa set status manual.
- [ ] Publik tidak lihat Draft dan tidak lihat Event status internal draft.
- [ ] Multi-day tampil sebagai rentang, bukan N event lepas tanpa `dateEnd`.
- [ ] Recurring: hapus satu occurrence ≠ hapus seluruh series (aksi series eksplisit).

---

## 4. Context: Akuisisi

### 4.1 Community Registration

Lead dari **Pendaftar**. Status: `pending` → `reviewed` → `approved` | `rejected`.

| Field domain | Catatan |
|--------------|---------|
| organizationType | community, school, company, eo, campus, government, ngo, other |
| identity + PIC + contact | nama, phone, email, instagram |
| preferredDate, description | usulan |
| typeSpecificData | field per tipe organisasi |
| status, adminNote | review |

### 4.2 Rules ([ADR 003](adr/003-registration-not-auto-draft.md))

1. Submit publik (Pendaftar) → status `pending`.
2. Admin/viewer: list + detail; admin ubah status + `adminNote`.
3. **`approved` tidak spawn Draft/Event.**
4. Lanjut jadwal = admin buat Draft (atau Event) manual; Registration boleh jadi referensi UI, bukan FK wajib di domain v1.

### 4.3 Acceptance — Akuisisi

- [ ] Pendaftar submit tanpa login; data masuk `pending`.
- [ ] Admin approve → status `approved` saja; jumlah Draft/Event tidak bertambah otomatis.
- [ ] Admin reject + note tersimpan.
- [ ] Viewer lihat list tanpa ubah status (bila permission view-only).

---

## 5. Context: Feedback

### 5.1 Survey Kepuasan

- Tipe responden: `organizer` | `public`.
- Skala rating mall (1–10); public boleh rating EO (1–10).
- Terikat `event_id`; config aktif per event (`is_active`, auto-activate opsional).
- Publik / link form: no login.
- Anti-spam: device fingerprint (atau setara) — detail teknis di ticket, bukan di sini.

### 5.2 Evaluasi Tenant

- Self-assessment tenant/gerai; skala 1–5.
- Status: `draft` | `submitted` | `reviewed` (ini progress form tenant, **bukan** Draft antrian Event).
- Review: `reviewed_by`, `reviewed_at`, `review_notes` (admin/TR sesuai permission).
- **Jangan** campur storage/UX naming dengan Survey Kepuasan.

### 5.3 Acceptance — Feedback

- [ ] Form Survey Kepuasan public vs organizer beda field EO (EO null/hidden untuk organizer).
- [ ] Evaluasi Tenant submit → `submitted`; review → `reviewed`.
- [ ] Analytics Survey Kepuasan dan Hasil Evaluasi Tenant terpisah di nav/copy.
- [ ] `tenant_relation` akses hasil Evaluasi Tenant; tidak wajib akses edit Event.

---

## 6. Context: Aset

### 6.1 Gallery

- **PhotoAlbum** + **EventPhoto**; optional `eventId`.
- Event valid tanpa album.
- Publik: index + album by slug.

### 6.2 Surat (GeneratedLetter)

- Data surat + PDF; optional `eventId` / `draftEventId`.
- Bukan gate publish Draft.
- Status dokumen: active | archived | deleted (opsional lifecycle file).

### 6.3 Acceptance — Aset

- [ ] Buat Event tanpa album/surat sukses.
- [ ] Album bisa ada tanpa eventId (konten longgar) atau dengan eventId.
- [ ] Generate surat dari Draft atau Event tidak mengubah progress/status jadwal.

---

## 7. Context: Akses

### 7.1 Auth

- Login: email + password (Supabase Auth). Legacy password: off by default; bila on, treat sebagai admin setara legacy flag.
- Session: loading state tidak flash surface terlarang.

### 7.2 Route / surface (logical)

| Surface | Aktor |
|---------|--------|
| `/` Community Hub | Publik |
| `/events` jadwal publik | Publik |
| `/gallery`, `/gallery/:slug` | Publik |
| `/survey/:eventId` Survey Kepuasan | Publik |
| `/tenant-survey` (+ event) Evaluasi Tenant form | Publik / eo_tenant policy |
| `/letter/:id` | link surat |
| `/dashboard/*` | login roles per capability |
| `/tenant-survey-results` | admin + tenant_relation |

Exact path = implementasi; spek jaga **siapa** dan **apa**.

### 7.3 Acceptance — Akses

- [ ] Unauthenticated hit dashboard → login / redirect, bukan data admin.
- [ ] viewer tidak dapat mutasi Event/Draft.
- [ ] superadmin only: user management.
- [ ] tenant_relation default land di hasil Evaluasi Tenant, bukan full event ops.

---

## 8. Cross-cutting

### 8.1 Naming (wajib di ticket/UI copy)

| Pakai | Jangan |
|-------|--------|
| Event / Draft | “event draft” campur tanpa beda entitas |
| Publish Draft | “promote”, “convert row” |
| Survey Kepuasan / Evaluasi Tenant | “survey” generik di spek fitur |
| EO (organisasi) vs eo_tenant (role) | samakan tanpa kualifikasi |
| admin / viewer / … | “Staff Mall” |

### 8.2 Data integrity

- Soft-delete Draft: tidak muncul antrian aktif; tidak hapus Event yang sudah di-publish.
- Hapus Event: tidak wajib hapus Draft arsip; putus atau biarkan `sourceDraftId` dangling = ticket detail (prefer keep Draft arsip).
- Tidak expose service role, R2 keys, admin password di client.

### 8.3 Observability

- Activity log: aksi mutasi admin (create/update/delete Event/Draft, user, settings) — depth di ticket.
- Error sink production: existing logger path; jangan log secret.

---

## 9. Gap vs kode (untuk ticket, bukan blokir spek)

Spek = target domain. Kode boleh nyusul.

| Area | Risiko gap | Arah |
|------|------------|------|
| Event.status di-set manual di form | bentrok ADR 002 | derive on read/write; deprekate set manual |
| Event status `draft` di union type | kabur vs Draft entitas | hide publik; dokumentasi internal only |
| Permission matrix drift | role baru / flag | selaraskan `usePermission` ke §2.1 |
| Registration → Draft shortcut di UI | langgar ADR 003 | boleh “Buat Draft dari registration” **eksplisit manual**, bukan auto on approve |
| Dual field Evaluasi Tenant (EN + ID columns) | model kotor | normalisasi di spek data belakangan |

---

## 10. Tickets

Board: [docs/tickets/README.md](tickets/README.md)

| ID | P | Judul |
|----|---|-------|
| T-001 | P0 | Event status derive dari tanggal |
| T-002 | P0 | Publish Draft rules + forbid re-publish |
| T-003 | P0 | Hide Draft / Event draft dari publik |
| T-004 | P0 | Permission matrix align + tests |
| T-005 | P1 | Registration approve no-spawn + CTA Draft manual |
| T-006 | P1 | Feedback naming Survey Kepuasan vs Evaluasi Tenant |
| T-007 | P2 | EventStatus type cleanup |
| T-008 | P2 | Aset tidak gate lifecycle jadwal |

---

## 11. Open questions (tidak blokir spek v1)

1. Timezone & jam: status ganti di tengah hari — pakai date-only atau jam mulai Event?
2. Publish ulang Draft yang sudah `published` — forbid vs spawn Event kedua?
3. Recurring edit: “this occurrence” vs “entire series” — UX default?
4. Apakah viewer boleh calendar/kanban atau table-only?

Jawab di grill lanjutan atau ticket discovery; default sementara:

1. Date-only Asia/Jakarta.  
2. Forbid re-publish; buat Draft baru.  
3. Default this occurrence; series = aksi eksplisit.  
4. Ikuti permission/view existing kode sampai ticket P0 akses.

---

## References

- [CONTEXT.md](../CONTEXT.md)
- [ADR 001 Draft/Event dual entity](adr/001-draft-event-dual-entity.md)
- [ADR 002 Event status from dates](adr/002-event-status-from-dates.md)
- [ADR 003 Registration not auto-Draft](adr/003-registration-not-auto-draft.md)
