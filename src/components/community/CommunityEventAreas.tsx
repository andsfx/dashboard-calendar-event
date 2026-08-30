import { useCallback, useEffect, useState } from 'react';
import { Camera, Loader2, MapPin } from 'lucide-react';
import type { AreaPhoto, EventArea } from '../../types';
import { RevealSection, CommunityEyebrow } from './CommunityRevealPrimitives';
import { PhotoLightbox } from '../PhotoLightbox';
import { thumbUrl } from '../../utils/imageOptim';
import { fetchAreaPhotos } from '../../utils/supabaseApi';

interface Props {
  areas: EventArea[];
  isLoading?: boolean;
}

function SkeletonAreas() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5">
      {[0, 1, 2].map(i => (
        <div key={i} className="h-56 animate-pulse rounded-[2rem] border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800" />
      ))}
    </div>
  );
}

/** Section "Foto Area Event" — grid area event dengan cover foto (kurasi admin). */
export function CommunityEventAreas({ areas, isLoading = false }: Props) {
  const [lightbox, setLightbox] = useState<{ areaId: string; index: number } | null>(null);
  const [photosByArea, setPhotosByArea] = useState<Record<string, AreaPhoto[]>>({});
  const [loadingAreaId, setLoadingAreaId] = useState<string | null>(null);

  const visible = areas.filter(a => a.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  const empty = visible.length === 0;
  const lightboxVisible = lightbox !== null && !isLoading && !empty;

  // Lazy-fetch foto area saat kartu diklik (sekali per area)
  const openArea = useCallback(async (area: EventArea) => {
    if (!area.photoCount || area.photoCount <= 0) return;
    setLightbox({ areaId: area.id, index: 0 });
    if (photosByArea[area.id]) return;
    setLoadingAreaId(area.id);
    try {
      const fetched = await fetchAreaPhotos(area.id);
      setPhotosByArea(m => ({ ...m, [area.id]: fetched }));
      if (fetched.length === 0) setLightbox(cur => (cur?.areaId === area.id ? null : cur));
    } catch {
      setLightbox(cur => (cur?.areaId === area.id ? null : cur));
    } finally {
      setLoadingAreaId(cur => (cur === area.id ? null : cur));
    }
  }, [photosByArea]);

  const closeLightbox = useCallback(() => setLightbox(null), []);

  const photos = lightbox ? photosByArea[lightbox.areaId] ?? [] : [];

  // Lock body scroll saat lightbox terbuka
  useEffect(() => {
    if (!lightboxVisible) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [lightboxVisible]);

  const lightboxLoading = lightboxVisible && photos.length === 0;
  const lightboxArea = lightbox ? visible.find(a => a.id === lightbox.areaId) : undefined;

  if (!isLoading && empty) return null;

  return (
    <RevealSection id="areas" className="border-b border-black/5 bg-white/60 px-4 py-16 dark:border-slate-800 dark:bg-slate-900/20 sm:px-6 sm:py-24 lg:py-32" skeleton={<SkeletonAreas />} isLoading={isLoading}>
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <CommunityEyebrow>Foto Area Event</CommunityEyebrow>
          <h2 className="font-display mt-2 text-4xl font-bold leading-tight tracking-tight text-slate-950 dark:text-white sm:text-5xl">
            Arena di Metropolitan Mall.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-400">
            Dari panggung utama sampai area tenant — lihat suasana tiap sudut tempat event digelar.
          </p>
        </div>

        {visible.length > 0 ? (
          <div className="mt-10 grid gap-4 sm:mt-14 lg:mt-16 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {visible.map(area => {
              const photoCount = area.photoCount ?? 0;
              const clickable = photoCount > 0;
              return (
              <figure
                key={area.id}
                role={clickable ? 'button' : undefined}
                tabIndex={clickable ? 0 : undefined}
                aria-label={clickable ? `Lihat ${photoCount} foto ${area.name}` : undefined}
                onClick={clickable ? () => { void openArea(area); } : undefined}
                onKeyDown={clickable ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    void openArea(area);
                  }
                } : undefined}
                className={[
                  'ui-campaign-card group overflow-hidden rounded-[2rem] bg-white shadow-[var(--shadow-card-soft)] transition hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)] dark:bg-slate-900',
                  clickable ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-tosca)] focus-visible:ring-offset-2' : '',
                ].join(' ')}
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-200 dark:bg-slate-700">
                  {area.coverPhotoUrl ? (
                    <img
                      src={thumbUrl(area.coverPhotoUrl)}
                      alt={area.name}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05] motion-reduce:transform-none"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-[color-mix(in_srgb,var(--brand-tosca)_12%,white)] dark:bg-[color-mix(in_srgb,var(--brand-tosca)_30%,black)]">
                      <Camera className="h-9 w-9 text-[var(--brand-tosca)] dark:text-[var(--brand-tosca-soft)]" aria-hidden="true" />
                    </div>
                  )}
                  {typeof area.photoCount === 'number' && area.photoCount > 0 && (
                    <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                      <Camera className="h-3 w-3" aria-hidden="true" />
                      {area.photoCount} foto
                    </span>
                  )}
                </div>
                <figcaption className="p-5 sm:p-6">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-tosca-dark)] dark:text-[var(--brand-tosca-soft)]" aria-hidden="true" />
                    <h3 className="text-lg font-bold leading-snug text-slate-900 dark:text-white">{area.name}</h3>
                  </div>
                  {area.description && (
                    <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{area.description}</p>
                  )}
                </figcaption>
              </figure>
              );
            })}
          </div>
        ) : (
          <div className="mt-10 flex flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-slate-200 py-14 text-center dark:border-slate-700">
            <MapPin className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-500" aria-hidden="true" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Belum ada foto area</p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Foto area akan tampil di sini saat admin menambahkannya.</p>
          </div>
        )}

        {/* Lightbox foto area — klik kartu */}
        {lightboxVisible && lightboxArea && (
          lightboxLoading ? (
            <div
              className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 bg-black/90 backdrop-blur-sm"
              onClick={closeLightbox}
              role="dialog"
              aria-modal="true"
              aria-label={`Memuat foto ${lightboxArea.name}`}
            >
              <Loader2 className="h-8 w-8 animate-spin text-white/80" aria-hidden="true" />
              <p className="text-sm text-white/70">Memuat foto…</p>
            </div>
          ) : (
            <PhotoLightbox
              photos={photos}
              currentIndex={lightbox.index}
              onClose={closeLightbox}
              onPrev={() => setLightbox(lb => lb ? { ...lb, index: (lb.index - 1 + photos.length) % photos.length } : lb)}
              onNext={() => setLightbox(lb => lb ? { ...lb, index: (lb.index + 1) % photos.length } : lb)}
            />
          )
        )}
      </div>
    </RevealSection>
  );
}