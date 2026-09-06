import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Camera, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PhotoAlbum } from '../../types';
import { RevealSection } from './CommunityRevealPrimitives';
import { thumbUrl } from '../../utils/imageOptim';

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-tosca-soft)] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950';

interface CachedInstagramPost {
  shortCode?: string;
  postUrl?: string;
  imageUrl?: string;
  cachedImageUrl?: string;
  caption?: string;
}

function SkeletonGalleryAlbums() {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="text-center">
        <div className="mx-auto h-3 w-16 rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="mx-auto mt-4 h-9 w-72 rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="mx-auto mt-3 h-4 w-96 max-w-full rounded bg-slate-100 dark:bg-slate-700/60" />
      </div>
      <div className="mt-10">
        <div className="mb-6 flex items-center gap-2">
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          <div className="h-3 w-32 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-slate-800">
              <div className="aspect-[16/9] bg-slate-200 dark:bg-slate-700" />
              <div className="space-y-2 p-3 sm:p-4">
                <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-3 w-1/2 rounded bg-slate-100 dark:bg-slate-700/60" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LazyInstagramEmbed({ url }: { url: string }) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { const entry = entries[0]; if (entry?.isIntersecting) { setIsVisible(true); observer.disconnect(); } },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Load Instagram embed script when visible
  useEffect(() => {
    if (!isVisible) return;
    const existing = document.querySelector('script[src*="instagram.com/embed"]');
    if (!existing) {
      const script = document.createElement('script');
      script.src = 'https://www.instagram.com/embed.js';
      script.async = true;
      document.body.appendChild(script);
    } else if ((window as any).instgrm) {
      (window as any).instgrm.Embeds.process();
    }
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible || hasError) return;
    const timer = setTimeout(() => setTimedOut(true), 10000);
    return () => clearTimeout(timer);
  }, [isVisible, hasError]);

  return (
    <div ref={containerRef} className="min-h-[350px] overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-slate-800">
      {!isVisible ? (
        <div className="flex h-[350px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[var(--brand-tosca)]" />
        </div>
      ) : hasError || timedOut ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-[350px] flex-col items-center justify-center gap-3 text-sm text-slate-600 transition hover:bg-slate-50 dark:hover:bg-slate-700/50"
        >
          <Globe className="h-8 w-8 text-[var(--brand-tosca)] dark:text-[var(--brand-tosca-soft)]" />
          <span>Lihat di Instagram &rarr;</span>
        </a>
      ) : (
        <div className="relative">
          <iframe
            src={`https://www.instagram.com/p/${url.split('/p/')[1]?.split('/')[0]}/embed/captioned`}
            className="h-[480px] w-full md:h-[520px]"
            style={{ maxWidth: '100%' }}
            title="Instagram post"
            loading="lazy"
            allowTransparency
            onError={() => setHasError(true)}
          />
        </div>
      )}
    </div>
  );
}

/* ─── Cached Instagram card (no external embeds) ────────── */
function InstagramCachedCard({ post }: { post: CachedInstagramPost }) {
  const [imgFailed, setImgFailed] = useState(false);
  const imgSrc = post.cachedImageUrl || post.imageUrl;
  return (
    <a
      href={post.postUrl || 'https://instagram.com/metmalbekasi'}
      target="_blank"
      rel="noopener noreferrer"
      className={`group overflow-hidden rounded-2xl bg-white shadow-sm transition hover:shadow-lg dark:bg-slate-800 ${focusRing}`}
    >
      <div className="aspect-square overflow-hidden bg-slate-200 dark:bg-slate-700">
        {imgSrc && !imgFailed ? (
          <img
            src={imgSrc}
            alt={post.caption || 'Instagram post'}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05] motion-reduce:transform-none"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[color-mix(in_srgb,var(--brand-tosca)_12%,white)] dark:bg-[color-mix(in_srgb,var(--brand-tosca)_25%,black)]">
            <Globe className="h-10 w-10 text-[var(--brand-tosca)] dark:text-[var(--brand-tosca-soft)]" aria-hidden="true" />
          </div>
        )}
      </div>
      {post.caption && (
        <div className="p-3 sm:p-4">
          <p className="text-xs leading-relaxed text-slate-600 line-clamp-2 dark:text-slate-300">{post.caption}</p>
        </div>
      )}
    </a>
  );
}

/* ─── Fallback Instagram card ──────────────────────────── */
function InstagramFallbackCard({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-neutral-100 p-8 text-center shadow-[0_12px_32px_rgba(15,23,42,0.06)] transition hover:shadow-lg dark:border-slate-700 dark:bg-slate-800"
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--brand-tosca)_12%,white)] dark:bg-[color-mix(in_srgb,var(--brand-tosca)_25%,black)]">
        <Globe className="h-10 w-10 text-[var(--brand-tosca)] dark:text-[var(--brand-tosca-soft)]" aria-hidden="true" />
      </div>
      <p className="mt-5 text-lg font-bold text-slate-900 dark:text-white">Lihat di Instagram</p>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">@metmalbekasi</p>
    </a>
  );
}

