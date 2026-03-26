import { useState, useMemo, useCallback, useEffect } from 'react';
import { CalendarDays, TrendingUp, Plus, Table, Clock, Search } from 'lucide-react';
import { EventItem, FilterType, ViewMode, AnnualTheme } from './types';
import { recalculateStatuses } from './data/mockEvents';
import { useDarkMode } from './hooks/useDarkMode';
import { useDebouncedValue } from './hooks/useDebouncedValue';
import { useLocalStorage } from './hooks/useLocalStorage';
import { normalizeEventInput } from './utils/eventInput';
import { STORAGE_KEYS, STATUS_ORDER, INPUT_LIMITS } from './constants';
import { fetchEvents, createEvent as createSheetsEvent, updateEvent as updateSheetsEvent, deleteEvent as deleteSheetsEvent } from './utils/sheetsApi';

import Navbar from './components/Navbar';
import StatCard from './components/StatCard';
import FeaturedEventCard from './components/FeaturedEventCard';
import FilterBar from './components/FilterBar';
import EventTable from './components/EventTable';
import CalendarView from './components/CalendarView';
import AdminLoginModal from './components/AdminLoginModal';
import CrudEventModal from './components/CrudEventModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import AnnualTimeline from './components/AnnualTimeline';
import UpcomingNext from './components/UpcomingNext';

const ADMIN_PASSWORD = (import.meta.env.VITE_ADMIN_PASSWORD ?? '').trim();
const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL ?? '';

function resequenceRowIndex(list: EventItem[]): EventItem[] {
  return list.map((event, index) => ({
    ...event,
    rowIndex: index + 2,
  }));
}

function createEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `evt-${crypto.randomUUID()}`;
  }
  return `evt-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

export default function App() {
  const [isDark, toggleDark] = useDarkMode();
  const [events, setEvents] = useLocalStorage<EventItem[]>(STORAGE_KEYS.EVENTS, []);
  const [annualThemes, setAnnualThemes] = useState<AnnualTheme[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('Semua');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showCrudModal, setShowCrudModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<EventItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 250);

  // Load data from Google Sheets on mount
  useEffect(() => {
    const loadEvents = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { events: sheetsEvents, themes } = await fetchEvents();
        setEvents(recalculateStatuses(sheetsEvents));
        setAnnualThemes(themes);
      } catch (err) {
        console.error('Failed to load from Sheets:', err);
        setError('Gagal memuat data dari spreadsheet. Menggunakan data lokal.');
      } finally {
        setIsLoading(false);
      }
    };

    loadEvents();
  }, [setEvents]);

  // Recalculate statuses periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setEvents(prev => recalculateStatuses(prev));
    }, 60000);
    return () => clearInterval(interval);
  }, [setEvents]);

  // Compute stats
  const stats = useMemo(() => {
    const total = events.length;
    const ongoing = events.filter(e => e.status === 'ongoing').length;
    const upcoming = events.filter(e => e.status === 'upcoming').length;
    const past = events.filter(e => e.status === 'past').length;
    return { total, ongoing, upcoming, past };
  }, [events]);

  // Get unique months for filter
  const months = useMemo(() => {
    const uniqueMonths = [...new Set(events.map(e => e.month))];
    return ['Semua', ...uniqueMonths];
  }, [events]);

  // Filter events - optimized with separate memoization
  const filteredByMonth = useMemo(() => {
    if (activeFilter === 'Semua') return events;
    return events.filter(e => e.month === activeFilter);
  }, [events, activeFilter]);

  const filteredBySearch = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return filteredByMonth;
    const q = debouncedSearchQuery.toLowerCase();
    return filteredByMonth.filter(e =>
      e.acara.toLowerCase().includes(q) ||
      e.lokasi.toLowerCase().includes(q) ||
      e.eo.toLowerCase().includes(q) ||
      e.keterangan.toLowerCase().includes(q)
    );
  }, [filteredByMonth, debouncedSearchQuery]);

  const filteredEvents = useMemo(() => {
    return [...filteredBySearch].sort((a, b) => {
      if (STATUS_ORDER[a.status] !== STATUS_ORDER[b.status]) {
        return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      }
      if (a.status === 'past') return b.dateStr.localeCompare(a.dateStr);
      return a.dateStr.localeCompare(b.dateStr);
    });
  }, [filteredBySearch]);

  // Admin login handler
  const handleAdminLogin = useCallback((password: string) => {
    if (ADMIN_PASSWORD && password === ADMIN_PASSWORD) {
      setIsAdmin(true);
      return true;
    }
    return false;
  }, []);

  const handleLogout = useCallback(() => {
    setIsAdmin(false);
  }, []);

  // Refresh data from Sheets
  const refreshFromSheets = useCallback(async () => {
    if (!APPS_SCRIPT_URL) return;
    try {
      const { events: sheetsEvents, themes } = await fetchEvents();
      setEvents(recalculateStatuses(sheetsEvents));
      setAnnualThemes(themes);
    } catch (err) {
      console.error('Refresh error:', err);
    }
  }, [setEvents]);

  // CRUD handlers
  const handleSaveEvent = useCallback(async (data: Partial<EventItem>) => {
    const normalizedData = normalizeEventInput(data);
    const isEditing = !!normalizedData.id;

    // Sync to Google Sheets FIRST
    if (APPS_SCRIPT_URL) {
      setIsSyncing(true);
      setSyncMessage(null);
      try {
        if (isEditing && normalizedData.sheetRow) {
          // UPDATE existing event
          await updateSheetsEvent({
            sheetRow: normalizedData.sheetRow,
            dateStr: normalizedData.dateStr || '',
            tanggal: normalizedData.tanggal || '',
            day: normalizedData.day || '',
            jam: normalizedData.jam || '',
            acara: normalizedData.acara || '',
            lokasi: normalizedData.lokasi || '',
            eo: normalizedData.eo || '',
            keterangan: normalizedData.keterangan || '',
            month: normalizedData.month || '',
          });
          setSyncMessage({ type: 'success', text: 'Event berhasil diupdate di spreadsheet!' });
        } else {
          // CREATE new event
          const newSheetRow = await createSheetsEvent({
            dateStr: normalizedData.dateStr || '',
            tanggal: normalizedData.tanggal || '',
            day: normalizedData.day || '',
            jam: normalizedData.jam || '',
            acara: normalizedData.acara || '',
            lokasi: normalizedData.lokasi || '',
            eo: normalizedData.eo || '',
            keterangan: normalizedData.keterangan || '',
            month: normalizedData.month || '',
          });
          normalizedData.sheetRow = newSheetRow;
          setSyncMessage({ type: 'success', text: 'Event berhasil ditambahkan ke spreadsheet!' });
        }

        // Refresh all data from Sheets after sync
        await refreshFromSheets();
      } catch (err) {
        console.error('Sync error:', err);
        setSyncMessage({ type: 'error', text: 'Gagal sync ke spreadsheet. Data disimpan lokal.' });

        // Fallback: save to localStorage only
        setEvents(prev => {
          if (isEditing) {
            return recalculateStatuses(
              resequenceRowIndex(
                prev.map(e => e.id === normalizedData.id ? { ...e, ...normalizedData } as EventItem : e)
              )
            );
          } else {
            const newEvent: EventItem = {
              id: createEventId(),
              sheetRow: normalizedData.sheetRow,
              rowIndex: prev.length + 2,
              tanggal: normalizedData.tanggal || '',
              dateStr: normalizedData.dateStr || '',
              day: normalizedData.day || '',
              jam: normalizedData.jam || '',
              acara: normalizedData.acara || '',
              lokasi: normalizedData.lokasi || '',
              eo: normalizedData.eo || '',
              keterangan: normalizedData.keterangan || '',
              month: normalizedData.month || '',
              status: 'upcoming',
            };
            return recalculateStatuses(resequenceRowIndex([...prev, newEvent]));
          }
        });
      } finally {
        setIsSyncing(false);
        setTimeout(() => setSyncMessage(null), 3000);
      }
    } else {
      // No Sheets URL: save to localStorage
      setEvents(prev => {
        if (isEditing) {
          return recalculateStatuses(
            resequenceRowIndex(
              prev.map(e => e.id === normalizedData.id ? { ...e, ...normalizedData } as EventItem : e)
            )
          );
        } else {
          const newEvent: EventItem = {
            id: createEventId(),
            rowIndex: prev.length + 2,
            tanggal: normalizedData.tanggal || '',
            dateStr: normalizedData.dateStr || '',
            day: normalizedData.day || '',
            jam: normalizedData.jam || '',
            acara: normalizedData.acara || '',
            lokasi: normalizedData.lokasi || '',
            eo: normalizedData.eo || '',
            keterangan: normalizedData.keterangan || '',
            month: normalizedData.month || '',
            status: 'upcoming',
          };
          return recalculateStatuses(resequenceRowIndex([...prev, newEvent]));
        }
      });
    }
  }, [refreshFromSheets, setEvents]);

  const handleDeleteEvent = useCallback(async () => {
    if (!deletingEvent) return;

    const sheetRow = deletingEvent.sheetRow;
    const eventId = deletingEvent.id;

    // Close modal first
    setDeletingEvent(null);
    setShowDeleteModal(false);

    // Sync to Google Sheets
    if (APPS_SCRIPT_URL && sheetRow) {
      setIsSyncing(true);
      setSyncMessage(null);
      try {
        await deleteSheetsEvent(sheetRow);
        setSyncMessage({ type: 'success', text: 'Event berhasil dihapus dari spreadsheet!' });

        // Refresh all data from Sheets
        await refreshFromSheets();
      } catch (err) {
        console.error('Delete sync error:', err);
        setSyncMessage({ type: 'error', text: 'Gagal hapus dari spreadsheet. Data dihapus lokal.' });

        // Fallback: remove from localStorage
        setEvents(prev => resequenceRowIndex(prev.filter(e => e.id !== eventId)));
      } finally {
        setIsSyncing(false);
        setTimeout(() => setSyncMessage(null), 3000);
      }
    } else {
      // No Sheets URL: remove from localStorage
      setEvents(prev => resequenceRowIndex(prev.filter(e => e.id !== eventId)));
    }
  }, [deletingEvent, refreshFromSheets, setEvents]);

  const handleEditClick = useCallback((event: EventItem) => {
    setEditingEvent(event);
    setShowCrudModal(true);
  }, []);

  const handleDeleteClick = useCallback((event: EventItem) => {
    setDeletingEvent(event);
    setShowDeleteModal(true);
  }, []);

  const handleAddNew = useCallback(() => {
    setEditingEvent(null);
    setShowCrudModal(true);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <Navbar
        isDark={isDark}
        toggleDark={toggleDark}
        isAdmin={isAdmin}
        onAdminClick={() => setShowAdminModal(true)}
        onLogout={handleLogout}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 animate-fade-in-up">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">
              Dashboard <span className="text-primary">Event</span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Kelola dan pantau semua acara di Metropolitan Mall Bekasi
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari acara..."
                maxLength={INPUT_LIMITS.SEARCH_QUERY}
                className="w-48 sm:w-64 px-4 py-2.5 pl-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>

            {isAdmin && (
              <button
                onClick={handleAddNew}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:from-indigo-600 hover:to-indigo-700 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Tambah Acara</span>
              </button>
            )}
          </div>
        </div>

        {/* Loading & Error States */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Memuat data...</p>
          </div>
        )}
        
        {error && (
          <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-center gap-3">
            <span className="text-amber-600 dark:text-amber-400">⚠️</span>
            <p className="text-sm text-amber-700 dark:text-amber-300">{error}</p>
          </div>
        )}

        {!isLoading && events.length === 0 && !error && (
          <div className="text-center py-8">
            <p className="text-slate-500 dark:text-slate-400 text-sm">Tidak ada acara untuk ditampilkan.</p>
          </div>
        )}

        {events.length > 0 && (
          <>
            {/* Admin Banner when logged in */}
            {isAdmin && (
              <div className="bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-4 flex items-center gap-3 animate-fade-in-up">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <span className="text-lg">🔓</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Mode Admin Aktif</p>
                  <p className="text-xs text-indigo-500 dark:text-indigo-400">Anda dapat menambah, mengedit, dan menghapus acara.</p>
                </div>
              </div>
            )}

            {/* Sync Status Message */}
            {syncMessage && (
              <div className={`rounded-2xl p-4 flex items-center gap-3 animate-fade-in-up ${
                syncMessage.type === 'success' 
                  ? 'bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800' 
                  : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800'
              }`}>
                <span className={syncMessage.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                  {syncMessage.type === 'success' ? '✓' : '⚠️'}
                </span>
                <p className={`text-sm ${syncMessage.type === 'success' ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
                  {syncMessage.text}
                </p>
                {isSyncing && <span className="ml-auto animate-spin text-indigo-500">⏳</span>}
              </div>
            )}

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={<CalendarDays className="w-6 h-6" />}
                label="Total Acara"
                value={stats.total}
                color="indigo"
                delay={0}
              />
              <StatCard
                icon={<TrendingUp className="w-6 h-6" />}
                label="Berlangsung"
                value={stats.ongoing}
                color="emerald"
                delay={100}
              />
              <StatCard
                icon={<Clock className="w-6 h-6" />}
                label="Mendatang"
                value={stats.upcoming}
                color="amber"
                delay={200}
              />
              <StatCard
                icon={<Table className="w-6 h-6" />}
                label="Selesai"
                value={stats.past}
                color="slate"
                delay={300}
              />
            </div>

            {/* Annual Themes Timeline */}
            {annualThemes.length > 0 && <AnnualTimeline themes={annualThemes} />}

            {/* Featured Ongoing Events */}
            <FeaturedEventCard events={events} annualThemes={annualThemes} />

            {/* Upcoming Next Events */}
            <UpcomingNext events={events} />

            {/* Filter Bar */}
            <FilterBar
              filters={months}
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              totalCount={events.length}
              filteredCount={filteredEvents.length}
            />

            {/* View Toggle */}
            <div className="flex items-center justify-between animate-fade-in-up" style={{ animationDelay: '350ms' }}>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                {viewMode === 'table' ? 'Daftar Acara' : 'Kalender'}
              </h3>
              <div className="flex items-center bg-white dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setViewMode('table')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    viewMode === 'table'
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  <Table className="w-4 h-4" />
                  <span className="hidden sm:inline">Tabel</span>
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    viewMode === 'calendar'
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span className="hidden sm:inline">Kalender</span>
                </button>
              </div>
            </div>

            {/* Events View */}
            {viewMode === 'table' ? (
              <EventTable
                events={filteredEvents}
                isAdmin={isAdmin}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
              />
            ) : (
              <CalendarView
                events={filteredEvents}
                isAdmin={isAdmin}
                onEventClick={handleEditClick}
              />
            )}
          </>
        )}

        {/* Footer */}
        <footer className="text-center py-8 border-t border-slate-200 dark:border-slate-800 animate-fade-in-up">
          <p className="text-sm text-slate-400 dark:text-slate-500">
            © {new Date().getFullYear()}{' '}
            <span className="text-indigo-500 font-semibold">Metropolitan Mall Bekasi</span>
            {' '}
          </p>
          <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">
            Built with React + Tailwind CSS • Data dari Google Sheets
          </p>
        </footer>
      </main>

      {/* Modals */}
      <AdminLoginModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        onLogin={handleAdminLogin}
        isConfigured={Boolean(ADMIN_PASSWORD)}
      />

      <CrudEventModal
        isOpen={showCrudModal}
        editingEvent={editingEvent}
        onClose={() => { setShowCrudModal(false); setEditingEvent(null); }}
        onSave={handleSaveEvent}
      />

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        event={deletingEvent}
        onClose={() => { setShowDeleteModal(false); setDeletingEvent(null); }}
        onConfirm={handleDeleteEvent}
      />
    </div>
  );
}
