/**
 * Image Optimization Utility
 *
 * Uses Vercel's built-in image optimization (/_vercel/image) for R2 photos.
 * Vercel fetches the original, resizes, converts to WebP/AVIF, and caches at edge.
 * No server-side dependencies needed (no sharp).
 *
 * Usage:
 *   import { thumbUrl, gridUrl, lightboxUrl } from '../utils/imageOptim';
 *
 *   <img src={thumbUrl(album.coverPhotoUrl)} />     // 480px cover
 *   <img src={gridUrl(photo.url)} />                 // 640px grid
 *   <img src={lightboxUrl(photo.url)} />             // 1600px lightbox
 */

const R2_PUBLIC_URL = (import.meta.env.VITE_R2_PUBLIC_URL || '').replace(/\/$/, '');

interface ImgOptions {
  /** Target width in pixels (default: 800) */
  w?: number;
  /** Quality 1-100 (default: 75) */
  q?: number;
}

/**
 * Check if a URL is from our R2 CDN and can be optimized.
 */
function isR2Url(url: string): boolean {
  if (!url || !R2_PUBLIC_URL) return false;
  return url.startsWith(R2_PUBLIC_URL);
}

/**
 * Generate an optimized image URL via Vercel's built-in image optimization.
 * Falls back to the original URL if it's not from R2 or env is not configured.
 */
export function imgUrl(originalUrl: string, options: ImgOptions = {}): string {
  if (!isR2Url(originalUrl)) return originalUrl;

  const w = options.w || 800;
  const q = options.q || 75;

  return `/_vercel/image?url=${encodeURIComponent(originalUrl)}&w=${w}&q=${q}`;
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
