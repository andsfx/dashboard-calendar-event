import { useState, useCallback, useEffect, useMemo, Suspense, lazy } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { CalendarDays, List, Kanban, Clock4, Radio, Clock3, CheckCircle2, ShieldCheck, FileText, Plus, Settings } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { StatCard } from './components/StatCard';
import { SearchBar } from './components/SearchBar';
import { AdminLoginModal } from './components/AdminLoginModal';
import { DashboardSkeleton } from './components/DashboardSkeleton';
import { SectionNav } from './components/SectionNav';
import { ToastContainer } from './components/ToastContainer';
import { useEvents } from './hooks/useEvents';
import { useDraftEvents } from './hooks/useDraftEvents';
import { useToast } from './hooks/useToast';
import { DraftEventItem, EventItem, LetterRequestItem, ViewMode, AnnualTheme } from './types';
import { createId } from './utils/eventUtils';
import { createLetterRequest, createDraftEvent, fetchSiteSettings, updateSiteSettings } from './utils/supabaseApi';
import type { PublicEventRequestPayload } from './components/PublicLandingPage';

const CommunityLandingPage = lazy(() => import('./components/CommunityLandingPage').then(m => ({ default: m.CommunityLandingPage })));
const InstagramSettingsModal = lazy(() => import('./components/InstagramSettingsModal').then(m => ({ default: m.InstagramSettingsModal })));

const VIEW_TABS: Array<{ key: ViewMode; label: string; icon: React.ReactNode }> = [
  { key: 'table',    label: 'Tabel',    icon: <List    className="h-3.5 w-3.5" /> },
  { key: 'calendar', label: 'Kalender', icon: <CalendarDays className="h-3.5 w-3.5" /> },
  { key: 'kanban',   label: 'Kanban',   icon: <Kanban  className="h-3.5 w-3.5" /> },
  { key: 'timeline', label: 'Timeline', icon: <Clock4  className="h-3.5 w-3.5" /> },
];

const FeaturedEvents = lazy(() => import('./components/FeaturedEvents').then(m => ({ default: m.FeaturedEvents })));
const QuarterTimeline = lazy(() => import('./components/QuarterTimeline').then(m => ({ default: m.QuarterTimeline })));
const CategoryChart = lazy(() => import('./components/CategoryChart').then(m => ({ default: m.CategoryChart })));
const CalendarView = lazy(() => import('./components/CalendarView').then(m => ({ default: m.CalendarView })));
const EventCrudModal = lazy(() => import('./components/EventCrudModal').then(m => ({ default: m.EventCrudModal })));
const EventDetailModal = lazy(() => import('./components/EventDetailModal').then(m => ({ default: m.EventDetailModal })));
const DeleteConfirmModal = lazy(() => import('./components/DeleteConfirmModal').then(m => ({ default: m.DeleteConfirmModal })));
const DraftCrudModal = lazy(() => import('./components/DraftCrudModal').then(m => ({ default: m.DraftCrudModal })));
const DraftLetterModal = lazy(() => import('./components/DraftLetterModal').then(m => ({ default: m.DraftLetterModal })));
const EventLetterPickerModal = lazy(() => import('./components/EventLetterPickerModal').then(m => ({ default: m.EventLetterPickerModal })));
const AnnualThemeCrudModal = lazy(() => import('./components/AnnualThemeCrudModal').then(m => ({ default: m.AnnualThemeCrudModal })));
const AdminDraftSection = lazy(() => import('./components/AdminDraftSection').then(m => ({ default: m.AdminDraftSection })));
const DashboardViewsSection = lazy(() => import('./components/DashboardViewsSection').then(m => ({ default: m.DashboardViewsSection })));

function SectionFallback({ height = 'h-32' }: { height?: string }) {
  return <div className={`animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800 ${height}`} />;
}

