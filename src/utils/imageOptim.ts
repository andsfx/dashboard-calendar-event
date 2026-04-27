/**
 * Image Optimization Utility
 *
 * Uses wsrv.nl (free, open-source image CDN) to resize and convert
 * R2 photos to WebP on-the-fly. Results are cached at wsrv.nl's edge.
 *
 * Savings: ~7MB JPG originals → ~27KB WebP thumbnails (99.6% reduction)
 *
 * Future: Can be migrated to Cloudflare Workers Image Resizing
 * when enabled on the andotherstori.my.id zone.
 */

const R2_PUBLIC_URL = (import.meta.env.VITE_R2_PUBLIC_URL || '').replace(/\/$/, '');

interface ImgOptions {
  /** Target width in pixels */
  w?: number;
  /** Target height in pixels (omit for auto) */
  h?: number;
  /** Quality 1-100 */
  q?: number;
  /** Fit mode: cover | contain | inside | outside */
  fit?: 'cover' | 'contain' | 'inside' | 'outside';
}

function isR2Url(url: string): boolean {
  if (!url || !R2_PUBLIC_URL) return false;
  return url.startsWith(R2_PUBLIC_URL);
}

/**
 * Generate an optimized image URL via wsrv.nl image proxy.
 * Falls back to the original URL if it's not from R2.
 */
export function imgUrl(originalUrl: string, options: ImgOptions = {}): string {
  if (!isR2Url(originalUrl)) return originalUrl;

  const params = new URLSearchParams();
  params.set('url', originalUrl);
  if (options.w) params.set('w', String(options.w));
  if (options.h) params.set('h', String(options.h));
  if (options.q) params.set('q', String(options.q));
  if (options.fit) params.set('fit', options.fit);
  params.set('output', 'webp');

  return `https://wsrv.nl/?${params.toString()}`;
}

/** Gallery index cover thumbnail (480px) */
export function thumbUrl(url: string): string {
  return imgUrl(url, { w: 480, q: 70, fit: 'cover' });
}

/** Album grid photo (640px) */
export function gridUrl(url: string): string {
  return imgUrl(url, { w: 640, q: 75 });
}

/** Lightbox full-view (1600px, higher quality) */
export function lightboxUrl(url: string): string {
  return imgUrl(url, { w: 1600, q: 85 });
}

/** Admin thumbnail (200px) */
export function adminThumbUrl(url: string): string {
  return imgUrl(url, { w: 200, q: 65 });
}
