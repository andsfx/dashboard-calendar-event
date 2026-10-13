-- Antrian pengajuan kolaborasi tenant (halaman publik /kolaborasi-tenant).
--
-- Idempoten: CREATE TABLE IF NOT EXISTS + CHECK inline + DROP/CREATE trigger —
-- aman dijalankan berulang. DB baru mendapat bentuk yang sama lewat
-- server/schema.sql (blok tabel + trigger).
--
-- Jalankan di VPS SEBELUM deploy kode api:
--   docker compose exec -T postgres psql -U metmal -d metmal \
--     < server/migrations/2026-10-13-tenant-event-proposals.sql

CREATE TABLE IF NOT EXISTS tenant_event_proposals (
  id TEXT PRIMARY KEY DEFAULT ('tep_' || replace(gen_random_uuid()::text, '-', '')),
  tenant_name TEXT NOT NULL,
  unit_number TEXT NOT NULL DEFAULT '',
  tenant_category TEXT NOT NULL DEFAULT '',
  contact_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  event_title TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'other'
    CONSTRAINT chk_tenant_proposals_event_type
    CHECK (event_type IN ('promo', 'workshop', 'exhibition', 'performance', 'launching', 'other')),
  event_description TEXT NOT NULL,
  proposed_start DATE NOT NULL,
  proposed_end DATE,
  preferred_area TEXT NOT NULL DEFAULT '',
  expected_visitors TEXT NOT NULL DEFAULT '',
  needs TEXT NOT NULL DEFAULT '',
  proposal_file_url TEXT NOT NULL DEFAULT '',
  proposal_file_name TEXT NOT NULL DEFAULT '',
  proposal_mime_type TEXT NOT NULL DEFAULT '',
  proposal_file_size BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CONSTRAINT chk_tenant_proposals_status
    CHECK (status IN ('pending', 'contacted', 'approved', 'rejected')),
  internal_notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_event_proposals_status ON tenant_event_proposals (status);
CREATE INDEX IF NOT EXISTS idx_tenant_event_proposals_created_at ON tenant_event_proposals (created_at DESC);

DROP TRIGGER IF EXISTS tenant_event_proposals_updated_at ON tenant_event_proposals;
CREATE TRIGGER tenant_event_proposals_updated_at
  BEFORE UPDATE ON tenant_event_proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
