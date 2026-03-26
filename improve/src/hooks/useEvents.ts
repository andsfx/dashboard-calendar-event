import { useState, useMemo, useCallback, useEffect } from 'react';
import { EventItem, EventStatus } from '../types';
import { mockEvents } from '../data/mockEvents';
import { sortEvents } from '../utils/eventUtils';

export function useEvents() {
  const [events, setEvents] = useState<EventItem[]>(mockEvents);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<EventStatus | 'Semua'>('Semua');
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [activePriority, setActivePriority] = useState('Semua');

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

  const addEvent = useCallback((ev: EventItem) => {
    setEvents(prev => [...prev, ev]);
  }, []);

  const updateEvent = useCallback((ev: EventItem) => {
    setEvents(prev => prev.map(e => e.id === ev.id ? ev : e));
  }, []);

  const deleteEvent = useCallback((id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  }, []);

  return {
    events,
    filteredEvents,
    stats,
    months,
    categories,
    searchQuery, setSearchQuery,
    activeFilter, setActiveFilter,
    activeCategory, setActiveCategory,
    activePriority, setActivePriority,
    addEvent, updateEvent, deleteEvent,
  };
}
