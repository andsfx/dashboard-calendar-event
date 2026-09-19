-- ============================================================================
-- Migrasi: hapus 16 kolom mati blok "Legacy comprehensive fields"
-- pada `tenant_event_surveys`
-- ----------------------------------------------------------------------------
-- `schema.sql` memakai CREATE TABLE IF NOT EXISTS, jadi DB yang sudah ada
-- TIDAK ikut berubah saat schema.sql dijalankan ulang. Kolom harus di-DROP
-- eksplisit di sini.
--
-- Ke-16 kolom ini tidak pernah ditulis jalur insert mana pun (`/tenant/submit`
-- publik & `/tenant/create` tidak memuatnya), tidak ada di whitelist
-- `/tenant/update` (`textFields`/`ratingFields`), dan tidak pernah dibaca
-- endpoint, agregasi, maupun tipe/form FE mana pun. Satu-satunya kolom di blok
-- ini yang sempat punya kode — `would_repeat` — sudah dihapus di commit 3c9e98c
-- (migrasi `2026-09-19-drop-would-repeat.sql`); sisanya murni mati.
--
-- Jalankan (produksi):
--   docker compose exec -T postgres psql -U metmal -d metmal < server/migrations/2026-09-19-drop-legacy-columns.sql
--
-- Idempoten: aman dijalankan berulang.
-- ============================================================================

ALTER TABLE tenant_event_surveys
  DROP COLUMN IF EXISTS venue_preparation,
  DROP COLUMN IF EXISTS logistics_smoothness,
  DROP COLUMN IF EXISTS setup_teardown_efficiency,
  DROP COLUMN IF EXISTS mall_coordination_rating,
  DROP COLUMN IF EXISTS mall_support_rating,
  DROP COLUMN IF EXISTS communication_quality,
  DROP COLUMN IF EXISTS event_execution_quality,
  DROP COLUMN IF EXISTS crowd_management,
  DROP COLUMN IF EXISTS visitor_satisfaction_estimate,
  DROP COLUMN IF EXISTS overall_self_rating,
  DROP COLUMN IF EXISTS what_went_well,
  DROP COLUMN IF EXISTS what_went_wrong,
  DROP COLUMN IF EXISTS improvements_needed,
  DROP COLUMN IF EXISTS issues_encountered,
  DROP COLUMN IF EXISTS suggestions_for_mall,
  DROP COLUMN IF EXISTS additional_notes;
