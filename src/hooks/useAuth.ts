import { useState, useEffect, useCallback, useMemo } from 'react';
import type { AuthUser, AuthState, LoginResult } from '../types/auth';
import { apiGet, apiPost } from '../lib/rest';

/**
 * useAuth — manages authentication state (Opsi B: REST + cookie HttpOnly).
 *
 * On mount, checks existing session via GET /auth/me (through rest.ts,
 * credentials: 'include', cookie sb-access-token HttpOnly).
 * Provides login, legacyLogin (tidak didukung lagi), and logout.
 */

// ─── Dev mode auto-login bypass ────────────────────────────────
const DEV_AUTO_LOGIN = import.meta.env.DEV && import.meta.env.VITE_DEV_AUTO_LOGIN === 'true';

interface AuthMeResponse {
  success: boolean;
  user: AuthUser | null;
  legacy?: boolean;
}

interface AuthLoginResponse {
  success: boolean;
  user?: AuthUser | null;
  error?: string;
  legacy?: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLegacy, setIsLegacy] = useState(false);

  // ─── Session check on mount ─────────────────────────────────────
  useEffect(() => {
    if (DEV_AUTO_LOGIN) {
      const devUser: AuthUser = {
        id: 'dev-auto-login',
        email: 'dev@localhost',
        display_name: 'Dev Admin',
        role: 'superadmin',
      };
      setUser(devUser);
      setIsLegacy(false);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function checkSession() {
      try {
        const data = await apiGet<AuthMeResponse>('/auth/me');
        if (cancelled) return;

        if (data.user) {
          // Supabase Auth session
          setUser(data.user);
          setIsLegacy(false);
        } else if (data.legacy) {
          // Legacy cookie session
          setUser(null);
          setIsLegacy(true);
        } else {
          // Not authenticated
          setUser(null);
          setIsLegacy(false);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setIsLegacy(false);
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
      const devUser: AuthUser = {
        id: 'dev-auto-login',
        email: 'dev@localhost',
        display_name: 'Dev Admin',
        role: 'superadmin',
      };
      setUser(devUser);
      setIsLegacy(false);
      return { ok: true };
    }

    try {
      const data = await apiPost<AuthLoginResponse>('/auth/login', { email, password });

      if (data.success && data.user) {
        setUser(data.user);
        setIsLegacy(false);
        return { ok: true };
      }

      return { ok: false, error: data.error || 'Login gagal' };
    } catch (err) {
      // ApiError membawa pesan server (mis. "Email atau password salah")
      // atau fallback koneksi.
      return { ok: false, error: err instanceof Error ? err.message : 'Tidak dapat terhubung ke server' };
    }
  }, []);

  // ─── Legacy login with password only ────────────────────────────
  const legacyLogin = useCallback(async (_password: string): Promise<LoginResult> => {
    // Opsi B: alur legacy (password-only) tidak didukung lagi —
    // arahkan pemakaian ke login email+password biasa.
    return { ok: false, error: 'Login lama tidak didukung. Gunakan email dan password.' };
  }, []);

  // ─── Logout ─────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    if (DEV_AUTO_LOGIN) {
      // Dev mode: re-login as dev user (logout = reset state)
      const devUser: AuthUser = {
        id: 'dev-auto-login',
        email: 'dev@localhost',
        display_name: 'Dev Admin',
        role: 'superadmin',
      };
      setUser(devUser);
      setIsLegacy(false);
      return;
    }

    try {
      // POST /auth/logout — server membersihkan cookie sb-access-token.
      await apiPost('/auth/logout');
    } catch {
      // ignore — state di-reset apa adanya.
    } finally {
      setUser(null);
      setIsLegacy(false);
    }
  }, []);

  // ─── Derived state ──────────────────────────────────────────────
  const state: AuthState = useMemo(() => ({
    user,
    isLoading,
    isAuthenticated: !!user || isLegacy,
    isAdmin: isLegacy || user?.role === 'admin' || user?.role === 'superadmin',
    isSuperadmin: user?.role === 'superadmin',
    isLegacy,
  }), [user, isLoading, isLegacy]);

  return {
    ...state,
    login,
    legacyLogin,
    logout,
  };
}