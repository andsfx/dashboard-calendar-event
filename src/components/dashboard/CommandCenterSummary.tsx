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
  const rest = cards.filter(card => !card.attention);

  const renderRow = (card: (typeof cards)[number]) => (
    <Link key={card.id} to={card.route} className="wf-row group">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--wf-board-2)] text-[var(--wf-ink-muted)]">
        {card.icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[var(--wf-ink)]">{card.title}</span>
        <span className="block truncate text-xs text-[var(--wf-ink-muted)]">{card.subtitle}</span>
      </span>

      {card.attention && (
        <span className="wf-key wf-key--action shrink-0">
          <span className="wf-beacon h-2 w-2 rounded-full bg-current" aria-hidden="true" />
          <span className="hidden sm:inline">Perlu tindakan</span>
          <span className="sr-only sm:hidden">Perlu tindakan</span>
        </span>
      )}

      {card.value !== undefined && (
        <span className="wf-code shrink-0 text-base font-semibold text-[var(--wf-ink)]">{card.value}</span>
      )}

      <ArrowRight
        className="h-4 w-4 shrink-0 text-[var(--wf-ink-muted)] transition-transform group-hover:translate-x-0.5"
        strokeWidth={1.5}
        aria-hidden
      />
    </Link>
  );

  return (
    <section aria-label="Pusat Komando" className="space-y-5">
      <div className="wf-register">
        <h2 className="wf-row-head">
          <span>Perlu Tindakan</span>
          <span className="wf-code ml-auto">{attention.length}</span>
        </h2>
        {attention.length > 0 ? (
          <div>{attention.map(renderRow)}</div>
        ) : (
          <p className="flex items-center gap-2 px-3.5 py-3.5 text-sm text-[var(--wf-ink-muted)]">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--wf-live)]" strokeWidth={1.5} aria-hidden />
            Tidak ada modul yang menunggu tindakan. Antrian kosong.
          </p>
        )}
      </div>

      <div className="wf-register">
        <h2 className="wf-row-head">
          <span>Semua Modul</span>
          <span className="wf-code ml-auto">{rest.length}</span>
        </h2>
        <div>{rest.map(renderRow)}</div>
      </div>
    </section>
  );
});
