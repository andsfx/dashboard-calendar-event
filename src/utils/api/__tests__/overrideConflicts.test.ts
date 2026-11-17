/**
 * Test klien wiring `override_conflicts` — flag admin untuk menembus guard
 * konflik area di server. `createEvent`/`updateEvent` membaca `opts` opsional
 * dan menyisipkan `override_conflicts: true` ke body.data. Server menyaring
 * whitelist kolom sendiri, jadi flag ini hanya bagian dari request body,
 * bukan kolom INSERT/UPDATE.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { createEvent, updateEvent, batchCreateEvents } from '../eventsApi';

/** Mock fetch global yang menjawab success untuk endpoint admin create/update. */
function mockAdminFetch(): Mock {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : String(input);
    if (url.endsWith('/admin/createEvent')) {
      return { ok: true, status: 200, json: () => Promise.resolve({ success: true, id: 'evt-new', row: 0 }), text: () => Promise.resolve('{}') } as unknown as Response;
    }
    if (url.endsWith('/admin/updateEvent')) {
      return { ok: true, status: 200, json: () => Promise.resolve({ success: true }), text: () => Promise.resolve('{}') } as unknown as Response;
    }
    if (url.endsWith('/admin/batchCreateEvents')) {
      return { ok: true, status: 200, json: () => Promise.resolve({ success: true, results: [{ id: 'evt-1' }], count: 1 }), text: () => Promise.resolve('{}') } as unknown as Response;
    }
    return { ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('{}') } as unknown as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** body.data dari panggilan fetch terakhir. */
function sentData(fetchMock: Mock): Record<string, unknown> {
  const calls = fetchMock.mock.calls;
  const last = calls[calls.length - 1];
  const init = last?.[1] as RequestInit | undefined;
  const body = JSON.parse(String(init?.body ?? '{}')) as { data?: Record<string, unknown> };
  return body.data ?? {};
}

/** body.data (array baris) dari panggilan fetch terakhir. */
function sentRows(fetchMock: Mock): Array<Record<string, unknown>> {
  const calls = fetchMock.mock.calls;
  const last = calls[calls.length - 1];
  const init = last?.[1] as RequestInit | undefined;
  const body = JSON.parse(String(init?.body ?? '{}')) as { data?: Array<Record<string, unknown>> };
  return body.data ?? [];
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('override_conflicts wiring klien', () => {
  it('createEvent dengan opts.overrideConflicts=true → body.data memuat override_conflicts:true', async () => {
    const fetchMock = mockAdminFetch();
    await createEvent({ acara: 'A', dateStr: '2026-11-20', areaId: 'area-1' } as never, { overrideConflicts: true });
    expect(sentData(fetchMock).override_conflicts).toBe(true);
  });

  it('createEvent tanpa opts → body.data TIDAK memuat key override_conflicts', async () => {
    const fetchMock = mockAdminFetch();
    await createEvent({ acara: 'A', dateStr: '2026-11-20', areaId: 'area-1' } as never);
    expect('override_conflicts' in sentData(fetchMock)).toBe(false);
  });

  it('updateEvent dengan opts.overrideConflicts=true → body.data memuat override_conflicts:true', async () => {
    const fetchMock = mockAdminFetch();
    await updateEvent({ id: 'evt-1', acara: 'A', dateStr: '2026-11-20', areaId: 'area-1' } as never, undefined, { overrideConflicts: true });
    expect(sentData(fetchMock).override_conflicts).toBe(true);
  });

  it('updateEvent tanpa opts → body.data TIDAK memuat key override_conflicts', async () => {
    const fetchMock = mockAdminFetch();
    await updateEvent({ id: 'evt-1', acara: 'A', dateStr: '2026-11-20', areaId: 'area-1' } as never);
    expect('override_conflicts' in sentData(fetchMock)).toBe(false);
  });

  it('batchCreateEvents dengan opts.overrideConflicts=true → setiap row memuat override_conflicts:true', async () => {
    const fetchMock = mockAdminFetch();
    await batchCreateEvents(
      [
        { acara: 'A', dateStr: '2026-11-20', areaId: 'area-1' } as never,
        { acara: 'B', dateStr: '2026-11-21', areaId: 'area-1' } as never,
      ],
      { overrideConflicts: true },
    );
    const rows = sentRows(fetchMock);
    expect(rows).toHaveLength(2);
    expect(rows[0].override_conflicts).toBe(true);
    expect(rows[1].override_conflicts).toBe(true);
  });

  it('batchCreateEvents tanpa opts → row TIDAK memuat key override_conflicts', async () => {
    const fetchMock = mockAdminFetch();
    await batchCreateEvents([{ acara: 'A', dateStr: '2026-11-20', areaId: 'area-1' } as never]);
    const rows = sentRows(fetchMock);
    expect(rows).toHaveLength(1);
    expect('override_conflicts' in rows[0]).toBe(false);
  });
});
