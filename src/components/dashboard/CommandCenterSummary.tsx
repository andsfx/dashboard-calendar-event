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
      <div className="mb-6">
        <h2 id="command-center-title" className="text-lg font-bold text-slate-900 dark:text-white">
          Command Center
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Quick access to all dashboard modules
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map(card => (
          <Link
            key={card.id}
            to={card.route}
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 ui-focus-ring"
          >
            {/* Gradient background on hover */}
            <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 transition-opacity group-hover:opacity-5`} />

            <div className="relative flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {card.title}
                </p>
                <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                  {card.value}
                </p>
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                  {card.subtitle}
                </p>
              </div>

              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.iconBg} ${card.textColor} transition-transform group-hover:scale-110`}>
                {card.icon}
              </div>
            </div>

            {/* Arrow indicator */}
            <div className="absolute bottom-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 opacity-0 transition-all group-hover:opacity-100 dark:bg-slate-700">
              <ArrowRight className="h-3 w-3 text-slate-600 dark:text-slate-300" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
});
