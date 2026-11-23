-- ============================================================================
-- Modul Kolaborasi: Pameran & Aktivasi Marcomm (2026-11-23)
--
-- Memperluas fitur pameran yang sudah ada TANPA memindahkan data:
--   exhibitions            -> program induk (program_type pameran|aktivasi_marcomm)
--   exhibition_slots       -> slot tanggal/sesi yang bisa dipilih calon mitra
--   exhibition_leads       -> pengajuan mitra + kontrol agenda publik
--   public_program_agenda  -> proyeksi aman untuk agenda publik (tanpa PII)
--
-- Idempoten: aman dijalankan berulang. Jalankan SEBELUM deploy kode terkait.
-- ============================================================================

-- ── 1. exhibitions: kolom program ──────────────────────────────────────────
ALTER TABLE exhibitions ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE exhibitions ADD COLUMN IF NOT EXISTS subtitle TEXT NOT NULL DEFAULT '';
ALTER TABLE exhibitions ADD COLUMN IF NOT EXISTS program_type TEXT NOT NULL DEFAULT 'pameran';
ALTER TABLE exhibitions ADD COLUMN IF NOT EXISTS schedule_note TEXT NOT NULL DEFAULT '';
ALTER TABLE exhibitions ADD COLUMN IF NOT EXISTS target_audience TEXT NOT NULL DEFAULT 'Terbuka untuk umum (semua usia)';
ALTER TABLE exhibitions ADD COLUMN IF NOT EXISTS looking_for_summary TEXT NOT NULL DEFAULT '';
ALTER TABLE exhibitions ADD COLUMN IF NOT EXISTS looking_for_tags TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE exhibitions ADD COLUMN IF NOT EXISTS benefits JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE exhibitions ADD COLUMN IF NOT EXISTS cover_image_url TEXT NOT NULL DEFAULT '';
ALTER TABLE exhibitions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE exhibitions ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE exhibitions ADD COLUMN IF NOT EXISTS default_organization_type TEXT NOT NULL DEFAULT 'komunitas';
ALTER TABLE exhibitions ADD COLUMN IF NOT EXISTS form_config JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Backfill slug dari id agar setiap baris punya alamat publik yang stabil.
UPDATE exhibitions SET slug = id WHERE slug IS NULL OR slug = '';

-- publication lama tetap jadi gerbang tayang; status baru memetakan siklusnya.
UPDATE exhibitions
SET status = CASE publication
  WHEN 'published' THEN 'open'
  WHEN 'archived' THEN 'archived'
  ELSE 'draft'
END
WHERE status = 'draft' AND publication IN ('published', 'archived');

-- Program lama yang sudah lewat jangan tetap tampil "Dibuka untuk Kolaborasi".
UPDATE exhibitions
SET status = CASE
  WHEN date_end < CURRENT_DATE THEN 'completed'
  WHEN date_start > CURRENT_DATE THEN 'open'
  ELSE 'ongoing'
