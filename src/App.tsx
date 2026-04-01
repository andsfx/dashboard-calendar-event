import { useState, useCallback, useEffect, useMemo } from 'react';
import { CalendarDays, List, Kanban, Clock4, Plus, RefreshCw, Radio, Clock3, CheckCircle2, SearchX, ShieldCheck, Archive, ChevronDown, ChevronUp, ClipboardList, FileText } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { StatCard } from './components/StatCard';
import { SearchBar } from './components/SearchBar';
import { FilterBar } from './components/FilterBar';
import { FeaturedEvents } from './components/FeaturedEvents';
import { QuarterTimeline } from './components/QuarterTimeline';
import { CategoryChart } from './components/CategoryChart';
import { EventTable } from './components/EventTable';
import { CalendarView } from './components/CalendarView';
import { KanbanView } from './components/KanbanView';
import { TimelineView } from './components/TimelineView';
import { AdminLoginModal } from './components/AdminLoginModal';
import { EventCrudModal } from './components/EventCrudModal';
import { EventDetailModal } from './components/EventDetailModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { DraftCrudModal } from './components/DraftCrudModal';
import { DraftLetterModal } from './components/DraftLetterModal';
import { DraftQueueTable } from './components/DraftQueueTable';
import { EventLetterPickerModal } from './components/EventLetterPickerModal';
import { DraftHistoryTable } from './components/DraftHistoryTable';
import { DashboardSkeleton } from './components/DashboardSkeleton';
import { SectionNav } from './components/SectionNav';
import { ToastContainer } from './components/ToastContainer';
import { useEvents } from './hooks/useEvents';
import { useDraftEvents } from './hooks/useDraftEvents';
import { useToast } from './hooks/useToast';
import { annualThemes as mockThemes } from './data/mockEvents';
import { DraftEventItem, EventItem, LetterRequestItem, ViewMode } from './types';
import { createId } from './utils/eventUtils';
import { createLetterRequest } from './utils/sheetsApi';

const VIEW_TABS: Array<{ key: ViewMode; label: string; icon: React.ReactNode }> = [
  { key: 'table',    label: 'Tabel',    icon: <List    className="h-3.5 w-3.5" /> },
  { key: 'calendar', label: 'Kalender', icon: <CalendarDays className="h-3.5 w-3.5" /> },
  { key: 'kanban',   label: 'Kanban',   icon: <Kanban  className="h-3.5 w-3.5" /> },
  { key: 'timeline', label: 'Timeline', icon: <Clock4  className="h-3.5 w-3.5" /> },
];

