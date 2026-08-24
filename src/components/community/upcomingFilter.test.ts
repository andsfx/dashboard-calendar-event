import { describe, it, expect } from 'vitest'
import { filterUpcomingForMonth } from './upcomingFilter'
import type { EventItem } from '../../types'

function makeEvent(overrides: Partial<EventItem> & { id: string }): EventItem {
  return {
    dateStr: '2026-08-10',
    day: 'Senin',
    jam: '10:00 - 12:00',
    acara: 'Event',
    lokasi: 'Lantai 3',
    eo: 'Panitia',
    pic: 'Ali',
    phone: '08123',
    keterangan: '',
    month: '2026-08',
    category: '',
    categories: [],
    priority: 'medium',
    eventModel: 'free',
    eventNominal: '',
    eventModelNotes: '',
    rowIndex: 0,
    tanggal: '10 Aug 2026',
    status: 'upcoming',
    ...overrides,
  }
}

describe('filterUpcomingForMonth', () => {
  it('keeps ongoing events even when they started last month', () => {
    const ongoing = makeEvent({ id: 'a', dateStr: '2026-07-28', status: 'ongoing' })
    const result = filterUpcomingForMonth([ongoing], '2026-08')
    expect(result.map(e => e.id)).toEqual(['a'])
  })

  it('limits upcoming events to the active month', () => {
    const inMonth = makeEvent({ id: 'a', dateStr: '2026-08-05', status: 'upcoming' })
    const nextMonth = makeEvent({ id: 'b', dateStr: '2026-09-12', status: 'upcoming' })
    const result = filterUpcomingForMonth([inMonth, nextMonth], '2026-08')
    expect(result.map(e => e.id)).toEqual(['a'])
  })

  it('falls back to the nearest upcoming events when the month is empty', () => {
    const far = makeEvent({ id: 'a', dateStr: '2026-10-02', status: 'upcoming' })
    const near = makeEvent({ id: 'b', dateStr: '2026-09-12', status: 'upcoming' })
    const result = filterUpcomingForMonth([far, near], '2026-08')
    expect(result.map(e => e.id)).toEqual(['b', 'a'])
  })

  it('sorts by priority first, then upcoming before ongoing, then date', () => {
    const lowUpcoming = makeEvent({ id: 'a', dateStr: '2026-08-30', status: 'upcoming', priority: 'low' })
    const highOngoing = makeEvent({ id: 'b', dateStr: '2026-08-01', status: 'ongoing', priority: 'high' })
    const mediumUpcoming = makeEvent({ id: 'c', dateStr: '2026-08-20', status: 'upcoming', priority: 'medium' })
    const result = filterUpcomingForMonth([lowUpcoming, highOngoing, mediumUpcoming], '2026-08')
    expect(result.map(e => e.id)).toEqual(['b', 'c', 'a'])
  })

  it('returns an empty array for empty input', () => {
    expect(filterUpcomingForMonth([], '2026-08')).toEqual([])
  })

  it('excludes past and draft events entirely', () => {
    const past = makeEvent({ id: 'a', dateStr: '2026-06-01', status: 'past' })
    const draft = makeEvent({ id: 'b', dateStr: '2026-08-05', status: 'draft' })
    expect(filterUpcomingForMonth([past, draft], '2026-08')).toEqual([])
  })
})
