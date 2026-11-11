import { useEffect, useRef, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { ToastMessage } from '../../types';
import { isGsapMotionLoaded, loadGsapMotion } from '../../lib/gsapMotion';
import { Button } from '../shadcn/button';

const CONFIG = {
  // Ikon pakai shade 700: tint `bg-*-50` dirender `opacity-40` di atas kartu putih,
  // sehingga 500 hanya mencapai 2.1–3.6:1 (gagal 3:1 untuk grafis, WCAG 1.4.11).
  // Sinyal jenis notifikasi dibawa oleh tint + ikon + bilah progres. Garis
  // `border-l-4` dihapus: garis aksen kiri pada callout adalah pola yang ditolak
  // bahasa papan (dan tertangkap rule `side-tab` detektor).
  success: { icon: <CheckCircle className="h-4 w-4" />, bar: 'bg-emerald-500', iconColor: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  error:   { icon: <AlertCircle  className="h-4 w-4" />, bar: 'bg-red-500',     iconColor: 'text-red-700 dark:text-red-400',         bg: 'bg-red-50 dark:bg-red-900/20' },
  info:    { icon: <Info         className="h-4 w-4" />, bar: 'bg-blue-500',    iconColor: 'text-blue-700 dark:text-blue-400',       bg: 'bg-blue-50 dark:bg-blue-900/20' },
  warning: { icon: <AlertTriangle className="h-4 w-4" />, bar: 'bg-amber-500', iconColor: 'text-amber-700 dark:text-amber-400',     bg: 'bg-amber-50 dark:bg-amber-900/20' },
};

const DURATION = 4000;
/** Durasi exit; sama dengan `.toast-exit` yang digantikan. */
const EXIT_MS = 280;
/** Batas tunggu chunk GSAP sebelum toast tampil apa adanya (jauh lebih pendek dari
 *  reveal publik 2,5 s: usia toast hanya 4 s, menahannya separuh hidupnya adalah bug). */
const FALLBACK_MS = 500;

const REDUCE_QUERY = '(prefers-reduced-motion: reduce)';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(REDUCE_QUERY).matches;
}

function ToastItem({ t, onRemove }: { t: ToastMessage; onRemove: (id: string) => void }) {
  const [exiting, setExiting] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const cfg = CONFIG[t.type];

  /**
   * Hapus toast. Bila GSAP siap & gerak diizinkan, exit memakai tween singkat
   * lalu `onRemove`; selain itu (reduced motion / chunk gagal) langsung hapus
   * tanpa menunggu — "instant end state".
   */
  const dismiss = () => {
    if (exiting) return;
    setExiting(true);

    if (prefersReducedMotion() || !isGsapMotionLoaded()) {
      onRemove(t.id);
      return;
    }

    const root = rootRef.current;
    if (!root) {
      onRemove(t.id);
      return;
    }

    void loadGsapMotion()
      .then(({ gsap, outExpo }) => {
        // Reduced motion bisa berubah sejak mount; hormati keadaan saat ini.
        if (prefersReducedMotion()) {
          onRemove(t.id);
          return;
        }
        gsap.to(root, {
          autoAlpha: 0,
          xPercent: 110,
          x: 0,
          duration: EXIT_MS / 1000,
          ease: outExpo,
          onComplete: () => onRemove(t.id),
        });
      })
      .catch(() => onRemove(t.id));
  };

  // Auto-dismiss: timing identik dengan sebelumnya (DURATION ms, lalu exit singkat).
  useEffect(() => {
    const timer = setTimeout(() => dismiss(), DURATION);
    return () => clearTimeout(timer);
    // dismiss ditutup per-item; hanya jalankan sekali pada mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Enter + progress bar (GSAP; sekali pada mount).
  useEffect(() => {
    const root = rootRef.current;
    const bar = barRef.current;
    if (!root) return;

    const release = () => root.classList.add('toast-static');

    // Reduced motion: tampil langsung di end state, tanpa tween.
    if (prefersReducedMotion()) {
      release();
      return;
    }

    let cancelled = false;
    let tweens: Array<{ kill: () => void }> = [];

    // Fail-open: chunk yang menggantung tidak boleh menahan toast lebih dari
    // separuh hidupnya. Berakhir di end state via `toast-static` (sudah tercakup
    // juga oleh blok reduced-motion global di motion.css untuk tween yang datang).
    const timer = setTimeout(() => {
      if (cancelled || isGsapMotionLoaded()) return;
      release();
    }, FALLBACK_MS);

    void loadGsapMotion()
      .then(({ gsap, outExpo }) => {
        window.clearTimeout(timer);
        if (cancelled || !root.isConnected) return;
        // Chunk sempat menggantung lalu tiba di bawah reduced motion: tetaplah end state.
        if (prefersReducedMotion() || root.classList.contains('toast-static')) {
          release();
          return;
        }
        const enter = gsap.fromTo(
          root,
          { autoAlpha: 0, xPercent: 110, x: 0 },
          { autoAlpha: 1, xPercent: 0, x: 0, duration: 0.35, ease: outExpo, immediateRender: true },
        );
        const progress = gsap.fromTo(
          bar,
          { scaleX: 1 },
          {
            scaleX: 0,
            duration: DURATION / 1000,
            ease: 'none',
            transformOrigin: 'left center',
            immediateRender: true,
          },
        );
        tweens = [enter, progress];
      })
      .catch(() => {
        window.clearTimeout(timer);
        if (!cancelled) release();
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      tweens.forEach((tween) => tween.kill());
    };
  }, []);

  return (
    <div
      ref={rootRef}
      data-toast
      className={`toast-enter relative flex w-full max-w-[calc(100vw-2rem)] items-start gap-3 overflow-hidden rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board)] p-4 shadow-lg dark:shadow-slate-900/50 sm:w-80 sm:max-w-sm`}
    >
      {/* Tinted background */}
      <div className={`absolute inset-0 opacity-40 ${cfg.bg}`} />

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 h-0.5 w-full bg-[var(--wf-board-2)]">
        <div ref={barRef} className={`h-full ${cfg.bar}`} />
      </div>

      <div className={`relative mt-0.5 shrink-0 ${cfg.iconColor}`}>{cfg.icon}</div>

      <div className="relative min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--wf-ink)] leading-tight">{t.title}</p>
        {t.message && <p className="mt-0.5 text-xs text-[var(--wf-ink-muted)] leading-relaxed">{t.message}</p>}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={dismiss}
        className="relative -mr-1 h-11 w-11 shrink-0 rounded-lg text-[var(--wf-ink-muted)] hover:bg-[var(--wf-board-2)] hover:text-[var(--wf-ink)] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wf-accent)]"
        aria-label="Tutup notifikasi"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

interface Props {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
  /**
   * Mobile bottom offset. Routes with a sticky bottom CTA (the landing page)
   * pass a larger value so the toast stack clears the CTA instead of covering it
   * — the two used to overlap by 91% of the CTA height at 390x844.
   */
  bottomOffsetClass?: string;
}

export function ToastContainer({ toasts, onRemove, bottomOffsetClass = 'bottom-4' }: Props) {
  if (!toasts.length) return null;
  return (
    <div className={`fixed inset-x-4 ${bottomOffsetClass} z-[100] flex flex-col gap-2 sm:inset-x-auto sm:bottom-6 sm:right-6`} role="region" aria-live="polite" aria-label="Notifikasi">
      {toasts.map(t => (
        <ToastItem key={t.id} t={t} onRemove={onRemove} />
      ))}
    </div>
  );
}
