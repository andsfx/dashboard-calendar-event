import { useState, useMemo, useCallback, useEffect } from 'react';
import { EventItem, EventStatus, AnnualTheme, HolidayItem } from '../types';
import { sortEvents, recalculateStatuses } from '../utils/eventUtils';
import { fetchEvents, createEvent as apiCreate, updateEvent as apiUpdate, deleteEvent as apiDelete, createAnnualTheme as apiCreateTheme, updateAnnualTheme as apiUpdateTheme, deleteAnnualTheme as apiDeleteTheme, batchCreateEvents as apiBatchCreate, deleteRecurringSeries as apiDeleteSeries } from '../utils/supabaseApi';
import { supabase } from '../lib/supabase';

function normalizeEvent(ev: EventItem): EventItem {
  const normalized = recalculateStatuses([ev])[0];
  if (!normalized) {
    return ev;
  }
  return normalized;
}

export function useEvents() {
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

  const refreshEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { events: fetchedEvents, themes: fetchedThemes, holidays: fetchedHolidays } = await fetchEvents();
      setEvents(recalculateStatuses(fetchedEvents));
      setThemes(fetchedThemes);
      setHolidays(fetchedHolidays);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Gagal memuat data event. Periksa koneksi atau konfigurasi proxy publik.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load from Supabase
  useEffect(() => {
    refreshEvents();
  }, [refreshEvents]);

  // Supabase Realtime: auto-refresh on changes
  useEffect(() => {
    const channel = supabase
      .channel('events-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        refreshEvents();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'annual_themes' }, () => {
        refreshEvents();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'holidays' }, () => {
        refreshEvents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshEvents]);

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
      const { id, status, rowIndex, ...apiData } = normalizedEvent;
      const created = await apiCreate(apiData);
      setEvents(prev => prev.map(e => e.id === tempId ? { ...e, id: created.id || tempId, sheetRow: created.row } : e));
      return true;
    } catch (err) {
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
        const { id, status, rowIndex, ...apiData } = e;
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

  const updateEvent = useCallback(async (ev: EventItem): Promise<boolean> => {
    const prevEvent = events.find(e => e.id === ev.id);
    const normalizedEvent = normalizeEvent(ev);
    setEvents(prev => prev.map(e => e.id === ev.id ? normalizedEvent : e));
    if (ev.id) {
      try {
        await apiUpdate(normalizedEvent as EventItem & { id: string });
        return true;
      } catch (err) {
        console.error('Error updating event:', err);
        if (prevEvent) setEvents(prev => prev.map(e => e.id === ev.id ? prevEvent : e));
        return false;
      }
    }
    return true;
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
        console.error('Error deleting event:', err);
        if (target) setEvents(prev => [...prev, target]);
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
      setEvents(prev => [...prev, ...targets]);
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
    searchQuery, setSearchQuery,
    activeFilter, setActiveFilter,
    activeCategory, setActiveCategory,
    activePriority, setActivePriority,
    activeMonth, setActiveMonth,
    addEvent, addRecurringEvents, updateEvent, deleteEvent, deleteRecurringSeries,
    addTheme, updateTheme, deleteTheme,
    refreshEvents,
  };
}
