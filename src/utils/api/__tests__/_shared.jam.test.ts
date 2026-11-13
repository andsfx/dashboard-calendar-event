/**
 * Mapper tulis menegakkan kontrak `jam`/`day` (audit A-10/A-11).
 *
 * Semua jalur tulis (create/update/batch event, create/update draft) lewat
 * `eventItemToDbRow`/`draftItemToDbRow`, jadi nilai sampah tidak boleh lolos
 * ke DB dari sini.
 */
import { describe, expect, it } from 'vitest';
import {
  dbDraftToDraftItem,
  dbEventToEventItem,
  draftItemToDbRow,
  eventItemToDbRow,
  type DbDraft,
  type DbEvent,
} from '../_shared';

describe('eventItemToDbRow — kontrak jam', () => {
  it('jam tunggal + WIB disimpan dalam bentuk kanonik', () => {
    expect(eventItemToDbRow({ jam: '13.00 WIB' }).jam).toBe('13:00');
  });

  it('placeholder tidak pernah disimpan', () => {
    expect(eventItemToDbRow({ jam: '–' }).jam).toBe('');
    expect(eventItemToDbRow({ jam: '-' }).jam).toBe('');
    expect(eventItemToDbRow({ jam: 'TBA' }).jam).toBe('');
  });

  it('rentang tetap dinormalkan', () => {
    expect(eventItemToDbRow({ jam: '10.00 - 12.00' }).jam).toBe('10:00 - 12:00');
  });

  it('field lain tidak ditambahkan saat jam tidak dikirim', () => {
    const row = eventItemToDbRow({ acara: 'Bazaar' });
    expect('jam' in row).toBe(false);
    expect('day' in row).toBe(false);
  });
});

describe('eventItemToDbRow — day mengikuti dateStr', () => {
  it('day basi ditimpa hari dari dateStr', () => {
    // 2026-11-17 = Selasa.
    const row = eventItemToDbRow({ dateStr: '2026-11-17', day: 'Senin' });
    expect(row.day).toBe('Selasa');
  });

  it('day tersimpan dipakai bila dateStr tidak ada', () => {
    expect(eventItemToDbRow({ day: 'Senin' }).day).toBe('Senin');
  });
});

describe('draftItemToDbRow — kontrak jam', () => {
  it('menormalkan jam draft seperti event', () => {
    expect(draftItemToDbRow({ jam: '13.00 WIB' }).jam).toBe('13:00');
    expect(draftItemToDbRow({ jam: '–' }).jam).toBe('');
    expect(draftItemToDbRow({ jam: '10.00 - 12.00' }).jam).toBe('10:00 - 12:00');
  });
});

// ─── Sisi baca: data historis ────────────────────────────────────

function makeDbRow(partial: Partial<DbEvent> = {}): DbEvent {
  return {
    id: 'evt_1', date_str: '2026-09-10', date_end: null, day: 'Kamis',
    tanggal: '10 September 2026', jam: '10:00 - 21:00', acara: 'Festival Minang 2026',
    lokasi: 'Atrium Utama', eo: 'Komunitas Minang', pic: '', phone: '', keterangan: '',
    month: 'September', status: null, category: 'Festival', categories: ['Festival'],
    priority: 'medium', event_model: '', event_nominal: '', event_model_notes: '',
    source_draft_id: '', is_multi_day: false, day_time_slots: null, event_type: 'single',
    recurrence_group_id: '', is_recurring: false, poster_url: null, organization_id: null,
    area_id: null,
    ...partial,
  } as DbEvent;
}

function makeDraftRow(partial: Partial<DbDraft> = {}): DbDraft {
  return {
    id: 'dft_1', date_str: '2026-09-10', date_end: null, day: 'Kamis',
    tanggal: '10 September 2026', jam: '10:00 - 21:00', acara: 'Workshop',
    lokasi: 'Atrium', eo: 'EO', pic: '', phone: '', keterangan: '', internal_note: '',
    month: 'September', category: 'Workshop', categories: ['Workshop'], priority: 'medium',
    event_model: '', event_nominal: '', event_model_notes: '', progress: 'draft',
    published: false, published_at: null, deleted: false, deleted_at: null,
    is_multi_day: false, day_time_slots: null, event_type: 'single',
    recurrence_group_id: '', is_recurring: false, area_id: null,
    ...partial,
  } as DbDraft;
}

describe('dbEventToEventItem — jam historis dinormalkan saat baca', () => {
  it('placeholder "–" tidak lagi tampil di kartu', () => {
    const item = dbEventToEventItem(makeDbRow({ jam: '–' }), 0);
    expect(item.jam).toBe('');
  });

  it('format campur "13.00 WIB" menjadi "13:00"', () => {
    expect(dbEventToEventItem(makeDbRow({ jam: '13.00 WIB' }), 0).jam).toBe('13:00');
  });

  it('teks bermakna yang tidak dipahami dipertahankan', () => {
    expect(dbEventToEventItem(makeDbRow({ jam: 'Setelah Isya' }), 0).jam).toBe('Setelah Isya');
  });
});

describe('dbDraftToDraftItem — jam historis dinormalkan saat baca', () => {
  it('placeholder "-" menjadi kosong', () => {
    expect(dbDraftToDraftItem(makeDraftRow({ jam: '-' }), 0).jam).toBe('');
  });
});

// ─── Roundtrip baca → tulis: satu aturan, tidak boleh menghapus data ──
// Jalur nyata: EventCrudModal mem-prefill form dari item hasil baca, lalu
// mengirim ulang SELURUH objek saat admin mengubah field apa pun.

describe('roundtrip dbEventToEventItem → eventItemToDbRow', () => {
  function roundtrip(jam: string) {
    return eventItemToDbRow(dbEventToEventItem(makeDbRow({ jam }), 0)).jam;
  }

  it('prosa dipertahankan apa adanya (bukan dihapus)', () => {
    expect(roundtrip('Sepanjang hari')).toBe('Sepanjang hari');
    expect(roundtrip('Setelah Isya')).toBe('Setelah Isya');
  });

  it('format campur dinormalkan stabil', () => {
    expect(roundtrip('13.00 WIB')).toBe('13:00');
    expect(roundtrip('10.00 - 12.00')).toBe('10:00 - 12:00');
  });

  it('jam mulai dengan akhir tak terbaca menjadi jam mulai', () => {
    expect(roundtrip('11.00 WIB - selesai')).toBe('11:00');
  });

  it('placeholder hilang (tidak tersimpan ulang)', () => {
    expect(roundtrip('–')).toBe('');
    expect(roundtrip('-')).toBe('');
  });

  it('mengubah field lain tidak mengubah jam', () => {
    const item = dbEventToEventItem(makeDbRow({ jam: 'Setelah Isya' }), 0);
    const row = eventItemToDbRow({ ...item, lokasi: 'Lantai 2' });
    expect(row.lokasi).toBe('Lantai 2');
    expect(row.jam).toBe('Setelah Isya');
  });
});
