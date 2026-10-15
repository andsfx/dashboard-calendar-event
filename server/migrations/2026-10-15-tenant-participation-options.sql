-- Opsi form partisipasi tenant (open booth & voucher) dikelola admin.
--
-- Sebelumnya skema booth, ukuran booth, jenis voucher, dan format voucher
-- adalah enum hardcoded (zod + CHECK constraint + label di 3 tempat UI). Kini
-- admin bisa menambah, mengganti label, mematikan, dan menyalakan opsi lewat
-- dashboard; form publik membaca daftar aktif dari GET /tenant-participations/options.
--
-- `value` = slug yang disimpan di tenant_participations (bukan teks bebas)
-- supaya data lama tetap terbaca saat label berubah. `is_active=false`
-- menyembunyikan opsi dari form publik DAN menolaknya di submit; nilai yang
-- sudah tersimpan di pengajuan tidak pernah diubah oleh toggling.
--
-- Seed = tepat 13 opsi yang sebelumnya hardcoded, jadi perilaku form tidak
-- berubah setelah migrasi. Idempoten: ON CONFLICT (group, value) DO NOTHING.

CREATE TABLE IF NOT EXISTS tenant_participation_options (
  id TEXT PRIMARY KEY DEFAULT ('tpo_' || replace(gen_random_uuid()::text, '-', '')),
  "group" TEXT NOT NULL
    CONSTRAINT chk_tpo_group CHECK ("group" IN ('booth_scheme','booth_size','voucher_type','voucher_format')),
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_tenant_participation_options_group_value UNIQUE ("group", value),
  CONSTRAINT chk_tenant_participation_options_value CHECK (value <> '' AND length(value) <= 50),
  CONSTRAINT chk_tenant_participation_options_label CHECK (label <> '' AND length(label) <= 100)
);

CREATE INDEX IF NOT EXISTS idx_tenant_participation_options_group
  ON tenant_participation_options ("group", sort_order);

-- ── Seed: nilai awal identik dengan enum lama ───────────────────────
INSERT INTO tenant_participation_options ("group", value, label, sort_order) VALUES
  ('booth_scheme', 'solo', 'Booth sendiri', 10),
  ('booth_scheme', 'joint', 'Gabungan beberapa tenant', 20),
  ('booth_scheme', 'mall_support', 'Butuh dukungan mall (meja, listrik, dsb.)', 30),
  ('voucher_type', 'discount_percent', 'Diskon persentase (mis. 20%)', 10),
  ('voucher_type', 'discount_amount', 'Potongan harga tetap (mis. Rp20.000)', 20),
  ('voucher_type', 'buy1get1', 'Beli 1 gratis 1', 30),
  ('voucher_type', 'free_item', 'Gratis item atau tambahan', 40),
  ('voucher_type', 'min_spend', 'Diskon minimum belanja', 50),
  ('voucher_type', 'other', 'Lainnya', 60),
  ('voucher_format', 'digital', 'Digital (kode atau QR dari tenant)', 10),
  ('voucher_format', 'fisik', 'Fisik (kupon cetak)', 20),
  ('voucher_format', 'both', 'Digital dan fisik', 30)
ON CONFLICT ("group", value) DO NOTHING;

-- booth_size sebelumnya input teks bebas; kini dropdown dikelola admin.
-- Seed ukuran umum booth mal — admin bebas tambah/ubah/matiikan.
INSERT INTO tenant_participation_options ("group", value, label, sort_order) VALUES
  ('booth_size', '2x2', '2 × 2 m', 10),
  ('booth_size', '3x3', '3 × 3 m', 20),
  ('booth_size', '4x4', '4 × 4 m', 30),
  ('booth_size', 'custom', 'Ukuran lain (ditulis di catatan)', 40)
ON CONFLICT ("group", value) DO NOTHING;

-- Trigger updated_at konsisten dengan tabel lain.
DROP TRIGGER IF EXISTS trg_tenant_participation_options_updated_at ON tenant_participation_options;
CREATE TRIGGER trg_tenant_participation_options_updated_at
  BEFORE UPDATE ON tenant_participation_options
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
