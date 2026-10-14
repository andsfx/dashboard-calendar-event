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
  Sparkles,
  Store,
  TrendingUp,
  UserCog,
  Users,
} from 'lucide-react';
import type { AnnualTheme, CommunityRegistration, DraftEventItem, ExhibitionLead, TenantEventProposal } from '../../types';
import type { Permissions } from '../../hooks/usePermission';

/** Monoline admin icons: stroke 1.5 matches brand-spec / HTML prototype (1.4) */
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
  /** Fitur sengaja ditutup sementara: rail menandainya agar tidak dikira rusak. */
  maintenance?: boolean;
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

/** Rute nyata per modul konten: bukan query param yang membuka modal. */
export const CONTENT_ROUTES = {
  'landing-page': '/dashboard/content/landing',
  'album-gallery': '/dashboard/content/galeri',
  'event-areas': '/dashboard/content/foto-area',
  letter: '/dashboard/content/surat',
  news: '/dashboard/content/berita',
  sponsorship: '/dashboard/content/sponsorship',
} as const satisfies Record<string, string>;

/** Canonical Dashboard Group labels, in display order, used by the register
 *  "Semua modul" to group its rows. The rail lists the same five groups, but
 *  with its own literal labels: this constant does not drive the rail. */
export type DashboardGroupLabel = 'Ringkasan' | 'Kelola Event' | 'Interaksi' | 'Sistem' | 'Konten';

export const DASHBOARD_GROUP_ORDER: DashboardGroupLabel[] = [
  'Ringkasan',
  'Kelola Event',
  'Interaksi',
  'Sistem',
  'Konten',
];

/**
 * Antrian yang benar-benar menunggu keputusan manusia. Kehadirannya, bukan
 * angkanya, yang menentukan berat sebuah modul di Pusat Komando: modul tanpa
 * antrian hanya baris direktori, modul ber-antrian naik ke register
 * "Perlu tindakan" dengan angka, keadaan, dan aksi.
 */
export interface CommandCenterQueue {
  count: number;
  /** Keadaan antrian dalam kata (mis. "menunggu review"). */
  state: string;
  /** Label aksi menuju modul yang memilikinya. */
  action: string;
  /** Pesan gagal muat: antrian yang tak terbaca tidak boleh terbaca kosong. */
  error?: string | null;
}

export interface CommandCenterCard {
  id: string;
  title: string;
  /** Satu baris: modul ini untuk apa. Kalimatnya sama dengan plat lokasi dan
   *  rail (lihat `WAYFINDING`), jadi satu modul tidak menyebut dirinya dengan
   *  dua kalimat berbeda. */
  subtitle: string;
  icon: React.ReactNode;
  route: string;
  /** Dashboard Group this module belongs to: the register's grouping key. */
  group: DashboardGroupLabel;
  /** Antrian manusia. Tidak ada angka di baris direktori: angkanya hidup di
   *  register "Perlu tindakan", sekali, supaya tidak diulang di satu halaman. */
  queue?: CommandCenterQueue;
  /** Keadaan bukan-antrian yang menyebut NAMA, bukan angka (mis. tema aktif). */
  state?: string;
  /** Fitur sengaja ditutup sementara: baris menandainya agar tidak dikira rusak. */
  maintenance?: boolean;
}

