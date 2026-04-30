import { useState, useEffect } from 'react';
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
      <div className="relative mx-4 mb-4 w-full max-w-sm animate-[slide-up_0.3s_ease-out] rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:mb-0 dark:border-slate-700 dark:bg-slate-800">
        {/* Close */}
        <button
          onClick={handleDismiss}
          className="absolute right-3 top-3 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
          aria-label="Tutup"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Content */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/40">
            <Star className="h-6 w-6 text-violet-600 dark:text-violet-400" />
          </div>

          <h3 className="mb-1 text-base font-bold text-slate-900 dark:text-white">
            Bagaimana Pengalaman Anda?
          </h3>
          <p className="mb-1 text-sm text-slate-600 dark:text-slate-400">
            Event <span className="font-semibold text-violet-600 dark:text-violet-400">"{targetEvent.acara}"</span> telah selesai.
          </p>
          <p className="mb-5 text-xs text-slate-500 dark:text-slate-400">
            Bantu kami meningkatkan kualitas layanan dengan mengisi survey singkat.
          </p>

          <div className="flex w-full gap-3">
            <button
              onClick={handleDismiss}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Nanti Saja
            </button>
            <button
              onClick={handleOpen}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
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
