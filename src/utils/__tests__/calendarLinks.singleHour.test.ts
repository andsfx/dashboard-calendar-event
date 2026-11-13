/**
 * Regresi ekspor kalender untuk `jam` berformat jam tunggal ("13:00").
 *
 * `parseTimeRange` sengaja tetap rentang dua sisi, jadi nilai seperti "13:00"
 * TIDAK menghasilkan rentang durasi nol. Ekspor harus jatuh ke all-day seperti
 * event tanpa jam — bukan DTSTART == DTEND (audit A-10).
 */
import { describe, expect, it } from 'vitest';
import { buildGoogleCalendarUrl, buildIcsBlob } from '../calendarLinks';
import type { EventItem } from '../../types';

function makeEvent(overrides: Partial<EventItem>): EventItem {
  return {
    id: 'evt_single_hour',
    acara: 'Kelas Zumba',
    dateStr: '2026-10-10',
    dateEnd: undefined,
    jam: '13:00',
    lokasi: 'Atrium Utama',
    eo: 'Metmal',
    keterangan: '',
    status: 'upcoming',
    ...overrides,
  } as EventItem;
}

describe('calendarLinks — jam tunggal tetap all-day', () => {
  it('Google Calendar memakai rentang tanggal, bukan jam', () => {
    const url = buildGoogleCalendarUrl(makeEvent({}));
    expect(url).not.toBeNull();
    // All-day: YYYYMMDD/YYYYMMDD (tanggal berakhir + 1, eksklusif).
    expect(url).toContain('dates=20261010%2F20261011');
    expect(url).not.toContain('T130000');
    expect(url).not.toContain('T000000');
  });

  it('ICS memakai VALUE=DATE, bukan TZID dengan durasi nol', async () => {
    const blob = buildIcsBlob(makeEvent({}));
    expect(blob).not.toBeNull();
    const text = await blob!.text();
    expect(text).toContain('DTSTART;VALUE=DATE:20261010');
    expect(text).toContain('DTEND;VALUE=DATE:20261011');
    expect(text).not.toContain('DTSTART;TZID=');
  });
});
