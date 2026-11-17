/**
 * Builder feed ICS publik (`server/src/lib/ics.js`).
 *
 * Kontrak yang dikunci:
 * - Jam WIB ditulis wall-clock + TZID=Asia/Jakarta, bukan UTC.
 * - Event tanpa jam → all-day, DTEND = tanggal berakhir + 1 (eksklusif).
 * - UID stabil per event/slot supaya langganan memperbarui, bukan menduplikasi.
 * - Tanggal rusak dilewati, tidak menjatuhkan seluruh feed.
 * - Baris dilipat ≤75 oktet (UTF-8), termasuk nama acara non-ASCII.
 */
import { describe, expect, it } from 'vitest';
import {
  buildCalendarFeed,
  escapeIcsText,
  parseTimeRange,
  resolveEventRange,
} from '../ics.js';

const NOW = new Date('2026-11-17T03:00:00.000Z');

function makeEvent(overrides = {}) {
  return {
    id: 'evt_1',
    date_str: '2026-11-20',
    date_end: null,
    jam: '10:00 - 12:00',
    acara: 'Festival Kuliner, Seni & Kriya',
    lokasi: 'Atrium Utama Lt.1',
    keterangan: 'Baru! Gratis masuk',
    day_time_slots: null,
    ...overrides,
  };
}

describe('parseTimeRange', () => {
  it('menerima titik sebagai pemisah jam (10.00 - 12.00)', () => {
    expect(parseTimeRange('10.00 - 12.00')).toEqual({
      startHour: 10,
      startMin: 0,
      endHour: 12,
      endMin: 0,
    });
  });

  it('null untuk jam tunggal atau teks bebas (menjadi all-day)', () => {
    expect(parseTimeRange('13:00')).toBeNull();
    expect(parseTimeRange('Sepanjang hari')).toBeNull();
  });
});

describe('resolveEventRange', () => {
  it('event satu hari berdurasi memakai tanggal yang sama', () => {
    expect(resolveEventRange(makeEvent())).toEqual({
      start: '20261120T100000',
      end: '20261120T120000',
      allDay: false,
    });
  });

  it('jam melewati tengah malam digulung ke hari berikutnya', () => {
    expect(resolveEventRange(makeEvent({ jam: '22:00 - 01:00' }))).toEqual({
      start: '20261120T220000',
      end: '20261121T010000',
      allDay: false,
    });
  });

  it('tanpa jam → all-day multi-hari, DTEND eksklusif', () => {
    expect(resolveEventRange(makeEvent({ jam: '', date_end: '2026-11-22' }))).toEqual({
      start: '20261120T000000',
      end: '20261123T000000',
      allDay: true,
    });
  });

  it('tanggal mustahil (2026-02-31) → null', () => {
    expect(resolveEventRange(makeEvent({ date_str: '2026-02-31' }))).toBeNull();
  });
});

describe('escapeIcsText', () => {
  it('meng-escape backslash, titik koma, koma, dan newline', () => {
    expect(escapeIcsText('a\\b;c,d\ne')).toBe('a\\\\b\\;c\\,d\\ne');
  });
});

describe('buildCalendarFeed', () => {
  it('header kalender + VEVENT ber-TZID dan UID stabil', () => {
    const feed = buildCalendarFeed([makeEvent()], { now: NOW });
    expect(feed).toContain('BEGIN:VCALENDAR');
    expect(feed).toContain('X-WR-CALNAME:Jadwal Event Metropolitan Mall Bekasi');
    expect(feed).toContain('BEGIN:VTIMEZONE');
    expect(feed).toContain('TZID:Asia/Jakarta');
    expect(feed).toContain('UID:evt_1@metmalcommunityspace.web.id');
    expect(feed).toContain('DTSTAMP:20261117T030000Z');
    expect(feed).toContain('DTSTART;TZID=Asia/Jakarta:20261120T100000');
    expect(feed).toContain('DTEND;TZID=Asia/Jakarta:20261120T120000');
    expect(feed).toContain('SUMMARY:Festival Kuliner\\, Seni & Kriya');
    expect(feed).toContain('URL:https://www.metmalcommunityspace.web.id/events/evt_1');
    expect(feed).toContain('END:VCALENDAR');
    expect(feed.endsWith('\r\n')).toBe(true);
  });

  it('multi-hari ber-day_time_slots → satu VEVENT per slot', () => {
    const feed = buildCalendarFeed([
      makeEvent({
        date_end: '2026-11-22',
        day_time_slots: [
          { date: '2026-11-20', jam: '10:00 - 12:00' },
          { date: '2026-11-21', jam: '13:00 - 15:00' },
        ],
      }),
    ], { now: NOW });

    expect(feed.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(feed).toContain('UID:evt_1-2026-11-20-0@metmalcommunityspace.web.id');
    expect(feed).toContain('UID:evt_1-2026-11-21-1@metmalcommunityspace.web.id');
    expect(feed).toContain('DTSTART;TZID=Asia/Jakarta:20261121T130000');
    expect(feed).not.toContain('DTEND;TZID=Asia/Jakarta:20261122T150000');
  });

  it('slot duplikat dihilangkan', () => {
    const feed = buildCalendarFeed([
      makeEvent({
        day_time_slots: [
          { date: '2026-11-20', jam: '10:00 - 12:00' },
          { date: '2026-11-20', jam: '10:00 - 12:00' },
        ],
      }),
    ], { now: NOW });
    expect(feed.match(/BEGIN:VEVENT/g)).toHaveLength(1);
  });

  it('jam tunggal tetap all-day, jam mentah masuk DESCRIPTION', () => {
    const feed = buildCalendarFeed([makeEvent({ jam: '13.00 WIB' })], { now: NOW });
    expect(feed).toContain('DTSTART;VALUE=DATE:20261120');
    expect(feed).toContain('Jam: 13.00 WIB');
  });

  it('tapak "-" tidak ditulis sebagai jam', () => {
    const feed = buildCalendarFeed([makeEvent({ jam: '-' })], { now: NOW });
    expect(feed).not.toContain('Jam: -');
  });

  it('baris dengan tanggal rusak dilewati tanpa menggagalkan feed', () => {
    const feed = buildCalendarFeed([
      makeEvent({ id: 'rusak', date_str: '12 Juli 2026' }),
      makeEvent({ id: 'valid' }),
    ], { now: NOW });
    expect(feed).not.toContain('UID:rusak@');
    expect(feed).toContain('UID:valid@');
  });

  it('setiap baris ≤75 oktet, termasuk nama acara non-ASCII', () => {
    const feed = buildCalendarFeed([
      makeEvent({ acara: 'Pameran Kriya Nusantara dengan Nama Sangat Panjang ' + 'é'.repeat(40) }),
    ], { now: NOW });
    for (const line of feed.split('\r\n')) {
      expect(Buffer.byteLength(line, 'utf8'), line).toBeLessThanOrEqual(75);
    }
  });
});