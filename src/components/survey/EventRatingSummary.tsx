import { useState, useEffect } from 'react';
import { Star, ChevronDown, ChevronUp } from 'lucide-react';
import type { SurveySummary } from '../../types';

interface EventRatingSummaryProps {
  eventId: string;
  compact?: boolean;
}

const ratingColor = (n: number | null | undefined): string => {
  if (n == null) return 'text-slate-400';
  if (n >= 8) return 'text-emerald-500';
  if (n >= 5) return 'text-yellow-500';
  return 'text-red-500';
};

export default function EventRatingSummary({ eventId, compact = false }: EventRatingSummaryProps) {
  const [summary, setSummary] = useState<SurveySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/survey?action=summary&event_id=${encodeURIComponent(eventId)}`);
        const json = await res.json();
        if (!cancelled && json.success && json.summary?.total_responses > 0) {
          setSummary(json.summary);
        }
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [eventId]);

  if (loading || !summary) return null;

  const mallOverall = summary.mall_avg?.overall;
  const eoOverall = summary.eo_avg?.overall;

  // Compact: just a badge
  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${ratingColor(mallOverall)}`}>
        <Star className="h-3 w-3 fill-current" />
        {mallOverall?.toFixed(1) || '-'}
      </span>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Star className={`h-4 w-4 fill-current ${ratingColor(mallOverall)}`} />
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Rating: <span className={ratingColor(mallOverall)}>{mallOverall?.toFixed(1) || '-'}</span>/10
          </span>
          <span className="text-xs text-slate-400">
            ({summary.total_responses} responden)
          </span>
        </div>
        {expanded
          ? <ChevronUp className="h-4 w-4 text-slate-400" />
          : <ChevronDown className="h-4 w-4 text-slate-400" />
        }
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-3 space-y-3 border-t border-slate-100 pt-3 dark:border-slate-700">
          {/* Mall ratings */}
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">Pengelola Tempat</p>
            <div className="grid grid-cols-2 gap-2">
              <RatingRow label="Kebersihan" value={summary.mall_avg?.cleanliness} />
              <RatingRow label="Pelayanan" value={summary.mall_avg?.staff_service} />
              <RatingRow label="Koordinasi" value={summary.mall_avg?.coordination} />
              <RatingRow label="Keamanan" value={summary.mall_avg?.security} />
            </div>
          </div>

          {/* EO ratings */}
          {summary.eo_avg && (
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">Penyelenggara Event</p>
              <div className="grid grid-cols-2 gap-2">
                <RatingRow label="Kualitas" value={summary.eo_avg.event_quality} />
                <RatingRow label="Organisasi" value={summary.eo_avg.organization} />
                <RatingRow label="Panitia" value={summary.eo_avg.committee_service} />
                <RatingRow label="Promosi" value={summary.eo_avg.promotion_accuracy} />
                <RatingRow label="Rekomendasi" value={summary.eo_avg.recommendation} />
              </div>
            </div>
          )}

          <p className="text-[10px] text-slate-400">
            {summary.organizer_responses} penyelenggara · {summary.public_responses} peserta
          </p>
        </div>
      )}
    </div>
  );
}

function RatingRow({ label, value }: { label: string; value: number | null | undefined }) {
  const v = value ?? 0;
  const pct = (v / 10) * 100;
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-600 dark:text-slate-400">{label}</span>
        <span className={`text-[11px] font-semibold ${ratingColor(v)}`}>{v > 0 ? v.toFixed(1) : '-'}</span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
        <div
          className={`h-full rounded-full transition-all duration-500 ${v >= 8 ? 'bg-emerald-500' : v >= 5 ? 'bg-yellow-500' : 'bg-red-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
