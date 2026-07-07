import {
  Activity,
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  FileEdit,
  FileText,
  Globe,
  Image,
  LayoutDashboard,
  Palette,
  TrendingUp,
  UserCog,
  Users,
} from 'lucide-react';
import type { AnnualTheme, CommunityRegistration, DraftEventItem } from '../../types';
import type { Permissions } from '../../hooks/usePermission';

export interface DashboardNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: 'route' | 'callback';
  route?: string;
  callback?: () => void;
}

export interface DashboardNavGroup {
  label: string;
  items: DashboardNavItem[];
}

interface DashboardNavCallbacks {
  onOpenInstagramSettings: () => void;
  onOpenAlbumManager: () => void;
  onOpenLetterPicker: () => void;
}

interface CommandCenterCard {
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

interface CommandCenterCardParams {
  totalEvents: number;
  upcomingEvents: number;
  ongoingEvents: number;
  activeDrafts: DraftEventItem[];
  annualThemes: AnnualTheme[];
  communityRegistrations: CommunityRegistration[];
  permissions: Permissions;
  isSuperadmin?: boolean;
}

export function getDashboardNavGroups(
  permissions: Permissions,
  callbacks: DashboardNavCallbacks,
): DashboardNavGroup[] {
  return [
    {
      label: 'Overview',
      items: [
        { id: 'overview', label: 'Command Center', icon: <LayoutDashboard className="h-4 w-4" />, action: 'route' as const, route: '/dashboard' },
        ...(permissions.canViewSurvey ? [{ id: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" />, action: 'route' as const, route: '/dashboard/analytics' }] : []),
      ],
    },
    {
      label: 'Event Management',
      items: [
        { id: 'events', label: 'Event Schedule', icon: <CalendarDays className="h-4 w-4" />, action: 'route' as const, route: '/dashboard/events' },
        ...(permissions.canEditEvents ? [{ id: 'drafts', label: 'Draft Queue', icon: <FileEdit className="h-4 w-4" />, action: 'route' as const, route: '/dashboard/drafts' }] : []),
        ...(permissions.canManageThemes ? [{ id: 'themes', label: 'Annual Themes', icon: <Palette className="h-4 w-4" />, action: 'route' as const, route: '/dashboard/themes' }] : []),
      ],
    },
    {
      label: 'Engagement',
      items: [
        ...(permissions.canViewRegistrations ? [{ id: 'registrations', label: 'Registrations', icon: <Users className="h-4 w-4" />, action: 'route' as const, route: '/dashboard/registrations' }] : []),
        ...(permissions.canViewSurvey ? [{ id: 'survey', label: 'Satisfaction Survey', icon: <ClipboardCheck className="h-4 w-4" />, action: 'route' as const, route: '/dashboard/survey' }] : []),
        ...(permissions.canViewSurvey || permissions.isEoTenant ? [{ id: 'tenant-surveys', label: 'Tenant Self-Assessment', icon: <ClipboardCheck className="h-4 w-4" />, action: 'route' as const, route: '/dashboard/tenant-surveys' }] : []),
      ],
    },
    {
      label: 'System',
      items: [
        ...(permissions.canManageUsers ? [{ id: 'users', label: 'User Management', icon: <UserCog className="h-4 w-4" />, action: 'route' as const, route: '/dashboard/users' }] : []),
        ...(permissions.canViewActivityLog ? [{ id: 'activity-log', label: 'Activity Log', icon: <Activity className="h-4 w-4" />, action: 'route' as const, route: '/dashboard/activity-log' }] : []),
      ],
    },
    {
      label: 'Content Settings',
      items: [
        ...(permissions.canManageSettings ? [
          { id: 'landing-page', label: 'Landing Page', icon: <Globe className="h-4 w-4" />, action: 'callback' as const, callback: callbacks.onOpenInstagramSettings },
          { id: 'album-gallery', label: 'Album Gallery', icon: <Image className="h-4 w-4" />, action: 'callback' as const, callback: callbacks.onOpenAlbumManager },
          { id: 'letter', label: 'Create Letter', icon: <FileText className="h-4 w-4" />, action: 'callback' as const, callback: callbacks.onOpenLetterPicker },
        ] : []),
      ],
    },
  ].filter(group => group.items.length > 0);
}

export function getAllowedDashboardPaths(permissions: Permissions): string[] {
  const routeItems = getDashboardNavGroups(permissions, {
    onOpenInstagramSettings: () => undefined,
    onOpenAlbumManager: () => undefined,
    onOpenLetterPicker: () => undefined,
  })
    .flatMap(group => group.items)
    .filter(item => item.action === 'route' && item.route)
    .map(item => item.route === '/dashboard' ? '/' : item.route?.replace('/dashboard', '') || '/');

  return Array.from(new Set(routeItems));
}

export function getDefaultDashboardPath(permissions: Permissions): string {
  if (permissions.isEoTenant) return '/tenant-surveys';
  const paths = getAllowedDashboardPaths(permissions);
  if (paths.includes('/')) return '/';
  return paths[0] || '/';
}

export function getCommandCenterCards({
  totalEvents,
  upcomingEvents,
  ongoingEvents,
  activeDrafts,
  annualThemes,
  communityRegistrations,
  permissions,
  isSuperadmin,
}: CommandCenterCardParams): CommandCenterCard[] {
  const pendingRegistrations = communityRegistrations.filter(r => r.status === 'pending').length;
  const currentTheme = annualThemes.find(theme => {
    const now = new Date();
    const start = new Date(theme.dateStart);
    const end = new Date(theme.dateEnd);
    return now >= start && now <= end;
  });

  const cards: CommandCenterCard[] = [
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
    ...(permissions.canEditEvents ? [{
      id: 'drafts',
      title: 'Draft Queue',
      value: activeDrafts.length,
      subtitle: activeDrafts.length === 0 ? 'All clear' : 'Needs review',
      icon: <FileEdit className="h-5 w-5" />,
      route: '/dashboard/drafts',
      gradient: 'from-purple-500 to-violet-600',
      iconBg: 'bg-purple-100 dark:bg-purple-900/50',
      textColor: 'text-purple-700 dark:text-purple-300',
    }] : []),
    ...(permissions.canManageThemes ? [{
      id: 'themes',
      title: 'Annual Themes',
      value: annualThemes.length,
      subtitle: currentTheme ? `Active: ${currentTheme.name}` : 'No active theme',
      icon: <Palette className="h-5 w-5" />,
      route: '/dashboard/themes',
      gradient: 'from-pink-500 to-rose-600',
      iconBg: 'bg-pink-100 dark:bg-pink-900/50',
      textColor: 'text-pink-700 dark:text-pink-300',
    }] : []),
    ...(permissions.canViewRegistrations ? [{
      id: 'registrations',
      title: 'Registrations',
      value: communityRegistrations.length,
      subtitle: pendingRegistrations > 0 ? `${pendingRegistrations} pending review` : 'All reviewed',
      icon: <Users className="h-5 w-5" />,
      route: '/dashboard/registrations',
      gradient: 'from-emerald-500 to-teal-600',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
      textColor: 'text-emerald-700 dark:text-emerald-300',
    }] : []),
    ...(permissions.canViewSurvey ? [{
      id: 'survey',
      title: 'Satisfaction Survey',
      value: '—',
      subtitle: 'View responses',
      icon: <ClipboardCheck className="h-5 w-5" />,
      route: '/dashboard/survey',
      gradient: 'from-amber-500 to-orange-600',
      iconBg: 'bg-amber-100 dark:bg-amber-900/50',
      textColor: 'text-amber-700 dark:text-amber-300',
    }] : []),
    ...((permissions.canViewSurvey || permissions.isEoTenant) ? [{
      id: 'tenant-surveys',
      title: 'Tenant Self-Assessment',
      value: '—',
      subtitle: 'EO evaluations',
      icon: <ClipboardCheck className="h-5 w-5" />,
      route: '/dashboard/tenant-surveys',
      gradient: 'from-teal-500 to-emerald-600',
      iconBg: 'bg-teal-100 dark:bg-teal-900/50',
      textColor: 'text-teal-700 dark:text-teal-300',
    }] : []),
    ...(permissions.canViewSurvey ? [{
      id: 'analytics',
      title: 'Analytics',
      value: <TrendingUp className="h-6 w-6" />,
      subtitle: 'View trends & insights',
      icon: <BarChart3 className="h-5 w-5" />,
      route: '/dashboard/analytics',
      gradient: 'from-blue-500 to-cyan-600',
      iconBg: 'bg-blue-100 dark:bg-blue-900/50',
      textColor: 'text-blue-700 dark:text-blue-300',
    }] : []),
    ...(permissions.canViewActivityLog ? [{
      id: 'activity-log',
      title: 'Activity Log',
      value: <Activity className="h-6 w-6" />,
      subtitle: 'View recent activity',
      icon: <Activity className="h-5 w-5" />,
      route: '/dashboard/activity-log',
      gradient: 'from-slate-500 to-slate-700',
      iconBg: 'bg-slate-100 dark:bg-slate-900/50',
      textColor: 'text-slate-700 dark:text-slate-300',
    }] : []),
    ...(isSuperadmin && permissions.canManageUsers ? [{
      id: 'users',
      title: 'User Management',
      value: <UserCog className="h-6 w-6" />,
      subtitle: 'Manage admin users',
      icon: <UserCog className="h-5 w-5" />,
      route: '/dashboard/users',
      gradient: 'from-red-500 to-rose-600',
      iconBg: 'bg-red-100 dark:bg-red-900/50',
      textColor: 'text-red-700 dark:text-red-300',
    }] : []),
  ];

  return cards;
}