export default function App() {
  const navigate = useNavigate();

  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = saved ? saved === 'dark' : prefersDark;
    if (dark) document.documentElement.classList.add('dark');
    return dark;
  });
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [isAdmin, setIsAdmin] = useState(false);
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
  const [letterInitialData, setLetterInitialData] = useState<Partial<LetterRequestItem> | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<EventItem | null>(null);
  const [detailEvent, setDetailEvent] = useState<EventItem | null>(null);
  const [showInstagramSettings, setShowInstagramSettings] = useState(false);
  const [instagramPosts, setInstagramPosts] = useState<string[]>([]);

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

  // Fetch Instagram posts from site settings
  useEffect(() => {
    fetchSiteSettings<string[]>('instagram_posts').then(posts => {
      if (posts && Array.isArray(posts)) setInstagramPosts(posts);
    }).catch(() => {});
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

  // Dark mode toggle
  const toggleDark = useCallback(() => {
    setIsDark(v => {
      const next = !v;
      document.documentElement.classList.toggle('dark', next);
      localStorage.setItem('theme', next ? 'dark' : 'light');
      return next;
    });
  }, []);

  const handleLogin = useCallback(async (pw: string) => {
    try {
      const response = await fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: pw }),
      });

      const contentType = response.headers.get('content-type') || '';
      let result: { success?: boolean; error?: string } | null = null;

      if (contentType.includes('application/json')) {
        result = await response.json();
      } else {
        const text = await response.text();
        console.error('Admin login returned non-JSON response:', text);
      }

      if (response.ok && result?.success) {
        setIsAdmin(true);
        return { ok: true };
      }

      if (response.status === 401) {
        return { ok: false, error: result?.error || 'Password salah. Coba lagi.' };
      }

      showToast('error', 'Login admin gagal', result?.error || 'Server auth sedang bermasalah. Periksa konfigurasi API admin lalu coba lagi.');
      return { ok: false, error: 'Server auth error. Coba lagi sebentar.' };
    } catch (error) {
      console.error('Admin login error:', error);
      showToast('error', 'Login admin gagal', 'Permintaan login tidak berhasil diproses. Cek server lokal Anda lalu coba lagi.');
      return { ok: false, error: 'Server auth error. Coba lagi sebentar.' };
    }
  }, [showToast]);

  const handleLogout = useCallback(() => {
    fetch('/api/admin-logout', {
      method: 'POST',
      credentials: 'include',
    }).catch(error => console.error('Admin logout error:', error)).finally(() => {
      setIsAdmin(false);
      showToast('info', 'Keluar', 'Mode admin dinonaktifkan.');
    });
  }, [showToast]);

  // CRUD
  const handleAddNew = useCallback(() => {
    setEditingEvent(null);
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

  const handleOpenLetter = useCallback((initialData: Partial<LetterRequestItem>) => {
    setLetterInitialData(initialData);
    setShowLetterModal(true);
  }, []);

  const handleSelectLetterEvent = useCallback((event: EventItem) => {
    setShowLetterPickerModal(false);
    handleOpenLetter({
      namaEO: event.eo || '',
      penanggungJawab: event.pic || '',
      namaEvent: event.acara || '',
      lokasi: event.lokasi || '',
      hariTanggalPelaksanaan: `${event.day}, ${event.tanggal}`,
      waktuPelaksanaan: event.jam || '',
      nomorTelepon: event.phone || '',
    });
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

  const handlePublicSubmitRequest = useCallback(async (payload: PublicEventRequestPayload) => {
    try {
      await createDraftEvent({
        acara: payload.acara,
        dateStr: payload.dateStr,
        tanggal: '',
        day: '',
        jam: payload.jam,
        lokasi: payload.lokasi,
        eo: payload.eo,
        pic: payload.pic,
        phone: payload.phone,
        keterangan: payload.keterangan,
        internalNote: '',
        month: '',
        category: payload.categories[0] || 'Umum',
        categories: payload.categories,
        priority: 'medium',
        eventModel: payload.eventModel,
        eventNominal: payload.eventNominal,
        eventModelNotes: payload.eventModelNotes,
        progress: 'draft',
      }, 'public');
      showToast('success', 'Pengajuan terkirim', 'Tim mall akan meninjau pengajuan event Anda.');
      return true;
    } catch {
      showToast('error', 'Gagal mengirim', 'Pengajuan belum terkirim. Coba lagi.');
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
      { id: 'calendar', label: 'Kalender' },
      { id: 'views', label: 'Daftar Acara' },
      { id: 'summary', label: 'Ringkasan' },
      { id: 'themes', label: 'Tema Tahunan' },
    ],
    [ongoingEvents.length, upcomingEvents.length]
  );
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

  return (
    <Routes>
      {/* Community Landing Page — default route */}
      <Route path="/" element={
        <Suspense fallback={<DashboardSkeleton isAdmin={false} />}>
          <CommunityLandingPage
            isDark={isDark}
            onToggleDark={toggleDark}
            onBack={() => navigate('/dashboard')}
            instagramPosts={instagramPosts}
            events={publicEvents}
            onEventDetail={handleDetailClick}
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

      {/* Dashboard — event schedule */}
      <Route path="/dashboard" element={
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <Navbar
        isDark={isDark}
        onToggleDark={toggleDark}
        isAdmin={isAdmin}
        onLoginClick={() => setShowLoginModal(true)}
        onLogout={handleLogout}
        ongoingCount={visibleStats.ongoing}
      />

      {!isAdmin && !isLoading && <SectionNav items={publicSectionItems} />}

      {isLoading ? (
        <DashboardSkeleton isAdmin={isAdmin} />
      ) : (

      <main className="mx-auto max-w-7xl px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              {isAdmin ? 'Dashboard Event' : 'Jadwal Event'}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {isAdmin ? 'Pantau & kelola semua acara' : 'Jadwal acara publik Metropolitan Mall Bekasi'}
            </p>
          </div>
          {isAdmin && (
            <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
              <div className="w-full sm:w-[320px]">
                <SearchBar value={searchQuery} onChange={setSearchQuery} />
              </div>
              <button
                onClick={() => setShowInstagramSettings(true)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:focus-visible:ring-offset-slate-950 shrink-0"
                title="Instagram Gallery Settings"
              >
                <Settings className="h-4 w-4" />
              </button>
              <button
                onClick={handleOpenLetterPicker}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 shadow-sm transition hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 dark:border-violet-800/50 dark:bg-violet-900/20 dark:text-violet-300 dark:hover:bg-violet-900/30 dark:focus-visible:ring-offset-slate-950 shrink-0"
              >
                <FileText className="h-4 w-4" /> <span>Buat Surat</span>
              </button>
              <button
                onClick={handleAddNew}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200 transition hover:from-violet-700 hover:to-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 dark:shadow-violet-900/30 dark:focus-visible:ring-offset-slate-950 shrink-0"
              >
                <Plus className="h-4 w-4" /> <span>Tambah</span>
              </button>
            </div>
          )}
        </div>

        {/* Admin Banner */}
        {isAdmin && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 dark:border-violet-800/50 dark:bg-violet-900/20">
            <ShieldCheck className="h-5 w-5 shrink-0 text-violet-600 dark:text-violet-300" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-violet-800 dark:text-violet-300">Mode Admin Aktif</p>
              <p className="text-xs text-violet-600 dark:text-violet-400">Bisa tambah, edit, hapus acara</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-xl border border-violet-300 px-3 py-1.5 text-xs font-medium text-violet-700 transition hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 dark:border-violet-700 dark:text-violet-300 dark:hover:bg-violet-900/40 dark:focus-visible:ring-offset-slate-950"
            >
              Keluar
            </button>
          </div>
        )}

        {isAdmin && (
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
        )}

        {/* Stat Cards -- admin only at top position */}
        {isAdmin && (
          <section id="summary" className="scroll-mt-32">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <StatCard
              icon={<CalendarDays className="h-5 w-5 text-white" />}
              label="Total Acara"
              value={visibleStats.total}
              subtitle="keseluruhan"
              gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            />
            <StatCard
              icon={<Radio className="h-5 w-5 text-white" />}
              label="Sedang Berlangsung"
              value={visibleStats.ongoing}
              subtitle="sedang aktif"
              gradient="linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
              pulse
            />
            <StatCard
              icon={<Clock3 className="h-5 w-5 text-white" />}
              label="Akan Datang"
              value={visibleStats.upcoming}
              subtitle="akan datang"
              gradient="linear-gradient(135deg, #f093fb 0%, #f5a623 100%)"
            />
            <StatCard
              icon={<CheckCircle2 className="h-5 w-5 text-white" />}
              label="Selesai"
              value={visibleStats.past}
              subtitle="telah berlangsung"
              gradient="linear-gradient(135deg, #4facfe 0%, #6c757d 100%)"
            />
            </div>
          </section>
        )}

        {/* Quarter Timeline */}
        {isAdmin && (
          <Suspense fallback={<SectionFallback height="h-40" />}>
            <QuarterTimeline themes={annualThemes} isAdmin onAddTheme={handleAddTheme} onEditTheme={handleEditTheme} onDeleteTheme={handleDeleteTheme} />
          </Suspense>
        )}

        {/* Featured ongoing & upcoming */}
        {isAdmin && (ongoingEvents.length > 0 || upcomingEvents.length > 0) && (
          <div className="space-y-4 sm:space-y-5">
            <Suspense fallback={<SectionFallback height="h-40" />}>
              <FeaturedEvents
                events={ongoingEvents}
                title="Sedang Berlangsung"
                accent="emerald"
                icon={<Radio className="h-4 w-4 animate-pulse text-emerald-500" />}
                onDetail={handleDetailClick}
              />
            </Suspense>
            <Suspense fallback={<SectionFallback height="h-40" />}>
              <FeaturedEvents
                events={upcomingEvents.slice(0, 3)}
                title="Segera Dimulai"
                accent="amber"
                icon={<Clock3 className="h-4 w-4 text-amber-500" />}
                onDetail={handleDetailClick}
              />
            </Suspense>
          </div>
        )}

        {/* Featured for public -- ongoing + upcoming */}
        {!isAdmin && (ongoingEvents.length > 0 || upcomingEvents.length > 0) && (
          <section id="featured" className="space-y-4 scroll-mt-32 sm:space-y-5">
            {ongoingEvents.length > 0 && (
              <Suspense fallback={<SectionFallback height="h-40" />}>
                <FeaturedEvents
                  events={ongoingEvents}
                  title="Sedang Berlangsung"
                  accent="emerald"
                  icon={<Radio className="h-4 w-4 animate-pulse text-emerald-500" />}
                  onDetail={handleDetailClick}
                />
              </Suspense>
            )}
            <Suspense fallback={<SectionFallback height="h-40" />}>
              <FeaturedEvents
                events={upcomingEvents.slice(0, 3)}
                title="Segera Dimulai"
                accent="amber"
                icon={<Clock3 className="h-4 w-4 text-amber-500" />}
                onDetail={handleDetailClick}
              />
            </Suspense>
          </section>
        )}

        {/* Public Calendar */}
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

        {/* Category chart */}
        {isAdmin && (
          <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <Suspense fallback={<SectionFallback height="h-48" />}>
              <CategoryChart events={events} />
            </Suspense>
          </div>
        )}

        <section id="views" className="scroll-mt-32">
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
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
              onDetail={handleDetailClick}
            />
          </Suspense>
        </section>

        {/* Stat Cards -- public at bottom position */}
        {!isAdmin && (
          <section id="summary" className="scroll-mt-32">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <StatCard
              icon={<CalendarDays className="h-5 w-5 text-white" />}
              label="Total Acara"
              value={visibleStats.total}
              subtitle="acara terjadwal"
              gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            />
            <StatCard
              icon={<Radio className="h-5 w-5 text-white" />}
              label="Sedang Berlangsung"
              value={visibleStats.ongoing}
              subtitle="bisa dikunjungi sekarang"
              gradient="linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
              pulse
            />
            <StatCard
              icon={<Clock3 className="h-5 w-5 text-white" />}
              label="Akan Datang"
              value={visibleStats.upcoming}
              subtitle="jadwal berikutnya"
              gradient="linear-gradient(135deg, #f093fb 0%, #f5a623 100%)"
            />
            <StatCard
              icon={<CheckCircle2 className="h-5 w-5 text-white" />}
              label="Sudah Selesai"
              value={visibleStats.past}
              subtitle="arsip kegiatan"
              gradient="linear-gradient(135deg, #4facfe 0%, #6c757d 100%)"
            />
            </div>
          </section>
        )}

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
            <p>(c) {new Date().getFullYear()} Metropolitan Mall Bekasi</p>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end sm:gap-3">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 live-dot" />
                <span>{visibleStats.ongoing} berlangsung</span>
              </span>
              <span className="hidden sm:inline">·</span>
              <span>{visibleStats.upcoming} mendatang</span>
            </div>
          </div>
        </footer>
      </main>
      )}

      {/* Modals */}
      <AdminLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={handleLogin}
      />
      <Suspense fallback={null}>
        <EventCrudModal
          isOpen={showCrudModal}
          onClose={() => { setShowCrudModal(false); setEditingEvent(null); }}
          onSave={handleSave}
          onSaveBatch={handleSaveBatch}
          editingEvent={editingEvent}
          events={events}
        />
        <DraftCrudModal
          isOpen={showDraftModal}
          onClose={() => { setShowDraftModal(false); setEditingDraft(null); }}
          onSave={handleSaveDraft}
          editingDraft={editingDraft}
          events={events}
          draftEvents={draftEvents}
        />
        <EventLetterPickerModal
          isOpen={showLetterPickerModal}
          onClose={() => setShowLetterPickerModal(false)}
          events={publicEvents}
          onSelect={handleSelectLetterEvent}
        />
        <DraftLetterModal
          isOpen={showLetterModal}
          onClose={() => { setShowLetterModal(false); setLetterInitialData(null); }}
          initialData={letterInitialData}
          onSubmit={handleSubmitLetter}
        />
        <AnnualThemeCrudModal
          isOpen={showThemeModal}
          onClose={() => { setShowThemeModal(false); setEditingTheme(null); }}
          onSave={handleSaveTheme}
          editingTheme={editingTheme}
        />
        <DeleteConfirmModal
          isOpen={showDeleteModal}
          event={deletingEvent}
          onClose={() => { setShowDeleteModal(false); setDeletingEvent(null); }}
          onConfirm={handleDeleteConfirm}
        />
        <EventDetailModal
          isOpen={showDetailModal}
          event={detailEvent}
          onClose={() => { setShowDetailModal(false); setDetailEvent(null); }}
          onEdit={isAdmin ? handleEdit : undefined}
          onDelete={isAdmin ? handleDeleteClick : undefined}
          onDeleteSeries={isAdmin ? handleDeleteSeries : undefined}
          events={events}
          isAdmin={isAdmin}
        />
        <InstagramSettingsModal
          isOpen={showInstagramSettings}
          onClose={() => setShowInstagramSettings(false)}
          posts={instagramPosts}
          onSave={handleSaveInstagramPosts}
        />
      </Suspense>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
      } />
    </Routes>
  );
}
