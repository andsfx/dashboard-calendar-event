# ADR 008: `events.status` adalah flag lifecycle, bukan status temporal

## Status

Accepted (2026-10-04) — menegakkan ADR 002 yang sebelumnya dilanggar.

## Context

ADR 002 menyatakan status operasional event **diderivasi** dari tanggal dan
kolom `status` di penyimpanan "boleh ada sebagai cache/denormalisasi, tetapi
bukan sumber kebenaran workflow". Praktiknya menyimpang jauh:

- `events.status` menyimpan **dua hal berbeda** sekaligus: flag lifecycle
  `draft` dan status temporal `upcoming`/`ongoing`/`past`.
- `publishDraft` **tidak pernah** menulis kolom itu, sehingga DEFAULT
  `'upcoming'` berlaku selamanya. Produksi: **258/258 event punya
  `source_draft_id`** dan distribusi status tersimpan tidak pernah cocok
  dengan tanggal sebenarnya.
- Nilai temporal itu tetap **ditulis dari client** (`eventItemToDbRow`
  mengirim `ev.status` hasil derivasi) dan **dibaca oleh SQL** sebagai
  otoritas.

Akibat terverifikasi di produksi: `GET /api/v1/tenant/events` memakai
`WHERE status IN ('past','ongoing')` dan hanya mengembalikan **1 dari 5**
event yang survey-nya aktif. **12 submission tenant survey** ikut terkunci
(tenant tidak pernah melihat event yang sudah lewat). Endpoint lain
(`/sponsor/events` memakai `status = 'upcoming'`) pun bergantung pada nilai
yang sama-sama basi.

## Decision

`events.status` **hanya** menyimpan flag lifecycle: `'draft'` | `'published'`.

- **Tidak ada** nilai temporal yang ditulis atau dibaca. Status temporal
  (`upcoming`/`ongoing`/`past`) selalu diturunkan dari `date_str`/`date_end`
  memakai aturan WIB (`getStatus` di klien, `server/src/lib/eventWindow.js`
  di server).
- Writer memaksa non-draft menjadi `'published'`:
  `createEvent`, `batchCreateEvents`, `publishDraft`.
- `updateEvent` hanya menerima `'draft'`/`'published'`; nilai temporal dari
  client **diabaikan** (bukan dipetakan), supaya tidak menghidupkan kembali
  data basi.
- Mapper klien (`eventItemToDbRow`) hanya mengirim `status` saat nilainya
  `'draft'`.
- Predikat SQL yang butuh waktu memakai turunan tanggal, bukan kolom status:
  `startedOnOrBefore` / `notStartedOn` / `startedStatusCase`
  (`server/src/lib/eventWindow.js`). Cast `date_str` (TEXT) selalu dibungkus
  `CASE WHEN <regex> THEN to_date(...) END` — `AND` tidak menjamin urutan
  evaluasi di Postgres, jadi bentuk `regex AND to_date(...)` bisa melempar
  22007 pada satu baris rusak dan mematikan seluruh query.
- Gerbang `status <> 'draft'` **tetap** dipakai untuk visibilitas publik
  (`public.js`, OG image, `/sponsor/events`, `/tenant/events`).
- Constraint `CHECK (status IN ('draft','published'))` dipasang **hanya**
  lewat migrasi terurut (normalisasi data → constraint), bukan lewat
  `schema.sql` yang dijalankan ulang pada DB existing.

## Consequences

**Plus**

- Satu aturan untuk semua filter; tidak ada lagi status busuk yang menyesatkan.
- 12 submission tenant survey **akan** kembali terlihat setelah migrasi +
  kode dideploy (perbaikan belum berlaku di produksi saat ADR ini ditulis —
  verifikasi produksi waktu itu hanya SELECT read-only).
- `/sponsor/events` tidak lagi bergantung pada kebetulan.
- Klien tidak berubah — ia memang selalu menghitung ulang status saat baca.

**Minus / biaya**

- Migrasi `2026-10-04-normalize-event-status.sql` **wajib** dijalankan
  **sebelum** kode baru di-deploy. Urutan terbalik: kode baru menulis
  `'published'` (aman), tetapi kode lama pada DB ber-constraint akan menulis
  `'upcoming'` dan ditolak CHECK.
- Indeks `idx_events_status` dihapus, diganti indeks parsial
  `idx_events_draft`.
- Setiap query baru yang butuh "upcoming/past/ongoing" **wajib** memakai
  helper tanggal; dilarang menyentuh kolom `status` untuk urusan waktu.

## Alternatives considered

1. **Menghapus kolom `status` sepenuhnya** — paling bersih, tetapi gerbang
   `draft` masih dibutuhkan (`public.js` menyembunyikan event internal) dan
   `draft_events` adalah entitas terpisah (ADR 001). Menghapusnya berarti
   kehilangan satu-satunya penanda "jangan tampilkan ke publik".
2. **Memperbaiki cache (menulis status temporal yang benar saat write)** —
   ditolak: nilai temporal pasti basi seiring waktu tanpa job recompute, dan
   itu persis akar bug ini.
3. **Generated column dari tanggal** — tidak bisa: `date_str` bertipe TEXT
   dan aturannya bergantung jam + multi-day (`day_time_slots`), di luar
   kemampuan ekspresi generated sederhana.
