import {
  Activity,
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileEdit,
  FileText,
  Globe,
  Handshake,
  Images,
  LayoutDashboard,
  Newspaper,
  Palette,
  Store,
  TrendingUp,
  UserCog,
  Users,
} from 'lucide-react';
import type { AnnualTheme, CommunityRegistration, DraftEventItem } from '../../types';
import type { Permissions } from '../../hooks/usePermission';

/** Monoline admin icons — stroke 1.5 matches brand-spec / HTML prototype (1.4) */
const NAV = 'h-4 w-4 shrink-0';
const CARD = 'h-5 w-5 shrink-0';
const VALUE = 'h-6 w-6 shrink-0';
const sw = 1.5;

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
  onOpenNewsManager: () => void;
  onOpenSponsorManager: () => void;
}

interface CommandCenterCard {
  id: string;
  title: string;
  value: React.ReactNode;
  subtitle: string;
  icon: React.ReactNode;
  route: string;
  /** Optional attention hint for ops (e.g. pending count) */
  attention?: boolean;
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
  // TR-only accounts: analytics page only (no command center / event ops)
  const isTrOnly = permissions.isTenantRelation && !permissions.canEditEvents;

  return [
    {
      label: 'Ringkasan',
      items: [
        ...(!isTrOnly ? [{ id: 'overview', label: 'Pusat Komando', icon: <LayoutDashboard className={NAV} strokeWidth={sw} />, action: 'route' as const, route: '/dashboard' }] : []),
        ...(permissions.canViewSurvey ? [{ id: 'analytics', label: 'Analitik', icon: <BarChart3 className={NAV} strokeWidth={sw} />, action: 'route' as const, route: '/dashboard/analytics' }] : []),
        ...(permissions.canViewTenantSurveyResults ? [{ id: 'tenant-survey-results', label: 'Hasil Evaluasi Tenant', icon: <TrendingUp className={NAV} strokeWidth={sw} />, action: 'route' as const, route: '/tenant-survey-results' }] : []),
      ],
    },
    {
      label: 'Kelola Event',
      items: [
        ...(!isTrOnly ? [{ id: 'events', label: 'Jadwal Event', icon: <CalendarDays className={NAV} strokeWidth={sw} />, action: 'route' as const, route: '/dashboard/events' }] : []),
        ...(permissions.canEditEvents ? [{ id: 'drafts', label: 'Antrian Draft', icon: <FileEdit className={NAV} strokeWidth={sw} />, action: 'route' as const, route: '/dashboard/drafts' }] : []),
        ...(permissions.canManageThemes ? [{ id: 'themes', label: 'Tema Tahunan', icon: <Palette className={NAV} strokeWidth={sw} />, action: 'route' as const, route: '/dashboard/themes' }] : []),
      ],
    },
    {
      label: 'Interaksi',
      items: [
        ...(permissions.canViewRegistrations ? [{ id: 'registrations', label: 'Pendaftaran', icon: <Users className={NAV} strokeWidth={sw} />, action: 'route' as const, route: '/dashboard/registrations' }] : []),
        ...(permissions.canViewRegistrations ? [{ id: 'sponsorship', label: 'Sponsorship', icon: <Handshake className={NAV} strokeWidth={sw} />, action: 'callback' as const, callback: callbacks.onOpenSponsorManager }] : []),
        ...(permissions.canViewSurvey ? [{ id: 'survey', label: 'Survey Kepuasan', icon: <ClipboardCheck className={NAV} strokeWidth={sw} />, action: 'route' as const, route: '/dashboard/survey' }] : []),
        ...((permissions.canViewSurvey || permissions.isEoTenant) && !permissions.isTenantRelation ? [{ id: 'tenant-surveys', label: 'Evaluasi Tenant', icon: <Store className={NAV} strokeWidth={sw} />, action: 'route' as const, route: '/dashboard/tenant-surveys' }] : []),
      ],
    },
    {
      label: 'Sistem',
      items: [
        ...(permissions.canManageUsers ? [{ id: 'users', label: 'Manajemen Pengguna', icon: <UserCog className={NAV} strokeWidth={sw} />, action: 'route' as const, route: '/dashboard/users' }] : []),
        ...(permissions.canViewActivityLog ? [{ id: 'activity-log', label: 'Log Aktivitas', icon: <Activity className={NAV} strokeWidth={sw} />, action: 'route' as const, route: '/dashboard/activity-log' }] : []),
      ],
    },
    {
      label: 'Konten',
      items: [
        ...(permissions.canManageSettings ? [
          { id: 'landing-page', label: 'Halaman Landing', icon: <Globe className={NAV} strokeWidth={sw} />, action: 'callback' as const, callback: callbacks.onOpenInstagramSettings },
          { id: 'album-gallery', label: 'Galeri Album', icon: <Images className={NAV} strokeWidth={sw} />, action: 'callback' as const, callback: callbacks.onOpenAlbumManager },
          { id: 'letter', label: 'Buat Surat', icon: <FileText className={NAV} strokeWidth={sw} />, action: 'callback' as const, callback: callbacks.onOpenLetterPicker },
          { id: 'news', label: 'Berita', icon: <Newspaper className={NAV} strokeWidth={sw} />, action: 'callback' as const, callback: callbacks.onOpenNewsManager },
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
    onOpenNewsManager: () => undefined,
    onOpenSponsorManager: () => undefined,
  })
    .flatMap(group => group.items)
    .filter(item => item.action === 'route' && item.route)
    // Standalone routes (not under /dashboard/*) are not dashboard-path keys
    .filter(item => item.route === '/dashboard' || item.route?.startsWith('/dashboard/'))
    .map(item => item.route === '/dashboard' ? '/' : item.route?.replace('/dashboard', '') || '/');

  return Array.from(new Set(routeItems));
}

/** Absolute path for post-login / unauthorized redirect (may be outside /dashboard). */
export function getDefaultAppPath(permissions: Permissions): string {
  if (permissions.isTenantRelation) return '/tenant-survey-results';
  if (permissions.isEoTenant) return '/dashboard/tenant-surveys';
  const paths = getAllowedDashboardPaths(permissions);
  if (paths.includes('/')) return '/dashboard';
  const first = paths[0];
  return first ? `/dashboard${first}` : '/dashboard';
}

export function getDefaultDashboardPath(permissions: Permissions): string {
  if (permissions.isTenantRelation) return '/tenant-survey-results';
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
      title: 'Jadwal Event',
      value: totalEvents,
      subtitle: `${upcomingEvents} mendatang · ${ongoingEvents} berlangsung`,
      icon: <CalendarDays className={CARD} strokeWidth={sw} />,
      route: '/dashboard/events',
      attention: ongoingEvents > 0,
    },
    ...(permissions.canEditEvents ? [{
      id: 'drafts',
      title: 'Antrian Draft',
      value: activeDrafts.length,
      subtitle: activeDrafts.length === 0 ? 'Antrian kosong' : 'Perlu review',
      icon: <FileEdit className={CARD} strokeWidth={sw} />,
      route: '/dashboard/drafts',
      attention: activeDrafts.length > 0,
    }] : []),
    ...(permissions.canManageThemes ? [{
      id: 'themes',
      title: 'Tema Tahunan',
      value: annualThemes.length,
      subtitle: currentTheme ? `Aktif: ${currentTheme.name}` : 'Belum ada tema aktif',
      icon: <Palette className={CARD} strokeWidth={sw} />,
      route: '/dashboard/themes',
    }] : []),
    ...(permissions.canViewRegistrations ? [{
      id: 'registrations',
      title: 'Pendaftaran',
      value: communityRegistrations.length,
      subtitle: pendingRegistrations > 0 ? `${pendingRegistrations} menunggu review` : 'Semua sudah direview',
      icon: <Users className={CARD} strokeWidth={sw} />,
      route: '/dashboard/registrations',
      attention: pendingRegistrations > 0,
    }] : []),
    ...(permissions.canViewSurvey ? [{
      id: 'survey',
      title: 'Survey Kepuasan',
      value: <ClipboardList className={VALUE} strokeWidth={sw} aria-hidden />,
      subtitle: 'Lihat respons survey',
      icon: <ClipboardCheck className={CARD} strokeWidth={sw} />,
      route: '/dashboard/survey',
    }] : []),
    ...((permissions.canViewSurvey || permissions.isEoTenant) && !permissions.isTenantRelation ? [{
      id: 'tenant-surveys',
      title: 'Evaluasi Tenant',
      value: <Store className={VALUE} strokeWidth={sw} aria-hidden />,
      subtitle: 'Evaluasi EO/tenant',
      icon: <Store className={CARD} strokeWidth={sw} />,
      route: '/dashboard/tenant-surveys',
    }] : []),
    ...(permissions.canViewTenantSurveyResults ? [{
      id: 'tenant-survey-results',
      title: 'Hasil Evaluasi Tenant',
      value: <TrendingUp className={VALUE} strokeWidth={sw} aria-hidden />,
      subtitle: 'Hasil evaluasi tenant',
      icon: <TrendingUp className={CARD} strokeWidth={sw} />,
      route: '/tenant-survey-results',
    }] : []),
    ...(permissions.canViewSurvey ? [{
      id: 'analytics',
      title: 'Analitik',
      value: <BarChart3 className={VALUE} strokeWidth={sw} aria-hidden />,
      subtitle: 'Tren & insight',
      icon: <BarChart3 className={CARD} strokeWidth={sw} />,
      route: '/dashboard/analytics',
    }] : []),
    ...(permissions.canViewActivityLog ? [{
      id: 'activity-log',
      title: 'Log Aktivitas',
      value: <Activity className={VALUE} strokeWidth={sw} aria-hidden />,
      subtitle: 'Aktivitas terbaru',
      icon: <Activity className={CARD} strokeWidth={sw} />,
      route: '/dashboard/activity-log',
    }] : []),
    ...(isSuperadmin && permissions.canManageUsers ? [{
      id: 'users',
      title: 'Manajemen Pengguna',
      value: <UserCog className={VALUE} strokeWidth={sw} aria-hidden />,
      subtitle: 'Kelola admin',
      icon: <UserCog className={CARD} strokeWidth={sw} />,
      route: '/dashboard/users',
    }] : []),
  ];

  return cards;
}
