import { useEffect, useRef } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { lightboxUrl } from '../utils/imageOptim';

/** Shape minimal foto lightbox — struktural cocok untuk EventPhoto & AreaPhoto. */
export interface LightboxPhoto {
  url: string;
  caption: string;
  eventDate?: string;
}

/* ─── Standalone Lightbox (shared: galeri publik + foto area event) ─── */
export function PhotoLightbox({ photos, currentIndex, onClose, onPrev, onNext }: {
  photos: LightboxPhoto[];
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const photo = photos[currentIndex];
  const lightboxRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation
  useEffect(() => {
    if (!photo) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [photo, onClose, onPrev, onNext]);

  // Focus trap
  useEffect(() => {
    if (!photo || !lightboxRef.current) return;
    const container = lightboxRef.current;
    const focusableSelector = 'button:not([disabled]), [tabindex]:not([tabindex="-1"])';

    // Auto-focus close button
    const closeBtn = container.querySelector<HTMLElement>('[data-lightbox-close]');
    closeBtn?.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = Array.from(container.querySelectorAll<HTMLElement>(focusableSelector));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (first && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (last && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [photo]);

  if (!photo) return null;

  return (
    <div
      ref={lightboxRef}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Foto: ${photo.caption}`}
    >
      {/* Close button */}
      <button
        data-lightbox-close
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/20"
        aria-label="Tutup lightbox"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Prev / Next — min 44x44 touch target */}
      {photos.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); onPrev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-4 text-white transition hover:bg-white/20"
            aria-label="Foto sebelumnya"
          >
            <ChevronDown className="h-6 w-6 rotate-90" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onNext(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-4 text-white transition hover:bg-white/20"
            aria-label="Foto berikutnya"
          >
            <ChevronDown className="h-6 w-6 -rotate-90" />
          </button>
        </>
      )}

      {/* Image + caption */}
      <div className="max-w-4xl px-16" onClick={(e) => e.stopPropagation()}>
        <img
          src={lightboxUrl(photo.url)}
          alt={photo.caption}
          className="max-h-[80vh] w-full rounded-lg object-contain"
          onError={(e) => { (e.target as HTMLImageElement).src = photo.url; }}
        />
        <div className="mt-4 text-center">
          <p className="text-lg font-semibold text-white">{photo.caption}</p>
          {photo.eventDate && <p className="mt-1 text-sm text-white/60">{photo.eventDate}</p>}
          <p className="mt-2 text-xs text-white/40">{currentIndex + 1} / {photos.length}</p>
        </div>
      </div>
    </div>
  );
}
