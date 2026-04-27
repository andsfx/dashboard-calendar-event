/**
 * Image Optimization Utility
 *
 * Generates optimized image URLs via /api/img serverless proxy.
 * The proxy fetches from R2, resizes with sharp, converts to WebP,
 * and caches at Vercel's edge for 30 days.
 */

const R2_PUBLIC_URL = (import.meta.env.VITE_R2_PUBLIC_URL || '').replace(/\/$/, '');

interface ImgOptions {
  w?: number;
  q?: number;
}

function isR2Url(url: string): boolean {
  if (!url || !R2_PUBLIC_URL) return false;
  return url.startsWith(R2_PUBLIC_URL);
}

export function imgUrl(originalUrl: string, options: ImgOptions = {}): string {
  if (!isR2Url(originalUrl)) return originalUrl;
  const w = options.w || 800;
  const q = options.q || 75;
  return `/api/img?url=${encodeURIComponent(originalUrl)}&w=${w}&q=${q}`;
}

/** Gallery index cover thumbnail (480px) */
export function thumbUrl(url: string): string {
  return imgUrl(url, { w: 480, q: 70 });
}

/** Album grid photo (640px) */
export function gridUrl(url: string): string {
  return imgUrl(url, { w: 640, q: 75 });
}

/** Lightbox full-view (1600px) */
export function lightboxUrl(url: string): string {
  return imgUrl(url, { w: 1600, q: 85 });
}

/** Admin thumbnail (200px) */
export function adminThumbUrl(url: string): string {
  return imgUrl(url, { w: 200, q: 65 });
}