export default function App() {
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
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [editingDraft, setEditingDraft] = useState<DraftEventItem | null>(null);
  const [letterInitialData, setLetterInitialData] = useState<Partial<LetterRequestItem> | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<EventItem | null>(null);
  const [detailEvent, setDetailEvent] = useState<EventItem | null>(null);

  const { toasts, showToast, removeToast } = useToast();
  const {
    events, filteredEvents,
    searchQuery, setSearchQuery,
    activeFilter, setActiveFilter,
    activeCategory, setActiveCategory,
    activePriority, setActivePriority,
    activeMonth, setActiveMonth,
    addEvent, updateEvent, deleteEvent,
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
  } = useDraftEvents();

  // Dark mode toggle
  const toggleDark = useCallback(() => {
    setIsDark(v => {
      const next = !v;
      document.documentElement.classList.toggle('dark', next);
      localStorage.setItem('theme', next ? 'dark' : 'light');
      return next;
    });
  }, []);

  // Admin login - use env variable for password
  const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123';
  
  const handleLogin = useCallback((pw: string) => {
    if (pw === ADMIN_PASSWORD) { setIsAdmin(true); return true; }
    return false;
  }, []);

  const handleLogout = useCallback(() => {
    setIsAdmin(false);
    showToast('info', 'Keluar', 'Mode admin dinonaktifkan.');
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
  const ongoingEvents  = visibleEvents.filter(e => e.status === 'ongoing');
  const upcomingEvents = visibleEvents.filter(e => e.status === 'upcoming');
  const visibleCategories = useMemo(() => {
    const source = isAdmin ? events : publicEvents;
    return ['Semua', ...new Set(source.flatMap(e => e.categories))];
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
    () => isAdmin ? VIEW_TABS : VIEW_TABS.filter(tab => tab.key !== 'calendar'),
    [isAdmin]
  );
  const publicSectionItems = useMemo(
    () => [
      { id: 'summary', label: 'Overview' },
      ...(upcomingEvents.length > 0 ? [{ id: 'featured', label: 'Coming Soon' }] : []),
      { id: 'calendar', label: 'Calendar' },
      { id: 'views', label: 'Events' },
      { id: 'themes', label: 'Annual Theme' },
    ],
    [upcomingEvents.length]
  );

  useEffect(() => {
    if (!isAdmin && activeFilter === 'draft') {
      setActiveFilter('Semua');
    }
  }, [isAdmin, activeFilter, setActiveFilter]);

  useEffect(() => {
    if (!isAdmin && viewMode === 'calendar') {
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
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300`}>
      {/* Navbar */}
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
              Dashboard Event
            </h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Pantau & kelola semua acara
            </p>
          </div>
          <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="w-full sm:w-[320px]">
              <SearchBar value={searchQuery} onChange={setSearchQuery} />
            </div>
            {isAdmin && (
              <>
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
              </>
            )}
          </div>
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
          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">Queue Aktif Draft Event</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Antrian event yang masih diproses</p>
                </div>
              </div>
              <button
                onClick={handleAddDraft}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200 transition hover:from-violet-700 hover:to-indigo-700 dark:shadow-violet-900/30"
              >
                <Plus className="h-4 w-4" /> Tambah Draft Event
              </button>
            </div>

            {draftError && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-300">
                {draftError}
              </div>
            )}

            {isDraftLoading ? (
              <div className="space-y-3 animate-pulse">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 rounded-xl bg-slate-200 dark:bg-slate-700" />
                ))}
              </div>
            ) : (
              <DraftQueueTable
                drafts={activeDrafts}
                onEdit={handleEditDraft}
                onDelete={handleDeleteDraft}
                onPublish={handlePublishDraft}
                onProgressChange={handleDraftProgressChange}
              />
            )}

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <button
                onClick={() => setShowDraftHistory(v => !v)}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    <Archive className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-white">Riwayat Draft Event</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Event yang dibatalkan atau sudah dipublikasikan</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span>{draftHistory.length} item</span>
                  {showDraftHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </button>

              {showDraftHistory && (
                <div className="mt-4">
                  <DraftHistoryTable drafts={draftHistory} onRestore={handleRestoreDraft} />
                </div>
              )}
            </div>
          </section>
        )}

        {/* Stat Cards */}
        <section id="summary" className="scroll-mt-32">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <StatCard
            icon={<CalendarDays className="h-5 w-5 text-white" />}
            label={isAdmin ? 'Total Acara' : 'Total Event'}
            value={visibleStats.total}
            subtitle={isAdmin ? 'keseluruhan' : 'semua event'}
            gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
          />
          <StatCard
            icon={<Radio className="h-5 w-5 text-white" />}
            label="Sedang Berlangsung"
            value={visibleStats.ongoing}
            subtitle={isAdmin ? 'sedang aktif' : 'bisa dikunjungi sekarang'}
            gradient="linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
            pulse
          />
          <StatCard
            icon={<Clock3 className="h-5 w-5 text-white" />}
            label="Akan Datang"
            value={visibleStats.upcoming}
            subtitle={isAdmin ? 'akan datang' : 'jadwal berikutnya'}
            gradient="linear-gradient(135deg, #f093fb 0%, #f5a623 100%)"
          />
          <StatCard
            icon={<CheckCircle2 className="h-5 w-5 text-white" />}
            label={isAdmin ? 'Selesai' : 'Event Selesai'}
            value={visibleStats.past}
            subtitle={isAdmin ? 'telah berlangsung' : 'arsip kegiatan'}
            gradient="linear-gradient(135deg, #4facfe 0%, #6c757d 100%)"
          />
          </div>
        </section>

        {/* Quarter Timeline */}
        {isAdmin && <QuarterTimeline themes={annualThemes} />}

        {/* Featured ongoing & upcoming */}
        {isAdmin && (ongoingEvents.length > 0 || upcomingEvents.length > 0) && (
          <div className="space-y-4 sm:space-y-5">
            <FeaturedEvents
              events={ongoingEvents}
              title="Sedang Berlangsung"
              accent="emerald"
              icon={<Radio className="h-4 w-4 animate-pulse text-emerald-500" />}
            />
            <FeaturedEvents
              events={upcomingEvents.slice(0, 3)}
              title="Segera Dimulai"
              accent="amber"
              icon={<Clock3 className="h-4 w-4 text-amber-500" />}
            />
          </div>
        )}

        {/* Featured upcoming for non-admin */}
        {!isAdmin && upcomingEvents.length > 0 && (
          <section id="featured" className="scroll-mt-32">
            <FeaturedEvents
              events={upcomingEvents.slice(0, 3)}
              title="Segera Dimulai"
              accent="amber"
              icon={<Clock3 className="h-4 w-4 text-amber-500" />}
            />
          </section>
        )}

        {/* Public Calendar */}
        {!isAdmin && (
          <section id="calendar" className="space-y-3 scroll-mt-32">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Kalender Event</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Lihat semua event publik dalam tampilan kalender.</p>
            </div>
            <CalendarView events={publicEvents} holidays={holidays} onDetail={handleDetailClick} />
          </section>
        )}

        {/* Category chart */}
        {isAdmin && (
          <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <CategoryChart events={events} />
          </div>
        )}

        {/* Filter/View */}
        <section id="views" className="scroll-mt-32">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex flex-col gap-3">
            {/* Row 1: status tabs - scrollable on mobile */}
            <div>
              <FilterBar
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
                categories={visibleCategories}
                activeCategory={activeCategory}
                onCategoryChange={setActiveCategory}
                activePriority={activePriority}
                onPriorityChange={setActivePriority}
                months={visibleMonths}
                activeMonth={activeMonth}
                onMonthChange={setActiveMonth}
                showDraft={isAdmin}
                showPriority={isAdmin}
              />
            </div>
            {/* View Mode Toggle */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Tampilan</p>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-1 sm:rounded-xl sm:bg-slate-100 sm:p-1 dark:sm:bg-slate-700/50">
                {availableViewTabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setViewMode(tab.key)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 sm:justify-start sm:rounded-lg sm:border-0 sm:px-3 sm:py-1.5 ${
                      viewMode === tab.key
                        ? 'border-violet-200 bg-violet-50 text-violet-700 shadow-sm dark:border-violet-800/50 dark:bg-slate-600 dark:text-violet-300'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-slate-200'
                    }`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Row 2: result summary */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Menampilkan <span className="font-semibold text-slate-700 dark:text-slate-200">{visibleEvents.length}</span> dari {visibleStats.total} acara
                {searchQuery && <span> · pencarian "<em>{searchQuery}</em>"</span>}
              </p>
              <button
                onClick={() => { setSearchQuery(''); setActiveFilter('upcoming'); setActiveCategory('Semua'); setActivePriority('Semua'); setActiveMonth('Semua'); }}
                className="flex items-center gap-1 self-start text-xs text-violet-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 dark:text-violet-400 dark:focus-visible:ring-offset-slate-950"
              >
                <RefreshCw className="h-3 w-3" /> Reset
              </button>
            </div>
          </div>
        </div>
        </section>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 dark:border-red-800/50 dark:bg-red-900/20">
            <span className="text-lg">⚠️</span>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!error && visibleEvents.length === 0 && visibleStats.total > 0 && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-16 text-center dark:border-slate-700 dark:bg-slate-800/50">
            <SearchX className="h-10 w-10 text-slate-400" />
            <p className="font-semibold text-slate-700 dark:text-slate-200">Tidak ada acara yang cocok</p>
            <p className="text-sm text-slate-400">Coba ubah atau reset filter.</p>
              <button
                onClick={() => { setSearchQuery(''); setActiveFilter('upcoming'); setActiveCategory('Semua'); setActivePriority('Semua'); setActiveMonth('Semua'); }}
                className="mt-1 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
              >
                Reset Filter
            </button>
          </div>
        )}

        {/* Event Views */}
        {viewMode === 'table' && (
          <EventTable
            events={visibleEvents}
            isAdmin={isAdmin}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
            onDetail={handleDetailClick}
          />
        )}
        {isAdmin && viewMode === 'calendar' && (
          <CalendarView events={visibleEvents} holidays={holidays} onDetail={handleDetailClick} />
        )}
        {viewMode === 'kanban' && (
          <KanbanView
            events={visibleEvents}
            isAdmin={isAdmin}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
            onDetail={handleDetailClick}
          />
        )}
        {viewMode === 'timeline' && (
          <TimelineView
            events={visibleEvents}
            isAdmin={isAdmin}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
            onDetail={handleDetailClick}
          />
        )}

        {!isAdmin && (
          <section id="themes" className="scroll-mt-32">
            <QuarterTimeline themes={annualThemes} />
          </section>
        )}

        {/* Footer */}
        <footer className="border-t border-slate-200 pt-4 sm:pt-6 pb-4 dark:border-slate-800">
          <div className="flex flex-col items-center justify-between gap-2 text-center text-xs text-slate-400 sm:flex-row sm:text-left">
            <p>© {new Date().getFullYear()} Metropolitan Mall Bekasi</p>
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
      <EventCrudModal
        isOpen={showCrudModal}
        onClose={() => { setShowCrudModal(false); setEditingEvent(null); }}
        onSave={handleSave}
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
      />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
