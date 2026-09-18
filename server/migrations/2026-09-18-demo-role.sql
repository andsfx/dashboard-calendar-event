-- ============================================================================
-- Migrasi: tambah role `demo` (akun peragaan read-only)
-- ----------------------------------------------------------------------------
-- `schema.sql` memakai CREATE TABLE IF NOT EXISTS, jadi DB yang sudah ada
-- TIDAK ikut berubah saat schema.sql dijalankan ulang. CHECK constraint
-- users.role harus di-ALTER eksplisit di sini.
--
-- Jalankan (produksi):
--   docker compose exec -T postgres psql -U metmal -d metmal < server/migrations/2026-09-18-demo-role.sql
--
-- Idempoten: aman dijalankan berulang.
-- ============================================================================

DO $$
DECLARE
  c record;
BEGIN
  -- Lepas HANYA check constraint pada users.role (nama auto-generated bisa
  -- berbeda antar-DB), lalu pasang ulang dengan daftar role yang baru.
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE rel.relname = 'users'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%role IN%'
  LOOP
    EXECUTE format('ALTER TABLE users DROP CONSTRAINT %I', c.conname);
  END LOOP;

  ALTER TABLE users
    ADD CONSTRAINT users_role_check
    CHECK (role IN ('superadmin', 'admin', 'demo', 'viewer', 'eo_tenant', 'tenant_relation'));
END $$;
