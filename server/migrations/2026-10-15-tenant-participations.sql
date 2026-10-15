-- ============================================================================
-- Partisipasi tenant per event: open booth & voucher (fitur baru 2026-10-15)
--
-- Satu baris = satu pengajuan partisipasi tenant pada SATU event (bukan
-- pengajuan event baru — lihat tenant_event_proposals untuk itu). Jenis:
-- booth, voucher, atau both. Cutoff pengajuan H-1 ditegakkan di route publik,
-- bukan di constraint.
--
-- `code` unik dibuat server (TPR-XXXXXX) dan dipakai tenant untuk cek status
-- bersama nomor telepon. `event_id` boleh NULL bila event dihapus; judul dan
-- tanggal didenormalisasi agar antrean admin tetap terbaca.
--
-- Idempoten: aman dijalankan berulang.
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_participations (
  id TEXT PRIMARY KEY DEFAULT ('tpr_' || replace(gen_random_uuid()::text, '-', '')),
  code TEXT NOT NULL UNIQUE,                 -- TPR-XXXXXX, dibuat server
  tenant_id TEXT NOT NULL DEFAULT '',        -- TENANT_ID master MID; '' = isi manual
  tenant_name TEXT NOT NULL,
  unit_number TEXT NOT NULL DEFAULT '',
  tenant_category TEXT NOT NULL DEFAULT '',
  tenant_logo TEXT NOT NULL DEFAULT '',      -- TENANT_LOGO MID disalin saat submit (halaman publik tidak memanggil MID)
  contact_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  event_id TEXT REFERENCES events(id) ON DELETE SET NULL,
  event_title TEXT NOT NULL,                 -- denormalisasi utk antrean/laporan
  event_date DATE,                           -- denormalisasi date_str event saat submit
  kind TEXT NOT NULL DEFAULT 'both'
    CONSTRAINT chk_tenant_participations_kind CHECK (kind IN ('booth','voucher','both')),
  -- Booth
  booth_area TEXT NOT NULL DEFAULT '',
  booth_start DATE,
  booth_end DATE,
  booth_size TEXT NOT NULL DEFAULT '',
  booth_products TEXT NOT NULL DEFAULT '',
  booth_scheme TEXT NOT NULL DEFAULT 'solo'
    CONSTRAINT chk_tenant_participations_scheme CHECK (booth_scheme IN ('solo','joint','mall_support')),
  booth_needs TEXT NOT NULL DEFAULT '',
  -- Voucher
  voucher_type TEXT NOT NULL DEFAULT 'other'
    CONSTRAINT chk_tenant_participations_voucher_type
    CHECK (voucher_type IN ('discount_percent','discount_amount','buy1get1','free_item','min_spend','other')),
  voucher_terms TEXT NOT NULL DEFAULT '',
  voucher_quota INTEGER CHECK (voucher_quota IS NULL OR voucher_quota >= 0),
  voucher_format TEXT NOT NULL DEFAULT 'both'
    CONSTRAINT chk_tenant_participations_voucher_format CHECK (voucher_format IN ('digital','fisik','both')),
  -- Review
  status TEXT NOT NULL DEFAULT 'pending'
    CONSTRAINT chk_tenant_participations_status CHECK (status IN ('pending','contacted','approved','rejected')),
  internal_notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_participations_event ON tenant_participations (event_id, status);
CREATE INDEX IF NOT EXISTS idx_tenant_participations_status ON tenant_participations (status);
CREATE INDEX IF NOT EXISTS idx_tenant_participations_created_at ON tenant_participations (created_at DESC);

DROP TRIGGER IF EXISTS tenant_participations_updated_at ON tenant_participations;
CREATE TRIGGER tenant_participations_updated_at
  BEFORE UPDATE ON tenant_participations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
