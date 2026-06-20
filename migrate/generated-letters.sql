-- Generated letters/documents table
-- Stores metadata about PDF documents generated from the WYSIWYG editor

CREATE TABLE IF NOT EXISTS generated_letters (
  id TEXT PRIMARY KEY DEFAULT ('ltr_' || replace(gen_random_uuid()::text, '-', '')),
  event_id TEXT REFERENCES events(id) ON DELETE SET NULL,
  draft_event_id TEXT REFERENCES draft_events(id) ON DELETE SET NULL,
  letter_data JSONB NOT NULL, -- Full LetterRequestItem data
  pdf_url TEXT, -- URL to stored PDF if uploaded to storage
  pdf_base64 TEXT, -- Base64 encoded PDF (for small documents)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT, -- User/admin who generated it
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted'))
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_generated_letters_event_id ON generated_letters(event_id);
CREATE INDEX IF NOT EXISTS idx_generated_letters_draft_event_id ON generated_letters(draft_event_id);
CREATE INDEX IF NOT EXISTS idx_generated_letters_created_at ON generated_letters(created_at DESC);

-- Enable RLS
ALTER TABLE generated_letters ENABLE ROW LEVEL SECURITY;

-- Policies: Admins can manage all, public can read active ones
DROP POLICY IF EXISTS "Admin full access to generated_letters" ON generated_letters;
CREATE POLICY "Admin full access to generated_letters" ON generated_letters 
  USING (EXISTS (
    SELECT 1 FROM auth.users WHERE auth.uid() = auth.users.id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM auth.users WHERE auth.uid() = auth.users.id
  ));

DROP POLICY IF EXISTS "Public read active generated_letters" ON generated_letters;
CREATE POLICY "Public read active generated_letters" ON generated_letters 
  FOR SELECT USING (status = 'active');

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE generated_letters;