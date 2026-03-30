import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { ToastMessage } from '../types';

const CONFIG = {
  success: { icon: <CheckCircle className="h-4 w-4" />, bar: 'bg-emerald-500', border: 'border-l-emerald-500', iconColor: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  error:   { icon: <AlertCircle  className="h-4 w-4" />, bar: 'bg-red-500',     border: 'border-l-red-500',     iconColor: 'text-red-500',     bg: 'bg-red-50 dark:bg-red-900/20' },
  info:    { icon: <Info         className="h-4 w-4" />, bar: 'bg-blue-500',    border: 'border-l-blue-500',    iconColor: 'text-blue-500',    bg: 'bg-blue-50 dark:bg-blue-900/20' },
  warning: { icon: <AlertTriangle className="h-4 w-4" />, bar: 'bg-amber-500', border: 'border-l-amber-500',   iconColor: 'text-amber-500',   bg: 'bg-amber-50 dark:bg-amber-900/20' },
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
      className={`relative flex w-full max-w-[calc(100vw-2rem)] items-start gap-3 overflow-hidden rounded-xl border-l-4 bg-white p-4 shadow-lg dark:bg-slate-800 dark:shadow-slate-900/50 sm:w-80 sm:max-w-sm ${cfg.border} ${exiting ? 'toast-exit' : 'toast-enter'}`}
    >
      {/* Tinted background */}
      <div className={`absolute inset-0 opacity-40 ${cfg.bg}`} />

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 h-0.5 w-full bg-slate-100 dark:bg-slate-700">
        <div
          className={`h-full ${cfg.bar} toast-progress`}
          style={{ animationDuration: `${DURATION}ms` }}
        />
      </div>

      <div className={`relative mt-0.5 shrink-0 ${cfg.iconColor}`}>{cfg.icon}</div>

      <div className="relative min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-800 dark:text-white leading-tight">{t.title}</p>
        {t.message && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{t.message}</p>}
      </div>

      <button
        onClick={dismiss}
        className="relative shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 dark:hover:bg-slate-700 dark:hover:text-white"
        aria-label="Tutup notifikasi"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

interface Props {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: Props) {
  if (!toasts.length) return null;
  return (
    <div className="fixed inset-x-4 bottom-4 z-[100] flex flex-col gap-2 sm:inset-x-auto sm:bottom-6 sm:right-6" role="region" aria-live="polite" aria-label="Notifikasi">
      {toasts.map(t => (
        <ToastItem key={t.id} t={t} onRemove={onRemove} />
      ))}
    </div>
  );
}
