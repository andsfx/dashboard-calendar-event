import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Camera, Globe } from 'lucide-react';
import { PhotoAlbum } from '../../types';
import { CommunityEyebrow, RevealSection } from './CommunityRevealPrimitives';
import { thumbUrl } from '../../utils/imageOptim';

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950';

const IG_POSTS = [
  'https://www.instagram.com/p/DXYxAlQkXrD/',
  'https://www.instagram.com/metmalbekasi/p/DXecp6JEaqt/',
];

interface CachedInstagramPost {
  shortCode?: string;
  postUrl?: string;
  imageUrl?: string;
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
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-violet-500" />
        </div>
      ) : hasError || timedOut ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-[350px] flex-col items-center justify-center gap-3 text-sm text-slate-500 transition hover:bg-slate-50 dark:hover:bg-slate-700/50"
        >
          <Globe className="h-8 w-8 text-violet-400" />
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
  return (
    <a
      href={post.postUrl || 'https://instagram.com/metmalbekasi'}
      target="_blank"
      rel="noopener noreferrer"
      className={`group overflow-hidden rounded-2xl bg-white shadow-sm transition hover:shadow-lg dark:bg-slate-800 ${focusRing}`}
    >
      <div className="aspect-square overflow-hidden bg-slate-200 dark:bg-slate-700">
        {post.imageUrl ? (
          <img src={post.imageUrl} alt={post.caption || 'Instagram post'} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-violet-100 to-amber-50 dark:from-violet-900/30 dark:to-amber-900/20">
            <Globe className="h-10 w-10 text-violet-400" />
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
      className="group flex flex-col items-center justify-center rounded-2xl border border-black/[0.06] bg-[#faf6ef] p-8 text-center shadow-[0_12px_32px_rgba(15,23,42,0.06)] transition hover:shadow-lg dark:border-slate-700 dark:bg-slate-800"
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-amber-50 dark:from-violet-900/30 dark:to-amber-900/20">
        <Globe className="h-10 w-10 text-violet-500 dark:text-violet-400" />
      </div>
      <p className="mt-5 text-lg font-bold text-slate-900 dark:text-white">Lihat di Instagram</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">@metmalbekasi</p>
    </a>
  );
}

interface Props {
  albums: PhotoAlbum[];
  instagramPosts?: string[];
  cachedIgPosts?: CachedInstagramPost[];
}

export function CommunityGallery({ albums, instagramPosts, cachedIgPosts = [] }: Props) {
  return (
    <RevealSection id="gallery" className="border-y border-black/5 bg-[#f4efe8] px-4 py-16 dark:bg-slate-900 dark:border-slate-800 sm:px-6 sm:py-24 lg:py-32" skeleton={<SkeletonGalleryAlbums />}>
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <CommunityEyebrow className="text-xs">Galeri</CommunityEyebrow>
          <h2 className="mt-3 text-4xl font-bold leading-tight text-slate-950 dark:text-white sm:text-5xl">
            Lihat sendiri keseruannya.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-400">
            Dokumentasi event dan update terbaru dari Metropolitan Mall Bekasi
          </p>
        </div>

        {/* ── Dokumentasi Event ── */}
        {albums.length > 0 && (
          <div className="mt-10 sm:mt-14 lg:mt-16">
            <div className="mb-6 flex items-center justify-center gap-2">
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Dokumentasi Event</h3>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            </div>

            <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3">
              {albums.slice(0, 3).map(album => (
                <a
                  key={album.id}
                  href={`/gallery/${album.slug}`}
                  className={`group overflow-hidden rounded-2xl bg-white shadow-sm transition hover:shadow-lg dark:bg-slate-800 ${focusRing}`}
                >
                  <div className="relative aspect-[16/9] overflow-hidden bg-slate-200 dark:bg-slate-700">
                    {album.coverPhotoUrl ? (
                      <img src={thumbUrl(album.coverPhotoUrl)} alt={album.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" loading="lazy" />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-violet-100 to-violet-200 dark:from-violet-900/40 dark:to-slate-700">
                        <Camera className="h-8 w-8 text-violet-300 dark:text-violet-500" aria-hidden="true" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
                      <span className="text-sm font-semibold text-white">Lihat Foto &rarr;</span>
                    </div>
                  </div>
                  <div className="p-3 sm:p-4">
                    <p className="text-sm font-semibold text-slate-800 line-clamp-1 dark:text-white">{album.name}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      {album.eventDate && <span>{album.eventDate}</span>}
                      {typeof album.photoCount === 'number' && album.photoCount > 0 && <span>{album.eventDate ? '·' : ''} {album.photoCount} foto</span>}
                    </div>
                  </div>
                </a>
              ))}
            </div>

            <div className="mt-6 text-center">
              <a
                href="/gallery"
                className={`inline-flex items-center gap-2 rounded-full border border-black/[0.06] dark:border-slate-700 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 ${focusRing}`}
              >
                <Camera className="h-4 w-4" aria-hidden="true" />
                Lihat Semua Gallery
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        )}

        {/* ── Instagram ── */}
        <div className={albums.length > 0 ? 'mt-14 sm:mt-16' : 'mt-10 sm:mt-14 lg:mt-16'}>
          <div className="mb-6 flex items-center justify-center gap-2">
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Instagram</h3>
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          </div>

          {/* Use cached posts if available (fast, no external scripts) */}
          {cachedIgPosts.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {cachedIgPosts.map((post) => (
                <InstagramCachedCard key={post.shortCode || post.postUrl} post={post} />
              ))}
            </div>
          ) : (
            /* Fallback: iframe embed (slower, loads external scripts) */
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {(instagramPosts && instagramPosts.length > 0
                ? instagramPosts
                : IG_POSTS
              ).map((url, idx) => {
                const trimmedUrl = (url || '').trim();
                if (!trimmedUrl || !trimmedUrl.includes('instagram.com')) {
                  return <InstagramFallbackCard key={`fallback-${idx}`} url="https://instagram.com/metmalbekasi" />;
                }
                return <LazyInstagramEmbed key={trimmedUrl} url={trimmedUrl} />;
              })}
            </div>
          )}

          <div className="mt-8 text-center">
            <a
              href="https://instagram.com/metmalbekasi"
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 rounded-full border border-black/[0.06] dark:border-slate-700 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 ${focusRing}`}
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
