/**
 * Test klien `linkRegistrationToEvent` — kontrak admin link/unlink registrasi
 * komunitas ke event (events.organization_id). Mock fetch global per-URL:
 * endpoint `POST /api/v1/admin/linkRegistrationToEvent` dikirim lewat
 * `adminAction` → `apiPost` (envelope flat `{ success, error? }`).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { linkRegistrationToEvent, unlinkRegistrationFromEvent } from '../eventsApi';
import { ApiError } from '../../../lib/rest';

/** Mock fetch global yang menjawab `body` untuk endpoint admin link. */
function mockAdminFetch(status: number, body: unknown): Mock {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : String(input);
    if (!url.endsWith('/admin/linkRegistrationToEvent')) {
      return { ok: false, status: 404, json: () => Promise.resolve({}) } as Response;
    }
    return {
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(JSON.stringify(body)),
    } as unknown as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** Body JSON dari panggilan fetch admin link (panggilan terakhir). */
function sentBody(fetchMock: Mock): { action?: string; registrationId?: string; eventId?: string | null; unlinkEventId?: string | null } {
  const calls = fetchMock.mock.calls;
  const last = calls[calls.length - 1];
  const init = last?.[1] as RequestInit | undefined;
  return JSON.parse(String(init?.body ?? '{}'));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('linkRegistrationToEvent — taut/lepas registrasi ke event', () => {
  it('taut: kirim { action, registrationId, eventId } dan resolve saat success:true', async () => {
    const fetchMock = mockAdminFetch(200, { success: true });

    await expect(linkRegistrationToEvent('reg-1', 'evt-1')).resolves.toBeUndefined();

    expect(sentBody(fetchMock)).toEqual({ action: 'linkRegistrationToEvent', registrationId: 'reg-1', eventId: 'evt-1' });
  });

  it('lepas: kirim eventId null (bukan string kosong) dan resolve saat success:true', async () => {
    const fetchMock = mockAdminFetch(200, { success: true });

    await expect(linkRegistrationToEvent('reg-1', null)).resolves.toBeUndefined();

    expect(sentBody(fetchMock)).toEqual({ action: 'linkRegistrationToEvent', registrationId: 'reg-1', eventId: null });
  });

  it('taut gagal: success:false melempar ApiError dengan pesan server', async () => {
    mockAdminFetch(400, { success: false, status: 400, error: 'Registrasi tidak ditemukan' });

    await expect(linkRegistrationToEvent('reg-x', 'evt-1')).rejects.toBeInstanceOf(ApiError);
    await expect(linkRegistrationToEvent('reg-x', 'evt-1')).rejects.toThrow('Registrasi tidak ditemukan');
  });

  it('lepas gagal: success:false melempar ApiError dengan pesan server', async () => {
    mockAdminFetch(400, { success: false, status: 400, error: 'Event tidak ditemukan' });

    await expect(linkRegistrationToEvent('reg-1', null)).rejects.toBeInstanceOf(ApiError);
    await expect(linkRegistrationToEvent('reg-1', null)).rejects.toThrow('Event tidak ditemukan');
  });

  it('gagal tanpa pesan server: fallback ApiError Bahasa Indonesia', async () => {
    mockAdminFetch(200, { success: false });

    await expect(linkRegistrationToEvent('reg-1', 'evt-1')).rejects.toThrow('Gagal menautkan registrasi ke event');
  });
});

describe('unlinkRegistrationFromEvent — lepas SATU event (per-event)', () => {
  it('kirim { registrationId, eventId: null, unlinkEventId } dan resolve saat success:true', async () => {
    const fetchMock = mockAdminFetch(200, { success: true });

    await expect(unlinkRegistrationFromEvent('reg-1', 'evt-1')).resolves.toBeUndefined();

    expect(sentBody(fetchMock)).toEqual({
      action: 'linkRegistrationToEvent',
      registrationId: 'reg-1',
      eventId: null,
      unlinkEventId: 'evt-1',
    });
  });

  it('gagal: success:false melempar ApiError dengan pesan server', async () => {
    mockAdminFetch(400, { success: false, status: 400, error: 'Event ini tidak tertaut ke registrasi ini. Muat ulang daftar.' });

    await expect(unlinkRegistrationFromEvent('reg-1', 'evt-1')).rejects.toBeInstanceOf(ApiError);
    await expect(unlinkRegistrationFromEvent('reg-1', 'evt-1')).rejects.toThrow('Event ini tidak tertaut ke registrasi ini. Muat ulang daftar.');
  });
});
