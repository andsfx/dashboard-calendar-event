-- Security P0: harden RLS for photo + draft write paths
-- Apply via Supabase SQL editor or `supabase db push`.
-- Intent: anon/authenticated clients can READ public gallery data,
-- but ONLY service_role (used by /api/supabase-admin) may write photos/albums.
-- Public draft submission remains INSERT-only for draft_events.

-- ── event_photos ────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.event_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_photos_public_select" ON public.event_photos;
CREATE POLICY "event_photos_public_select"
  ON public.event_photos
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Deny direct client writes (service_role bypasses RLS)
DROP POLICY IF EXISTS "event_photos_anon_insert" ON public.event_photos;
DROP POLICY IF EXISTS "event_photos_anon_update" ON public.event_photos;
DROP POLICY IF EXISTS "event_photos_anon_delete" ON public.event_photos;
DROP POLICY IF EXISTS "event_photos_auth_insert" ON public.event_photos;
DROP POLICY IF EXISTS "event_photos_auth_update" ON public.event_photos;
DROP POLICY IF EXISTS "event_photos_auth_delete" ON public.event_photos;
DROP POLICY IF EXISTS "Allow public insert event_photos" ON public.event_photos;
DROP POLICY IF EXISTS "Allow public update event_photos" ON public.event_photos;
DROP POLICY IF EXISTS "Allow public delete event_photos" ON public.event_photos;

-- ── photo_albums ────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.photo_albums ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "photo_albums_public_select" ON public.photo_albums;
CREATE POLICY "photo_albums_public_select"
  ON public.photo_albums
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "photo_albums_anon_insert" ON public.photo_albums;
DROP POLICY IF EXISTS "photo_albums_anon_update" ON public.photo_albums;
DROP POLICY IF EXISTS "photo_albums_anon_delete" ON public.photo_albums;
DROP POLICY IF EXISTS "photo_albums_auth_insert" ON public.photo_albums;
DROP POLICY IF EXISTS "photo_albums_auth_update" ON public.photo_albums;
DROP POLICY IF EXISTS "photo_albums_auth_delete" ON public.photo_albums;
DROP POLICY IF EXISTS "Allow public insert photo_albums" ON public.photo_albums;
DROP POLICY IF EXISTS "Allow public update photo_albums" ON public.photo_albums;
DROP POLICY IF EXISTS "Allow public delete photo_albums" ON public.photo_albums;

-- ── draft_events: public may INSERT only ────────────────────────────
ALTER TABLE IF EXISTS public.draft_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "draft_events_public_insert" ON public.draft_events;
CREATE POLICY "draft_events_public_insert"
  ON public.draft_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- No public SELECT/UPDATE/DELETE of drafts (admin via service_role)
DROP POLICY IF EXISTS "draft_events_public_select" ON public.draft_events;
DROP POLICY IF EXISTS "draft_events_public_update" ON public.draft_events;
DROP POLICY IF EXISTS "draft_events_public_delete" ON public.draft_events;

-- ── helpful indexes (idempotent) ────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_event_photos_event_id ON public.event_photos (event_id);
CREATE INDEX IF NOT EXISTS idx_event_photos_album_id ON public.event_photos (album_id);
CREATE INDEX IF NOT EXISTS idx_photo_albums_event_id ON public.photo_albums (event_id);
CREATE INDEX IF NOT EXISTS idx_photo_albums_slug ON public.photo_albums (slug);
