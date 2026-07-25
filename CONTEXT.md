# CONTEXT — Dashboard Calendar Event

Shared language for Metropolitan Mall Bekasi event operations.
Pipeline: `grill-with-docs` (this file) → [`to-spec`](docs/SPEC.md) → [`to-tickets`](docs/tickets/README.md) → implement.

**Job utama:** operasional jadwal event mall. Community, survey, gallery, surat = satelit di sekitar Event.

**Scope lokasi:** single mall — Metropolitan Mall Bekasi. Bukan multi-tenant lokasi.

---

## Bounded contexts

| Context | Inti | Entitas utama |
|---------|------|----------------|
| **Jadwal Event** | Jadwal resmi + antrian pra-jadwal + konteks kalender | `Event`, `Draft`, `Tema Tahunan`, `Libur`, `Kategori`, `Model Kerja Sama` |
| **Akuisisi** | Lead penyelenggara eksternal | `Community Registration` |
| **Feedback** | Evaluasi pasca/selama event | `Survey Kepuasan`, `Evaluasi Tenant` |
| **Aset** | Dokumen & media opsional menempel Event | `PhotoAlbum`, `EventPhoto`, `GeneratedLetter` |
| **Akses** | Siapa boleh apa | Aktor login (`UserRole`), permission, activity log |

---

## Glossary

### Jadwal Event

| Istilah | Arti kanonik | Bukan |
|---------|--------------|--------|
| **Event** | Jadwal resmi di kalender operasional. Sumber kebenaran tampilan jadwal setelah publish. | Antrian pra-jadwal (itu **Draft**) |
| **Draft** | Antrian pra-jadwal. Hidup di Antrian Draft sampai di-publish atau di-cancel. Setelah publish tetap arsip antrian. | Status `draft` di `EventItem` (flag internal/legacy) |
| **Publish (Draft)** | Spawn **Event** resmi dari Draft; tandai Draft `published`. Draft tidak hilang. Event boleh punya `sourceDraftId`. | Promote record (satu entitas pindah tabel); dual-write sinkron terus |
| **Status Event** | Fase tampilan operasional: `upcoming` · `ongoing` · `past`. Dihitung dari `dateStr`/`dateEnd` vs hari ini. | Workflow manual Staff; progress antrian Draft |
| **Status Event `draft`** | Flag internal/legacy di data Event; tidak untuk publik. | Progress Draft di antrian |
| **Progress Draft** | Keputusan antrian: `draft` · `confirm` · `cancel`. | Status Event; flag `published` |
| **Published (flag Draft)** | Draft sudah spawn Event. Terpisah dari Progress. | Progress `confirm` (bisa confirm belum publish) |
| **Bentuk waktu (`EventType`)** | `single` · `multi_day` · `recurring`. | Presentasi UI saja |
| **Multi-day** | Satu Event rentang hari (`dateEnd`, `dayTimeSlots`). | Banyak Event lepas tanpa relasi |
| **Recurring** | Series berbagi `recurrenceGroupId`; tiap occurrence Event. | Helper generate yang diabaikan domain |
| **Model Kerja Sama (`eventModel`)** | Monetisasi/skema slot: `free` · `bayar` · `support`. Nominal + notes pelengkap. | Role login; kategori konten |
| **Kategori** | Label klasifikasi konten; multi per Event; auto-detect dari nama (override Staff OK). | Enum bisnis ketat wajib |
| **Prioritas** | `high` · `medium` · `low` — urutan perhatian operasional. | Status Event |
| **EO (field Event)** | Nama organisasi/penyelenggara di slot event. | Role login `eo_tenant`; PIC |
| **PIC (field Event)** | Orang kontak di lapangan/surat. | Organisasi EO; akun login |
| **Tema Tahunan (`AnnualTheme`)** | Payung periode/tema mall di timeline (bukan Event). | Event; kategori |
| **Libur (`HolidayItem`)** | Libur nasional / cuti bersama di kalender. | Event dibatalkan |

### Akuisisi

| Istilah | Arti kanonik | Bukan |
|---------|--------------|--------|
| **Community Registration** | Lead/usulan dari pendaftar eksternal. Status: `pending` · `reviewed` · `approved` · `rejected`. | Draft; Event |
| **Approve Registration** | Keputusan review Staff. **Tidak** otomatis buat Draft/Event. Lanjut = Staff buat Draft/Event manual. | Publish Draft |

### Feedback

| Istilah | Arti kanonik | Bukan |
|---------|--------------|--------|
| **Survey Kepuasan** | Feedback pengunjung (`public`) atau organizer tentang mall (+ EO untuk public). Skala 1–10. | Evaluasi Tenant |
| **Evaluasi Tenant** | Self-assessment tenant/gerai terkait event. Skala 1–5. Status: `draft` · `submitted` · `reviewed`. | Survey Kepuasan |
| **Survey** (kata generik) | Hindari di spek tanpa kualifikasi. Pakai **Survey Kepuasan** atau **Evaluasi Tenant**. | — |

### Aset

| Istilah | Arti kanonik | Bukan |
|---------|--------------|--------|
| **PhotoAlbum / EventPhoto** | Media gallery; boleh taut `eventId`. Event valid tanpa album. | Syarat lifecycle Event |
| **GeneratedLetter (Surat)** | Surat/PDF operasional; boleh taut `eventId` / `draftEventId`. Opsional. | Wajib sebelum publish |

### Akses — Aktor

| Aktor | Arti kanonik |
|-------|----------------|
| **superadmin** | Login. Kelola user + permission; akses penuh admin + user management. |
| **admin** | Login. Operasional penuh: Event, Draft, tema, registrasi, survey config, settings, activity log. |
| **viewer** | Login. Baca dashboard (registrasi, survey, export); read-only. |
| **eo_tenant** | Login. Terbatas; fokusasi Tenant / self-assessment. |
| **tenant_relation** | Login. Fokus hasil Evaluasi Tenant (analytics); read-only operasional. |
| **Pendaftar** | Non-login. Submit Community Registration. |
| **Publik** | Non-login. Community Hub, gallery, isi Survey Kepuasan. |

Jangan pakai payung **"Staff Mall"** di spek baru — sebut role di atas.

---

## Lifecycle (ringkas)

```
[Pendaftar] → Community Registration (pending→…→approved|rejected)
                    ↘ (manual Staff, bukan auto)
[admin] → Draft (progress: draft|confirm|cancel)
              → publish → Event (upcoming|ongoing|past dari tanggal)
              → (opsional) Surat, Album, Survey Kepuasan, Evaluasi Tenant
```

---

## Out of scope (sengaja)

- Multi-mall / multi-site tenant data
- Approve Registration → auto-spawn Draft atau Event
- Status Event sebagai workflow manual murni (tanpa derivasi tanggal)
- Menyamakan field EO Event dengan role `eo_tenant`
- Menyatukan Survey Kepuasan dan Evaluasi Tenant jadi satu entitas

---

## ADR

Keputusan keras (susah di-reverse):

- [ADR 001 — Draft & Event dual entity](docs/adr/001-draft-event-dual-entity.md)
- [ADR 002 — Event status from dates](docs/adr/002-event-status-from-dates.md)
- [ADR 003 — Registration not auto-Draft](docs/adr/003-registration-not-auto-draft.md)

---

## Kode acuan (bukan sumber kebenaran domain)

- Tipe: `src/types.ts`, `src/types/auth.ts`
- Permission: `src/hooks/usePermission.ts`
- Nav capability: `src/components/dashboard/dashboardNavigation.tsx`

Kalau kode dan glossary bentrok, **glossary menang sampai ADR/spek diubah.**
