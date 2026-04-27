/**
 * Cloudflare R2 Image Optimization Utility
 *
 * Generates optimized image URLs via the /api/img proxy.
 * The proxy fetches from R2, resizes with sharp, converts to WebP,
 * and caches at Vercel's edge for 30 days.
 *
 * Usage:
 *   import { thumbUrl, imgUrl } from '../utils/imageOptim';
 *
 *   // Gallery index cover (small thumbnail)
 *   <img src={thumbUrl(album.coverPhotoUrl)} />
 *
 *   // Album grid photo (medium)
 *   <img src={imgUrl(photo.url, { w: 640 })} />
 *
 *   // Lightbox (large, high quality)
 *   <img src={imgUrl(photo.url, { w: 1600, q: 85 })} />
 */

const R2_PUBLIC_URL = (import.meta.env.VITE_R2_PUBLIC_URL || '').replace(/\/$/, '');

interface ImgOptions {
  /** Target width in pixels (default: 800) */
  w?: number;
  /** Target height in pixels (omit for auto) */
  h?: number;
  /** Quality 1-100 (default: 75) */
  q?: number;
  /** Fit mode: cover | contain | fill | inside | outside */
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

/**
 * Check if a URL is from our R2 CDN and can be optimized.
 */
function isR2Url(url: string): boolean {
  if (!url || !R2_PUBLIC_URL) return false;
  return url.startsWith(R2_PUBLIC_URL);
}

/**
 * Generate an optimized image URL via the /api/img proxy.
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

  return `/api/img?${params.toString()}`;
}

/**
 * Preset: Gallery index cover thumbnail (small, 480px wide)
 */
export function thumbUrl(url: string): string {
  return imgUrl(url, { w: 480, q: 70 });
}

/**
 * Preset: Album grid photo (medium, 640px wide)
 */
export function gridUrl(url: string): string {
  return imgUrl(url, { w: 640, q: 75 });
}

/**
 * Preset: Lightbox / full-view photo (large, 1600px wide, higher quality)
 */
export function lightboxUrl(url: string): string {
  return imgUrl(url, { w: 1600, q: 85 });
}

/**
 * Preset: Admin thumbnail (tiny, 200px wide)
 */
export function adminThumbUrl(url: string): string {
  return imgUrl(url, { w: 200, q: 65 });
}
