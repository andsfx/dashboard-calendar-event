-- Relasi events -> community_registrations (halaman "community/EO/sekolah
-- yang sudah pernah buat event").

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS organization_id TEXT REFERENCES public.community_registrations(id);

CREATE INDEX IF NOT EXISTS idx_events_organization_id ON public.events(organization_id);

-- Backfill: kaitkan event yang `eo`-nya sama persis dengan organization_name
-- (case-insensitive) ke registrasi yang cocok.
UPDATE public.events e
   SET organization_id = cr.id
  FROM public.community_registrations cr
 WHERE e.organization_id IS NULL
   AND lower(trim(coalesce(e.eo, ''))) = lower(trim(cr.organization_name));
