import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { ToastMessage } from '../../types';

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

function ToastItem({ t, onRemove }: { t: ToastMessage; onRemove: (id: string) => void }) {
  const [exiting, setExiting] = useState(false);
  const cfg = CONFIG[t.type];

  const dismiss = () => {
    setExiting(true);
    setTimeout(() => onRemove(t.id), 280);
  };

  useEffect(() => {
    const timer = setTimeout(() => dismiss(), DURATION);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`relative flex w-full max-w-[calc(100vw-2rem)] items-start gap-3 overflow-hidden rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board)] p-4 shadow-lg dark:shadow-slate-900/50 sm:w-80 sm:max-w-sm ${exiting ? 'toast-exit' : 'toast-enter'}`}
    >
      {/* Tinted background */}
      <div className={`absolute inset-0 opacity-40 ${cfg.bg}`} />

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 h-0.5 w-full bg-[var(--wf-board-2)]">
        <div
          className={`h-full ${cfg.bar} toast-progress`}
          style={{ animationDuration: `${DURATION}ms` }}
        />
      </div>

      <div className={`relative mt-0.5 shrink-0 ${cfg.iconColor}`}>{cfg.icon}</div>

      <div className="relative min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--wf-ink)] leading-tight">{t.title}</p>
        {t.message && <p className="mt-0.5 text-xs text-[var(--wf-ink-muted)] leading-relaxed">{t.message}</p>}
      </div>

      <button
        onClick={dismiss}
        className="relative -mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--wf-ink-muted)] transition hover:bg-[var(--wf-board-2)] hover:text-[var(--wf-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--wf-accent)]"
        aria-label="Tutup notifikasi"
      >
        <X className="h-4 w-4" />
      </button>
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
