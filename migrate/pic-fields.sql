-- ============================================================================
-- PIC FIELDS — Add pic_name and pic_phone to tenant_event_surveys
-- Metropolitan Mall Bekasi
-- ============================================================================
--
-- IDEMPOTENCY: Safe to run multiple times (ADD COLUMN IF NOT EXISTS)
-- ============================================================================

ALTER TABLE tenant_event_surveys
  ADD COLUMN IF NOT EXISTS pic_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS pic_phone VARCHAR(20);

COMMENT ON COLUMN tenant_event_surveys.pic_name IS
  'Nama penanggung jawab (PIC) tenant — opsional, dari MID data atau input manual';

COMMENT ON COLUMN tenant_event_surveys.pic_phone IS
  'Nomor telepon PIC tenant — opsional, dari MID data atau input manual';