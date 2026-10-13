-- ============================================================================
-- Migrasi: normalkan `events.status` menjadi flag lifecycle saja
-- ----------------------------------------------------------------------------
-- ADR 002 menyatakan status operasional event DITURUNKAN dari tanggal dan
-- tidak pernah disimpan. Kenyataannya di DB ada kolom `events.status` yang
-- menyimpan dua hal berbeda:
--
--   1. Flag lifecycle 'draft' — gerbang visibilitas publik (public.js,
--      OG image, /sponsor/events). INI yang harus tetap ada.
--   2. Nilai temporal 'upcoming' | 'ongoing' | 'past' — TIDAK pernah diisi
--      ulang setelah event dibuat. `publishDraft` tidak menyertakan kolom ini,
--      jadi DEFAULT 'upcoming' berlaku selamanya. Produksi: 258/258 event
--      punya source_draft_id, dan distribusi status tersimpan tidak pernah cocok
--      dengan tanggal sebenarnya.
--
-- Dampak: filter SQL yang memercayai kolom ini salah. Contoh terverifikasi —
-- GET /api/v1/tenant/events hanya mengembalikan 1 dari 5 event aktif karena
-- `WHERE status IN ('past','ongoing')`; 12 submission tenant survey jadi
-- terkunci. Klien tidak terpengaruh karena ia selalu menghitung ulang status
-- dari tanggal saat baca (src/utils/api/_shared.ts → getStatus).
--
-- Perbaikan: kode (rilis ini) sudah berhenti menulis/membaca nilai temporal —
-- `createEvent`/`batchCreateEvents`/`publishDraft` menulis 'published',
-- `updateEvent` hanya menerima 'draft'/'published', dan query publik memakai
-- turunan tanggal. Kolom ini lalu diseragamkan agar tidak menyesatkan lagi.
--
-- Mengapa 'published' dan bukan NULL: kolom ini masih dibaca `status <> 'draft'`
-- di beberapa query, dan menambahkan COALESCE hanya menambah kompleksitas.
-- Semua baris non-draft menjadi 'published'.
--
-- Jalankan (produksi):
--   docker compose exec -T postgres psql -U metmal -d metmal < server/migrations/2026-10-04-normalize-event-status.sql
--
-- Idempoten: aman dijalankan berulang.
-- ============================================================================

UPDATE events
   SET status = 'published'
 WHERE status IS NULL
    OR status NOT IN ('draft', 'published');

-- Menyamakan default kolom untuk INSERT masa depan yang tidak menyebut status.
ALTER TABLE events ALTER COLUMN status SET DEFAULT 'published';

-- Gerbang write: setelah normalisasi, kolom hanya boleh berisi nilai
-- lifecycle. Tanpa CHECK, regresi bisa masuk lagi lewat INSERT apa pun yang
-- tidak sengaja menyebut kolom status — persis bom waktu yang membuat kolom
-- ini tersesat sejak awal. Bungkus pg_constraint agar aman dijalankan ulang.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'chk_events_status_lifecycle'
       AND conrelid = 'events'::regclass
  ) THEN
    ALTER TABLE events DROP CONSTRAINT chk_events_status_lifecycle;
  END IF;
  ALTER TABLE events
    ADD CONSTRAINT chk_events_status_lifecycle
    CHECK (status IN ('draft', 'published'));
END $$;

-- Membuang indeks status lama: tak ada lagi query yang memfilter kolom ini
-- kecuali lifecycle 'draft', yang parsialnya kecil (tidak ada event draft produksi).
DROP INDEX IF EXISTS idx_events_status;

-- Indeks parsial untuk gerbang 'draft' (pembacaan publik adalah mayoritas).
CREATE INDEX IF NOT EXISTS idx_events_draft ON events (id) WHERE status = 'draft';

-- Verifikasi (harus mengembalikan 0 baris):
--   SELECT id, date_str, status FROM events
--    WHERE status NOT IN ('draft', 'published');