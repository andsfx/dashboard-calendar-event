import { useState, useEffect } from 'react';
import { Star, ChevronDown, ChevronUp } from 'lucide-react';
import type { SurveySummary } from '../../types';
import { apiGet } from '../../lib/rest';
import { Button } from '../shadcn/button';

interface EventRatingSummaryProps {
  eventId: string;
  compact?: boolean;
}

const ratingColor = (n: number | null | undefined): string => {
  if (n == null) return 'text-[var(--wf-ink-muted)]';
  if (n >= 8) return 'text-[var(--wf-live)]';
  if (n >= 5) return 'text-[var(--wf-action)]';
  return 'text-[var(--wf-danger)]';
};

export default function EventRatingSummary({ eventId, compact = false }: EventRatingSummaryProps) {
  const [summary, setSummary] = useState<SurveySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // GET /api/v1/survey/summary?event_id= — data langsung (apiGet unwrap).
        const data = await apiGet<SurveySummary>(`/survey/summary?event_id=${encodeURIComponent(eventId)}`);
        if (!cancelled && data && data.total_responses > 0) {
          setSummary(data);
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
    <div className="rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board)] p-3">
      {/* Header */}
      {/* Baris disclosure penuh yang membungkus konten blok (ikon + judul +
          meta + chevron): shadcn `Button` ghost dengan chrome primitif
          dinetralkan (h-auto/p-0/border-0/rounded-none) supaya tinggi baris
          tidak membengkak 32px dan latar tetap transparan. */}
      <Button
        type="button"
        variant="ghost"
        onClick={() => setExpanded(!expanded)}
        className="flex! h-auto! w-full! items-center justify-between! gap-0! whitespace-normal! rounded-none border-0! p-0! text-left! font-normal! hover:bg-transparent! dark:hover:bg-transparent! active:translate-y-0!"
      >
        <div className="flex items-center gap-2">
          <Star className={`size-4 fill-current ${ratingColor(mallOverall)}`} />
          <span className="text-sm font-semibold text-[var(--wf-ink)]">
            Rating: <span className={ratingColor(mallOverall)}>{mallOverall?.toFixed(1) || '-'}</span>/10
          </span>
          <span className="text-xs text-[var(--wf-ink-muted)]">
            ({summary.total_responses} responden)
          </span>
        </div>
        {expanded
          ? <ChevronUp className="size-4 text-[var(--wf-ink-muted)]" />
          : <ChevronDown className="size-4 text-[var(--wf-ink-muted)]" />
        }
      </Button>

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-3 space-y-3 border-t border-[var(--wf-rule)] pt-3">
          {/* Mall ratings */}
          <div>
            <p className="mb-2 text-xs font-semibold ui-text-muted">Pengelola Tempat</p>
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
              <p className="mb-2 text-xs font-semibold ui-text-muted">Penyelenggara Event</p>
              <div className="grid grid-cols-2 gap-2">
                <RatingRow label="Kualitas" value={summary.eo_avg.event_quality} />
                <RatingRow label="Organisasi" value={summary.eo_avg.organization} />
                <RatingRow label="Panitia" value={summary.eo_avg.committee_service} />
                <RatingRow label="Promosi" value={summary.eo_avg.promotion_accuracy} />
                <RatingRow label="Rekomendasi" value={summary.eo_avg.recommendation} />
              </div>
            </div>
          )}

          <p className="text-[10px] text-[var(--wf-ink-muted)]">
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
        <span className="text-[11px] text-[var(--wf-ink-muted)]">{label}</span>
        <span className={`text-[11px] font-semibold ${ratingColor(v)}`}>{v > 0 ? v.toFixed(1) : '-'}</span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--wf-rule)]">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${v >= 8 ? 'bg-[var(--wf-live)]' : v >= 5 ? 'bg-[var(--wf-action)]' : 'bg-[var(--wf-danger)]'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
