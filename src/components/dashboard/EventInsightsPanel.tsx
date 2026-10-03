import { useMemo } from 'react';
import { AlertTriangle, Info, Lightbulb, Sparkles } from 'lucide-react';
import type {
  CommunityRegistration,
  DraftEventItem,
  EventArea,
  EventItem,
  InsightSeverity,
} from '../../types';
import { Card } from './Card';
import { buildEventInsights } from '../../utils/eventInsights';

interface EventInsightsPanelProps {
  /** Himpunan penuh event internal (bukan hasil filter tabel), sama seperti panel analitik. */
  events: EventItem[];
  activeDrafts: DraftEventItem[];
  communityRegistrations: CommunityRegistration[];
  areas: EventArea[];
}

/**
 * Panel "Insight Cerdas" Pusat Komando. Insight dihitung di klien dari data yang
 * sudah dimuat halaman (lihat `src/utils/eventInsights.ts`) — tanpa panggilan
 * jaringan tambahan, jadi otomatis ikut segar saat event/draft diperbarui.
 *
 * Warna memakai token `--wf-*` supaya benar di tema terang maupun gelap admin.
 * Label severity selalu tampil sebagai teks, bukan hanya warna.
 */
const SEVERITY: Record<InsightSeverity, { label: string; icon: typeof AlertTriangle; tone: string; chip: string }> = {
  peringatan: {
    label: 'Perlu perhatian',
    icon: AlertTriangle,
    tone: 'text-[var(--wf-action)]',
    chip: 'border-[var(--wf-action)] text-[var(--wf-action)]',
  },
  saran: {
    label: 'Saran',
    icon: Lightbulb,
    tone: 'text-[var(--wf-accent)]',
    chip: 'border-[var(--wf-accent)] text-[var(--wf-accent)]',
  },
  info: {
    label: 'Info',
    icon: Info,
    tone: 'text-[var(--wf-ink-muted)]',
    chip: 'border-[var(--wf-rule-strong)] text-[var(--wf-ink-muted)]',
  },
};

export function EventInsightsPanel({
  events,
  activeDrafts,
  communityRegistrations,
  areas,
}: EventInsightsPanelProps) {
  const { generatedAt, insights } = useMemo(
    () => buildEventInsights({ events, activeDrafts, registrations: communityRegistrations, areas }),
    [events, activeDrafts, communityRegistrations, areas],
  );

  const generatedLabel = new Date(generatedAt).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Card
      title={
        <span className="inline-flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[var(--wf-accent)]" aria-hidden />
          Insight Cerdas
        </span>
      }
      subtitle={`Analisis otomatis dari data event · diperbarui ${generatedLabel}`}
    >
      {insights.length === 0 ? (
        <p className="text-sm text-[var(--wf-ink-muted)]">
          Belum ada insight — data event belum cukup untuk menarik kesimpulan.
        </p>
      ) : (
        <ul className="space-y-3">
          {insights.map((insight) => {
            const meta = SEVERITY[insight.severity];
            const Icon = meta.icon;
            return (
              <li
                key={insight.id}
                className="flex items-start gap-3 rounded-[var(--wf-radius-control)] border border-[var(--wf-rule)] bg-[var(--wf-board-2)] px-4 py-3"
              >
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${meta.tone}`} aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${meta.chip}`}
                    >
                      {meta.label}
                    </span>
                    <h3 className="text-sm font-semibold text-[var(--wf-ink)]">{insight.title}</h3>
                    {insight.metric ? (
                      <span className="ml-auto font-display text-sm font-semibold tabular-nums text-[var(--wf-ink)]">
                        {insight.metric}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-[var(--wf-ink-muted)]">{insight.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
