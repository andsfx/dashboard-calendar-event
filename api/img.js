import sharp from 'sharp';

// ─── Vercel Serverless Image Proxy ───────────────────────────
// Fetches original from R2, resizes + converts to WebP, caches at edge.
//
// Usage:  /api/img?url=<R2_URL>&w=640&q=75
//   url  – full CDN URL (must start with R2_PUBLIC_URL)
//   w    – target width  (default 800, max 2000)
//   q    – quality 1-100 (default 75)
//   h    – optional target height (omit to auto-scale)
//   fit  – sharp fit mode: cover|contain|fill|inside|outside (default cover)

const ALLOWED_ORIGIN = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');
const MAX_WIDTH = 2000;
const MAX_HEIGHT = 2000;
const DEFAULT_WIDTH = 800;
const DEFAULT_QUALITY = 75;

// Cache for 30 days at CDN edge, 7 days in browser
const CACHE_HEADER = 'public, s-maxage=2592000, max-age=604800, stale-while-revalidate=86400';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, w, h, q, fit } = req.query;

  // ── Validate URL ──
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing ?url= parameter' });
  }

  if (ALLOWED_ORIGIN && !url.startsWith(ALLOWED_ORIGIN)) {
    return res.status(403).json({ error: 'URL not from allowed origin' });
  }

  // ── Parse params ──
  const width = Math.min(Math.max(parseInt(w) || DEFAULT_WIDTH, 16), MAX_WIDTH);
  const height = h ? Math.min(Math.max(parseInt(h), 16), MAX_HEIGHT) : undefined;
  const quality = Math.min(Math.max(parseInt(q) || DEFAULT_QUALITY, 1), 100);
  const fitMode = ['cover', 'contain', 'fill', 'inside', 'outside'].includes(fit) ? fit : 'cover';

  try {
    // ── Fetch original from R2 ──
    const upstream = await fetch(url, {
      headers: { 'Accept': 'image/*' },
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `Upstream returned ${upstream.status}` });
    }

    const contentType = upstream.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      return res.status(400).json({ error: 'URL is not an image' });
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());

    // ── Resize + convert to WebP ──
    const resizeOptions = { width, fit: fitMode, withoutEnlargement: true };
    if (height) resizeOptions.height = height;

    const optimized = await sharp(buffer)
      .resize(resizeOptions)
      .webp({ quality })
      .toBuffer();

    // ── Respond ──
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', CACHE_HEADER);
    res.setHeader('Vary', 'Accept');
    res.setHeader('X-Original-Size', buffer.length);
    res.setHeader('X-Optimized-Size', optimized.length);
    res.status(200).send(optimized);
  } catch (error) {
    console.error('Image proxy error:', error);
    res.status(500).json({ error: 'Image processing failed' });
  }
}
