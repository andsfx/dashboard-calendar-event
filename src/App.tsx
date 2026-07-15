import { useState, useCallback, useEffect, useMemo, Suspense, lazy } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { List, Kanban, Clock4, Radio, Clock3, ArrowLeft } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { DashboardSkeleton } from './components/DashboardSkeleton';
import { SectionNav } from './components/SectionNav';
import { ToastContainer } from './components/ToastContainer';
import { DashboardHeader } from './components/dashboard/DashboardHeader';
import { DashboardStats } from './components/dashboard/DashboardStats';
import { AdminSidebar } from './components/dashboard/AdminSidebar';
import { DashboardModals } from './components/dashboard/DashboardModals';
import { CommandCenterSummary } from './components/dashboard/CommandCenterSummary';
import { getAllowedDashboardPaths, getDefaultDashboardPath } from './components/dashboard/dashboardNavigation';
import { useEvents } from './hooks/useEvents';
import { useDraftEvents } from './hooks/useDraftEvents';
import { useToast } from './hooks/useToast';
import { useAuth } from './hooks/useAuth';
import { usePermission } from './hooks/usePermission';
import { DraftEventItem, EventItem, LetterRequestItem, ViewMode, AnnualTheme, CommunityRegistration, RegistrationStatus } from './types';
import { createId, parseDateStrLocal, MONTH_NAMES } from './utils/eventUtils';
import { createLetterRequest, fetchSiteSettings, updateSiteSettings, fetchCommunityRegistrations, updateRegistrationStatus, fetchAlbums } from './utils/supabaseApi';
import type { PhotoAlbum } from './types';
import mallLogo from './assets/brand/LOGOMETMAL2016-01.svg';


const CommunityLandingPage = lazy(() => import('./components/CommunityLandingPage').then(m => ({ default: m.CommunityLandingPage })));
const EventsLandingPage = lazy(() => import('./components/EventsLandingPage').then(m => ({ default: m.EventsLandingPage })));
const GalleryIndexPage = lazy(() => import('./components/GalleryIndexPage').then(m => ({ default: m.GalleryIndexPage })));
const GalleryAlbumPage = lazy(() => import('./components/GalleryAlbumPage').then(m => ({ default: m.GalleryAlbumPage })));
const PublicLetterViewer = lazy(() => import('./components/PublicLetterViewer').then(m => ({ default: m.PublicLetterViewer })));
const CommunityRegistrationSection = lazy(() => import('./components/CommunityRegistrationSection').then(m => ({ default: m.CommunityRegistrationSection })));

const VIEW_TABS: Array<{ key: ViewMode; label: string; icon: React.ReactNode }> = [
  { key: 'table',    label: 'Tabel',    icon: <List    className="h-3.5 w-3.5" /> },
  { key: 'calendar', label: 'Kalender', icon: <List className="h-3.5 w-3.5" /> },
  { key: 'kanban',   label: 'Kanban',   icon: <Kanban  className="h-3.5 w-3.5" /> },
  { key: 'timeline', label: 'Timeline', icon: <Clock4  className="h-3.5 w-3.5" /> },
];

const FeaturedEvents = lazy(() => import('./components/FeaturedEvents').then(m => ({ default: m.FeaturedEvents })));
const QuarterTimeline = lazy(() => import('./components/QuarterTimeline').then(m => ({ default: m.QuarterTimeline })));
const CalendarView = lazy(() => import('./components/CalendarView').then(m => ({ default: m.CalendarView })));
const EventDetailModal = lazy(() => import('./components/EventDetailModal').then(m => ({ default: m.EventDetailModal })));
const AdminDraftSection = lazy(() => import('./components/AdminDraftSection').then(m => ({ default: m.AdminDraftSection })));
const SurveyPage = lazy(() => import('./components/survey/SurveyPage'));
const SurveyDashboard = lazy(() => import('./components/survey/SurveyDashboard').then(m => ({ default: m.SurveyDashboard })));
const TenantSurveyPage = lazy(() => import('./components/survey/TenantSurveyPage'));
const TenantSurveyPublicPage = lazy(() => import('./components/survey/TenantSurveyPublicPage'));
const TenantSurveyEventPicker = lazy(() => import('./components/survey/TenantSurveyEventPicker'));
const UserManagement = lazy(() => import('./components/admin/UserManagement').then(m => ({ default: m.UserManagement })));
const ActivityLog = lazy(() => import('./components/admin/ActivityLog').then(m => ({ default: m.ActivityLog })));
const AnalyticsDashboard = lazy(() => import('./components/admin/AnalyticsDashboard').then(m => ({ default: m.AnalyticsDashboard })));
const DashboardViewsSection = lazy(() => import('./components/DashboardViewsSection').then(m => ({ default: m.DashboardViewsSection })));

