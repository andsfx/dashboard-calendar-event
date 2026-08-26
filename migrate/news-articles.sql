-- News / Blog articles table
CREATE TABLE IF NOT EXISTS news_articles (
  id TEXT PRIMARY KEY DEFAULT ('news_' || replace(gen_random_uuid()::text, '-', '')),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT DEFAULT '',
  content TEXT DEFAULT '',
  cover_image_url TEXT DEFAULT '',
  author TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read published news" ON news_articles;
CREATE POLICY "Public can read published news" ON news_articles FOR SELECT USING (status = 'published');

CREATE INDEX IF NOT EXISTS idx_news_articles_slug ON news_articles (slug);
CREATE INDEX IF NOT EXISTS idx_news_articles_published ON news_articles (published_at DESC);
