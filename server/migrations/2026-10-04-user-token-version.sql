-- ============================================================================
-- Migrasi: tambah `users.token_version` — pencabutan token server-side
-- ----------------------------------------------------------------------------
-- Temuan audit 2026-10-04: refresh token berumur 30 hari TIDAK bisa dicabut.
-- `signRefresh` hanya membawa `{ typ:'refresh', sub }`, `verifyToken` hanya
-- memeriksa tanda tangan + `typ`, dan `POST /auth/logout` hanya menghapus
-- cookie. Salinan token yang dicuri (atau tersimpan di perangkat bersama)
-- tetap bisa menukar access token baru sampai kedaluwarsa penuh.
--
-- Solusi: satu angka per user. Access & refresh JWT membawa claim `ver`;
-- `authenticate` menolak token yang `ver`-nya tidak sama dengan nilai kolom
-- ini, di KEDUA jalur (access fast-path dan refresh-rotation). Logout dan
-- reset password menaikkan angkanya, sehingga seluruh token lama langsung
-- mati tanpa perlu menyimpan daftar token (stateless, tanpa tabel baru).
--
-- Catatan roll-out: token yang diterbitkan SEBELUM migrasi ini tidak punya
-- claim `ver`. Kode memperlakukannya sebagai versi 0 — sama dengan nilai
-- DEFAULT kolom ini — sehingga deploy TIDAK memaksa semua pengguna login
-- ulang. Setelah logout/reset pertama, `ver` mulai dibandingkan secara nyata.
--
-- Jalankan (produksi):
--   docker compose exec -T postgres psql -U metmal -d metmal < server/migrations/2026-10-04-user-token-version.sql
--
-- Idempoten: aman dijalankan berulang.
-- ============================================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;

-- Verifikasi (harus mengembalikan 0):
--   SELECT count(*) FROM users WHERE token_version IS NULL;