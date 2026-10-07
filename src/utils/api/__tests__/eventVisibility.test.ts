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
import { setEventVisibility, updateEvent } from '../eventsApi';
import type { EventItem } from '../../../types';

function mockOkFetch(): Mock {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify({ success: true })),
    json: () => Promise.resolve({ success: true }),
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
