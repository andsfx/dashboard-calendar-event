-- RLS Policies (drop existing first to avoid conflicts)
DROP POLICY IF EXISTS "Public can read events" ON events;
CREATE POLICY "Public can read events" ON events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can read annual_themes" ON annual_themes;
CREATE POLICY "Public can read annual_themes" ON annual_themes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can read holidays" ON holidays;
CREATE POLICY "Public can read holidays" ON holidays FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can insert draft_events" ON draft_events;
CREATE POLICY "Public can insert draft_events" ON draft_events FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can read draft_events" ON draft_events;
CREATE POLICY "Public can read draft_events" ON draft_events FOR SELECT USING (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE events;
ALTER PUBLICATION supabase_realtime ADD TABLE draft_events;
ALTER PUBLICATION supabase_realtime ADD TABLE annual_themes;
ALTER PUBLICATION supabase_realtime ADD TABLE holidays;
