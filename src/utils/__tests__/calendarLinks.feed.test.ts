/**
 * Feed langganan kalender (client-side):
 * - `calendarFeedUrl()` menghasilkan URL absolut ke `/api/v1/calendar.ics`.
 * - `googleCalendarSubscribeUrl()` memakai URL `webcal://` di parameter `cid`.
 * - `buildEventsIcsBlob()` membangun file .ics berisi banyak event (fallback
 *   langganan), memecah multi-hari ber-slot jadi satu VEVENT per hari.
 */
import { describe, expect, it } from 'vitest';
import {
  CALENDAR_ICS_FILE_NAME,
  buildEventsIcsBlob,
  buildGoogleCalendarUrl,
  buildIcsBlob,
  calendarFeedUrl,
  googleCalendarSubscribeUrl,
} from '../calendarLinks';
import type { EventItem } from '../../types';

function makeEvent(overrides: Partial<EventItem> = {}): EventItem {
  return {
    id: 'evt_1',
    acara: 'Festival Kuliner, Seni & Kriya',
    dateStr: '2026-10-10',
    dateEnd: undefined,
    jam: '10:00 - 12:00',
    lokasi: 'Atrium Utama Lt.1',
    eo: 'Nusantara Culinary',
    keterangan: 'Baru! Gratis masuk',
    status: 'upcoming',
    ...overrides,
  } as EventItem;
}

describe('calendarFeedUrl', () => {
  it('menghasilkan URL absolut ke /api/v1/calendar.ics', () => {
    const url = calendarFeedUrl();
    expect(url).toMatch(/^https?:\/\//);
    expect(url.endsWith('/api/v1/calendar.ics')).toBe(true);
  });
});

describe('googleCalendarSubscribeUrl', () => {
  it('mengubah https menjadi webcal dan meng-encode cid', () => {
    const url = googleCalendarSubscribeUrl('https://api.example.com/api/v1/calendar.ics');
    expect(url).toBe(
      'https://calendar.google.com/calendar/r?cid=' +
      encodeURIComponent('webcal://api.example.com/api/v1/calendar.ics'),
    );
  });
});

describe('buildGoogleCalendarUrl', () => {
  it('jam tunggal tetap all-day, jam asli masuk details', () => {
    const url = buildGoogleCalendarUrl(makeEvent({ jam: '13.00 WIB' }));
    expect(url).toContain('dates=20261010%2F20261011');
    const details = new URL(url!).searchParams.get('details') ?? '';
    expect(details).toContain('Jam: 13.00 WIB');
  });
});

describe('buildEventsIcsBlob', () => {
  it('memuat nama kalender + semua event dengan UID stabil', async () => {
    const blob = buildEventsIcsBlob([makeEvent(), makeEvent({ id: 'evt_2', acara: 'Bazar' })]);
    const text = await blob.text();

    expect(text).toContain('X-WR-CALNAME:Jadwal Event Metropolitan Mall Bekasi');
    expect(text).toContain('UID:evt_1@metmalcommunityspace.web.id');
    expect(text).toContain('UID:evt_2@metmalcommunityspace.web.id');
    expect(text.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(text).toContain('END:VCALENDAR');
  });

  it('multi-hari ber-dayTimeSlots dipecah per slot', async () => {
    const blob = buildEventsIcsBlob([
      makeEvent({
        id: 'evt_multi',
        dateEnd: '2026-10-12',
        dayTimeSlots: [
          { date: '2026-10-10', jam: '10:00 - 12:00' },
          { date: '2026-10-11', jam: '13:00 - 15:00' },
        ],
      }),
    ]);
    const text = await blob.text();

    expect(text.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(text).toContain('UID:evt_multi-2026-10-10-0@metmalcommunityspace.web.id');
    expect(text).toContain('UID:evt_multi-2026-10-11-1@metmalcommunityspace.web.id');
    expect(text).toContain('DTSTART;TZID=Asia/Jakarta:20261011T130000');
  });

  it('jam tunggal jadi all-day dengan jam mentah di deskripsi', async () => {
    const blob = buildEventsIcsBlob([makeEvent({ jam: '13.00 WIB' })]);
    const text = await blob.text();
    expect(text).toContain('DTSTART;VALUE=DATE:20261010');
    expect(text).toContain('Jam: 13.00 WIB');
  });

  it('buildIcsBlob satu event juga memecah dayTimeSlots seperti feed', async () => {
    const blob = buildIcsBlob(makeEvent({
      id: 'evt_slot',
      dateEnd: '2026-10-11',
      dayTimeSlots: [
        { date: '2026-10-10', jam: '10:00 - 12:00' },
        { date: '2026-10-11', jam: '13:00 - 15:00' },
      ],
    }));
    expect(blob).not.toBeNull();
    const text = await blob!.text();
    expect(text.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(text).toContain('UID:evt_slot-2026-10-11-1@metmalcommunityspace.web.id');
  });

  it('tanggal invalid dilewati, feed tetap sah', async () => {
    const blob = buildEventsIcsBlob([
      makeEvent({ id: 'rusak', dateStr: 'bukan-tanggal' }),
      makeEvent({ id: 'valid' }),
    ]);
    const text = await blob.text();
    expect(text).not.toContain('UID:rusak@');
    expect(text).toContain('UID:valid@');
  });

  it('setiap baris ≤75 oktet walau nama acara panjang/non-ASCII', async () => {
    const blob = buildEventsIcsBlob([
      makeEvent({ acara: 'Pameran Kriya Nusantara ' + 'é'.repeat(50) }),
    ]);
    const text = await blob.text();
    const encoder = new TextEncoder();
    for (const line of text.split('\r\n')) {
      expect(encoder.encode(line).length, line).toBeLessThanOrEqual(75);
    }
  });

  it('nama berkas feed stabil', () => {
    expect(CALENDAR_ICS_FILE_NAME).toBe('jadwal-event-mmb.ics');
  });
});