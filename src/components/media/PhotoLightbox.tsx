import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, X } from 'lucide-react';
import { lightboxUrl } from '../../utils/imageOptim';
import { useBackgroundInert } from './overlayLayer';

/** Shape minimal foto lightbox — struktural cocok untuk EventPhoto & AreaPhoto. */
export interface LightboxPhoto {
  url: string;
  caption: string;
  eventDate?: string;
}

/* ─── Standalone Lightbox (shared: galeri publik + foto area event) ─── */
export function PhotoLightbox({ photos, currentIndex, onClose, onPrev, onNext, hideCaption = false, title }: {
  photos: LightboxPhoto[];
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  /** Sembunyikan caption & tanggal (mis. caption area = nama file mentah); counter tetap tampil. */
  hideCaption?: boolean;
  /** Judul aksesibilitas dialog saat caption disembunyikan (mis. nama area). */
  title?: string;
}) {
  const photo = photos[currentIndex];
  const lightboxRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  // Simpan elemen pembuka saat dialog dibuka. Pengembalian fokus ada di efek
  // terpisah SESUDAH `useBackgroundInert`: cleanup berjalan sesuai urutan
  // deklarasi, jadi `#root` harus dilepas dari `inert` lebih dulu — `focus()`
  // pada elemen di dalam subtree `inert` diabaikan browser dan fokus jatuh ke
  // `<body>`.
  useEffect(() => {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }, []);

  useBackgroundInert(Boolean(photo));

  // Kembalikan fokus ke pembuka saat dialog ditutup (termasuk lewat Escape).
  useEffect(() => () => {
    const opener = openerRef.current;
    if (opener?.isConnected) opener.focus();
  }, []);

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

  // Portal ke `document.body`: overlay `fixed` tidak boleh terjebak di dalam
  // ancestor ber-`transform` (RevealSection) dan latar `#root` bisa di-`inert`.
  return createPortal(
    <div
      ref={lightboxRef}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/85"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={hideCaption ? `Foto: ${title || photo.caption}` : `Foto: ${photo.caption}`}
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
          alt={hideCaption ? `${title || 'Foto'} - ${currentIndex + 1}` : photo.caption}
          className="max-h-[80vh] w-full rounded-lg object-contain"
          onError={(e) => { (e.target as HTMLImageElement).src = photo.url; }}
        />
        <div className="mt-4 text-center">
          {!hideCaption && <p className="text-lg font-semibold text-white">{photo.caption}</p>}
          {!hideCaption && photo.eventDate && <p className="mt-1 text-sm text-white/60">{photo.eventDate}</p>}
          {/* text-white/40 failed AA: 3.33:1 measured over the slate-950/85
              overlay (axe: 3.34, minimum alpha to reach 4.5:1 is 0.522).
              /70 gives 6.72:1 worst-case (white page behind the overlay) and
              keeps the counter subdued relative to the full-white caption. */}
          <p className="text-xs text-white/70">{currentIndex + 1} / {photos.length}</p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
