import { memo } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Wrench } from 'lucide-react';
import type { DraftEventItem, AnnualTheme, CommunityRegistration } from '../../types';
import type { Permissions } from '../../hooks/usePermission';
import { DASHBOARD_GROUP_ORDER, getCommandCenterCards } from './dashboardNavigation';

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
 * Grid Kartu Modul — the Pusat Komando directory.
 *
 * Replaces the flat "Semua Modul" register: the modules that this role may see,
 * arranged as panels grouped by Dashboard Group so the landing reads as a
 * dashboard rather than a menu list. Cards come from `getCommandCenterCards`,
 * which applies the **same permission predicates** as the rail (so a module the
 * role cannot open never appears here), but it is a separate list — it is not
 * built from the rail's own nav items. A card that is waiting on a person takes
 * the accent border and names the state in words ("Perlu tindakan") — colour
 * alone never carries the meaning — and is sorted first inside its group.
 *
 * The queue total already leads the page (DashboardStats), so the grid does not
 * repeat it; the dot-and-label marks the waiting modules in place instead.
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

  // Group per Dashboard Group, preserving the canonical order and dropping
  // groups that have no visible module for this role (e.g. Konten for a viewer).
  const groups = DASHBOARD_GROUP_ORDER.map(label => ({
    label,
    cards: cards
      .filter(card => card.group === label)
      .sort((a, b) => Number(Boolean(b.attention)) - Number(Boolean(a.attention))),
  })).filter(group => group.cards.length > 0);

  const hasAttention = cards.some(card => card.attention);

  return (
    <section aria-label="Pusat Komando" className="space-y-4">
      {!hasAttention && (
        <p className="flex items-center gap-2 text-sm text-[var(--wf-ink-muted)]">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--wf-live)]" strokeWidth={1.5} aria-hidden />
          Tidak ada modul yang menunggu tindakan. Antrian kosong.
        </p>
      )}

      {groups.map(group => (
        <div key={group.label} className="wf-card-grid-group">
          <h2 className="wf-card-grid-group__title">
            <span>{group.label}</span>
            <span className="wf-code">{group.cards.length}</span>
          </h2>
          <div className="wf-card-grid">
            {group.cards.map(card => (
              <Link
                key={card.id}
                to={card.route}
                className={`wf-card${card.attention ? ' wf-card--attention' : ''}`}
              >
                <span className="wf-card__top">
                  <span className="wf-card__title">{card.title}</span>
                  <span className="wf-card__icon" aria-hidden>
                    {card.icon}
                  </span>
                </span>

                {card.value !== undefined && (
                  <span className={`wf-code wf-card__value${card.attention ? ' wf-card__value--attention' : ''}`}>
                    {card.value}
                  </span>
                )}

                <span className="wf-card__hint">{card.subtitle}</span>

                {/* State is named in words as well as shown by colour, so the
                    reading survives without hue. */}
                {card.attention && (
                  <span className="wf-key wf-key--action">
                    <span className="wf-dot wf-dot--action" aria-hidden="true" />
                    Perlu tindakan
                  </span>
                )}

                {card.maintenance && (
                  <span className="wf-key wf-key--action" title="Sedang diperbaiki">
                    <Wrench className="h-3 w-3" strokeWidth={1.5} aria-hidden />
                    Sedang diperbaiki
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
});
