import { useState, useMemo, useCallback, useEffect } from 'react';
import { EventItem, EventStatus, AnnualTheme } from '../types';
import { mockEvents, annualThemes as mockThemes } from '../data/mockEvents';
import { sortEvents, recalculateStatuses } from '../utils/eventUtils';
import { fetchEvents, createEvent as apiCreate, updateEvent as apiUpdate, deleteEvent as apiDelete } from '../utils/sheetsApi';

export function useEvents() {
  const [events, setEvents] = useState<EventItem[]>(recalculateStatuses(mockEvents));
  const [annualThemes, setThemes] = useState<AnnualTheme[]>(mockThemes);
  const [isLoading, setIsLoading] = useState(false);
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
        setError('Gagal memuat data dari spreadsheet. Menggunakan data lokal.');
        setEvents(recalculateStatuses(mockEvents));
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
  }, [events, activeFilter, activeCategory, activePriority, debouncedSearch]);

  const addEvent = useCallback(async (ev: EventItem) => {
    setEvents(prev => [...prev, ev]);
    try {
      const { id, status, rowIndex, ...apiData } = ev;
      const row = await apiCreate(apiData);
      setEvents(prev => prev.map(e => e.id === id ? { ...e, sheetRow: row } : e));
    } catch (err) {
      console.error('Error adding event:', err);
    }
  }, []);

  const updateEvent = useCallback(async (ev: EventItem) => {
    setEvents(prev => prev.map(e => e.id === ev.id ? ev : e));
    if (ev.sheetRow) {
      try {
        await apiUpdate(ev as EventItem & { sheetRow: number });
      } catch (err) {
        console.error('Error updating event:', err);
      }
    }
  }, []);

  const deleteEvent = useCallback(async (id: string) => {
    const target = events.find(e => e.id === id);
    setEvents(prev => prev.filter(e => e.id !== id));
    if (target?.sheetRow) {
      try {
        await apiDelete(target.sheetRow);
      } catch (err) {
        console.error('Error deleting event:', err);
      }
    }
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
