-- ============================================================
-- Space Entity — link event ke event_areas + deteksi konflik jadwal (2026-09-05)
-- events/draft_events mendapat kolom area_id opsional (FK ke event_areas).
-- `lokasi` tetap free-text sebagai label display; area_id dipakai untuk
-- deteksi konflik jadwal di form admin (anti double-booking).
-- ON DELETE SET NULL: hapus area di EventAreaManager tidak merusak event.
-- Terapkan manual: node migrate/run-schema.mjs migrate/event-area-link.sql
-- (env .env.supabase — PAT SUPABASE_ACCESS_TOKEN wajib untuk Management API DDL)
-- ============================================================

ALTER TABLE events       ADD COLUMN IF NOT EXISTS area_id TEXT REFERENCES event_areas(id) ON DELETE SET NULL;
ALTER TABLE draft_events ADD COLUMN IF NOT EXISTS area_id TEXT REFERENCES event_areas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_events_area_date       ON events       (area_id, date_str) WHERE area_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_draft_events_area_date ON draft_events (area_id, date_str) WHERE area_id IS NOT NULL;