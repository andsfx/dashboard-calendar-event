import { useState, useCallback } from 'react';
import { CalendarDays, List, Kanban, Clock4, Plus, RefreshCw, Radio, Clock3, CheckCircle2, SearchX } from 'lucide-react';
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
import { ToastContainer } from './components/ToastContainer';
import { useEvents } from './hooks/useEvents';
import { useToast } from './hooks/useToast';
import { annualThemes as mockThemes } from './data/mockEvents';
import { EventItem, ViewMode } from './types';
import { createId } from './utils/eventUtils';

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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<EventItem | null>(null);
  const [detailEvent, setDetailEvent] = useState<EventItem | null>(null);

  const { toasts, showToast, removeToast } = useToast();
  const {
    events, filteredEvents, stats, categories, months,
    searchQuery, setSearchQuery,
    activeFilter, setActiveFilter,
    activeCategory, setActiveCategory,
    activePriority, setActivePriority,
    activeMonth, setActiveMonth,
    addEvent, updateEvent, deleteEvent,
    annualThemes,
    isLoading,
    error,
  } = useEvents();

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

  const handleDeleteClick = useCallback((ev: EventItem) => {
    setDeletingEvent(ev);
    setShowDeleteModal(true);
  }, []);

  const handleDetailClick = useCallback((ev: EventItem) => {
    setDetailEvent(ev);
    setShowDetailModal(true);
  }, []);

  const handleSave = useCallback(async (data: Partial<EventItem>) => {
    if (editingEvent) {
      const success = await updateEvent({ ...editingEvent, ...data } as EventItem);
      if (success) showToast('success', 'Berhasil diperbarui!', `"${data.acara}" telah diperbarui.`);
    } else {
      const newEv: EventItem = {
        ...data as EventItem,
        id: createId(),
        rowIndex: events.length + 1,
        status: data.status || 'upcoming',
      };
      const success = await addEvent(newEv);
      if (success) showToast('success', 'Acara ditambahkan!', `"${data.acara}" berhasil ditambahkan.`);
    }
    setShowCrudModal(false);
    setEditingEvent(null);
  }, [editingEvent, events.length, addEvent, updateEvent, showToast]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingEvent) return;
    const success = await deleteEvent(deletingEvent.id);
    if (success) showToast('success', 'Acara dihapus!', `"${deletingEvent.acara}" telah dihapus.`);
    setDeletingEvent(null);
    setShowDeleteModal(false);
  }, [deletingEvent, deleteEvent, showToast]);

  const ongoingEvents  = filteredEvents.filter(e => e.status === 'ongoing');
  const upcomingEvents = filteredEvents.filter(e => e.status === 'upcoming');

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300`}>
      {/* Navbar */}
      <Navbar
        isDark={isDark}
        onToggleDark={toggleDark}
        isAdmin={isAdmin}
        onLoginClick={() => setShowLoginModal(true)}
        onLogout={handleLogout}
        ongoingCount={events.filter(e => e.status === 'ongoing').length}
      />

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
              <button
                onClick={handleAddNew}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200 transition hover:from-violet-700 hover:to-indigo-700 dark:shadow-violet-900/30 shrink-0"
              >
                <Plus className="h-4 w-4" /> <span>Tambah</span>
              </button>
            )}
          </div>
        </div>

        {/* Admin Banner */}
        {isAdmin && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 dark:border-violet-800/50 dark:bg-violet-900/20">
            <span className="text-lg">🔓</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-violet-800 dark:text-violet-300">Mode Admin Aktif</p>
              <p className="text-xs text-violet-600 dark:text-violet-400">Bisa tambah, edit, hapus acara</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-xl border border-violet-300 px-3 py-1.5 text-xs font-medium text-violet-700 transition hover:bg-violet-100 dark:border-violet-700 dark:text-violet-300 dark:hover:bg-violet-900/40"
            >
              Keluar
            </button>
          </div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <StatCard
            icon={<CalendarDays className="h-5 w-5 text-white" />}
            label="Total Acara"
            value={stats.total}
            subtitle="keseluruhan"
            gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
          />
          <StatCard
            icon={<Radio className="h-5 w-5 text-white" />}
            label="Berlangsung"
            value={stats.ongoing}
            subtitle="sedang aktif"
            gradient="linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
            pulse
          />
          <StatCard
            icon={<Clock3 className="h-5 w-5 text-white" />}
            label="Mendatang"
            value={stats.upcoming}
            subtitle="akan datang"
            gradient="linear-gradient(135deg, #f093fb 0%, #f5a623 100%)"
          />
          <StatCard
            icon={<CheckCircle2 className="h-5 w-5 text-white" />}
            label="Selesai"
            value={stats.past}
            subtitle="telah berlangsung"
            gradient="linear-gradient(135deg, #4facfe 0%, #6c757d 100%)"
          />
        </div>

        {/* Quarter Timeline */}
        <QuarterTimeline themes={annualThemes} />

        {/* Featured ongoing & upcoming */}
        {(ongoingEvents.length > 0 || upcomingEvents.length > 0) && (
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

        {/* Category chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <CategoryChart events={events} />
        </div>

        {/* Filter/View */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex flex-col gap-3">
            {/* Row 1: status tabs - scrollable on mobile */}
            <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
              <FilterBar
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
                categories={categories}
                activeCategory={activeCategory}
                onCategoryChange={setActiveCategory}
                activePriority={activePriority}
                onPriorityChange={setActivePriority}
                months={months}
                activeMonth={activeMonth}
                onMonthChange={setActiveMonth}
              />
            </div>
            {/* View Mode Toggle */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Tampilan</p>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-1 sm:rounded-xl sm:bg-slate-100 sm:p-1 dark:sm:bg-slate-700/50">
                {VIEW_TABS.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setViewMode(tab.key)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all whitespace-nowrap sm:justify-start sm:rounded-lg sm:border-0 sm:px-3 sm:py-1.5 ${
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
                Menampilkan <span className="font-semibold text-slate-700 dark:text-slate-200">{filteredEvents.length}</span> dari {events.length} acara
                {searchQuery && <span> · pencarian "<em>{searchQuery}</em>"</span>}
              </p>
              <button
                onClick={() => { setSearchQuery(''); setActiveFilter('Semua'); setActiveCategory('Semua'); setActivePriority('Semua'); setActiveMonth('Semua'); }}
                className="flex items-center gap-1 self-start text-xs text-violet-600 hover:underline dark:text-violet-400"
              >
                <RefreshCw className="h-3 w-3" /> Reset
              </button>
            </div>
          </div>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-3 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-slate-200 dark:bg-slate-700" />
            ))}
          </div>
        )}

        {/* Error banner */}
        {!isLoading && error && (
          <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 dark:border-red-800/50 dark:bg-red-900/20">
            <span className="text-lg">⚠️</span>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && filteredEvents.length === 0 && events.length > 0 && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-16 text-center dark:border-slate-700 dark:bg-slate-800/50">
            <SearchX className="h-10 w-10 text-slate-400" />
            <p className="font-semibold text-slate-700 dark:text-slate-200">Tidak ada acara yang cocok</p>
            <p className="text-sm text-slate-400">Coba ubah atau reset filter.</p>
            <button
              onClick={() => { setSearchQuery(''); setActiveFilter('Semua'); setActiveCategory('Semua'); setActivePriority('Semua'); setActiveMonth('Semua'); }}
              className="mt-1 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700"
            >
              Reset Filter
            </button>
          </div>
        )}

        {/* Event Views */}
        {viewMode === 'table' && (
          <EventTable
            events={filteredEvents}
            isAdmin={isAdmin}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
            onDetail={handleDetailClick}
          />
        )}
        {viewMode === 'calendar' && (
          <CalendarView events={filteredEvents} onDetail={handleDetailClick} />
        )}
        {viewMode === 'kanban' && (
          <KanbanView
            events={filteredEvents}
            isAdmin={isAdmin}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
            onDetail={handleDetailClick}
          />
        )}
        {viewMode === 'timeline' && (
          <TimelineView
            events={filteredEvents}
            isAdmin={isAdmin}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
            onDetail={handleDetailClick}
          />
        )}

        {/* Footer */}
        <footer className="border-t border-slate-200 pt-4 sm:pt-6 pb-4 dark:border-slate-800">
          <div className="flex flex-col items-center justify-between gap-2 text-center text-xs text-slate-400 sm:flex-row sm:text-left">
            <p>© {new Date().getFullYear()} Metropolitan Mall Bekasi</p>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end sm:gap-3">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 live-dot" />
                <span>{events.filter(e => e.status === 'ongoing').length} berlangsung</span>
              </span>
              <span className="hidden sm:inline">·</span>
              <span>{events.filter(e => e.status === 'upcoming').length} mendatang</span>
            </div>
          </div>
        </footer>
      </main>

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
