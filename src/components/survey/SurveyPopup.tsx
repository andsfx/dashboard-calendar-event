import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, X, Star } from 'lucide-react';
import type { EventItem } from '../../types';

interface SurveyPopupProps {
  /** Events that have ended (status === 'past') */
  pastEvents: EventItem[];
}

const DISMISS_KEY = 'metmal_survey_dismissed';

/** Get set of dismissed event IDs from localStorage */
function getDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function addDismissed(eventId: string) {
  try {
    const set = getDismissed();
    set.add(eventId);
    localStorage.setItem(DISMISS_KEY, JSON.stringify([...set]));
  } catch { /* ignore */ }
}

export default function SurveyPopup({ pastEvents }: SurveyPopupProps) {
  const navigate = useNavigate();
  const [targetEvent, setTargetEvent] = useState<EventItem | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (pastEvents.length === 0) return undefined;

    const dismissed = getDismissed();
    // Find the most recent past event that hasn't been dismissed
    const candidate = pastEvents
      .filter(e => !dismissed.has(e.id))
      .sort((a, b) => (b.dateStr || '').localeCompare(a.dateStr || ''))[0];

    if (candidate) {
      // Delay popup by 2 seconds for better UX
      const timer = setTimeout(() => setTargetEvent(candidate), 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [pastEvents]);

  // Nudge sebagai dialog benar: Escape menutup, Tab terkunci di dalam,
  // fokus awal ke tombol Tutup, fokus kembali ke pemicu saat ditutup.
  useEffect(() => {
    if (!targetEvent) return undefined;
    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        addDismissed(targetEvent.id);
        setTargetEvent(null);
        return;
      }
      if (e.key !== 'Tab') return;
      const root = dialogRef.current;
      if (!root) return;
      const focusable = Array.from(
        root.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      restoreFocusRef.current?.focus();
    };
  }, [targetEvent]);

  if (!targetEvent) return null;

  const handleDismiss = () => {
    addDismissed(targetEvent.id);
    setTargetEvent(null);
  };

  const handleOpen = () => {
    addDismissed(targetEvent.id);
    navigate(`/survey/${targetEvent.id}`);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleDismiss} />

      {/* Modal */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="survey-popup-title"
        className="relative mx-4 mb-4 w-full max-w-sm animate-[slide-up_0.3s_ease-out] rounded-2xl border border-slate-200 bg-[var(--brand-card-light)] p-5 shadow-2xl sm:mb-0 dark:border-slate-700 dark:bg-slate-800"
      >
        {/* Close */}
        <button
          ref={closeRef}
          type="button"
          onClick={handleDismiss}
          className="touch-target-hit ui-focus-ring absolute right-3 top-3 flex items-center justify-center rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
          aria-label="Tutup"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Content */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary-100 dark:bg-brand-primary-900/40">
            <Star className="h-6 w-6 text-brand-primary-600 dark:text-brand-primary-400" />
          </div>

          <h3 id="survey-popup-title" className="mb-1 text-base font-bold text-slate-900 dark:text-white">
            Bagaimana Pengalaman Anda?
          </h3>
          <p className="mb-1 text-sm text-slate-600 dark:text-slate-300">
            Event <span className="font-semibold text-brand-primary-600 dark:text-brand-primary-400">"{targetEvent.acara}"</span> telah selesai.
          </p>
          <p className="mb-5 text-xs ui-text-muted">
            Bantu kami meningkatkan kualitas layanan dengan mengisi survey singkat.
          </p>

          <div className="flex w-full gap-3">
            <button
              type="button"
              onClick={handleDismiss}
              className="ui-focus-ring min-h-[44px] flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Nanti Saja
            </button>
            <button
              type="button"
              onClick={handleOpen}
              className="ui-focus-ring flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-brand-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-700"
            >
              <ClipboardCheck className="h-4 w-4" />
              Isi Survey
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
