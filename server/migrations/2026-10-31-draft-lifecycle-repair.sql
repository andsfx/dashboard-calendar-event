-- ============================================================================
-- Migrasi: pulihkan draft yang "terbit" tanpa baris `events`
-- ----------------------------------------------------------------------------
-- Akar masalah (audit 2026-10-31): whitelist kolom di routes/admin.js
-- (`DRAFT_COLUMNS`) memuat `published`, `published_at`, `deleted`, `deleted_at`.
-- Payload `updateDraft` karenanya bisa menulis `published = true` TANPA lewat
-- `publishDraft` — dan `publishDraft` sendiri menolak draft yang sudah
-- `published = true` ("Draft sudah diterbitkan") sebelum sempat membuat baris
-- `events`. Hasilnya baris yatim yang tidak bisa diperbaiki dari UI:
--
--   draft_events.published = true  → dianggap sudah terbit
--   deleted = false                → tidak muncul di daftar draft terhapus
--   events(source_draft_id = id)   → TIDAK ADA, jadi tidak tampil di publik
--
-- Perbaikan kode sudah mendarat bersamaan dengan migrasi ini (dua kolom flag
-- lifecycle dikeluarkan dari whitelist; `publishDraft` menolak payload itu dan
-- menulis INSERT+UPDATE dalam satu transaksi). Migrasi ini HANYA membereskan
-- data lama yang sudah telanjur terjebak.
--
-- Lingkup sengaja SEMPIT: hanya draft yang belum dihapus, sudah ditandai
-- terbit, dan tidak punya padanan `events`. Draft yang memang punya baris
-- `events` tidak disentuh (itu hasil terbit yang sah, termasuk yang event-nya
-- sudah dihapus manual — memulihkannya di sini akan memunculkan event hantu).
--
-- Cara kerja: `published=false` + `published_at=NULL` mengembalikan draft ke
-- antrean "belum terbit"; `progress` TIDAK diubah karena status konfirmasi
-- adalah keputusan bisnis, bukan efek samping flag lifecycle.
--
-- Jalankan (setelah backup, SEBELUM deploy kode terkait):
--   docker compose exec -T postgres psql -U metmal -d metmal \
--     < server/migrations/2026-10-31-draft-lifecycle-repair.sql
--
-- Idempoten: aman dijalankan berulang (kondisi WHERE kosong pada run kedua).
-- ============================================================================

-- ─── SEBELUM: daftar draft yang akan diperbaiki (simpan keluarannya) ────
-- SELECT d.id, d.acara, d.date_str, d.progress, d.published_at
--   FROM draft_events d
--  WHERE d.deleted = false
--    AND d.published = true
--    AND NOT EXISTS (SELECT 1 FROM events e WHERE e.source_draft_id = d.id)
--  ORDER BY d.date_str;

-- ─── Perbaikan ──────────────────────────────────────────────────────────
UPDATE draft_events d
   SET published = false,
       published_at = NULL
 WHERE d.deleted = false
   AND d.published = true
   AND NOT EXISTS (
     SELECT 1 FROM events e WHERE e.source_draft_id = d.id
   );

-- ─── SESUDAH: verifikasi (harus mengembalikan 0 baris) ──────────────────
-- SELECT d.id, d.acara, d.date_str, d.published
--   FROM draft_events d
--  WHERE d.deleted = false
--    AND d.published = true
--    AND NOT EXISTS (SELECT 1 FROM events e WHERE e.source_draft_id = d.id);
--
-- Ringkasan kondisi data (dijalankan sebelum & sesudah, angka harus turun ke 0
-- pada baris kedua sementara baris pertama tetap):
-- SELECT
--   count(*) FILTER (WHERE d.published AND EXISTS (SELECT 1 FROM events e WHERE e.source_draft_id = d.id)) AS terbit_sah,
--   count(*) FILTER (WHERE d.published AND NOT EXISTS (SELECT 1 FROM events e WHERE e.source_draft_id = d.id)) AS yatim
--   FROM draft_events d
--  WHERE d.deleted = false;
