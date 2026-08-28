ALTER TABLE community_registrations
  ADD COLUMN IF NOT EXISTS proposal_file_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS proposal_file_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS proposal_file_size INTEGER DEFAULT 0;
