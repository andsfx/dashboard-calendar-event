-- ============================================================================
-- Migrasi: hapus kolom mati `tenant_event_surveys.would_repeat`
-- ----------------------------------------------------------------------------
-- `schema.sql` memakai CREATE TABLE IF NOT EXISTS, jadi DB yang sudah ada
-- TIDAK ikut berubah saat schema.sql dijalankan ulang. Kolom harus di-DROP
-- eksplisit di sini.
--
-- Kolom ini tidak pernah ditulis jalur insert mana pun (`/tenant/submit` publik
-- & `/tenant/create` tidak memuatnya) dan tidak pernah dibaca endpoint/FE mana
-- pun; kartu UI "Bersedia Repeat" sudah dihapus di commit 2c26b0a.
--
-- Jalankan (produksi):
--   docker compose exec -T postgres psql -U metmal -d metmal < server/migrations/2026-09-19-drop-would-repeat.sql
--
-- Idempoten: aman dijalankan berulang.
-- ============================================================================

ALTER TABLE tenant_event_surveys DROP COLUMN IF EXISTS would_repeat;
