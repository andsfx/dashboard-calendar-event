import { memo } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  FileEdit,
  Palette,
  Users,
  ClipboardCheck,
  BarChart3,
  Activity,
  UserCog,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import type { DraftEventItem, AnnualTheme, CommunityRegistration } from '../../types';

interface CommandCenterSummaryProps {
  totalEvents: number;
  upcomingEvents: number;
  ongoingEvents: number;
  activeDrafts: DraftEventItem[];
  annualThemes: AnnualTheme[];
  communityRegistrations: CommunityRegistration[];
  isSuperadmin?: boolean;
}

interface SummaryCard {
  id: string;
  title: string;
  value: React.ReactNode;
  subtitle: string;
  icon: React.ReactNode;
  route: string;
  gradient: string;
  iconBg: string;
  textColor: string;
}

export const CommandCenterSummary = memo(function CommandCenterSummary({
  totalEvents,
  upcomingEvents,
  ongoingEvents,
  activeDrafts,
  annualThemes,
  communityRegistrations,
  isSuperadmin,
}: CommandCenterSummaryProps) {
  const pendingRegistrations = communityRegistrations.filter(r => r.status === 'pending').length;
  const currentTheme = annualThemes.find(t => {
    const now = new Date();
    const start = new Date(t.dateStart);
    const end = new Date(t.dateEnd);
    return now >= start && now <= end;
  });

  const cards: SummaryCard[] = [
    {
      id: 'events',
      title: 'Event Schedule',
      value: totalEvents,
      subtitle: `${upcomingEvents} upcoming, ${ongoingEvents} live`,
      icon: <CalendarDays className="h-5 w-5" />,
      route: '/dashboard/events',
      gradient: 'from-violet-500 to-indigo-600',
      iconBg: 'bg-violet-100 dark:bg-violet-900/50',
      textColor: 'text-violet-700 dark:text-violet-300',
    },
    {
      id: 'drafts',
      title: 'Draft Queue',
      value: activeDrafts.length,
      subtitle: activeDrafts.length === 0 ? 'All clear' : 'Needs review',
      icon: <FileEdit className="h-5 w-5" />,
      route: '/dashboard/drafts',
      gradient: 'from-purple-500 to-violet-600',
      iconBg: 'bg-purple-100 dark:bg-purple-900/50',
      textColor: 'text-purple-700 dark:text-purple-300',
    },
    {
      id: 'themes',
      title: 'Annual Themes',
      value: annualThemes.length,
      subtitle: currentTheme ? `Active: ${currentTheme.name}` : 'No active theme',
      icon: <Palette className="h-5 w-5" />,
      route: '/dashboard/themes',
      gradient: 'from-pink-500 to-rose-600',
      iconBg: 'bg-pink-100 dark:bg-pink-900/50',
      textColor: 'text-pink-700 dark:text-pink-300',
    },
    {
      id: 'registrations',
      title: 'Registrations',
      value: communityRegistrations.length,
      subtitle: pendingRegistrations > 0 ? `${pendingRegistrations} pending review` : 'All reviewed',
      icon: <Users className="h-5 w-5" />,
      route: '/dashboard/registrations',
      gradient: 'from-emerald-500 to-teal-600',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
      textColor: 'text-emerald-700 dark:text-emerald-300',
    },
    {
      id: 'survey',
      title: 'Satisfaction Survey',
      value: '—',
      subtitle: 'View responses',
      icon: <ClipboardCheck className="h-5 w-5" />,
      route: '/dashboard/survey',
      gradient: 'from-amber-500 to-orange-600',
      iconBg: 'bg-amber-100 dark:bg-amber-900/50',
      textColor: 'text-amber-700 dark:text-amber-300',
    },
    {
      id: 'analytics',
      title: 'Analytics',
      value: <TrendingUp className="h-6 w-6" />,
      subtitle: 'View trends & insights',
      icon: <BarChart3 className="h-5 w-5" />,
      route: '/dashboard/analytics',
      gradient: 'from-blue-500 to-cyan-600',
      iconBg: 'bg-blue-100 dark:bg-blue-900/50',
      textColor: 'text-blue-700 dark:text-blue-300',
    },
    {
      id: 'activity-log',
      title: 'Activity Log',
      value: <Activity className="h-6 w-6" />,
      subtitle: 'View recent activity',
      icon: <Activity className="h-5 w-5" />,
      route: '/dashboard/activity-log',
      gradient: 'from-slate-500 to-slate-700',
      iconBg: 'bg-slate-100 dark:bg-slate-900/50',
      textColor: 'text-slate-700 dark:text-slate-300',
    },
  ];

  if (isSuperadmin) {
    cards.push({
      id: 'users',
      title: 'User Management',
      value: <UserCog className="h-6 w-6" />,
      subtitle: 'Manage admin users',
      icon: <UserCog className="h-5 w-5" />,
      route: '/dashboard/users',
      gradient: 'from-red-500 to-rose-600',
      iconBg: 'bg-red-100 dark:bg-red-900/50',
      textColor: 'text-red-700 dark:text-red-300',
    });
  }

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
