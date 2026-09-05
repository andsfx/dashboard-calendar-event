-- ============================================================
-- Fix RLS draft_events — tutup kebocoran PII ke anon (2026-09-05)
-- Sebelumnya: "Public can read draft_events" USING (true) membuat
-- siapa pun (anon key) bisa SELECT seluruh baris draft termasuk
-- pic, phone, dan internal_note.
-- Sesudah: hanya user terautentikasi (login Supabase / session
-- sb-access-token) yang bisa SELECT. Jalur admin tetap aman karena
-- memakai service_role (bypass RLS), dan realtime tetap jalan untuk
-- sesi yang terautentikasi.
-- Catatan: INSERT publik (form /ajukan-event) tetap diizinkan lewat
-- policy "Public can insert draft_events" (WITH CHECK true) — tanpa
-- RETURNING, sehingga tidak butuh privilege SELECT.
-- ============================================================

DROP POLICY IF EXISTS "Public can read draft_events" ON draft_events;
CREATE POLICY "Authenticated can read draft_events" ON draft_events
  FOR SELECT USING (auth.uid() IS NOT NULL);