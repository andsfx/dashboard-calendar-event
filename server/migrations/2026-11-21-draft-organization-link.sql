-- Tautan Draft → Community Registration.
--
-- Sebelum ini `draft_events` tidak punya kolom organisasi, jadi Draft yang
-- dibuat dari pendaftaran (tombol "Buat Draft dari pendaftaran") hanya menyalin
-- data dan menyimpan id registrasi sebagai teks di `internal_note`. Akibatnya:
-- pemilih organisasi di form Draft tidak ada, dan `publishDraft` tidak bisa
-- menautkan event hasil terbit ke registrasi asalnya.
--
-- Kolom ini menyimpan id `community_registrations` yang menjadi asal Draft.
-- `publishDraft` menyalinnya ke `events.organization_id`, sehingga registrasi
-- langsung tampil "Sudah dijadwalkan" tanpa penautan manual.
--
-- Idempoten — aman dijalankan ulang. Jalankan SEBELUM deploy API/SPA:
--   docker compose exec -T postgres psql -U metmal -d metmal \
--     < server/migrations/2026-11-21-draft-organization-link.sql

ALTER TABLE draft_events
  ADD COLUMN IF NOT EXISTS organization_id TEXT REFERENCES community_registrations(id);

CREATE INDEX IF NOT EXISTS idx_draft_events_organization_id
  ON draft_events (organization_id)
  WHERE organization_id IS NOT NULL;

-- Backfill Draft lama yang dibuat lewat tombol "Buat Draft dari pendaftaran"
-- sebelum kolom ini ada: satu-satunya jejak relasinya adalah id registrasi di
-- ekor `internal_note` ("Dari pendaftaran: <nama> (<id>)"). Hanya mengisi nilai
-- yang benar-benar ada di community_registrations, dan tidak menimpa tautan
-- yang sudah terisi — idempoten.
UPDATE draft_events d
SET organization_id = src.organization_id
FROM (
  SELECT id, (regexp_match(internal_note, '\(([^()]+)\)\s*$'))[1] AS organization_id
  FROM draft_events
  WHERE organization_id IS NULL
    AND internal_note LIKE 'Dari pendaftaran:%'
) src
WHERE d.id = src.id
  AND src.organization_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM community_registrations cr WHERE cr.id = src.organization_id
  );
