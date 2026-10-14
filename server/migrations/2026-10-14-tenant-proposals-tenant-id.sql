-- Tambah tautan ke master tenant MID (apiloyalty) pada pengajuan kolaborasi.
--
-- Kolom `tenant_id` menyimpan TENANT_ID dari MID saat tenant dipilih dari daftar,
-- sehingga staff bisa menelusuri pengajuan ke tenant yang benar walau nama
-- diketik ulang berbeda. Kosong = pengajuan memakai jalur isi manual (tenant
-- belum ada di MID / upstream sedang bermasalah) — bukan galat.
--
-- Idempoten: ADD COLUMN IF NOT EXISTS.
--
-- Jalankan di VPS SEBELUM deploy kode api:
--   docker compose exec -T postgres psql -U metmal -d metmal \
--     < server/migrations/2026-10-14-tenant-proposals-tenant-id.sql

ALTER TABLE tenant_event_proposals
  ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT '';
