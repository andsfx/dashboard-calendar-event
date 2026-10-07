import { useState, useMemo, useCallback, useEffect } from 'react';
import { EventItem, EventStatus, AnnualTheme, HolidayItem } from '../types';
import { sortEvents, recalculateStatuses, getStatus } from '../utils/eventUtils';
import { fetchEvents, fetchAdminEvents, fetchThemesAndHolidays, createEvent as apiCreate, updateEvent as apiUpdate, setEventVisibility as apiSetVisibility, deleteEvent as apiDelete, createAnnualTheme as apiCreateTheme, updateAnnualTheme as apiUpdateTheme, deleteAnnualTheme as apiDeleteTheme, batchCreateEvents as apiBatchCreate, deleteRecurringSeries as apiDeleteSeries } from '../utils/domainApi';
import { AdminError } from '../lib/adminError';

function normalizeEvent(ev: EventItem): EventItem {
  const normalized = recalculateStatuses([ev])[0];
  if (!normalized) {
    return ev;
  }
  return normalized;
}

export function useEvents(options?: { realtime?: boolean; includeHidden?: boolean; enabled?: boolean }) {
  const realtimeEnabled = options?.realtime ?? true;
  // `includeHidden` = pemakai boleh melihat jadwal internal (admin/superadmin/demo).
  // Hanya mereka yang membaca channel admin (`listEvents`, termasuk event
  // tersembunyi); pengunjung publik tetap membaca GET /events tanpa draft.
  const includeHidden = options?.includeHidden ?? false;
  // `enabled: false` menahan fetch sampai jawaban sesi diketahui. Tanpa ini,
  // dashboard sempat membaca GET /events publik selama /auth/me masih terbang
  // (includeHidden masih false) — persis pencampuran kanal yang dilarang.
  const enabled = options?.enabled ?? true;
  const [events, setEvents] = useState<EventItem[]>([]);
  const [annualThemes, setThemes] = useState<AnnualTheme[]>([]);
  const [holidays, setHolidays] = useState<HolidayItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<EventStatus | 'Semua'>('upcoming');
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [activePriority, setActivePriority] = useState('Semua');
  const [activeMonth, setActiveMonth] = useState('Semua');
  const [lastError, setLastError] = useState<AdminError | null>(null);
  const clearLastError = useCallback(() => setLastError(null), []);

  const refreshEvents = useCallback(async (opts?: { silent?: boolean }) => {
    if (!enabled) return;
    if (!opts?.silent) setIsLoading(true);
    setError(null);
    try {
      // Dashboard (includeHidden) memakai channel admin untuk daftar event dan
      // TIDAK menyentuh GET /events publik — dua kanal tetap terpisah.
      if (includeHidden) {
        try {
          const [adminEvents, meta] = await Promise.all([
            fetchAdminEvents(),
            fetchThemesAndHolidays(),
          ]);
          setEvents(recalculateStatuses(adminEvents));
          setThemes(meta.themes);
          setHolidays(meta.holidays);
          return;
        } catch (err) {
          // SPA (Vercel, auto-deploy) dan API (VPS, deploy manual) berversi
          // independen: API yang belum punya aksi `listEvents` membalas error.
          // Jangan biarkan dashboard kosong — turun ke kanal publik (tanpa
          // event tersembunyi) supaya jadwal tetap tampil.
          console.warn('listEvents gagal; fallback ke kanal publik.', err);
        }
      }
      const publicData = await fetchEvents();
      setEvents(recalculateStatuses(publicData.events));
      setThemes(publicData.themes);
      setHolidays(publicData.holidays);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Gagal memuat data event. Periksa koneksi atau konfigurasi proxy publik.');
    } finally {
      if (!opts?.silent) setIsLoading(false);
    }
  }, [includeHidden, enabled]);

  // Load from REST API (VPS) — setelah sesi diketahui (lihat `enabled`).
  useEffect(() => {
    refreshEvents();
  }, [refreshEvents]);

  // Opsi B: polling debounced — pengganti channel Realtime (realtime dihapus
  // bersama supabase-js).
  // Polling 30s memanggil scheduleRefresh yang sama (debounce 400ms
  // mengkoaleskan burst perubahan, full re-fetch alih-alih row-level patch).
  // silent: true agar skeleton tidak berkedip + scroll/filter tidak reset;
  // jeda saat tab tersembunyi (visibilitychange) agar tidak buang kuota.
  useEffect(() => {
    if (!realtimeEnabled) return;
    let timer: number | undefined;
    const scheduleRefresh = () => {
      if (document.visibilityState === 'hidden') return;
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = undefined;
        refreshEvents({ silent: true });
      }, 400);
    };

    const intervalId = setInterval(scheduleRefresh, 30_000);

    return () => {
      clearTimeout(timer);
      clearInterval(intervalId);
    };
  }, [refreshEvents, realtimeEnabled]);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 250);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const months = useMemo(() => {
    const unique = [...new Set(events.map(e => e.month))];
    return ['Semua', ...unique];
  }, [events]);

  const categories = useMemo(() => {
    const unique = [...new Set(events.flatMap(e => e.categories))];
    return ['Semua', ...unique];
  }, [events]);

  const stats = useMemo(() => ({
    total: events.length,
    ongoing: events.filter(e => e.status === 'ongoing').length,
    upcoming: events.filter(e => e.status === 'upcoming').length,
    past: events.filter(e => e.status === 'past').length,
  }), [events]);

  const filteredEvents = useMemo(() => {
    let result = events;
    if (activeFilter !== 'Semua') result = result.filter(e => e.status === activeFilter);
    if (activeCategory !== 'Semua') result = result.filter(e => e.categories.includes(activeCategory));
    if (activePriority !== 'Semua') result = result.filter(e => e.priority === activePriority);
    if (activeMonth !== 'Semua') result = result.filter(e => e.month === activeMonth);
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(e =>
        e.acara.toLowerCase().includes(q) ||
        e.lokasi.toLowerCase().includes(q) ||
        e.eo.toLowerCase().includes(q) ||
        e.keterangan.toLowerCase().includes(q) ||
        e.categories.some(category => category.toLowerCase().includes(q))
      );
    }
    return sortEvents(result);
  }, [events, activeFilter, activeCategory, activePriority, activeMonth, debouncedSearch]);

  const addEvent = useCallback(async (ev: EventItem): Promise<boolean> => {
    const tempId = ev.id;
    const normalizedEvent = normalizeEvent(ev);
    setEvents(prev => [...prev, normalizedEvent]);
    try {
      const { id, rowIndex, ...apiData } = normalizedEvent;
      const created = await apiCreate(apiData);
      setEvents(prev => prev.map(e => e.id === tempId ? { ...e, id: created.id || tempId, sheetRow: created.row } : e));
      return true;
    } catch (err) {
      const ae = err instanceof AdminError ? err : new AdminError('Unknown', err instanceof Error ? err.message : String(err), 0);
      setLastError(ae);
      if (ae.kind === 'Conflict') setError('Data berubah di server. Muat ulang lalu coba lagi.');
      else if (ae.kind === 'Unauthorized' || ae.kind === 'Forbidden') setError('Sesi berakhir. Masuk ulang untuk menyimpan perubahan.');
      console.error('Error adding event:', err);
      setEvents(prev => prev.filter(e => e.id !== tempId));
      return false;
    }
  }, []);

  const addRecurringEvents = useCallback(async (evs: EventItem[]): Promise<boolean> => {
    if (evs.length === 0) return false;
    const tempIds = evs.map(e => e.id);
    const normalizedEvents = evs.map(normalizeEvent);
    setEvents(prev => [...prev, ...normalizedEvents]);
    try {
      const apiDataList = normalizedEvents.map(e => {
        const { id, rowIndex, ...apiData } = e;
        return apiData;
      });
      const { results } = await apiBatchCreate(apiDataList);
      setEvents(prev => prev.map(e => {
        const idx = tempIds.indexOf(e.id);
        if (idx >= 0 && results[idx]) {
          return { ...e, id: results[idx].id || e.id, sheetRow: results[idx].row };
        }
        return e;
      }));
      return true;
    } catch (err) {
      console.error('Error adding recurring events:', err);
      setEvents(prev => prev.filter(e => !tempIds.includes(e.id)));
      return false;
    }
  }, []);

  const updateEvent = useCallback(async (ev: EventItem, lifecycle?: 'draft' | 'published'): Promise<boolean> => {
    const prevEvent = events.find(e => e.id === ev.id);
    const normalizedEvent = normalizeEvent(ev);
    // Lifecycle eksplisit harus tercermin di state lokal sekarang juga, bukan
    // menunggu poll 30 detik: hide → kelompok "Internal", unhide → status
    // temporal. Tanpa ini, unhide tampak gagal walau DB sudah benar.
    const optimisticEvent: EventItem = lifecycle
      ? {
          ...normalizedEvent,
          status: lifecycle === 'draft'
            ? 'draft'
            : getStatus(normalizedEvent.dateStr, normalizedEvent.jam || '', normalizedEvent.dateEnd, normalizedEvent.dayTimeSlots),
        }
      : normalizedEvent;
    setEvents(prev => prev.map(e => e.id === ev.id ? optimisticEvent : e));
    if (ev.id) {
      try {
        await apiUpdate(optimisticEvent as EventItem & { id: string }, lifecycle);
        return true;
      } catch (err) {
        const ae = err instanceof AdminError ? err : new AdminError('Unknown', err instanceof Error ? err.message : String(err), 0);
        setLastError(ae);
        if (ae.kind === 'Conflict') setError('Data berubah di server. Muat ulang lalu coba lagi.');
        else if (ae.kind === 'Unauthorized' || ae.kind === 'Forbidden') setError('Sesi berakhir. Masuk ulang untuk menyimpan perubahan.');
        console.error('Error updating event:', err);
        if (prevEvent) setEvents(prev => prev.map(e => e.id === ev.id ? prevEvent : e));
        return false;
      }
    }
    return true;
  }, [events]);

  /**
   * Sembunyikan/tampilkan event di halaman publik. Jalur eksplisit
   * (`setEventVisibility`) karena mapper umum hanya boleh menulis `'draft'`
   * (ADR 008). Optimistic: state lokal diubah dulu, dikembalikan bila gagal.
   */
  const setEventVisibility = useCallback(async (ev: EventItem, hidden: boolean): Promise<boolean> => {
    const prevEvent = events.find(e => e.id === ev.id);
    const nextStatus: EventStatus = hidden
      ? 'draft'
      : getStatus(ev.dateStr, ev.jam || '', ev.dateEnd, ev.dayTimeSlots);
    setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, status: nextStatus } : e));
    if (!ev.id) return true;
    try {
      await apiSetVisibility(ev.id, hidden);
      return true;
    } catch (err) {
      const ae = err instanceof AdminError ? err : new AdminError('Unknown', err instanceof Error ? err.message : String(err), 0);
      setLastError(ae);
      if (ae.kind === 'Conflict') setError('Data berubah di server. Muat ulang lalu coba lagi.');
      else if (ae.kind === 'Unauthorized' || ae.kind === 'Forbidden') setError('Sesi berakhir. Masuk ulang untuk menyimpan perubahan.');
      console.error('Error setting event visibility:', err);
      if (prevEvent) setEvents(prev => prev.map(e => e.id === ev.id ? prevEvent : e));
      return false;
    }
  }, [events]);

  const deleteEvent = useCallback(async (id: string): Promise<boolean> => {
    const target = events.find(e => e.id === id);
    setEvents(prev => prev.filter(e => e.id !== id));
    if (target?.id) {
      try {
        await apiDelete(target.id);
        await refreshEvents();
        return true;
      } catch (err) {
        const ae = err instanceof AdminError ? err : new AdminError('Unknown', err instanceof Error ? err.message : String(err), 0);
        setLastError(ae);
        if (ae.kind === 'Conflict') setError('Data berubah di server. Muat ulang lalu coba lagi.');
        else if (ae.kind === 'Unauthorized' || ae.kind === 'Forbidden') setError('Sesi berakhir. Masuk ulang untuk menyimpan perubahan.');
        console.error('Error deleting event:', err);
        if (target) setEvents(prev => sortEvents([...prev, target]));
        return false;
      }
    }
    return true;
  }, [events, refreshEvents]);

  const deleteRecurringSeries = useCallback(async (groupId: string): Promise<boolean> => {
    const targets = events.filter(e => e.recurrenceGroupId === groupId);
    const targetIds = targets.map(e => e.id);
    setEvents(prev => prev.filter(e => e.recurrenceGroupId !== groupId));
    try {
      await apiDeleteSeries(groupId);
      await refreshEvents();
      return true;
    } catch (err) {
      console.error('Error deleting recurring series:', err);
      setEvents(prev => sortEvents([...prev, ...targets]));
      return false;
    }
  }, [events, refreshEvents]);

  const addTheme = useCallback(async (theme: AnnualTheme): Promise<boolean> => {
    try {
      await apiCreateTheme({
        name: theme.name,
        dateStart: theme.dateStart,
        dateEnd: theme.dateEnd,
        color: theme.color,
      });
      await refreshEvents();
      return true;
    } catch (err) {
      console.error('Error adding annual theme:', err);
      return false;
    }
  }, [refreshEvents]);

  const updateTheme = useCallback(async (theme: AnnualTheme): Promise<boolean> => {
    if (!theme.id) return false;
    try {
      await apiUpdateTheme(theme as AnnualTheme & { id: string });
      await refreshEvents();
      return true;
    } catch (err) {
      console.error('Error updating annual theme:', err);
      return false;
    }
  }, [refreshEvents]);

  const deleteTheme = useCallback(async (themeRef: string | number): Promise<boolean> => {
    try {
      const id = typeof themeRef === 'string'
        ? themeRef
        : (annualThemes.find(theme => theme.sheetRow === themeRef)?.id || '');
      if (!id) return false;
      await apiDeleteTheme(id);
      await refreshEvents();
      return true;
    } catch (err) {
      console.error('Error deleting annual theme:', err);
      return false;
    }
  }, [annualThemes, refreshEvents]);

  return {
    events,
    filteredEvents,
    stats,
    months,
    categories,
    annualThemes,
    holidays,
    isLoading,
    error,
    lastError,
    clearLastError,
    searchQuery, setSearchQuery,
    activeFilter, setActiveFilter,
    activeCategory, setActiveCategory,
    activePriority, setActivePriority,
    activeMonth, setActiveMonth,
    addEvent, addRecurringEvents, updateEvent, setEventVisibility, deleteEvent, deleteRecurringSeries,
    addTheme, updateTheme, deleteTheme,
    refreshEvents,
  };
}