function SectionFallback({ height = 'h-32' }: { height?: string }) {
  return <div className={`animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800 ${height}`} />;
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const dashboardPath = location.pathname.replace('/dashboard', '') || '/';


  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = saved ? saved === 'dark' : prefersDark;
    if (dark) document.documentElement.classList.add('dark');
    return dark;
  });
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const auth = useAuth();
  const permissions = usePermission(auth.user, auth.isLegacy);
  const isAdmin = permissions.canViewDashboard;
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCrudModal, setShowCrudModal] = useState(false);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [showLetterPickerModal, setShowLetterPickerModal] = useState(false);
  const [showLetterModal, setShowLetterModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDraftHistory, setShowDraftHistory] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [editingDraft, setEditingDraft] = useState<DraftEventItem | null>(null);
  const [editingTheme, setEditingTheme] = useState<AnnualTheme | null>(null);
  const [letterEvent, setLetterEvent] = useState<EventItem | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<EventItem | null>(null);
  const [detailEvent, setDetailEvent] = useState<EventItem | null>(null);
  const [showInstagramSettings, setShowInstagramSettings] = useState(false);
  const [instagramPosts, setInstagramPosts] = useState<string[]>([]);
  const [showAlbumManager, setShowAlbumManager] = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [landingAlbums, setLandingAlbums] = useState<PhotoAlbum[]>([]);
  const [communityRegistrations, setCommunityRegistrations] = useState<CommunityRegistration[]>([]);
  const [isRegLoading, setIsRegLoading] = useState(false);
  const [showRegDetail, setShowRegDetail] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<CommunityRegistration | null>(null);

  const [initialEventData, setInitialEventData] = useState<Partial<EventItem> | null>(null);

  const { toasts, showToast, removeToast } = useToast();
  const {
    events, filteredEvents,
    searchQuery, setSearchQuery,
    activeFilter, setActiveFilter,
    activeCategory, setActiveCategory,
    activePriority, setActivePriority,
    activeMonth, setActiveMonth,
    addEvent, updateEvent, deleteEvent,
    addRecurringEvents, deleteRecurringSeries,
    addTheme, updateTheme, deleteTheme,
    annualThemes,
    holidays,
    isLoading,
    error,
    refreshEvents,
  } = useEvents();
  const {
    draftEvents,
    activeDrafts,
    draftHistory,
    isLoading: isDraftLoading,
    error: draftError,
    addDraft,
    updateDraft,
    deleteDraft,
    publishDraft,
    restoreDraft,
  } = useDraftEvents(isAdmin);

  const refreshRegistrations = useCallback(async (showError = true) => {
    if (!permissions.canViewRegistrations) return;
    setIsRegLoading(true);
    try {
      const regs = await fetchCommunityRegistrations();
      setCommunityRegistrations(regs);
      setSelectedRegistration(prev => prev ? (regs.find(r => r.id === prev.id) ?? prev) : null);
    } catch {
      if (showError) {
        showToast('error', 'Gagal memuat', 'Data pendaftaran belum berhasil dimuat. Coba refresh halaman.');
      }
    } finally {
      setIsRegLoading(false);
    }
  }, [permissions.canViewRegistrations, showToast]);

  useEffect(() => {
    if (permissions.canViewRegistrations && dashboardPath === '/registrations') {
      refreshRegistrations();
    }
  }, [dashboardPath, permissions.canViewRegistrations, refreshRegistrations]);

  useEffect(() => {
    if (draftError && dashboardPath === '/drafts') {
      showToast('error', 'Gagal memuat draft', draftError);
    }
  }, [dashboardPath, draftError, showToast]);

  const handleRegDetail = useCallback((reg: CommunityRegistration) => {
    setSelectedRegistration(reg);
    setShowRegDetail(true);
  }, []);

  const handleUpdateRegStatus = useCallback(async (id: string, status: RegistrationStatus, adminNote: string) => {
    try {
      await updateRegistrationStatus(id, status, adminNote);
      await refreshRegistrations();
      showToast('success', 'Status diperbarui', `Pendaftaran berhasil diubah ke ${status}.`);
      return true;
    } catch {
      showToast('error', 'Gagal memperbarui', 'Status pendaftaran belum berubah.');
      return false;
    }
  }, [refreshRegistrations, showToast]);

  const handleCreateEventFromRegistration = useCallback((registration: CommunityRegistration) => {
    // Parse preferred date or use empty string
    const dateStr = registration.preferredDate || '';
    const dateMeta = dateStr ? (() => {
      const DAY_ID = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
      const d = parseDateStrLocal(dateStr);
      if (!d) return { day: '', tanggal: '', month: '' };
      return {
        day: DAY_ID[d.getDay()] || '',
        tanggal: `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
        month: MONTH_NAMES[d.getMonth()] || '',
      };
    })() : { day: '', tanggal: '', month: '' };
    
    // Pre-fill event data from registration (NO id → will be treated as CREATE, not UPDATE)
    const prefillData: Partial<EventItem> = {
      acara: registration.organizationName || registration.communityName,
      lokasi: '',
      eo: registration.organizationName || registration.communityName,
      pic: registration.pic,
      phone: registration.phone,
      keterangan: registration.description || '',
      dateStr,
      day: dateMeta.day,
      tanggal: dateMeta.tanggal,
      month: dateMeta.month,
      jam: '',
      categories: [],
      category: 'Umum',
      priority: 'medium',
      eventModel: 'free',
    };
    
    // Use initialData (NOT editingEvent) so handleSave calls addEvent (INSERT), not updateEvent (UPDATE)
    setInitialEventData(prefillData);
    setEditingEvent(null);
    setShowCrudModal(true);
    showToast('info', 'Buat Event', 'Form event telah diisi dengan data pendaftaran. Silakan lengkapi dan simpan.');
  }, [showToast]);

  useEffect(() => {
    fetchSiteSettings<string[]>('instagram_posts').then(posts => {
      if (posts && Array.isArray(posts)) setInstagramPosts(posts);
    }).catch(() => {});
    fetchSiteSettings<string>('hero_image').then(url => {
      if (url && typeof url === 'string') setHeroImageUrl(url);
    }).catch(() => {});
    fetchAlbums().then(setLandingAlbums).catch(() => {});
  }, []);

  const handleSaveInstagramPosts = useCallback(async (posts: string[]) => {
    try {
      await updateSiteSettings('instagram_posts', posts);
      setInstagramPosts(posts);
      showToast('success', 'Instagram diperbarui', 'Link Instagram gallery berhasil disimpan.');
      return true;
    } catch {
      showToast('error', 'Gagal menyimpan', 'Link Instagram belum tersimpan. Coba lagi.');
      return false;
    }
  }, [showToast]);

  const handleSaveHeroImage = useCallback(async (url: string) => {
    try {
      await updateSiteSettings('hero_image', url);
      setHeroImageUrl(url);
      return true;
    } catch {
      showToast('error', 'Gagal menyimpan', 'Hero image belum tersimpan. Coba lagi.');
      return false;
    }
  }, [showToast]);


  // Dark mode toggle
  const toggleDark = useCallback(() => {
    setIsDark(v => {
      const next = !v;
      document.documentElement.classList.toggle('dark', next);
      localStorage.setItem('theme', next ? 'dark' : 'light');
      return next;
    });
  }, []);

  const handleLogout = useCallback(async () => {
    await auth.logout();
    showToast('info', 'Keluar', 'Mode admin dinonaktifkan.');
  }, [auth, showToast]);

  // CRUD
  const handleAddNew = useCallback(() => {
    setEditingEvent(null);
    setInitialEventData(null);
    setShowCrudModal(true);
  }, []);

  const handleEdit = useCallback((ev: EventItem) => {
    setEditingEvent(ev);
    setShowCrudModal(true);
  }, []);

  const handleAddDraft = useCallback(() => {
    setEditingDraft(null);
    setShowDraftModal(true);
  }, []);

  const handleEditDraft = useCallback((draft: DraftEventItem) => {
    setEditingDraft(draft);
    setShowDraftModal(true);
  }, []);

  const handleOpenLetterPicker = useCallback(() => {
    setShowLetterPickerModal(true);
  }, []);

  const handleAddTheme = useCallback(() => {
    setEditingTheme(null);
    setShowThemeModal(true);
  }, []);

  const handleEditTheme = useCallback((theme: AnnualTheme) => {
    setEditingTheme(theme);
    setShowThemeModal(true);
  }, []);

  const handleSaveTheme = useCallback(async (theme: AnnualTheme) => {
    const success = theme.sheetRow
      ? await updateTheme(theme)
      : await addTheme(theme);

    if (success) {
      setShowThemeModal(false);
      setEditingTheme(null);
      showToast('success', theme.sheetRow ? 'Tema diperbarui' : 'Tema ditambahkan', 'Perubahan tema tahunan sudah tersimpan.');
      return true;
    }

    showToast('error', 'Gagal menyimpan tema', 'Perubahan tema tahunan belum berhasil disimpan.');
    return false;
  }, [addTheme, updateTheme, showToast]);

  const handleDeleteTheme = useCallback(async (theme: AnnualTheme) => {
    if (!theme.id) return;
    const confirmed = window.confirm(`Hapus tema tahunan "${theme.name}"?`);
    if (!confirmed) return;

    const success = await deleteTheme(theme.id);
    if (success) {
      showToast('success', 'Tema dihapus', `"${theme.name}" telah dihapus.`);
    } else {
      showToast('error', 'Gagal menghapus tema', 'Tema tahunan belum berhasil dihapus.');
    }
  }, [deleteTheme, showToast]);

  const handleOpenLetter = useCallback((event: EventItem) => {
    setLetterEvent(event);
    setShowLetterModal(true);
  }, []);

  const handleSelectLetterEvent = useCallback((event: EventItem) => {
    setShowLetterPickerModal(false);
    handleOpenLetter(event);
  }, [handleOpenLetter]);

  const handleDeleteClick = useCallback((ev: EventItem) => {
    setDeletingEvent(ev);
    setShowDeleteModal(true);
  }, []);

  const handleDetailClick = useCallback((ev: EventItem) => {
    setDetailEvent(ev);
    setShowDetailModal(true);
  }, []);

  const handleSave = useCallback(async (data: Partial<EventItem>) => {
    let success = false;

    if (editingEvent) {
      success = await updateEvent({ ...editingEvent, ...data } as EventItem);
      if (success) showToast('success', 'Berhasil diperbarui!', `"${data.acara}" telah diperbarui.`);
      else showToast('error', 'Gagal memperbarui', 'Perubahan belum tersimpan. Silakan coba lagi.');
    } else {
      const newEv: EventItem = {
        ...data as EventItem,
        id: createId(),
        rowIndex: events.length + 1,
        status: data.status || 'upcoming',
      };
      success = await addEvent(newEv);
      if (success) showToast('success', 'Acara ditambahkan!', `"${data.acara}" berhasil ditambahkan.`);
      else showToast('error', 'Gagal menambahkan', 'Acara belum tersimpan. Silakan periksa koneksi lalu coba lagi.');
    }

    if (success) {
      setShowCrudModal(false);
      setEditingEvent(null);
      setInitialEventData(null);
    }

    return success;
  }, [editingEvent, events.length, addEvent, updateEvent, showToast]);

  const handleSaveBatch = useCallback(async (evs: EventItem[]) => {
    const success = await addRecurringEvents(evs);
    if (success) showToast('success', 'Event reguler ditambahkan!', `${evs.length} event berhasil dibuat.`);
    else showToast('error', 'Gagal menambahkan', 'Event reguler belum tersimpan. Silakan coba lagi.');
    if (success) {
      setShowCrudModal(false);
      setEditingEvent(null);
      setInitialEventData(null);
    }
    return success;
  }, [addRecurringEvents, showToast]);

  const handleDeleteSeries = useCallback(async (groupId: string) => {
    const success = await deleteRecurringSeries(groupId);
    if (success) showToast('success', 'Rangkaian dihapus!', 'Seluruh event dalam rangkaian telah dihapus.');
    else showToast('error', 'Gagal menghapus', 'Rangkaian belum berhasil dihapus.');
    setShowDetailModal(false);
    setDetailEvent(null);
    return success;
  }, [deleteRecurringSeries, showToast]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingEvent) return false;
    const success = await deleteEvent(deletingEvent.id);
    if (success) showToast('success', 'Acara dihapus!', `"${deletingEvent.acara}" telah dihapus.`);
    setDeletingEvent(null);
    setShowDeleteModal(false);
    if (!success) showToast('error', 'Gagal menghapus', 'Acara belum berhasil dihapus.');
    return success;
  }, [deletingEvent, deleteEvent, showToast]);

  const handleSaveDraft = useCallback(async (data: Partial<DraftEventItem>) => {
    let success = false;

    if (editingDraft) {
      success = await updateDraft({ ...editingDraft, ...data } as DraftEventItem);
      if (success) showToast('success', 'Draft diperbarui', `"${data.acara}" berhasil diperbarui.`);
      else showToast('error', 'Gagal memperbarui draft', 'Perubahan draft belum tersimpan.');
    } else {
      const newDraft: DraftEventItem = {
        ...data as DraftEventItem,
        id: createId(),
        rowIndex: draftEvents.length + 1,
        progress: data.progress || 'draft',
        published: false,
        publishedAt: '',
        deleted: false,
        deletedAt: '',
      };
      success = await addDraft(newDraft);
      if (success) showToast('success', 'Draft ditambahkan', `"${data.acara}" masuk ke queue aktif.`);
      else showToast('error', 'Gagal menambahkan draft', 'Draft event belum tersimpan.');
    }

    if (success) {
      setShowDraftModal(false);
      setEditingDraft(null);
    }

    return success;
  }, [editingDraft, draftEvents.length, addDraft, updateDraft, showToast]);

  const handleDeleteDraft = useCallback(async (draft: DraftEventItem) => {
    if (!window.confirm(`Hapus draft event "${draft.acara}"?`)) return;
    const success = await deleteDraft(draft.id);
    if (success) showToast('success', 'Draft dipindahkan ke riwayat', `"${draft.acara}" ditandai sebagai dihapus.`);
    else showToast('error', 'Gagal menghapus draft', 'Draft event belum terhapus.');
  }, [deleteDraft, showToast]);

  const handlePublishDraft = useCallback(async (draft: DraftEventItem) => {
    if (draft.progress !== 'confirm') {
      showToast('warning', 'Belum bisa dipublish', 'Draft harus berstatus confirm sebelum dipublish.');
      return;
    }
    if (!window.confirm(`Publish draft event "${draft.acara}" ke schedule utama?`)) return;

    const success = await publishDraft(draft.id);
    if (success) {
      await refreshEvents();
      showToast('success', 'Draft dipublish', `"${draft.acara}" sudah masuk ke schedule utama.`);
    } else {
      showToast('error', 'Gagal publish draft', 'Publish ke schedule utama belum berhasil.');
    }
  }, [publishDraft, refreshEvents, showToast]);

  const handleDraftProgressChange = useCallback(async (draft: DraftEventItem, progress: DraftEventItem['progress']) => {
    const success = await updateDraft({ ...draft, progress });
    if (success) {
      showToast('success', 'Progress diperbarui', `Draft "${draft.acara}" sekarang berstatus ${progress}.`);
    } else {
      showToast('error', 'Gagal memperbarui progress', 'Progress draft belum berubah.');
    }
  }, [updateDraft, showToast]);

  const handleRestoreDraft = useCallback(async (draft: DraftEventItem) => {
    if (draft.published) {
      showToast('warning', 'Tidak bisa dipulihkan', 'Draft yang sudah dipublish tidak dapat dipulihkan.');
      return;
    }
    if (!window.confirm(`Pulihkan draft event "${draft.acara}" ke queue aktif?`)) return;

    const success = await restoreDraft(draft.id);
    if (success) {
      showToast('success', 'Draft dipulihkan', `"${draft.acara}" kembali ke queue aktif.`);
    } else {
      showToast('error', 'Gagal memulihkan draft', 'Draft event belum berhasil dipulihkan.');
    }
  }, [restoreDraft, showToast]);

  const handleSubmitLetter = useCallback(async (data: LetterRequestItem) => {
    try {
      await createLetterRequest(data);
      showToast('success', 'Permintaan surat dikirim', 'Data berhasil masuk ke workflow Google Form dan AutoCrat akan membuat dokumennya otomatis.');
      return true;
    } catch (error) {
      console.error('Letter request error:', error);
      showToast('error', 'Gagal mengirim surat', 'Data surat belum berhasil dikirim ke Google Form. Periksa koneksi lalu coba lagi.');
      return false;
    }
  }, [showToast]);

  const publicEvents = useMemo(() => events.filter(e => e.status !== 'draft'), [events]);
  const visibleEvents = useMemo(() => filteredEvents.filter(e => isAdmin || e.status !== 'draft'), [filteredEvents, isAdmin]);
  const ongoingEvents = useMemo(
    () => (isAdmin ? visibleEvents : publicEvents).filter(e => e.status === 'ongoing'),
    [isAdmin, visibleEvents, publicEvents]
  );
  const upcomingEvents = useMemo(
    () => (isAdmin ? visibleEvents : publicEvents).filter(e => e.status === 'upcoming'),
    [isAdmin, visibleEvents, publicEvents]
  );
  const visibleCategories = useMemo(() => {
    const source = isAdmin ? events : publicEvents;
    const normalized = source
      .flatMap(e => e.categories)
      .flatMap(category => String(category || '').split(/[|,]/))
      .map(category => category.trim())
      .filter(Boolean);
    return ['Semua', ...new Set(normalized)];
  }, [isAdmin, events, publicEvents]);
  const visibleMonths = useMemo(() => {
    const source = isAdmin ? events : publicEvents;
    return ['Semua', ...new Set(source.map(e => e.month))];
  }, [isAdmin, events, publicEvents]);
  const visibleStats = useMemo(() => {
    const source = isAdmin ? events : publicEvents;
    return {
      total: source.length,
      ongoing: source.filter(e => e.status === 'ongoing').length,
      upcoming: source.filter(e => e.status === 'upcoming').length,
      past: source.filter(e => e.status === 'past').length,
    };
  }, [isAdmin, events, publicEvents]);
  const availableViewTabs = useMemo(
    () => isAdmin ? VIEW_TABS : VIEW_TABS.filter(tab => tab.key !== 'calendar' && tab.key !== 'kanban'),
    [isAdmin]
  );
  const publicSectionItems = useMemo(
    () => [
      ...((ongoingEvents.length > 0 || upcomingEvents.length > 0) ? [{ id: 'featured', label: 'Segera Hadir' }] : []),
      { id: 'summary', label: 'Ringkasan' },
      { id: 'calendar', label: 'Kalender' },
      { id: 'views', label: 'Daftar Acara' },
      { id: 'themes', label: 'Tema Tahunan' },
    ],
    [ongoingEvents.length, upcomingEvents.length]
  );
  const allowedDashboardPaths = useMemo(() => new Set(getAllowedDashboardPaths(permissions)), [permissions]);
  const defaultDashboardPath = useMemo(() => getDefaultDashboardPath(permissions), [permissions]);
  useEffect(() => {
    if (!isAdmin && activeFilter === 'draft') {
      setActiveFilter('Semua');
    }
  }, [isAdmin, activeFilter, setActiveFilter]);

  useEffect(() => {
    if (!isAdmin && (viewMode === 'calendar' || viewMode === 'kanban')) {
      setViewMode('table');
    }
  }, [isAdmin, viewMode]);

  useEffect(() => {
    if (!isAdmin && activePriority !== 'Semua') {
      setActivePriority('Semua');
    }
  }, [isAdmin, activePriority, setActivePriority]);

  useEffect(() => {
    if (!visibleCategories.includes(activeCategory)) {
      setActiveCategory('Semua');
    }
  }, [visibleCategories, activeCategory, setActiveCategory]);

  useEffect(() => {
    if (!visibleMonths.includes(activeMonth)) {
      setActiveMonth('Semua');
    }
  }, [visibleMonths, activeMonth, setActiveMonth]);

  useEffect(() => {
    if (!location.pathname.startsWith('/dashboard')) return;
    if (isLoading) return;
    if (!permissions.canViewDashboard) {
      if (dashboardPath !== '/') {
        navigate('/dashboard', { replace: true });
      }
      return;
    }
    if (!allowedDashboardPaths.has(dashboardPath)) {
      navigate(`/dashboard${defaultDashboardPath === '/' ? '' : defaultDashboardPath}`, { replace: true });
    }
  }, [allowedDashboardPaths, dashboardPath, defaultDashboardPath, isLoading, location.pathname, navigate, permissions.canViewDashboard]);

  return (
    <Routes>
      {/* Community Landing Page — default route */}
      <Route path="/" element={
        <Suspense fallback={<DashboardSkeleton isAdmin={false} />}>
          <CommunityLandingPage
            isDark={isDark}
            onToggleDark={toggleDark}
            onBack={() => navigate('/events')}
            instagramPosts={instagramPosts}
            events={publicEvents}
            onEventDetail={handleDetailClick}
            heroImageUrl={heroImageUrl}
            albums={landingAlbums}
          />
          <Suspense fallback={null}>
            <EventDetailModal
              isOpen={showDetailModal}
              event={detailEvent}
              onClose={() => { setShowDetailModal(false); setDetailEvent(null); }}
              events={events}
            />
          </Suspense>
          <ToastContainer toasts={toasts} onRemove={removeToast} />
        </Suspense>
      } />

      {/* Public event schedule landing — no dashboard chrome */}
      <Route path="/events" element={
        <Suspense fallback={<DashboardSkeleton isAdmin={false} />}>
          <EventsLandingPage
            isDark={isDark}
            onToggleDark={toggleDark}
            events={publicEvents}
            holidays={holidays}
            albums={landingAlbums}
            isLoading={isLoading}
            onDetail={handleDetailClick}
          />
          <Suspense fallback={null}>
            <EventDetailModal
              isOpen={showDetailModal}
              event={detailEvent}
              onClose={() => { setShowDetailModal(false); setDetailEvent(null); }}
              events={events}
            />
          </Suspense>
          <ToastContainer toasts={toasts} onRemove={removeToast} />
        </Suspense>
      } />

      {/* Gallery pages */}
      <Route path="/gallery" element={
        <Suspense fallback={<DashboardSkeleton isAdmin={false} />}>
          <GalleryIndexPage isDark={isDark} onToggleDark={toggleDark} />
        </Suspense>
      } />
      <Route path="/gallery/:slug" element={
        <Suspense fallback={<DashboardSkeleton isAdmin={false} />}>
          <GalleryAlbumPage isDark={isDark} onToggleDark={toggleDark} />
        </Suspense>
      } />

      {/* Survey — standalone page */}
      <Route path="/survey/:eventId" element={
        <Suspense fallback={<DashboardSkeleton isAdmin={false} />}>
          <SurveyPage />
        </Suspense>
      } />

      {/* Public Tenant Self-Assessment — standalone, no auth required */}
      <Route path="/tenant-survey" element={
        <Suspense fallback={<DashboardSkeleton isAdmin={false} />}>
          <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
              {/* Header with logo + back button */}
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={mallLogo} alt="Metropolitan Mall Bekasi" className="h-8 w-auto" />
                  <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    Tenant Self-Assessment
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => window.history.length > 1 ? window.history.back() : window.location.assign('/')}
                  className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 transition hover:text-brand-primary-600 dark:text-slate-400 dark:hover:text-brand-primary-400"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Kembali
                </button>
              </div>

              {/* Main card */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                {/* Card header */}
                <div className="border-b border-slate-100 bg-gradient-to-r from-brand-primary-50/50 to-transparent px-6 py-5 dark:border-slate-700 dark:from-brand-primary-950/30">
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                    Evaluasi Dampak Event
                  </h1>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Pilih event di bawah untuk mengisi survei tenant dan bantu kami memahami dampak event terhadap gerai Anda.
                  </p>
                </div>

                {/* Card body */}
                <div className="px-6 py-5">
                  <TenantSurveyEventPicker />
                </div>
              </div>

              {/* Footer */}
              <p className="mt-6 text-center text-[11px] text-slate-400 dark:text-slate-500">
                &copy; {new Date().getFullYear()} Metropolitan Mall Bekasi &mdash; Metland Coloring Life
              </p>
            </div>
          </div>
        </Suspense>
      } />
      <Route path="/tenant-survey/:eventId" element={
        <Suspense fallback={<DashboardSkeleton isAdmin={false} />}>
          <TenantSurveyPublicPage />
        </Suspense>
      } />

      {/* Public Letter Viewer — shareable link */}
      <Route path="/letter/:id" element={
        <Suspense fallback={<DashboardSkeleton isAdmin={false} />}>
          <PublicLetterViewer />
        </Suspense>
      } />

      {/* Dashboard routes */}
      <Route path="/dashboard/*" element={
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Skip to main content — WCAG 2.4.1 */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-brand-primary-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:outline-none"
      >
        Lewati ke konten utama
      </a>

      {/* Admin Sidebar */}
      {isAdmin && (
        <AdminSidebar
          isDark={isDark}
          onToggleDark={toggleDark}
          onLogout={handleLogout}
          user={auth.user}
          isSuperadmin={auth.isSuperadmin}
          isLegacy={auth.isLegacy}
          permissions={permissions}
          onOpenInstagramSettings={() => setShowInstagramSettings(true)}
          onOpenAlbumManager={() => setShowAlbumManager(true)}
          onOpenLetterPicker={handleOpenLetterPicker}
        />
      )}

      {/* Main content wrapper */}
      <div className={isAdmin ? 'lg:ml-64' : ''}>
        <Navbar
          isDark={isDark}
          onToggleDark={toggleDark}
          isAdmin={isAdmin}
          isSuperadmin={auth.isSuperadmin}
          isLegacy={auth.isLegacy}
          user={auth.user}
          onLoginClick={() => setShowLoginModal(true)}
          onLogout={handleLogout}
          ongoingCount={visibleStats.ongoing}
        />

        {!isAdmin && !isLoading && <SectionNav items={publicSectionItems} />}

        {isLoading ? (
          <DashboardSkeleton isAdmin={isAdmin} />
        ) : (

        <main id="main-content" className="mx-auto max-w-7xl px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">

          {/* Header */}
          <DashboardHeader
            isAdmin={isAdmin}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onAddNew={permissions.canEditEvents ? handleAddNew : undefined}
          />

          {/* 1. Overview — Stat Cards (paling penting, pertama dilihat) */}
          {isAdmin && dashboardPath === '/' && (
            <section id="overview" className="scroll-mt-20 space-y-6">
              <DashboardStats stats={visibleStats} />
              <CommandCenterSummary
                totalEvents={visibleStats.total}
                upcomingEvents={visibleStats.upcoming}
                ongoingEvents={visibleStats.ongoing}
                activeDrafts={activeDrafts}
                annualThemes={annualThemes}
                communityRegistrations={communityRegistrations}
                permissions={permissions}
                isSuperadmin={auth.isSuperadmin}
              />
            </section>
          )}

          {/* 2. Featured Events — yang sedang/akan berlangsung */}
          {isAdmin && dashboardPath === '/' && (ongoingEvents.length > 0 || upcomingEvents.length > 0) && (
            <div className="space-y-4 sm:space-y-5">
              {ongoingEvents.length > 0 && (
                <Suspense fallback={<SectionFallback height="h-40" />}>
                  <FeaturedEvents
                    events={ongoingEvents}
                    title="Sedang Berlangsung"
                    accent="brand-primary"
                    icon={<Radio className="h-4 w-4 animate-pulse text-brand-primary-500" />}
                    onDetail={handleDetailClick}
                  />
                </Suspense>
              )}
              {upcomingEvents.length > 0 && (
                <Suspense fallback={<SectionFallback height="h-40" />}>
                  <FeaturedEvents
                    events={upcomingEvents.slice(0, 3)}
                    title="Segera Dimulai"
                    accent="amber"
                    icon={<Clock3 className="h-4 w-4 text-amber-500" />}
                    onDetail={handleDetailClick}
                  />
                </Suspense>
              )}
            </div>
          )}

          {/* 3. Draft Queue — event yang perlu di-review/publish */}
          {permissions.canEditEvents && dashboardPath === '/drafts' && (
            <section id="draft-section" className="scroll-mt-20">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Draft Queue</h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Kelola draft event sebelum dipublikasikan
                </p>
              </div>
              <Suspense fallback={<SectionFallback height="h-64" />}>
                <AdminDraftSection
                  activeDrafts={activeDrafts}
                  draftHistory={draftHistory}
                  draftError={draftError}
                  isDraftLoading={isDraftLoading}
                  showDraftHistory={showDraftHistory}
                  setShowDraftHistory={setShowDraftHistory}
                  onAddDraft={handleAddDraft}
                  onEditDraft={handleEditDraft}
                  onDeleteDraft={handleDeleteDraft}
                  onPublishDraft={handlePublishDraft}
                  onDraftProgressChange={handleDraftProgressChange}
                  onRestoreDraft={handleRestoreDraft}
                />
              </Suspense>
            </section>
          )}

          {/* 4. Community Registrations — pendaftaran masuk */}
          {permissions.canViewRegistrations && dashboardPath === '/registrations' && (
            <section id="registrations" className="scroll-mt-20">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pendaftaran Community</h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Kelola permintaan pendaftaran dari community
                </p>
              </div>
              <Suspense fallback={<SectionFallback height="h-40" />}>
                <CommunityRegistrationSection
                  registrations={communityRegistrations}
                  isLoading={isRegLoading}
                  onDetail={handleRegDetail}
                />
              </Suspense>
            </section>
          )}

          {/* 5. Tema Tahunan — perencanaan jangka panjang */}
          {permissions.canManageThemes && dashboardPath === '/themes' && (
            <section id="themes" className="scroll-mt-20">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tema Tahunan</h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Kelola tema dan perencanaan tahunan
                </p>
              </div>
              <Suspense fallback={<SectionFallback height="h-40" />}>
                <QuarterTimeline themes={annualThemes} isAdmin onAddTheme={permissions.canManageThemes ? handleAddTheme : undefined} onEditTheme={permissions.canManageThemes ? handleEditTheme : undefined} onDeleteTheme={permissions.canManageThemes ? handleDeleteTheme : undefined} />
              </Suspense>
            </section>
          )}

        {/* Public: 1. Featured Events — sedang berlangsung / segera dimulai */}
        {!isAdmin && (ongoingEvents.length > 0 || upcomingEvents.length > 0) && (
          <section id="featured" className="space-y-4 scroll-mt-32 sm:space-y-5">
            {ongoingEvents.length > 0 && (
              <Suspense fallback={<SectionFallback height="h-40" />}>
                <FeaturedEvents
                  events={ongoingEvents}
                  title="Sedang Berlangsung"
                  accent="brand-primary"
                  icon={<Radio className="h-4 w-4 animate-pulse text-brand-primary-500" />}
                  onDetail={handleDetailClick}
                />
              </Suspense>
            )}
            {upcomingEvents.length > 0 && (
              <Suspense fallback={<SectionFallback height="h-40" />}>
                <FeaturedEvents
                  events={upcomingEvents.slice(0, 3)}
                  title="Segera Dimulai"
                  accent="amber"
                  icon={<Clock3 className="h-4 w-4 text-amber-500" />}
                  onDetail={handleDetailClick}
                />
              </Suspense>
            )}
          </section>
        )}

        {/* Public: 2. Ringkasan — stat cards */}
        {!isAdmin && (
          <section id="summary" className="scroll-mt-32">
            <DashboardStats stats={visibleStats} />
          </section>
        )}

        {/* Public: 3. Kalender Event */}
        {!isAdmin && (
          <section id="calendar" className="space-y-3 scroll-mt-32">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Kalender Event</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Lihat semua event publik dalam tampilan kalender.</p>
            </div>
            <Suspense fallback={<SectionFallback height="h-[28rem]" />}>
              <CalendarView events={publicEvents} holidays={holidays} onDetail={handleDetailClick} />
            </Suspense>
          </section>
        )}

        {/* 6. Jadwal Event — tabel/kalender/kanban/timeline */}
        {((isAdmin && dashboardPath === '/events') || (!isAdmin && dashboardPath === '/')) && (
        <section id="views" className="scroll-mt-20">
          {isAdmin && (
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Jadwal Event</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Kelola semua event dalam berbagai tampilan
              </p>
            </div>
          )}
          <Suspense fallback={<SectionFallback height="h-80" />}>
            <DashboardViewsSection
              viewMode={viewMode}
              availableViewTabs={availableViewTabs}
              setViewMode={setViewMode}
              isAdmin={isAdmin}
              visibleEvents={visibleEvents}
              visibleStats={{ total: visibleStats.total }}
              holidays={holidays}
              error={error}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              activeFilter={activeFilter}
              setActiveFilter={setActiveFilter}
              activeCategory={activeCategory}
              setActiveCategory={setActiveCategory}
              activePriority={activePriority}
              setActivePriority={setActivePriority}
              activeMonth={activeMonth}
              setActiveMonth={setActiveMonth}
              visibleCategories={visibleCategories}
              visibleMonths={visibleMonths}
              onEdit={permissions.canEditEvents ? handleEdit : undefined}
              onDelete={permissions.canDeleteEvents ? handleDeleteClick : undefined}
              onDetail={handleDetailClick}
            />
          </Suspense>
        </section>
        )}

        {/* 7. Analytics — statistik lanjutan */}
          {permissions.canViewSurvey && dashboardPath === '/analytics' && (
            <section id="category-chart" className="scroll-mt-20">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Analytics</h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Analisis tren dan statistik event
                </p>
              </div>
              <Suspense fallback={<SectionFallback height="h-80" />}>
                <AnalyticsDashboard events={events} />
              </Suspense>
            </section>
          )}

        {/* 8. Survey Kepuasan — admin only */}
        {permissions.canViewSurvey && dashboardPath === '/survey' && (
          <section id="survey-section" className="scroll-mt-20">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Survey Kepuasan</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Kelola survey dan feedback dari peserta event
              </p>
            </div>
            <Suspense fallback={<SectionFallback height="h-48" />}>
              <SurveyDashboard events={events.map(e => ({ id: e.id, acara: e.acara, status: e.status }))} />
            </Suspense>
          </section>
        )}

        {/* 8b. Tenant Self-Assessment — admin + eo_tenant */}
        {(isAdmin || permissions.isEoTenant) && dashboardPath === '/tenant-surveys' && (
          <section id="tenant-surveys-section" className="scroll-mt-20">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tenant Self-Assessment</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Evaluasi mandiri dari EO/Tenant untuk setiap event yang telah dilaksanakan
              </p>
            </div>
            <Suspense fallback={<SectionFallback height="h-48" />}>
              <TenantSurveyPage events={events} isAdmin={isAdmin} />
            </Suspense>
          </section>
        )}

        {/* 9. User Management — superadmin only */}
        {permissions.canManageUsers && dashboardPath === '/users' && (
          <section id="user-management" className="scroll-mt-20">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">User Management</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Kelola user dan permission (Superadmin only)
              </p>
            </div>
            <Suspense fallback={<SectionFallback height="h-48" />}>
              <UserManagement />
            </Suspense>
          </section>
        )}

        {/* 10. Activity Log — admin + superadmin */}
        {permissions.canViewActivityLog && dashboardPath === '/activity-log' && (
          <section id="activity-log" className="scroll-mt-20">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Activity Log</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Audit trail dari semua aktivitas sistem
              </p>
            </div>
            <Suspense fallback={<SectionFallback height="h-48" />}>
              <ActivityLog />
            </Suspense>
          </section>
        )}

        {/* Public: 5. Tema Tahunan — paling bawah */}
        {!isAdmin && (
          <section id="themes" className="scroll-mt-32">
            <Suspense fallback={<SectionFallback height="h-40" />}>
              <QuarterTimeline themes={annualThemes} />
            </Suspense>
          </section>
        )}

          {/* Footer */}
          <footer className="border-t border-slate-200 pt-4 sm:pt-6 pb-4 dark:border-slate-800">
            <div className="flex flex-col items-center justify-between gap-2 text-center text-xs text-slate-400 sm:flex-row sm:text-left">
              <p>&copy; {new Date().getFullYear()} Metropolitan Mall Bekasi</p>
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end sm:gap-3">
                <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-primary-500 live-dot" aria-hidden="true" />
                    <span>{visibleStats.ongoing} berlangsung</span>
                  </span>
                <span className="hidden sm:inline">·</span>
                <span>{visibleStats.upcoming} mendatang</span>
              </div>
            </div>
          </footer>
        </main>
        )}


      </div>

      {/* Modals */}
      <DashboardModals
        showLoginModal={showLoginModal}
        onCloseLoginModal={() => setShowLoginModal(false)}
        onEmailLogin={auth.login}
        onLegacyLogin={auth.legacyLogin}
        showCrudModal={showCrudModal}
        onCloseCrudModal={() => { setShowCrudModal(false); setEditingEvent(null); setInitialEventData(null); }}
        onSave={handleSave}
        onSaveBatch={handleSaveBatch}
        editingEvent={editingEvent}
        events={events}
        showDraftModal={showDraftModal}
        onCloseDraftModal={() => { setShowDraftModal(false); setEditingDraft(null); }}
        onSaveDraft={handleSaveDraft}
        editingDraft={editingDraft}
        draftEvents={draftEvents}
        showLetterPickerModal={showLetterPickerModal}
        onCloseLetterPickerModal={() => setShowLetterPickerModal(false)}
        publicEvents={publicEvents}
        onSelectLetterEvent={handleSelectLetterEvent}
        showLetterModal={showLetterModal}
        onCloseLetterModal={() => { setShowLetterModal(false); setLetterEvent(null); }}
        letterEvent={letterEvent}
        showThemeModal={showThemeModal}
        onCloseThemeModal={() => { setShowThemeModal(false); setEditingTheme(null); }}
        onSaveTheme={handleSaveTheme}
        editingTheme={editingTheme}
        showDeleteModal={showDeleteModal}
        onCloseDeleteModal={() => { setShowDeleteModal(false); setDeletingEvent(null); }}
        deletingEvent={deletingEvent}
        onDeleteConfirm={handleDeleteConfirm}
        showDetailModal={showDetailModal}
        onCloseDetailModal={() => { setShowDetailModal(false); setDetailEvent(null); }}
        detailEvent={detailEvent}
        onEdit={permissions.canEditEvents ? handleEdit : undefined}
        onDelete={permissions.canDeleteEvents ? handleDeleteClick : undefined}
        onDeleteSeries={permissions.canDeleteEvents ? handleDeleteSeries : undefined}
        isAdmin={isAdmin}
        showInstagramSettings={showInstagramSettings}
        onCloseInstagramSettings={() => setShowInstagramSettings(false)}
        instagramPosts={instagramPosts}
        onSaveInstagramPosts={handleSaveInstagramPosts}
        heroImageUrl={heroImageUrl}
        onSaveHeroImage={handleSaveHeroImage}
        showAlbumManager={showAlbumManager}
        onCloseAlbumManager={() => setShowAlbumManager(false)}
        pastEvents={events.filter(e => e.status === 'past')}
        annualThemes={annualThemes}
        showRegDetail={showRegDetail}
        onCloseRegDetail={() => { setShowRegDetail(false); setSelectedRegistration(null); }}
        selectedRegistration={selectedRegistration}
        onUpdateRegStatus={handleUpdateRegStatus}
        onCreateEventFromRegistration={handleCreateEventFromRegistration}
        initialEventData={initialEventData}
      />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
      } />
    </Routes>
  );
}
