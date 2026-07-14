import { memo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
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
  permissions: Permissions;
  isSuperadmin?: boolean;
}

export const CommandCenterSummary = memo(function CommandCenterSummary({
  totalEvents,
  upcomingEvents,
  ongoingEvents,
  activeDrafts,
  annualThemes,
  communityRegistrations,
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
    permissions,
    isSuperadmin,
  });

  return (
    <section aria-labelledby="command-center-title">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="command-center-title" className="text-lg font-bold text-slate-900 dark:text-white">
            Command Center
          </h2>
          <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
            Akses cepat modul operasional
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(card => (
          <Link
            key={card.id}
            to={card.route}
            className={`group flex items-start gap-3 rounded-xl border bg-white p-4 shadow-sm transition hover:border-brand-primary-300 hover:shadow-md dark:bg-slate-800 dark:hover:border-brand-primary-700 ui-focus-ring ${
              card.attention
                ? 'border-brand-primary-200 dark:border-brand-primary-800'
                : 'border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-primary-50 text-brand-primary-700 dark:bg-brand-primary-950/50 dark:text-brand-primary-300">
              {card.icon}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {card.title}
                </p>
                {card.attention && (
                  <span className="shrink-0 rounded-full bg-brand-primary-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-primary-700 dark:bg-brand-primary-900/40 dark:text-brand-primary-300">
                    Perlu
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                {card.value}
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                {card.subtitle}
              </p>
            </div>

            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-primary-500 dark:text-slate-600" aria-hidden />
          </Link>
        ))}
      </div>
    </section>
  );
});