interface CommandCenterCardParams {
  activeDrafts: DraftEventItem[];
  annualThemes: AnnualTheme[];
  communityRegistrations: CommunityRegistration[];
  /** Pengajuan pameran/aktivasi yang menunggu review manusia. */
  exhibitionLeads?: ExhibitionLead[];
  /** Pengajuan kolaborasi tenant yang menunggu review manusia. */
  tenantProposals?: TenantEventProposal[];
  /** Pesan error saat fetch draft gagal: antrian tidak boleh dianggap kosong */
  draftsError?: string | null;
  permissions: Permissions;
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
        ...(!isTrOnly ? [{ id: 'insights', label: 'Insight Cerdas', icon: <Sparkles className={NAV} strokeWidth={sw} />, action: 'route' as const, route: '/dashboard/insights' }] : []),
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
        ...(permissions.canViewTenantProposals ? [{ id: 'tenant-proposals', label: 'Kolaborasi Tenant', icon: <Store className={NAV} strokeWidth={sw} />, action: 'route' as const, route: '/dashboard/tenant-proposals' }] : []),
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
          { id: 'letter', label: 'Buat Surat', icon: <FileText className={NAV} strokeWidth={sw} />, action: 'route' as const, route: CONTENT_ROUTES['letter'], maintenance: true },
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
  { path: '/insights', label: 'Insight Cerdas', description: 'Analisis otomatis dan rekomendasi tindakan dari data event & modul lain' },
  { path: '/events', label: 'Jadwal Event', description: 'Kelola semua event dalam berbagai tampilan' },
  { path: '/drafts', label: 'Antrian Draft', description: 'Kelola draft event sebelum dipublikasikan' },
  { path: '/themes', label: 'Tema Tahunan', description: 'Kelola tema dan perencanaan tahunan' },
  { path: '/exhibitions', label: 'Pameran & Aktivasi', description: 'Kelola pameran Casual Leasing, tautan aktivasi, dan pengajuan brand/EO' },
  { path: '/registrations', label: 'Pendaftaran', description: 'Kelola permintaan pendaftaran dari community' },
  { path: '/tenant-proposals', label: 'Kolaborasi Tenant', description: 'Tinjau pengajuan event dan kerja sama dari tenant' },
  { path: '/survey', label: 'Survey Kepuasan', description: 'Kelola Survey Kepuasan pengunjung dan organizer per event' },
  { path: '/tenant-surveys', label: 'Evaluasi Tenant', description: 'Self-assessment tenant per event' },
  { path: '/analytics', label: 'Analitik', description: 'Analisis tren dan statistik event' },
  { path: '/users', label: 'Manajemen Pengguna', description: 'Kelola user dan permission' },
  { path: '/activity-log', label: 'Log Aktivitas', description: 'Audit trail dari semua aktivitas sistem' },
  { path: '/content/landing', label: 'Halaman Landing', description: 'Gambar hero dan feed Instagram halaman landing' },
  { path: '/content/galeri', label: 'Galeri Album', description: 'Album foto yang tampil di halaman galeri publik' },
  { path: '/content/foto-area', label: 'Foto Area Event', description: 'Area event dan foto representatifnya' },
  { path: '/content/surat', label: 'Buat Surat', description: 'Sedang diperbaiki: generator surat ditutup sementara' },
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

/** Kalimat "modul ini untuk apa", dibaca dari peta wayfinding yang sama dengan
 *  plat lokasi: satu modul, satu kalimat, tidak ada dua deskripsi paralel. */
const MODULE_PURPOSE: Record<string, string> = Object.fromEntries(
  WAYFINDING.map(entry => [entry.path, entry.description]),
);

/**
 * Isi register "Semua modul": modul yang boleh dibuka role ini, satu baris per
 * modul, dikelompokkan per Dashboard Group. Predicate izinnya identik dengan
 * rail (`canViewDrafts`, `canViewSettings`, `canViewSponsorship`, …) sehingga
 * modul yang tidak boleh dibuka tidak pernah muncul.
 *
 * Baris direktori sengaja TIDAK membawa angka. Angka antrian hidup sekali di
 * register "Perlu tindakan" (`CommandCenterSummary`); yang dibawa baris adalah
 * kalimat "modul ini untuk apa" plus penanda keadaan: titik penuh untuk modul
 * yang menunggu manusia (nama keadaannya dibawa `sr-only` + `title`, bentuknya
 * ikut membedakan tanpa warna), dan kalimat "Sedang diperbaiki" untuk modul
 * yang sengaja ditutup.
 */
export function getCommandCenterCards({
  activeDrafts,
  annualThemes,
  communityRegistrations,
  exhibitionLeads = [],
  tenantProposals = [],
  draftsError,
  permissions,
}: CommandCenterCardParams): CommandCenterCard[] {
  const pendingRegistrations = communityRegistrations.filter(r => r.status === 'pending').length;
  const pendingLeads = exhibitionLeads.filter(l => l.status === 'pending').length;
  const pendingTenantProposals = tenantProposals.filter(p => p.status === 'pending').length;
  const isTrOnly = permissions.isTenantRelation && !permissions.canEditEvents;
  const currentTheme = annualThemes.find(theme => {
    const now = new Date();
    const start = new Date(theme.dateStart);
    const end = new Date(theme.dateEnd);
    return now >= start && now <= end;
  });

  /* Antrian draft: gagal muat ≠ kosong. Keduanya jadi `queue` supaya modulnya
     tetap naik ke "Perlu tindakan"; yang membedakan hanya keadaannya. */
  const draftQueue: CommandCenterQueue | undefined = draftsError
    ? { count: 0, state: 'Gagal dimuat', action: 'Buka antrian draft', error: draftsError }
    : activeDrafts.length > 0
      ? { count: activeDrafts.length, state: 'menunggu dipublikasikan', action: 'Buka antrian draft' }
      : undefined;

  const cards: CommandCenterCard[] = [
    {
      id: 'events',
      title: 'Jadwal Event',
      subtitle: MODULE_PURPOSE['/events'] ?? 'Kelola semua event dalam berbagai tampilan',
      icon: <CalendarDays className={CARD} strokeWidth={sw} />,
      route: '/dashboard/events',
      group: 'Kelola Event',
    },
    ...(permissions.canViewDrafts ? [{
      id: 'drafts',
      title: 'Antrian Draft',
      subtitle: MODULE_PURPOSE['/drafts'] ?? 'Kelola draft event sebelum dipublikasikan',
      icon: <FileEdit className={CARD} strokeWidth={sw} />,
      route: '/dashboard/drafts',
      queue: draftQueue,
      group: 'Kelola Event' as const,
    }] : []),
    ...(permissions.canViewThemes ? [{
      id: 'themes',
      title: 'Tema Tahunan',
      subtitle: MODULE_PURPOSE['/themes'] ?? 'Kelola tema dan perencanaan tahunan',
      icon: <Palette className={CARD} strokeWidth={sw} />,
      route: '/dashboard/themes',
      state: currentTheme ? `Aktif: ${currentTheme.name}` : 'Belum ada tema aktif',
      group: 'Kelola Event' as const,
    }] : []),
    ...(permissions.canViewExhibitions ? [{
      id: 'exhibitions',
      title: 'Pameran & Aktivasi',
      subtitle: MODULE_PURPOSE['/exhibitions'] ?? 'Kelola pameran, aktivasi, dan pengajuan brand/EO',
      icon: <Store className={CARD} strokeWidth={sw} />,
      route: '/dashboard/exhibitions',
      queue: pendingLeads > 0
        ? { count: pendingLeads, state: 'pengajuan menunggu review', action: 'Buka pameran & aktivasi' }
        : undefined,
      group: 'Kelola Event' as const,
    }] : []),
    ...(permissions.canViewRegistrations ? [{
      id: 'registrations',
      title: 'Pendaftaran',
      subtitle: MODULE_PURPOSE['/registrations'] ?? 'Kelola permintaan pendaftaran dari community',
      icon: <Users className={CARD} strokeWidth={sw} />,
      route: '/dashboard/registrations',
      queue: pendingRegistrations > 0
        ? { count: pendingRegistrations, state: 'menunggu review', action: 'Buka pendaftaran' }
        : undefined,
      group: 'Interaksi' as const,
    }] : []),
    ...(permissions.canViewTenantProposals ? [{
      id: 'tenant-proposals',
      title: 'Kolaborasi Tenant',
      subtitle: MODULE_PURPOSE['/tenant-proposals'] ?? 'Tinjau pengajuan event dan kerja sama dari tenant',
      icon: <Store className={CARD} strokeWidth={sw} />,
      route: '/dashboard/tenant-proposals',
      queue: pendingTenantProposals > 0
        ? { count: pendingTenantProposals, state: 'pengajuan menunggu review', action: 'Buka kolaborasi tenant' }
        : undefined,
      group: 'Interaksi' as const,
    }] : []),
    ...(permissions.canViewSurvey ? [{
      id: 'survey',
      title: 'Survey Kepuasan',
      subtitle: MODULE_PURPOSE['/survey'] ?? 'Kelola Survey Kepuasan pengunjung dan organizer per event',
      icon: <ClipboardCheck className={CARD} strokeWidth={sw} />,
      route: '/dashboard/survey',
      group: 'Interaksi' as const,
    }] : []),
    ...(permissions.canViewTenantSurveys && !permissions.isTenantRelation ? [{
      id: 'tenant-surveys',
      title: 'Evaluasi Tenant',
      subtitle: MODULE_PURPOSE['/tenant-surveys'] ?? 'Self-assessment tenant per event',
      icon: <Store className={CARD} strokeWidth={sw} />,
      route: '/dashboard/tenant-surveys',
      group: 'Interaksi' as const,
    }] : []),
    ...(permissions.canViewTenantSurveyResults ? [{
      id: 'tenant-survey-results',
      title: 'Hasil Evaluasi Tenant',
      subtitle: 'Hasil evaluasi tenant',
      icon: <TrendingUp className={CARD} strokeWidth={sw} />,
      route: '/tenant-survey-results',
      group: 'Ringkasan' as const,
    }] : []),
    ...(permissions.canViewSurvey ? [{
      id: 'analytics',
      title: 'Analitik',
      subtitle: MODULE_PURPOSE['/analytics'] ?? 'Analisis tren dan statistik event',
      icon: <BarChart3 className={CARD} strokeWidth={sw} />,
      route: '/dashboard/analytics',
      group: 'Ringkasan' as const,
    }] : []),
    ...(!isTrOnly ? [{
      id: 'insights',
      title: 'Insight Cerdas',
      subtitle: MODULE_PURPOSE['/insights'] ?? 'Analisis otomatis dan rekomendasi tindakan',
      icon: <Sparkles className={CARD} strokeWidth={sw} />,
      route: '/dashboard/insights',
      group: 'Ringkasan' as const,
    }] : []),
    ...(permissions.canViewActivityLog ? [{
      id: 'activity-log',
      title: 'Log Aktivitas',
      subtitle: MODULE_PURPOSE['/activity-log'] ?? 'Audit trail dari semua aktivitas sistem',
      icon: <Activity className={CARD} strokeWidth={sw} />,
      route: '/dashboard/activity-log',
      group: 'Sistem' as const,
    }] : []),
    ...(permissions.canViewUsers ? [{
      id: 'users',
      title: 'Manajemen Pengguna',
      subtitle: MODULE_PURPOSE['/users'] ?? 'Kelola user dan permission',
      icon: <UserCog className={CARD} strokeWidth={sw} />,
      route: '/dashboard/users',
      group: 'Sistem' as const,
    }] : []),
    /* Modul Konten: gate izin identik dengan rail (canViewSettings /
       canViewSponsorship), jadi baris ini tidak pernah bocor ke role yang
       tidak berhak. */
    ...(permissions.canViewSettings ? [
      {
        id: 'content-landing',
        title: 'Halaman Landing',
        subtitle: MODULE_PURPOSE[CONTENT_ROUTES['landing-page']] ?? 'Gambar hero dan feed Instagram halaman landing',
        icon: <Globe className={CARD} strokeWidth={sw} />,
        route: CONTENT_ROUTES['landing-page'],
        group: 'Konten' as const,
      },
      {
        id: 'content-galeri',
        title: 'Galeri Album',
        subtitle: MODULE_PURPOSE[CONTENT_ROUTES['album-gallery']] ?? 'Album foto yang tampil di halaman galeri publik',
        icon: <Images className={CARD} strokeWidth={sw} />,
        route: CONTENT_ROUTES['album-gallery'],
        group: 'Konten' as const,
      },
      {
        id: 'content-foto-area',
        title: 'Foto Area Event',
        subtitle: MODULE_PURPOSE[CONTENT_ROUTES['event-areas']] ?? 'Area event dan foto representatifnya',
        icon: <MapPin className={CARD} strokeWidth={sw} />,
        route: CONTENT_ROUTES['event-areas'],
        group: 'Konten' as const,
      },
      {
        id: 'content-surat',
        title: 'Buat Surat',
        subtitle: 'Generator ditutup sementara',
        icon: <FileText className={CARD} strokeWidth={sw} />,
        route: CONTENT_ROUTES.letter,
        group: 'Konten' as const,
        maintenance: true,
      },
      {
        id: 'content-berita',
        title: 'Berita',
        subtitle: MODULE_PURPOSE[CONTENT_ROUTES.news] ?? 'Artikel berita yang tampil di situs publik',
        icon: <Newspaper className={CARD} strokeWidth={sw} />,
        route: CONTENT_ROUTES.news,
        group: 'Konten' as const,
      },
    ] : []),
    ...(permissions.canViewSponsorship ? [{
      id: 'content-sponsorship',
      title: 'Sponsorship',
      subtitle: MODULE_PURPOSE[CONTENT_ROUTES.sponsorship] ?? 'Sponsor, status penawaran, dan kerja sama',
      icon: <Handshake className={CARD} strokeWidth={sw} />,
      route: CONTENT_ROUTES.sponsorship,
      group: 'Konten' as const,
    }] : []),
  ];

  return cards;
}
