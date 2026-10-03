import { useCallback, useMemo, useState } from 'react';
import { AlertTriangle, Copy, EyeOff, Info, Lightbulb, RotateCcw, Sparkles } from 'lucide-react';
import type {
  CommunityRegistration,
  DraftEventItem,
  EventArea,
  EventItem,
  ExhibitionLead,
  InsightAction,
  InsightSeverity,
  TenantEventSurvey,
} from '../../types';
import { Card } from './Card';
import { InsightAiSummary } from './InsightAiSummary';
import { buildEventInsights } from '../../utils/eventInsights';

/** Kunci localStorage untuk insight yang disembunyikan pengguna. */
const DISMISS_KEY = 'metmal.insight.dismissed';

export interface EventInsightsPanelProps {
  /** Himpunan penuh event internal (bukan hasil filter tabel), sama seperti panel analitik. */
  events: EventItem[];
  activeDrafts: DraftEventItem[];
  communityRegistrations: CommunityRegistration[];
  areas: EventArea[];
  /** Data lintas-modul opsional (lihat `useInsightContext`). */
  surveys?: TenantEventSurvey[];
  exhibitionLeads?: ExhibitionLead[];
  /**
   * Jalur dashboard yang boleh dibuka role ini (`getAllowedDashboardPaths`).
   * Bila diberikan, aksi yang menuju jalur di luar daftar tidak dirender —
   * mesin insight sendiri tidak tahu apa pun soal izin.
   */
  allowedPaths?: string[];
  /** Dipanggil saat pengguna menekan aksi sebuah insight. */
  onAction?: (action: InsightAction) => void;
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

const SEVERITY_FILTERS: Array<{ value: InsightSeverity | 'Semua'; label: string }> = [
  { value: 'Semua', label: 'Semua' },
  { value: 'peringatan', label: 'Perlu perhatian' },
  { value: 'saran', label: 'Saran' },
  { value: 'info', label: 'Info' },
];

/** Baca daftar id yang disembunyikan; localStorage bisa diblokir di beberapa konteks. */
function loadDismissed(): string[] {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function persistDismissed(ids: string[]): void {
  try {
    localStorage.setItem(DISMISS_KEY, JSON.stringify(ids));
  } catch {
    /* penyimpanan tak tersedia — sembunyikan tetap berlaku untuk sesi ini */
  }
}

export function EventInsightsPanel({
  events,
  activeDrafts,
  communityRegistrations,
  areas,
  surveys,
  exhibitionLeads,
  allowedPaths,
  onAction,
}: EventInsightsPanelProps) {
  const { generatedAt, insights } = useMemo(
    () => buildEventInsights({ events, activeDrafts, registrations: communityRegistrations, areas, surveys, exhibitionLeads }),
    [events, activeDrafts, communityRegistrations, areas, surveys, exhibitionLeads],
  );

  const [severityFilter, setSeverityFilter] = useState<InsightSeverity | 'Semua'>('Semua');
  const [dismissed, setDismissed] = useState<string[]>(() => loadDismissed());

  const visible = insights.filter((insight) => !dismissed.includes(insight.id));
  const filtered = severityFilter === 'Semua' ? visible : visible.filter((insight) => insight.severity === severityFilter);

  const counts = useMemo(() => {
    const totals: Record<InsightSeverity, number> = { peringatan: 0, saran: 0, info: 0 };
    for (const insight of visible) totals[insight.severity] += 1;
    return totals;
  }, [visible]);

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      persistDismissed(next);
      return next;
    });
  }, []);

  const restoreAll = useCallback(() => {
    setDismissed([]);
    persistDismissed([]);
  }, []);

  const copySummary = useCallback(() => {
    const text = filtered
      .map((insight) => `• [${SEVERITY[insight.severity].label}] ${insight.title} — ${insight.body}`)
      .join('\n');
    void navigator.clipboard?.writeText(text);
  }, [filtered]);

  const generatedLabel = new Date(generatedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const crossModuleCount = visible.filter((insight) => insight.crossModule).length;

  return (
    <Card
      title={
        <span className="inline-flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[var(--wf-accent)]" aria-hidden />
          Insight Cerdas
        </span>
      }
      subtitle={`Analisis otomatis dari data event${crossModuleCount > 0 ? ' & modul lain' : ''} · diperbarui ${generatedLabel}`}
      actions={
        visible.length > 0 ? (
          <button
            type="button"
            onClick={copySummary}
            className="inline-flex items-center gap-1.5 rounded-[var(--wf-radius-control)] px-2 py-1 text-xs font-medium text-[var(--wf-ink-muted)] transition-colors hover:text-[var(--wf-ink)]"
          >
            <Copy className="h-3.5 w-3.5" aria-hidden />
            Salin ringkasan
          </button>
        ) : null
      }
    >
      {visible.length === 0 ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-[var(--wf-ink-muted)]">
            {dismissed.length > 0
              ? `Semua insight disembunyikan (${dismissed.length}).`
              : 'Belum ada insight — data event belum cukup untuk menarik kesimpulan.'}
          </p>
          {dismissed.length > 0 ? (
            <button
              type="button"
              onClick={restoreAll}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--wf-accent)] transition-colors hover:underline"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Tampilkan {dismissed.length} yang disembunyikan
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          <InsightAiSummary insights={visible} />
          <div className="flex flex-wrap items-center gap-2">
            <div role="group" aria-label="Saring insight menurut tingkat kepentingan" className="flex flex-wrap gap-1.5">
              {SEVERITY_FILTERS.map((option) => {
                const active = severityFilter === option.value;
                const total = option.value === 'Semua' ? visible.length : counts[option.value];
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSeverityFilter(option.value)}
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${
                      active
                        ? 'border-[var(--wf-accent)] bg-[var(--wf-accent-soft)] text-[var(--wf-accent)]'
                        : 'border-[var(--wf-rule)] text-[var(--wf-ink-muted)] hover:text-[var(--wf-ink)]'
                    }`}
                  >
                    {option.label} ({total})
                  </button>
                );
              })}
            </div>
            {dismissed.length > 0 ? (
              <button
                type="button"
                onClick={restoreAll}
                className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-[var(--wf-ink-muted)] transition-colors hover:text-[var(--wf-ink)]"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                Tampilkan {dismissed.length} yang disembunyikan
              </button>
            ) : null}
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-[var(--wf-ink-muted)]">Tidak ada insight pada tingkat ini.</p>
          ) : (
            <ul className="space-y-3">
              {filtered.map((insight) => {
                const meta = SEVERITY[insight.severity];
                const Icon = meta.icon;
                const actions = (insight.actions ?? []).filter(
                  (action) => !allowedPaths || allowedPaths.includes(action.path),
                );
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
                      {insight.crossModule ? (
                        <p className="mt-1 text-xs text-[var(--wf-ink-muted)]">Sumber: modul lain</p>
                      ) : null}
                      {actions.length > 0 || onAction ? (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {actions.map((action) => (
                            <button
                              key={`${insight.id}-${action.path}-${action.label}`}
                              type="button"
                              onClick={() => onAction?.(action)}
                              className="rounded-[var(--wf-radius-control)] border border-[var(--wf-accent)] px-2.5 py-1 text-xs font-semibold text-[var(--wf-accent)] transition-colors hover:bg-[var(--wf-accent-soft)]"
                            >
                              {action.label}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => dismiss(insight.id)}
                            className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-[var(--wf-ink-muted)] transition-colors hover:text-[var(--wf-ink)]"
                          >
                            <EyeOff className="h-3.5 w-3.5" aria-hidden />
                            Sembunyikan
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}