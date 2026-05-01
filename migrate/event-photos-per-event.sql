-- ============================================================================
-- EVENT PHOTOS PER EVENT — Add event_id to event_photos
-- ============================================================================
--
-- PURPOSE: Allow photos to be directly linked to events (not just albums)
-- IDEMPOTENCY: Safe to run multiple times
--
-- ============================================================================

-- Add event_id column to event_photos
ALTER TABLE event_photos ADD COLUMN IF NOT EXISTS event_id TEXT DEFAULT '';

-- Index for querying photos by event
CREATE INDEX IF NOT EXISTS idx_event_photos_event_id ON event_photos(event_id)
  WHERE event_id != '';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'event_photos' AND column_name = 'event_id';
