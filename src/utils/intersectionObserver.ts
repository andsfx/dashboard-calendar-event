/**
 * Guarded IntersectionObserver factory.
 *
 * Four call sites (CommunityGallery, SectionNav, CommunityLandingPage, and the
 * now-removed useAnimation) constructed `new IntersectionObserver(...)` directly.
 * In an environment without the API the constructor throws, and because those
 * calls run inside effects the whole page fell to the error boundary
 * ("Terjadi Kesalahan") instead of degrading.
 *
 * Callers MUST treat `null` as "no observation available" and render the final
 * state (visible, unpinned, …) rather than leaving content hidden.
 */
export function createIntersectionObserver(
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit,
): IntersectionObserver | null {
  if (typeof IntersectionObserver === 'undefined') return null;
  return new IntersectionObserver(callback, options);
}