interface Props {
  albums: PhotoAlbum[];
  instagramPosts?: string[];
  cachedIgPosts?: CachedInstagramPost[];
  isLoading?: boolean;
}

export function CommunityGallery({ albums, instagramPosts, cachedIgPosts = [], isLoading = false }: Props) {
  return (
    <RevealSection id="gallery" className="border-b border-black/5 bg-[var(--section-alt)] px-4 py-16 dark:border-slate-800 sm:px-6 sm:py-24 lg:py-32" skeleton={<SkeletonGalleryAlbums />} isLoading={isLoading}>
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <h2 className="text-4xl font-bold leading-tight text-slate-950 dark:text-white sm:text-5xl">
            Lihat sendiri keseruannya.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
            Dokumentasi event dan update terbaru dari Metropolitan Mall Bekasi
          </p>
        </div>

        {/* ── Dokumentasi Event ── */}
        {albums.length > 0 && (
          <div className="mt-10 sm:mt-14 lg:mt-16">
            <div className="mb-6 flex items-center gap-3">
              <h3 className="text-xs font-bold tracking-wide text-slate-600 dark:text-slate-300">Dokumentasi Event</h3>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            </div>

            <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3">
              {albums.slice(0, 3).map(album => (
                <Link
                  key={album.id}
                  to={`/gallery/${album.slug}`}
                  className={`group overflow-hidden rounded-2xl bg-white shadow-sm transition hover:shadow-lg dark:bg-slate-800 ${focusRing}`}
                >
                  <div className="relative aspect-[16/9] overflow-hidden bg-slate-200 dark:bg-slate-700">
                    {album.coverPhotoUrl ? (
                      <img src={thumbUrl(album.coverPhotoUrl)} alt={album.name} className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05] motion-reduce:transform-none" loading="lazy" />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-[color-mix(in_srgb,var(--brand-tosca)_12%,white)] dark:bg-[color-mix(in_srgb,var(--brand-tosca)_30%,black)]">
                        <Camera className="h-8 w-8 text-[var(--brand-tosca)] dark:text-[var(--brand-tosca-soft)]" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                  <div className="p-3 sm:p-4">
                    <p className="text-sm font-semibold text-slate-800 line-clamp-1 dark:text-white">{album.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                      {album.eventDate && <span>{album.eventDate}</span>}
                      {typeof album.photoCount === 'number' && album.photoCount > 0 && (
                        <span>{album.eventDate ? '·' : ''}{album.photoCount} foto</span>
                      )}
                      <span className="font-semibold text-[var(--brand-tosca-dark)] dark:text-[var(--brand-tosca-soft)]">Lihat foto →</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-6">
              <Link
                to="/gallery"
                className={`inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] dark:border-slate-700 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 ${focusRing}`}
              >
                <Camera className="h-4 w-4" aria-hidden="true" />
                Lihat Semua Gallery
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        )}

        {/* ── Instagram ── */}
        <div className={albums.length > 0 ? 'mt-14 sm:mt-16' : 'mt-10 sm:mt-14 lg:mt-16'}>
          <div className="mb-6 flex items-center gap-3">
              <h3 className="text-xs font-bold tracking-wide text-slate-600 dark:text-slate-300">Instagram</h3>
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          </div>

          {/* Use cached posts if available (fast, no external scripts) */}
          {cachedIgPosts.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {cachedIgPosts.map((post) => (
                <InstagramCachedCard key={post.shortCode || post.postUrl} post={post} />
              ))}
            </div>
          ) : instagramPosts && instagramPosts.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {instagramPosts.map((url, idx) => {
                const trimmedUrl = (url || '').trim();
                if (!trimmedUrl || !trimmedUrl.includes('instagram.com')) {
                  return <InstagramFallbackCard key={`fallback-${idx}`} url="https://instagram.com/metmalbekasi" />;
                }
                return <LazyInstagramEmbed key={trimmedUrl} url={trimmedUrl} />;
              })}
            </div>
          ) : (
            /* Fallback: lightweight profile card (no external iframes) */
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              <InstagramFallbackCard url="https://instagram.com/metmalbekasi" />
            </div>
          )}

          <div className="mt-8">
            <a
              href="https://instagram.com/metmalbekasi"
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] dark:border-slate-700 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 ${focusRing}`}
            >
              <Globe className="h-4 w-4" aria-hidden="true" />
              Follow @metmalbekasi
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </RevealSection>
  );
}
