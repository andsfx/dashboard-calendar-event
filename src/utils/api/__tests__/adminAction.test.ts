import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminAction, SupabaseApiError } from '../_shared';

function mockFetchResponse(status: number, body: string) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body),
    json: () => Promise.resolve(JSON.parse(body)),
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('adminAction error handling', () => {
  it('uses the Indonesian error message from a JSON error body', async () => {
    mockFetchResponse(409, JSON.stringify({ success: false, error: 'Draft sudah diterbitkan' }));

    let caught: unknown;
    try {
      await adminAction('publishDraft', { id: 'd1' });
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(SupabaseApiError);
    expect((caught as Error).message).toBe('Draft sudah diterbitkan');
  });

  it('falls back to a status message when the error body is empty', async () => {
    mockFetchResponse(404, '');

    let caught: unknown;
    try {
      await adminAction('readDrafts', {});
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(SupabaseApiError);
    expect((caught as Error).message).toBe('Gagal memuat data admin (HTTP 404)');
  });

  it('returns parsed JSON on success', async () => {
    mockFetchResponse(200, JSON.stringify({ success: true, data: [1, 2] }));

    const result = await adminAction<{ success: boolean }>('readDrafts', {});
    expect(result).toEqual({ success: true, data: [1, 2] });
  });
});