END
WHERE status = 'open';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_exhibitions_program_type') THEN
    ALTER TABLE exhibitions ADD CONSTRAINT chk_exhibitions_program_type
      CHECK (program_type IN ('pameran', 'aktivasi_marcomm'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_exhibitions_status_cycle') THEN
    ALTER TABLE exhibitions ADD CONSTRAINT chk_exhibitions_status_cycle
      CHECK (status IN ('draft', 'open', 'full', 'ongoing', 'completed', 'archived'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_exhibitions_default_org') THEN
    ALTER TABLE exhibitions ADD CONSTRAINT chk_exhibitions_default_org
      CHECK (default_organization_type IN (
        'komunitas', 'umkm_brand', 'event_organizer', 'kampus_sekolah', 'instansi_ngo', 'lainnya'
      ));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_exhibitions_slug ON exhibitions (slug);

-- ── 2. exhibition_slots: tanggal/sesi agenda aktivasi ─────────────────────
CREATE TABLE IF NOT EXISTS exhibition_slots (
  id TEXT PRIMARY KEY DEFAULT ('slot_' || replace(gen_random_uuid()::text, '-', '')),
  exhibition_id TEXT NOT NULL REFERENCES exhibitions(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL DEFAULT '06:30',
  end_time TIME NOT NULL DEFAULT '10:00',
  zone_name TEXT NOT NULL DEFAULT 'Area Utama',
  capacity INTEGER NOT NULL DEFAULT 3 CHECK (capacity >= 1),
  slot_status TEXT NOT NULL DEFAULT 'open'
    CHECK (slot_status IN ('open', 'limited', 'full', 'closed')),
  public_note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_exhibition_slots_time CHECK (end_time > start_time)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_exhibition_slots_slot
  ON exhibition_slots (exhibition_id, slot_date, start_time);
CREATE INDEX IF NOT EXISTS idx_exhibition_slots_program_date
  ON exhibition_slots (exhibition_id, slot_date);

-- ── 3. exhibition_leads: pengajuan mitra + kurasi ─────────────────────────
ALTER TABLE exhibition_leads ADD COLUMN IF NOT EXISTS reference_code TEXT;
ALTER TABLE exhibition_leads ADD COLUMN IF NOT EXISTS slot_id TEXT REFERENCES exhibition_slots(id) ON DELETE SET NULL;
ALTER TABLE exhibition_leads ADD COLUMN IF NOT EXISTS preferred_date_note TEXT NOT NULL DEFAULT '';
ALTER TABLE exhibition_leads ADD COLUMN IF NOT EXISTS contribution_type TEXT NOT NULL DEFAULT 'pengisi_aktivasi';
ALTER TABLE exhibition_leads ADD COLUMN IF NOT EXISTS estimated_participants TEXT;
ALTER TABLE exhibition_leads ADD COLUMN IF NOT EXISTS technical_needs TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE exhibition_leads ADD COLUMN IF NOT EXISTS technical_needs_note TEXT NOT NULL DEFAULT '';
ALTER TABLE exhibition_leads ADD COLUMN IF NOT EXISTS social_media_handle TEXT NOT NULL DEFAULT '';
ALTER TABLE exhibition_leads ADD COLUMN IF NOT EXISTS public_activity_title TEXT NOT NULL DEFAULT '';
ALTER TABLE exhibition_leads ADD COLUMN IF NOT EXISTS public_activity_summary TEXT NOT NULL DEFAULT '';
ALTER TABLE exhibition_leads ADD COLUMN IF NOT EXISTS is_public_agenda BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE exhibition_leads ADD COLUMN IF NOT EXISTS synced_event_id TEXT REFERENCES events(id) ON DELETE SET NULL;
ALTER TABLE exhibition_leads ADD COLUMN IF NOT EXISTS reviewed_by TEXT;
ALTER TABLE exhibition_leads ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- Status lama (pending/contacted) dipetakan ke siklus kurasi baru.
UPDATE exhibition_leads SET status = 'submitted' WHERE status = 'pending';
UPDATE exhibition_leads SET status = 'in_review' WHERE status = 'contacted';
ALTER TABLE exhibition_leads ALTER COLUMN status SET DEFAULT 'submitted';
UPDATE exhibition_leads SET contribution_type = CASE participation
  WHEN 'booth' THEN 'booth_umkm'
  WHEN 'activation' THEN 'pengisi_aktivasi'
  ELSE 'pengisi_aktivasi'
END
WHERE contribution_type IS NULL OR contribution_type = ''
   OR (contribution_type = 'pengisi_aktivasi' AND participation = 'booth');

-- Kode referensi lama: format KOL-YYMM-XXXX.
UPDATE exhibition_leads
SET reference_code = 'KOL-' || to_char(COALESCE(created_at, NOW()), 'YYMM') || '-'
                  || upper(substr(md5(id || random()::text), 1, 4))
WHERE reference_code IS NULL OR reference_code = '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_exhibition_leads_reference_code
  ON exhibition_leads (reference_code);
CREATE INDEX IF NOT EXISTS idx_exhibition_leads_program_status
  ON exhibition_leads (exhibition_id, status);
CREATE INDEX IF NOT EXISTS idx_exhibition_leads_slot
  ON exhibition_leads (slot_id);

-- Constraint lama diganti (nama dibuat Postgres untuk CHECK inline).
ALTER TABLE exhibition_leads DROP CONSTRAINT IF EXISTS exhibition_leads_organization_type_check;
ALTER TABLE exhibition_leads ADD CONSTRAINT exhibition_leads_organization_type_check
  CHECK (organization_type IN (
    'komunitas', 'umkm_brand', 'event_organizer', 'kampus_sekolah', 'instansi_ngo', 'lainnya',
    'brand', 'eo'
  ));

ALTER TABLE exhibition_leads DROP CONSTRAINT IF EXISTS exhibition_leads_status_check;
ALTER TABLE exhibition_leads ADD CONSTRAINT exhibition_leads_status_check
  CHECK (status IN (
    'submitted', 'in_review', 'need_info', 'approved', 'scheduled', 'completed', 'rejected', 'cancelled'
  ));

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_exhibition_leads_contribution') THEN
    ALTER TABLE exhibition_leads ADD CONSTRAINT chk_exhibition_leads_contribution
      CHECK (contribution_type IN (
        'pengisi_aktivasi', 'booth_umkm', 'sponsor_hadiah', 'media_partner', 'lainnya'
      ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_exhibition_leads_estimate') THEN
    ALTER TABLE exhibition_leads ADD CONSTRAINT chk_exhibition_leads_estimate
      CHECK (estimated_participants IS NULL OR estimated_participants IN (
        'under_15', '15_to_30', '30_to_50', 'over_50', 'unsure'
      ));
  END IF;
END $$;

-- ── 4. Trigger: kode referensi otomatis KOL-YYMM-XXXX ─────────────────────
CREATE OR REPLACE FUNCTION generate_collaboration_reference_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference_code IS NULL OR NEW.reference_code = '' THEN
    NEW.reference_code := 'KOL-' || to_char(COALESCE(NEW.created_at, NOW()), 'YYMM') || '-'
                       || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_exhibition_leads_reference_code ON exhibition_leads;
CREATE TRIGGER trg_exhibition_leads_reference_code
  BEFORE INSERT ON exhibition_leads
  FOR EACH ROW EXECUTE FUNCTION generate_collaboration_reference_code();

-- ── 5. Trigger: kapasitas slot mengikuti jumlah kolaborasi disetujui ───────
CREATE OR REPLACE FUNCTION recalculate_exhibition_slot_status()
RETURNS TRIGGER AS $$
DECLARE
  v_slot_id TEXT;
  v_capacity INTEGER;
  v_count INTEGER;
  v_manual_status TEXT;
  v_next_status TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_slot_id := OLD.slot_id;
  ELSE
    v_slot_id := NEW.slot_id;
  END IF;

  IF v_slot_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT capacity, slot_status INTO v_capacity, v_manual_status
  FROM exhibition_slots WHERE id = v_slot_id;
  IF NOT FOUND OR v_manual_status = 'closed' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COUNT(*)::int INTO v_count
  FROM exhibition_leads
  WHERE slot_id = v_slot_id AND status IN ('approved', 'scheduled');

  v_next_status := CASE
    WHEN v_count >= v_capacity THEN 'full'
    WHEN v_capacity > 1 AND (v_capacity - v_count) = 1 THEN 'limited'
    ELSE 'open'
  END;

  UPDATE exhibition_slots
  SET slot_status = v_next_status, updated_at = NOW()
  WHERE id = v_slot_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_exhibition_leads_slot_insert ON exhibition_leads;
CREATE TRIGGER trg_exhibition_leads_slot_insert
  AFTER INSERT ON exhibition_leads
  FOR EACH ROW EXECUTE FUNCTION recalculate_exhibition_slot_status();

DROP TRIGGER IF EXISTS trg_exhibition_leads_slot_update ON exhibition_leads;
CREATE TRIGGER trg_exhibition_leads_slot_update
  AFTER UPDATE OF slot_id, status ON exhibition_leads
  FOR EACH ROW EXECUTE FUNCTION recalculate_exhibition_slot_status();

DROP TRIGGER IF EXISTS trg_exhibition_leads_slot_delete ON exhibition_leads;
CREATE TRIGGER trg_exhibition_leads_slot_delete
  AFTER DELETE ON exhibition_leads
  FOR EACH ROW EXECUTE FUNCTION recalculate_exhibition_slot_status();

-- ── 6. View agenda publik (kolom aman saja) ───────────────────────────────
CREATE OR REPLACE VIEW public_program_agenda AS
SELECT
  id,
  exhibition_id AS program_id,
  slot_id,
  organization_name,
  organization_type,
  contribution_type,
  public_activity_title,
  public_activity_summary,
  status
FROM exhibition_leads
WHERE is_public_agenda = true
  AND status IN ('approved', 'scheduled', 'completed');

-- ── 7. Seed "Sarapan di Metmal" ───────────────────────────────────────────
UPDATE exhibitions
SET title = 'Sarapan di Metmal',
    slug = 'sarapan-di-metmal',
    subtitle = 'Kolaborasi Komunitas di Area Parkir Timur Setiap Minggu Pagi',
    program_type = 'aktivasi_marcomm',
    location = 'Area Parkir Timur, Metropolitan Mall Bekasi',
    date_start = DATE '2026-11-29',
    date_end = DATE '2026-12-27',
    schedule_note = 'Setiap hari Minggu, 06.30 - 10.00 WIB',
    target_audience = 'Terbuka untuk umum (semua usia)',
    looking_for_summary = 'Terbuka untuk komunitas, penggerak hobi, maupun pelaku usaha lokal yang membawa kegiatan seru dan ramah untuk semua kalangan usia.',
    looking_for_tags = ARRAY[
      'Olahraga & Senam Santai',
      'Keluarga & Permainan Anak',
      'Hobi, Sepeda & Sunmori',
      'Seni & Musik Akustik',
      'UMKM Sarapan & Kopi'
    ],
    status = 'open',
    publication = 'published',
    accepting_applications = true,
    default_organization_type = 'komunitas',
    form_config = '{
      "concept_placeholder": "Contoh: Kami dari komunitas senam pagi ingin mengadakan sesi line dance 45 menit bersama sekitar 30 anggota dan terbuka untuk pengunjung mall.",
      "allowed_contributions": ["pengisi_aktivasi", "booth_umkm", "sponsor_hadiah", "media_partner", "lainnya"],
      "show_technical_needs": true,
      "show_participant_estimate": true
    }'::jsonb
WHERE id = (
  SELECT id FROM exhibitions
  WHERE slug = 'sarapan-di-metmal' OR title ILIKE 'Sarapan di Metm%'
  ORDER BY (slug = 'sarapan-di-metmal') DESC, created_at ASC NULLS LAST
  LIMIT 1
);

INSERT INTO exhibitions (
  title, slug, subtitle, program_type, description, location, date_start, date_end,
  schedule_note, target_audience, looking_for_summary, looking_for_tags,
  status, publication, accepting_applications, default_organization_type, form_config
)
SELECT
  'Sarapan di Metmal',
  'sarapan-di-metmal',
  'Kolaborasi Komunitas di Area Parkir Timur Setiap Minggu Pagi',
  'aktivasi_marcomm',
  'Sarapan di Metmal adalah ruang interaksi publik Minggu pagi di Area Parkir Timur Metropolitan Mall Bekasi. Program ini mempertemukan komunitas, pelaku UMKM, dan pengunjung keluarga dalam satu ekosistem acara yang hangat dan terbuka untuk semua usia.',
  'Area Parkir Timur, Metropolitan Mall Bekasi',
  DATE '2026-11-29',
  DATE '2026-12-27',
  'Setiap hari Minggu, 06.30 - 10.00 WIB',
  'Terbuka untuk umum (semua usia)',
  'Terbuka untuk komunitas, penggerak hobi, maupun pelaku usaha lokal yang membawa kegiatan seru dan ramah untuk semua kalangan usia.',
  ARRAY[
    'Olahraga & Senam Santai',
    'Keluarga & Permainan Anak',
    'Hobi, Sepeda & Sunmori',
    'Seni & Musik Akustik',
    'UMKM Sarapan & Kopi'
  ],
  'open',
  'published',
  true,
  'komunitas',
  '{
    "concept_placeholder": "Contoh: Kami dari komunitas senam pagi ingin mengadakan sesi line dance 45 menit bersama sekitar 30 anggota dan terbuka untuk pengunjung mall.",
    "allowed_contributions": ["pengisi_aktivasi", "booth_umkm", "sponsor_hadiah", "media_partner", "lainnya"],
    "show_technical_needs": true,
    "show_participant_estimate": true
  }'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM exhibitions WHERE slug = 'sarapan-di-metmal');

INSERT INTO exhibition_slots (exhibition_id, slot_date, start_time, end_time, zone_name, capacity, slot_status)
SELECT x.id, d.slot_date, TIME '06:30', TIME '10:00', 'Area Parkir Timur', 3, 'open'
FROM exhibitions x
CROSS JOIN (VALUES
  (DATE '2026-11-29'),
  (DATE '2026-12-06'),
  (DATE '2026-12-13'),
  (DATE '2026-12-20'),
  (DATE '2026-12-27')
) AS d(slot_date)
WHERE x.slug = 'sarapan-di-metmal'
ON CONFLICT (exhibition_id, slot_date, start_time) DO NOTHING;
