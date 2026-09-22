import {
  Activity,
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  FileEdit,
  FileText,
  Globe,
  Handshake,
  Images,
  LayoutDashboard,
  MapPin,
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
  onOpenEventAreaManager: () => void;
}

/** Rute nyata per modul konten — bukan query param yang membuka modal. */
export const CONTENT_ROUTES = {
  'landing-page': '/dashboard/content/landing',
  'album-gallery': '/dashboard/content/galeri',
  'event-areas': '/dashboard/content/foto-area',
  letter: '/dashboard/content/surat',
  news: '/dashboard/content/berita',
  sponsorship: '/dashboard/content/sponsorship',
} as const satisfies Record<string, string>;

interface CommandCenterCard {
  id: string;
  title: string;
  /** Measured count, when the module has one. Omitted for modules that are
   *  destinations rather than queues — an icon in this slot would read as a
   *  second icon next to the row's own. */
  value?: React.ReactNode;
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
  /** Pesan error saat fetch draft gagal — antrian tidak boleh dianggap kosong */
  draftsError?: string | null;
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
        ...(permissions.canViewDrafts ? [{ id: 'drafts', label: 'Antrian Draft', icon: <FileEdit className={NAV} strokeWidth={sw} />, action: 'route' as const, route: '/dashboard/drafts' }] : []),
        ...(permissions.canViewThemes ? [{ id: 'themes', label: 'Tema Tahunan', icon: <Palette className={NAV} strokeWidth={sw} />, action: 'route' as const, route: '/dashboard/themes' }] : []),
        ...(permissions.canViewExhibitions ? [{ id: 'exhibitions', label: 'Pameran & Aktivasi', icon: <Store className={NAV} strokeWidth={sw} />, action: 'route' as const, route: '/dashboard/exhibitions' }] : []),
      ],
    },
    {
      label: 'Interaksi',
      items: [
        ...(permissions.canViewRegistrations ? [{ id: 'registrations', label: 'Pendaftaran', icon: <Users className={NAV} strokeWidth={sw} />, action: 'route' as const, route: '/dashboard/registrations' }] : []),
        ...(permissions.canViewSurvey ? [{ id: 'survey', label: 'Survey Kepuasan', icon: <ClipboardCheck className={NAV} strokeWidth={sw} />, action: 'route' as const, route: '/dashboard/survey' }] : []),
        ...(permissions.canViewTenantSurveys && !permissions.isTenantRelation ? [{ id: 'tenant-surveys', label: 'Evaluasi Tenant', icon: <Store className={NAV} strokeWidth={sw} />, action: 'route' as const, route: '/dashboard/tenant-surveys' }] : []),
      ],
    },
    {
      label: 'Sistem',
      items: [
        ...(permissions.canViewUsers ? [{ id: 'users', label: 'Manajemen Pengguna', icon: <UserCog className={NAV} strokeWidth={sw} />, action: 'route' as const, route: '/dashboard/users' }] : []),
        ...(permissions.canViewActivityLog ? [{ id: 'activity-log', label: 'Log Aktivitas', icon: <Activity className={NAV} strokeWidth={sw} />, action: 'route' as const, route: '/dashboard/activity-log' }] : []),
      ],
    },
    {
      label: 'Konten',
      items: [
        ...(permissions.canViewSettings ? [
          { id: 'landing-page', label: 'Halaman Landing', icon: <Globe className={NAV} strokeWidth={sw} />, action: 'route' as const, route: CONTENT_ROUTES['landing-page'] },
          { id: 'album-gallery', label: 'Galeri Album', icon: <Images className={NAV} strokeWidth={sw} />, action: 'route' as const, route: CONTENT_ROUTES['album-gallery'] },
          { id: 'event-areas', label: 'Foto Area Event', icon: <MapPin className={NAV} strokeWidth={sw} />, action: 'route' as const, route: CONTENT_ROUTES['event-areas'] },
          { id: 'letter', label: 'Buat Surat', icon: <FileText className={NAV} strokeWidth={sw} />, action: 'route' as const, route: CONTENT_ROUTES['letter'] },
          { id: 'news', label: 'Berita', icon: <Newspaper className={NAV} strokeWidth={sw} />, action: 'route' as const, route: CONTENT_ROUTES['news'] },
        ] : []),
        ...(permissions.canViewSponsorship ? [
          { id: 'sponsorship', label: 'Sponsorship', icon: <Handshake className={NAV} strokeWidth={sw} />, action: 'route' as const, route: CONTENT_ROUTES['sponsorship'] },
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
    onOpenEventAreaManager: () => undefined,
  })
    .flatMap(group => group.items)
    .filter(item => item.action === 'route' && item.route)
    // Standalone routes (not under /dashboard/*) are not dashboard-path keys
    .filter(item => item.route === '/dashboard' || item.route?.startsWith('/dashboard/'))
    .map(item => item.route === '/dashboard' ? '/' : (item.route?.replace('/dashboard', '') || '/').split('?')[0] || '/');

  return Array.from(new Set(routeItems));
}

/**
 * Wayfinding map: what each admin route calls itself and what it is for.
 * Labels match the pylon entries; descriptions are the same sentences the
 * page bodies already used, so no new product claims are introduced.
 */
export interface WayfindingEntry {
  path: string;
  label: string;
  description: string;
}

const WAYFINDING: WayfindingEntry[] = [
  { path: '/', label: 'Pusat Komando', description: 'Keadaan hari ini dan antrian yang perlu tindakan' },
  { path: '/events', label: 'Jadwal Event', description: 'Kelola semua event dalam berbagai tampilan' },
  { path: '/drafts', label: 'Antrian Draft', description: 'Kelola draft event sebelum dipublikasikan' },
  { path: '/themes', label: 'Tema Tahunan', description: 'Kelola tema dan perencanaan tahunan' },
  { path: '/exhibitions', label: 'Pameran & Aktivasi', description: 'Kelola pameran Casual Leasing, tautan aktivasi, dan pengajuan brand/EO' },
  { path: '/registrations', label: 'Pendaftaran', description: 'Kelola permintaan pendaftaran dari community' },
  { path: '/survey', label: 'Survey Kepuasan', description: 'Kelola Survey Kepuasan pengunjung dan organizer per event' },
  { path: '/tenant-surveys', label: 'Evaluasi Tenant', description: 'Self-assessment tenant/gerai per event' },
  { path: '/analytics', label: 'Analitik', description: 'Analisis tren dan statistik event' },
  { path: '/users', label: 'Manajemen Pengguna', description: 'Kelola user dan permission' },
  { path: '/activity-log', label: 'Log Aktivitas', description: 'Audit trail dari semua aktivitas sistem' },
  { path: '/content/landing', label: 'Halaman Landing', description: 'Gambar hero dan feed Instagram halaman landing' },
  { path: '/content/galeri', label: 'Galeri Album', description: 'Album foto yang tampil di halaman galeri publik' },
  { path: '/content/foto-area', label: 'Foto Area Event', description: 'Area event dan foto representatifnya' },
  { path: '/content/surat', label: 'Buat Surat', description: 'Susun dan unduh surat untuk event terpilih' },
  { path: '/content/berita', label: 'Berita', description: 'Artikel berita yang tampil di situs publik' },
  { path: '/content/sponsorship', label: 'Sponsorship', description: 'Sponsor, status penawaran, dan kerja sama' },
];

const CONTENT_FALLBACK: WayfindingEntry = {
  path: '/content',
  label: 'Konten',
  description: 'Kelola konten publik: halaman landing, galeri, surat, berita, dan sponsorship',
};

/**
 * Resolve the current route to its location plate. Falls back to the first
 * entry (Pusat Komando) for unknown paths so the header never renders empty.
 */
export function getWayfindingMap(dashboardPath: string): { current: WayfindingEntry } {
  const normalized = dashboardPath === '' ? '/' : dashboardPath;
  const current = WAYFINDING.find(entry => entry.path === normalized)
    ?? (normalized.startsWith('/content') ? CONTENT_FALLBACK : undefined)
    ?? WAYFINDING[0];
  return { current: current as WayfindingEntry };
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
  draftsError,
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
    ...(permissions.canViewDrafts ? [{
      id: 'drafts',
      title: 'Antrian Draft',
      value: draftsError ? '-' : activeDrafts.length,
      subtitle: draftsError ? 'Gagal memuat' : activeDrafts.length === 0 ? 'Antrian kosong' : 'Perlu review',
      icon: <FileEdit className={CARD} strokeWidth={sw} />,
      route: '/dashboard/drafts',
      attention: activeDrafts.length > 0,
    }] : []),
    ...(permissions.canViewThemes ? [{
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
      subtitle: 'Lihat respons survey',
      icon: <ClipboardCheck className={CARD} strokeWidth={sw} />,
      route: '/dashboard/survey',
    }] : []),
    ...(permissions.canViewTenantSurveys && !permissions.isTenantRelation ? [{
      id: 'tenant-surveys',
      title: 'Evaluasi Tenant',
      subtitle: 'Evaluasi EO/tenant',
      icon: <Store className={CARD} strokeWidth={sw} />,
      route: '/dashboard/tenant-surveys',
    }] : []),
    ...(permissions.canViewTenantSurveyResults ? [{
      id: 'tenant-survey-results',
      title: 'Hasil Evaluasi Tenant',
      subtitle: 'Hasil evaluasi tenant',
      icon: <TrendingUp className={CARD} strokeWidth={sw} />,
      route: '/tenant-survey-results',
    }] : []),
    ...(permissions.canViewSurvey ? [{
      id: 'analytics',
      title: 'Analitik',
      subtitle: 'Tren & insight',
      icon: <BarChart3 className={CARD} strokeWidth={sw} />,
      route: '/dashboard/analytics',
    }] : []),
    ...(permissions.canViewActivityLog ? [{
      id: 'activity-log',
      title: 'Log Aktivitas',
      subtitle: 'Aktivitas terbaru',
      icon: <Activity className={CARD} strokeWidth={sw} />,
      route: '/dashboard/activity-log',
    }] : []),
    ...(permissions.canViewUsers ? [{
      id: 'users',
      title: 'Manajemen Pengguna',
      subtitle: 'Kelola admin',
      icon: <UserCog className={CARD} strokeWidth={sw} />,
      route: '/dashboard/users',
    }] : []),
  ];

  return cards;
}
