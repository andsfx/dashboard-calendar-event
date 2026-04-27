import sharp from 'sharp';

// ─── Vercel Serverless Image Proxy ───────────────────────────
// Fetches original from R2, resizes + converts to WebP, caches at edge.
//
// Usage:  /api/img?url=<R2_URL>&w=640&q=75

const ALLOWED_ORIGIN = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
const MAX_WIDTH = 2000;
const DEFAULT_WIDTH = 800;
const DEFAULT_QUALITY = 75;
const CACHE_HEADER = 'public, s-maxage=2592000, max-age=604800, stale-while-revalidate=86400';

export const config = {
  maxDuration: 15,
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, w, q } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing ?url= parameter' });
  }

  if (ALLOWED_ORIGIN && !url.startsWith(ALLOWED_ORIGIN)) {
    return res.status(403).json({ error: 'URL not from allowed origin' });
  }

  const width = Math.min(Math.max(parseInt(w) || DEFAULT_WIDTH, 16), MAX_WIDTH);
  const quality = Math.min(Math.max(parseInt(q) || DEFAULT_QUALITY, 1), 100);

  try {
    const upstream = await fetch(url);

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `Upstream ${upstream.status}` });
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());

    const optimized = await sharp(buffer)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();

    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', CACHE_HEADER);
    res.setHeader('X-Original-Size', buffer.length);
    res.setHeader('X-Optimized-Size', optimized.length);
    res.status(200).send(optimized);
  } catch (error) {
    console.error('Image proxy error:', error);
    res.status(500).json({ error: 'Image processing failed' });
  }
}
