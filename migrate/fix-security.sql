-- Fix excessive grants on draft_events (anon should only SELECT + INSERT)
REVOKE DELETE, UPDATE, TRUNCATE, TRIGGER, REFERENCES ON draft_events FROM anon;
REVOKE DELETE, UPDATE, TRUNCATE, TRIGGER, REFERENCES ON draft_events FROM authenticated;

-- Fix excessive grants on annual_themes (anon should only SELECT)
REVOKE DELETE, INSERT, UPDATE, TRUNCATE, TRIGGER, REFERENCES ON annual_themes FROM anon;
REVOKE DELETE, INSERT, UPDATE, TRUNCATE, TRIGGER, REFERENCES ON annual_themes FROM authenticated;

-- Fix excessive grants on holidays (anon should only SELECT)
REVOKE DELETE, INSERT, UPDATE, TRUNCATE, TRIGGER, REFERENCES ON holidays FROM anon;
REVOKE DELETE, INSERT, UPDATE, TRUNCATE, TRIGGER, REFERENCES ON holidays FROM authenticated;

-- Remove overly permissive RLS policies on events
DROP POLICY IF EXISTS "anon_access" ON events;
DROP POLICY IF EXISTS "Allow anon access" ON events;
