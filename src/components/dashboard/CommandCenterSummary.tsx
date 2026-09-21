import { memo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import type { DraftEventItem, AnnualTheme, CommunityRegistration } from '../../types';
import type { Permissions } from '../../hooks/usePermission';
import { getCommandCenterCards } from './dashboardNavigation';

interface CommandCenterSummaryProps {
  totalEvents: number;
  upcomingEvents: number;
  ongoingEvents: number;
  activeDrafts: DraftEventItem[];
  annualThemes: AnnualTheme[];
  communityRegistrations: CommunityRegistration[];
  draftsError?: string | null;
  permissions: Permissions;
  isSuperadmin?: boolean;
}

/**
 * The module register. Two bands, not one flat grid: modules that are waiting on
 * a person are listed first and named, everything else follows as the directory.
 * The order is the hierarchy — a passive module (activity log) must not read as
 * urgent as a queue that is actually waiting.
 */
export const CommandCenterSummary = memo(function CommandCenterSummary({
  totalEvents,
  upcomingEvents,
  ongoingEvents,
  activeDrafts,
  annualThemes,
  communityRegistrations,
  draftsError,
  permissions,
  isSuperadmin,
}: CommandCenterSummaryProps) {
  const cards = getCommandCenterCards({
    totalEvents,
    upcomingEvents,
    ongoingEvents,
    activeDrafts,
    annualThemes,
    communityRegistrations,
    draftsError,
    permissions,
    isSuperadmin,
  });

  const attention = cards.filter(card => card.attention);

  const renderRow = (card: (typeof cards)[number]) => (
    <Link key={card.id} to={card.route} className="wf-row group">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--wf-board-2)] text-[var(--wf-ink-muted)]">
        {card.icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-sm font-semibold text-[var(--wf-ink)]">
          {/* A dot only where a module is actually waiting on a person. Marking
              every row would make the mark a legend instead of a signal. */}
          {card.attention && <span className="wf-dot wf-dot--action" aria-hidden="true" />}
          <span className="truncate">{card.title}</span>
        </span>
        <span className="block truncate text-xs text-[var(--wf-ink-muted)]">{card.subtitle}</span>
      </span>

      {card.attention && (
        <span className="sr-only">Perlu tindakan</span>
      )}

      {card.value !== undefined && (
        <span className={`wf-code shrink-0 text-base font-semibold ${card.attention ? 'text-[var(--wf-action)]' : 'text-[var(--wf-ink)]'}`}>{card.value}</span>
      )}

      <ArrowRight
        className="h-4 w-4 shrink-0 text-[var(--wf-ink-muted)] transition-transform group-hover:translate-x-0.5"
        strokeWidth={1.5}
        aria-hidden
      />
    </Link>
  );

  return (
    <section aria-label="Pusat Komando" className="space-y-3">
      {/* One register. The queue's total already leads the page, so listing the
          waiting modules a second time would just repeat it — the dot marks
          them in place instead. */}
      {attention.length === 0 && (
        <p className="flex items-center gap-2 text-sm text-[var(--wf-ink-muted)]">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--wf-live)]" strokeWidth={1.5} aria-hidden />
          Tidak ada modul yang menunggu tindakan. Antrian kosong.
        </p>
      )}

      <div className="wf-register">
        <h2 className="wf-row-head">
          <span>Semua Modul</span>
          <span className="wf-code ml-auto">{cards.length}</span>
        </h2>
        <div>{cards.map(renderRow)}</div>
      </div>
    </section>
  );
});
