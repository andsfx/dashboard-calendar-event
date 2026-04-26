import { describe, it, expect } from 'vitest'
import { sortEvents, recalculateStatuses, parseDateStrLocal, generateRecurringDates } from '../eventUtils'
import type { EventItem, RecurrenceRule } from '../../types'

describe('eventUtils', () => {
  describe('sortEvents', () => {
    it('sorts events by status order', () => {
      const events: EventItem[] = [
        { id: '1', status: 'past', dateStr: '2024-01-01', acara: 'Past Event' } as EventItem,
        { id: '2', status: 'ongoing', dateStr: '2024-01-15', acara: 'Ongoing Event' } as EventItem,
        { id: '3', status: 'upcoming', dateStr: '2024-02-01', acara: 'Upcoming Event' } as EventItem,
      ]
      
      const sorted = sortEvents(events)
      expect(sorted[0].status).toBe('ongoing')
      expect(sorted[1].status).toBe('upcoming')
      expect(sorted[2].status).toBe('past')
    })

    it('sorts by date within same status', () => {
      const events: EventItem[] = [
        { id: '1', status: 'upcoming', dateStr: '2024-02-15', acara: 'Event 2' } as EventItem,
        { id: '2', status: 'upcoming', dateStr: '2024-02-01', acara: 'Event 1' } as EventItem,
      ]
      
      const sorted = sortEvents(events)
      expect(sorted[0].dateStr).toBe('2024-02-01')
      expect(sorted[1].dateStr).toBe('2024-02-15')
    })
  })

  describe('parseDateStrLocal', () => {
    it('parses valid date string', () => {
      const date = parseDateStrLocal('2024-01-15')
      expect(date).toBeInstanceOf(Date)
      expect(date?.getFullYear()).toBe(2024)
      expect(date?.getMonth()).toBe(0) // January is 0
      expect(date?.getDate()).toBe(15)
    })

    it('returns null for invalid date', () => {
      expect(parseDateStrLocal('invalid')).toBeNull()
      expect(parseDateStrLocal('')).toBeNull()
    })
  })

  describe('recalculateStatuses', () => {
    it('marks past events correctly', () => {
      const events: EventItem[] = [
        { id: '1', dateStr: '2020-01-01', status: 'upcoming', acara: 'Old Event' } as EventItem,
      ]
      
      const updated = recalculateStatuses(events)
      expect(updated[0].status).toBe('past')
    })

    it('preserves draft status', () => {
      const events: EventItem[] = [
        { id: '1', dateStr: '2024-01-01', status: 'draft', acara: 'Draft Event' } as EventItem,
      ]
      
      const updated = recalculateStatuses(events)
      expect(updated[0].status).toBe('draft')
    })
  })

  describe('generateRecurringDates', () => {
    it('generates weekly recurring dates', () => {
      const rule: RecurrenceRule = {
        frequency: 'weekly',
        daysOfWeek: [1], // Monday
        dayOfMonth: 1,
        interval: 1,
        endDate: '2024-02-15',
      }
      
      const dates = generateRecurringDates('2024-01-15', rule)
      expect(dates.length).toBeGreaterThan(0)
      expect(dates[0]).toBe('2024-01-15')
    })

    it('generates monthly recurring dates', () => {
      const rule: RecurrenceRule = {
        frequency: 'monthly',
        daysOfWeek: [],
        dayOfMonth: 15,
        interval: 1,
        endDate: '2024-04-15',
      }
      
      const dates = generateRecurringDates('2024-01-15', rule)
      expect(dates.length).toBe(4) // Jan, Feb, Mar, Apr
    })

    it('returns empty array for invalid dates', () => {
      const rule: RecurrenceRule = {
        frequency: 'weekly',
        daysOfWeek: [1],
        dayOfMonth: 1,
        interval: 1,
        endDate: '2024-01-01',
      }
      
      const dates = generateRecurringDates('2024-02-01', rule)
      expect(dates).toEqual([])
    })
  })
})
