/**
 * Sumber kebenaran hari untuk label seri berulang (audit A-11).
 *
 * `dateStr` menang atas `day` tersimpan; `day` hanya fallback bila dateStr
 * tidak ada/tidak valid. Tanggal dibangun oleh `parseDateStrLocal`
 * (`new Date(y, m-1, d)`), jadi nama hari tidak bergantung timezone mesin —
 * jangan pakai `new Date('2026-11-17')` (itu parsing UTC).
 */
import { describe, expect, it } from 'vitest';
import type { EventItem } from '../../types';
import { DAY_NAMES, parseDateStrLocal, recurringScheduleLabel } from '../eventUtils';

function ev(partial: Partial<EventItem>): EventItem {
  return {
    id: 'e', dateStr: '2026-11-03', day: 'Selasa', jam: '', acara: 'A', lokasi: '',
    eo: '', pic: '', phone: '', keterangan: '', month: '', category: 'Umum',
    categories: [], priority: 'medium', eventModel: '', eventNominal: '',
    eventModelNotes: '', status: 'upcoming',
    ...partial,
  } as EventItem;
}

describe('recurringScheduleLabel — hari dari dateStr', () => {
  it('memakai dateStr walau event.day bertentangan', () => {
    // 2026-11-17 = Selasa; `day` tersimpan 'Senin' adalah sisa jadwal lama.
    const date = parseDateStrLocal('2026-11-17');
    expect(date).not.toBeNull();
    expect(DAY_NAMES[date!.getDay()]).toBe('Selasa');

    expect(recurringScheduleLabel(ev({ day: 'Senin', dateStr: '2026-11-17' }))).toBe('Setiap hari Selasa');
  });

  it('jatuh ke event.day bila dateStr tidak ada', () => {
    expect(recurringScheduleLabel(ev({ day: 'Kamis', dateStr: '' }))).toBe('Setiap hari Kamis');
  });

  it('jatuh ke event.day bila dateStr tidak valid', () => {
    expect(recurringScheduleLabel(ev({ day: 'Jumat', dateStr: '2026-02-30' }))).toBe('Setiap hari Jumat');
    expect(recurringScheduleLabel(ev({ day: 'Jumat', dateStr: 'bukan-tanggal' }))).toBe('Setiap hari Jumat');
  });

  it('mempertahankan label lama saat keduanya kosong', () => {
    expect(recurringScheduleLabel(ev({ day: '', dateStr: '' }))).toBe('Event reguler');
  });

  it('tidak mengubah bentuk keluaran label', () => {
    expect(recurringScheduleLabel(ev({ day: 'Selasa', dateStr: '2026-11-03' }))).toBe('Setiap hari Selasa');
  });
});
