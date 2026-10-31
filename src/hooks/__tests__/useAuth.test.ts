/**
 * Kontrak `useAuth` untuk sesi kedaluwarsa.
 *
 * Regresi yang dijaga: setelah mount, handler `onUnauthorized` dari rest.ts
 * harus terpasang dan mereset `user` + `isLoading`. Tanpa itu, `/dashboard`
 * tetap dirender setelah 401 (dashboard kosong) alih-alih form login.
 *
 * `.env.local` di mesin dev memasang `VITE_DEV_AUTO_LOGIN=true`; flag itu
 * dibaca saat modul dimuat, jadi modul di-import ulang setelah env di-stub.
 */
import { renderHook, waitFor, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '../../types/auth';

const restState = vi.hoisted(() => ({
  handler: null as ((info: { method: 'GET' | 'POST'; path: string }) => void) | null,
}));

vi.mock('../../lib/rest', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  setUnauthorizedHandler: vi.fn((handler: typeof restState.handler) => {
    restState.handler = handler;
  }),
}));

const adminUser: AuthUser = {
  id: 'u1',
  email: 'admin@metmal.test',
  display_name: 'Admin',
  role: 'admin',
};

async function loadAuth() {
  // Import dinamis disengaja: `DEV_AUTO_LOGIN` dibaca saat modul useAuth
  // dimuat, jadi import statis akan memakai `.env.local` (auto-login aktif)
  // dan handler 401 tidak pernah terpasang. Tidak bisa diselesaikan dengan
  // import statis.
  vi.resetModules();
  vi.stubEnv('VITE_DEV_AUTO_LOGIN', 'false');
  const rest = await import('../../lib/rest');
  const { useAuth } = await import('../useAuth');
  return { rest, useAuth };
}

describe('useAuth — sesi kedaluwarsa', () => {
  beforeEach(() => {
    restState.handler = null;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('mereset user ke null saat rest melaporkan 401, sehingga dashboard kembali ke login', async () => {
    const { rest, useAuth } = await loadAuth();
    vi.mocked(rest.apiGet).mockResolvedValueOnce({ success: true, user: adminUser });

    const { result, unmount } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user?.id).toBe('u1');

    // Handler dipasang setelah mount sesi.
    expect(rest.setUnauthorizedHandler).toHaveBeenCalledWith(expect.any(Function));
    expect(restState.handler).toBeTypeOf('function');

    act(() => {
      restState.handler?.({ method: 'POST', path: '/admin/listEvents' });
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isAdmin).toBe(false);

    unmount();
    expect(rest.setUnauthorizedHandler).toHaveBeenLastCalledWith(null);
  });

  it('tanpa sesi, 401 hanya memastikan state anonim (tidak error)', async () => {
    const { rest, useAuth } = await loadAuth();
    vi.mocked(rest.apiGet).mockResolvedValueOnce({ success: true, user: null });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      restState.handler?.({ method: 'GET', path: '/auth/me' });
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});
