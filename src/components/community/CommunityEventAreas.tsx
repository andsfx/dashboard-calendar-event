import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Loader2, MapPin } from 'lucide-react';
import { Skeleton } from '../shadcn/skeleton';
import { Button } from '../shadcn/button';
import type { AreaPhoto, EventArea } from '../../types';
import { RevealSection } from './CommunityRevealPrimitives';
import { PhotoLightbox } from '../media/PhotoLightbox';
import { thumbUrl } from '../../utils/imageOptim';
import { fetchAreaPhotos } from '../../utils/domainApi';

interface Props {
  areas: EventArea[];
  isLoading?: boolean;
}

function SkeletonAreas() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5">
      {[0, 1, 2].map(i => (
        <Skeleton key={i} className="h-56 rounded-[var(--radius-campaign-card)] border border-[var(--wf-rule)] bg-[var(--wf-rule)]" />
      ))}
    </div>
  );
}

/**
 * Media kartu area. Saat area punya foto, media dibungkus kontrol nyata
 * (shadcn `Button` ghost yang merender `<button>` asli) dengan chrome primitif
 * dinetralkan; kalau tidak ada aksi, media dirender polos tanpa kontrol.
 *
 * Sebelumnya seluruh `<figure>` diberi `role="button"` + onClick + onKeyDown —
 * ARIA melarang `role="button"` di atas `<figure>` (axe: `aria-allowed-role`).
 * `figure`/`figcaption` tetap dipertahankan sebagai pembungkus semantik.
 */
function AreaMedia({ area, photoCount, clickable, onOpen }: {
  area: EventArea;
  photoCount: number;
  clickable: boolean;
  onOpen: () => void;
}) {
  const media = (
    <div className="relative aspect-[16/10] overflow-hidden bg-[var(--wf-rule)]">
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
          <Camera className="size-9 text-[var(--brand-tosca)] dark:text-[var(--brand-tosca-soft)]" aria-hidden="true" />
        </div>
      )}
      {photoCount > 0 && (
        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
          <Camera className="size-3" aria-hidden="true" />
          {photoCount} foto
        </span>
      )}
    </div>
  );

  if (!clickable) return media;

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onOpen}
      aria-label={`Lihat ${photoCount} foto ${area.name}`}
      className="flex! flex-col! items-stretch! h-auto! w-full! gap-0! rounded-none border-0! p-0! cursor-pointer text-left! whitespace-normal! font-normal! hover:bg-transparent! dark:hover:bg-transparent! focus-visible:outline-none focus-visible:ring-2! focus-visible:ring-[var(--brand-tosca)]! focus-visible:ring-offset-2 active:translate-y-0!"
    >
      {media}
    </Button>
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
    <RevealSection className="border-b border-black/5 bg-[var(--wf-board)]/60 px-4 py-16   sm:px-6 sm:py-24 lg:py-32" skeleton={<SkeletonAreas />} isLoading={isLoading}>
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <h2 className="font-display text-4xl font-bold leading-tight tracking-tight text-[var(--wf-ink)] sm:text-5xl">
            Area di Metropolitan Mall Bekasi
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--wf-ink-muted)]">
            Masih bingung milih spot buat acaramu? Lihat area lebih detail.
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
                className="ui-campaign-card group overflow-hidden rounded-[var(--radius-campaign-card)] bg-[var(--wf-board)] shadow-[var(--shadow-card-soft)] transition-shadow hover:shadow-[0_16px_36px_rgba(22,33,27,0.08)] "
              >
                {/* Interaksi ada di elemen nyata (<button> di dalam AreaMedia),
                    bukan role="button" di atas <figure> — ARIA melarang role itu
                    di figure (axe: aria-allowed-role). figure/figcaption tetap
                    sebagai pembungkus semantik. */}
                <AreaMedia
                  area={area}
                  photoCount={photoCount}
                  clickable={clickable}
                  onOpen={() => { void openArea(area); }}
                />
                <figcaption className="p-5 sm:p-6">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-tosca-dark)] dark:text-[var(--brand-tosca-soft)]" aria-hidden="true" />
                    <h3 className="text-lg font-bold leading-snug text-[var(--wf-ink)]">{area.name}</h3>
                  </div>
                  {area.description && (
                    <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-[var(--wf-ink-muted)]">{area.description}</p>
                  )}
                </figcaption>
              </figure>
              );
            })}
          </div>
        ) : (
          <div className="mt-10 flex flex-col items-center justify-center rounded-[var(--radius-campaign-card)] border-2 border-dashed border-[var(--wf-rule)] py-14 text-center">
            <MapPin className="mb-3 h-10 w-10 text-[var(--wf-rule-strong)]" aria-hidden="true" />
            <p className="text-sm font-medium text-[var(--wf-ink-muted)]">Belum ada foto area</p>
            <p className="mt-1 text-xs text-[var(--wf-ink-muted)]">Foto area akan tampil di sini saat admin menambahkannya.</p>
          </div>
        )}

        {/* Lightbox foto area — klik kartu (portal ke body: RevealSection pakai transform,
            tanpa portal overlay fixed terjebak di dalam section & tidak menutupi header) */}
        {lightboxVisible && lightboxArea && createPortal(
          lightboxLoading ? (
            <div
              className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 bg-slate-950/85"
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
              hideCaption
              title={lightboxArea.name}
              onClose={closeLightbox}
              onPrev={() => setLightbox(lb => lb ? { ...lb, index: (lb.index - 1 + photos.length) % photos.length } : lb)}
              onNext={() => setLightbox(lb => lb ? { ...lb, index: (lb.index + 1) % photos.length } : lb)}
            />
          ),
          document.body
        )}
      </div>
    </RevealSection>
  );
}