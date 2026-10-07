/**
 * Test jalur visibilitas publik event (hide/unhide) — ADR 008.
 *
 * Kontrak yang dijaga:
 * - `setEventVisibility(id, hidden)` mengirim SATU literal lifecycle ke
 *   `updateEvent`: 'draft' saat disembunyikan, 'published' saat ditampilkan.
 *   Tanpa jalur ini, "tampilkan kembali" mustahil karena mapper umum hanya
 *   mengirim 'draft'.
 * - Mapper umum `eventItemToDbRow` TETAP tidak pernah mengirim status selain
 *   'draft' — edit biasa tidak boleh menulis nilai temporal (ADR 002/008).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { eventItemToDbRow } from '../_shared';
import { setEventVisibility, updateEvent, fetchAdminEvents } from '../eventsApi';
import type { EventItem } from '../../../types';

function mockOkFetch(payload: unknown = { success: true }): Mock {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(payload)),
    json: () => Promise.resolve(payload),
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** Body JSON dari panggilan fetch pertama. */
function sentBody(fetchMock: Mock): Record<string, unknown> {
  const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
  return JSON.parse(String(init?.body ?? '{}'));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('setEventVisibility — gerbang visibilitas publik', () => {
  it('hidden=true mengirim status literal "draft"', async () => {
    const fetchMock = mockOkFetch();
    await setEventVisibility('evt_1', true);

    expect(sentBody(fetchMock)).toEqual({
      action: 'updateEvent',
      id: 'evt_1',
      data: { status: 'draft' },
    });
  });

  it('hidden=false mengirim status literal "published"', async () => {
    const fetchMock = mockOkFetch();
    await setEventVisibility('evt_1', false);

    expect(sentBody(fetchMock)).toEqual({
      action: 'updateEvent',
      id: 'evt_1',
      data: { status: 'published' },
    });
  });
});

describe('updateEvent — lifecycle eksplisit digabung ke satu request', () => {
  it('lifecycle "draft" dikirim bersama perubahan field (bukan dua request)', async () => {
    const fetchMock = mockOkFetch();
    await updateEvent({ id: 'evt_1', acara: 'Nama Baru' } as Partial<EventItem> & { id: string }, 'draft');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sentBody(fetchMock)).toEqual({
      action: 'updateEvent',
      id: 'evt_1',
      data: { acara: 'Nama Baru', status: 'draft' },
    });
  });

  it('tanpa lifecycle, kolom status tidak ikut terkirim (edit biasa)', async () => {
    const fetchMock = mockOkFetch();
    await updateEvent({ id: 'evt_1', acara: 'Nama Baru' } as Partial<EventItem> & { id: string });

    expect(sentBody(fetchMock)).toEqual({
      action: 'updateEvent',
      id: 'evt_1',
      data: { acara: 'Nama Baru' },
    });
  });

  it('lifecycle "published" menampilkan kembali event tersembunyi', async () => {
    const fetchMock = mockOkFetch();
    await updateEvent({ id: 'evt_1', acara: 'Acara' } as Partial<EventItem> & { id: string }, 'published');

    expect((sentBody(fetchMock).data as Record<string, unknown>).status).toBe('published');
  });
});

describe('fetchAdminEvents — API lama tanpa aksi listEvents', () => {
  it('HTTP 200 + {success:false} HARUS melempar (bukan mengembalikan [])', async () => {
    // Server lama membalas 200 dengan "Aksi tidak dikenal". `apiPost` tidak
    // melempar untuk kasus ini, jadi pemeriksaan success ada di sini — kalau
    // hilang, dashboard tampil kosong dan fallback kanal publik tak pernah jalan.
    mockOkFetch({ success: false, error: 'Aksi tidak dikenal: listEvents' });
    await expect(fetchAdminEvents()).rejects.toThrow(/Aksi tidak dikenal/);
  });

  it('success:true mengembalikan baris yang dipetakan', async () => {
    mockOkFetch({
      success: true,
      data: [{
        id: 'evt_1', date_str: '2026-09-10', date_end: null, day: 'Kamis',
        tanggal: '10 September 2026', jam: '10:00', acara: 'Acara', lokasi: 'Atrium',
        area_id: null, eo: '', pic: '', phone: '', keterangan: '', month: 'September',
        status: 'draft', category: 'Umum', categories: ['Umum'], priority: 'medium',
        event_model: '', event_nominal: '', event_model_notes: '', source_draft_id: '',
        is_multi_day: false, day_time_slots: null, event_type: 'single',
        recurrence_group_id: '', is_recurring: false, poster_url: null,
      }],
    });
    const events = await fetchAdminEvents();
    expect(events).toHaveLength(1);
    expect(events[0]!.status).toBe('draft');
  });
});

describe('eventItemToDbRow — invariant lifecycle (ADR 008)', () => {
  it('status temporal tidak pernah ikut terkirim', () => {
    const row = eventItemToDbRow({ status: 'upcoming' } as Partial<EventItem>);
    expect(row).not.toHaveProperty('status');
  });

  it('hanya status "draft" yang dikirim', () => {
    const row = eventItemToDbRow({ status: 'draft' } as Partial<EventItem>);
    expect(row.status).toBe('draft');
  });
});
