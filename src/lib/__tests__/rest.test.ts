/**
 * Kontrak rest client untuk sesi & envelope error.
 *
 * Regresi yang dijaga:
 * - 401 pada endpoint ber-sesi memanggil `onUnauthorized` tepat sekali, sehingga
 *   `useAuth` mereset `user` dan `/dashboard` kembali menampilkan login.
 * - 401 dari endpoint publik anonim TIDAK mereset sesi (halaman publik tidak
 *   boleh mengeluarkan admin hanya karena satu request anonim gagal).
 * - Envelope `{ success:false }` di HTTP 200 tetap membawa `code`/`payload`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiGet, apiPost, setUnauthorizedHandler } from '../rest';

interface MockResponse {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}

function mockResponse(body: unknown, init: { ok: boolean; status: number }): MockResponse {
  return { ...init, json: async () => body };
}

const fetchMock = vi.fn();

describe('rest — sesi kedaluwarsa', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    setUnauthorizedHandler(null);
    vi.unstubAllGlobals();
  });

  it('401 pada aksi admin memicu onUnauthorized sekali dan melempar ApiError 401', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    fetchMock.mockResolvedValueOnce(
      mockResponse({ success: false, error: 'Sesi berakhir' }, { ok: false, status: 401 }),
    );

    await expect(apiPost('/admin/listEvents', { action: 'listEvents' })).rejects.toMatchObject({
      name: 'ApiError',
      code: '401',
    });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ method: 'POST', path: '/admin/listEvents' });
  });

  it('401 dari endpoint publik anonim tidak mereset sesi', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    fetchMock.mockResolvedValueOnce(
      mockResponse({ success: false, error: 'Tidak diizinkan' }, { ok: false, status: 401 }),
    );

    await expect(apiGet('/tenant/results-list')).rejects.toBeInstanceOf(ApiError);
    expect(handler).not.toHaveBeenCalled();
  });

  it('401 dari /auth/login (password salah) tidak mereset sesi', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    fetchMock.mockResolvedValueOnce(
      mockResponse({ success: false, error: 'Email atau password salah' }, { ok: false, status: 401 }),
    );

    await expect(apiPost('/auth/login', { email: 'a', password: 'b' })).rejects.toBeInstanceOf(ApiError);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('rest — envelope error HTTP 200', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('success:false di HTTP 200 meneruskan code dan payload dari body', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(
      {
        success: false,
        error: 'Terlalu banyak permintaan',
        code: '429',
        errors: ['event_id wajib'],
      },
      { ok: true, status: 200 },
    ));

    const err = await apiGet('/tenant/event-info?event_id=x').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).message).toBe('Terlalu banyak permintaan');
    expect((err as ApiError).code).toBe('429');
    expect((err as ApiError).payload).toEqual({ errors: ['event_id wajib'] });
  });

  it('error HTTP biasa meneruskan payload tambahan (errors validasi)', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(
      { success: false, error: 'Validasi gagal', errors: ['nama wajib'] },
      { ok: false, status: 400 },
    ));

    const err = await apiGet('/news').catch((e: unknown) => e);
    expect((err as ApiError).code).toBe('400');
    expect((err as ApiError).payload).toEqual({ errors: ['nama wajib'] });
  });
});
