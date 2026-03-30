import { useState, useMemo, useCallback, useEffect } from 'react';
import { EventItem, EventStatus, AnnualTheme } from '../types';
import { sortEvents, recalculateStatuses } from '../utils/eventUtils';
import { fetchEvents, createEvent as apiCreate, updateEvent as apiUpdate, deleteEvent as apiDelete } from '../utils/sheetsApi';

function normalizeEvent(ev: EventItem): EventItem {
  return recalculateStatuses([ev])[0];
}

export function useEvents() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [annualThemes, setThemes] = useState<AnnualTheme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<EventStatus | 'Semua'>('Semua');
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [activePriority, setActivePriority] = useState('Semua');
  const [activeMonth, setActiveMonth] = useState('Semua');

  // Load from Sheets
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { events: sheetsEvents, themes: sheetsThemes } = await fetchEvents();
        setEvents(recalculateStatuses(sheetsEvents));
        setThemes(sheetsThemes);
      } catch (err) {
        console.error('Fetch error:', err);
        setError('Gagal memuat data dari spreadsheet. Periksa koneksi atau konfigurasi URL.');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

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
    const unique = [...new Set(events.map(e => e.category))];
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
    if (activeCategory !== 'Semua') result = result.filter(e => e.category === activeCategory);
    if (activePriority !== 'Semua') result = result.filter(e => e.priority === activePriority);
    if (activeMonth !== 'Semua') result = result.filter(e => e.month === activeMonth);
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(e =>
        e.acara.toLowerCase().includes(q) ||
        e.lokasi.toLowerCase().includes(q) ||
        e.eo.toLowerCase().includes(q) ||
        e.keterangan.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
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
      const row = await apiCreate(apiData);
      setEvents(prev => prev.map(e => e.id === tempId ? { ...e, sheetRow: row } : e));
      return true;
    } catch (err) {
      console.error('Error adding event:', err);
      setEvents(prev => prev.filter(e => e.id !== tempId));
      return false;
    }
  }, []);

  const updateEvent = useCallback(async (ev: EventItem): Promise<boolean> => {
    const prevEvent = events.find(e => e.id === ev.id);
    const normalizedEvent = normalizeEvent(ev);
    setEvents(prev => prev.map(e => e.id === ev.id ? normalizedEvent : e));
    if (ev.sheetRow) {
      try {
        await apiUpdate(normalizedEvent as EventItem & { sheetRow: number });
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
    if (target?.sheetRow) {
      try {
        await apiDelete(target.sheetRow);
        return true;
      } catch (err) {
        console.error('Error deleting event:', err);
        if (target) setEvents(prev => [...prev, target]);
        return false;
      }
    }
    return true;
  }, [events]);

  return {
    events,
    filteredEvents,
    stats,
    months,
    categories,
    annualThemes,
    isLoading,
    error,
    searchQuery, setSearchQuery,
    activeFilter, setActiveFilter,
    activeCategory, setActiveCategory,
    activePriority, setActivePriority,
    activeMonth, setActiveMonth,
    addEvent, updateEvent, deleteEvent,
  };
}
