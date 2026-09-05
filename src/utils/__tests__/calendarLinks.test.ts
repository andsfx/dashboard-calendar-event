/**
 * Tes calendarLinks — perilaku "Tambah ke Kalender":
 * - Google Calendar URL memuat tanggal/jam WIB, text, lokasi, details.
 * - ICS: DTSTART/DTEND TZID=Asia/Jakarta, UID stabil, escape koma/titik koma.
 * - All-day (tanpa jam) → VALUE=DATE + DTEND = tanggal berakhir + 1 (eksklusif).
 * - Multi-day → rentang menyesuaikan dateEnd.
 * - Tanggal invalid → null (tombol disembunyikan).
 * - Jam melewati tengah malam → DTEND digulung ke hari berikutnya.
 */
import { describe, it, expect } from 'vitest';
import { buildGoogleCalendarUrl, buildIcsBlob, icsFileName } from '../calendarLinks';
import type { EventItem } from '../../types';

function makeEvent(overrides: Partial<EventItem>): EventItem {
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

describe('buildGoogleCalendarUrl', () => {
  it('memuat tanggal + jam WIB, text, lokasi, dan details', () => {
    const url = buildGoogleCalendarUrl(makeEvent({}));
    expect(url).toContain('https://calendar.google.com/calendar/render?');
    expect(url).toContain('action=TEMPLATE');
    expect(url).toContain('ctz=Asia%2FJakarta');
    expect(url).toContain('text=Festival');
    expect(url).toContain('20261010T100000%2F20261010T120000');
    expect(url).toContain('location=Atrium+Utama+Lt.1');
    expect(url).toContain('details=Baru%21+Gratis+masuk');
  });

  it('null untuk tanggal invalid — caller menyembunyikan tombol', () => {
    expect(buildGoogleCalendarUrl(makeEvent({ dateStr: 'bukan-tanggal' }))).toBeNull();
  });
});

describe('buildIcsBlob', () => {
  it('VEVENT dengan TZID Asia/Jakarta, UID stabil, teks ter-escape', async () => {
    const blob = buildIcsBlob(makeEvent({}));
    expect(blob).not.toBeNull();
    const text = await blob!.text();
    expect(text).toContain('BEGIN:VCALENDAR');
    expect(text).toContain('UID:evt_1@metmalcommunityspace.web.id');
    expect(text).toContain('DTSTART;TZID=Asia/Jakarta:20261010T100000');
    expect(text).toContain('DTEND;TZID=Asia/Jakarta:20261010T120000');
    expect(text).toContain('SUMMARY:Festival Kuliner\\, Seni & Kriya');
    expect(text).toContain('LOCATION:Atrium Utama Lt.1');
    expect(text).toContain('DESCRIPTION:Baru! Gratis masuk');
    expect(text).toContain('END:VCALENDAR');
  });

  it('tanpa jam → all-day, DTEND = dateEnd + 1 hari (eksklusif)', async () => {
    const blob = buildIcsBlob(makeEvent({ jam: '', dateEnd: '2026-10-12' }));
    const text = await blob!.text();
    expect(text).toContain('DTSTART;VALUE=DATE:20261010');
    expect(text).toContain('DTEND;VALUE=DATE:20261013');
  });

  it('multi-day dengan jam → rentang dateStr..dateEnd', async () => {
    const blob = buildIcsBlob(makeEvent({ dateEnd: '2026-10-11', dateStr: '2026-10-10' }));
    const text = await blob!.text();
    expect(text).toContain('DTSTART;TZID=Asia/Jakarta:20261010T100000');
    expect(text).toContain('DTEND;TZID=Asia/Jakarta:20261011T120000');
  });

  it('jam melewati tengah malam → DTEND digulung ke hari berikutnya', async () => {
    const blob = buildIcsBlob(makeEvent({ jam: '22:00 - 01:00', dateEnd: undefined }));
    const text = await blob!.text();
    expect(text).toContain('DTSTART;TZID=Asia/Jakarta:20261010T220000');
    expect(text).toContain('DTEND;TZID=Asia/Jakarta:20261011T010000');
  });

  it('tanggal invalid → null', () => {
    expect(buildIcsBlob(makeEvent({ dateStr: 'salah' }))).toBeNull();
  });
});

describe('icsFileName', () => {
  it('slug acara + tanggal, karakter non-alfanumerik jadi strip', () => {
    expect(icsFileName(makeEvent({ acara: 'Festival Kuliner & Seni!!' }))).toBe('festival-kuliner-seni-2026-10-10.ics');
  });
});