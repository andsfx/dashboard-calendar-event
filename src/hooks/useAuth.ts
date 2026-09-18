import { useState, useEffect, useCallback, useMemo } from 'react';
import type { AuthUser, AuthState, LoginResult } from '../types/auth';
import { apiGet, apiPost } from '../lib/rest';

/**
 * useAuth — manages authentication state (Opsi B: REST + cookie HttpOnly).
 *
 * On mount, checks existing session via GET /auth/me (through rest.ts,
 * credentials: 'include', cookie sb-access-token HttpOnly).
 * Provides login (email+password) and logout. Login legacy password-only
 * sudah dihapus total saat migrasi Opsi B.
 */

// ─── Dev mode auto-login bypass ────────────────────────────────
const DEV_AUTO_LOGIN = import.meta.env.DEV && import.meta.env.VITE_DEV_AUTO_LOGIN === 'true';
// Role yang dipakai bypass dev — untuk menguji UI per-role tanpa backend.
// `VITE_DEV_AUTO_LOGIN_ROLE=demo` mis. memverifikasi tampilan read-only.
const DEV_AUTO_LOGIN_ROLE = (import.meta.env.VITE_DEV_AUTO_LOGIN_ROLE || 'superadmin') as AuthUser['role'];
const devUser = (): AuthUser => ({
  id: 'dev-auto-login',
  email: 'dev@localhost',
  display_name: `Dev ${DEV_AUTO_LOGIN_ROLE}`,
  role: DEV_AUTO_LOGIN_ROLE,
});

interface AuthMeResponse {
  success: boolean;
  user: AuthUser | null;
}

interface AuthLoginResponse {
  success: boolean;
  user?: AuthUser | null;
  error?: string;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ─── Session check on mount ─────────────────────────────────────
  useEffect(() => {
    if (DEV_AUTO_LOGIN) {
      setUser(devUser());
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function checkSession() {
      try {
        const data = await apiGet<AuthMeResponse>('/auth/me');
        if (cancelled) return;

        // REST /auth/me: user aktif atau null (tanpa session legacy).
        setUser(data.user || null);
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    checkSession();

    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Login with email + password ────────────────────────────────
  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    if (DEV_AUTO_LOGIN) {
      setUser(devUser());
      return { ok: true };
    }

    try {
      const data = await apiPost<AuthLoginResponse>('/auth/login', { email, password });

      if (data.success && data.user) {
        setUser(data.user);
        return { ok: true };
      }

      return { ok: false, error: data.error || 'Login gagal' };
    } catch (err) {
      // ApiError membawa pesan server (mis. "Email atau password salah")
      // atau fallback koneksi.
      return { ok: false, error: err instanceof Error ? err.message : 'Tidak dapat terhubung ke server' };
    }
  }, []);

  // ─── Logout ─────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    if (DEV_AUTO_LOGIN) {
      // Dev mode: re-login as dev user (logout = reset state)
      setUser(devUser());
      return;
    }

    try {
      // POST /auth/logout — server membersihkan cookie sb-access-token.
      await apiPost('/auth/logout');
    } catch {
      // ignore — state di-reset apa adanya.
    } finally {
      setUser(null);
    }
  }, []);

  // ─── Derived state ──────────────────────────────────────────────
  const state: AuthState = useMemo(() => ({
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin' || user?.role === 'superadmin',
    isSuperadmin: user?.role === 'superadmin',
  }), [user, isLoading]);

  return {
    ...state,
    login,
    logout,
  };
}
