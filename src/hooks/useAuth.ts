import { useState, useEffect, useCallback, useMemo } from 'react';
import type { AuthUser, AuthState, LoginResult } from '../types/auth';

/**
 * useAuth — manages authentication state with dual auth support
 * (Supabase Auth email+password + legacy password-only).
 * 
 * On mount, checks existing session via GET /api/auth-me.
 * Provides login, legacyLogin, and logout functions.
 */
export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLegacy, setIsLegacy] = useState(false);

  // ─── Session check on mount ─────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const res = await fetch('/api/auth?action=me', {
          method: 'GET',
          credentials: 'include',
        });

        if (!res.ok) {
          if (!cancelled) {
            setUser(null);
            setIsLegacy(false);
          }
          return;
        }

        const data = await res.json();

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

  // ─── Login with email + password (Supabase Auth) ────────────────
  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    try {
      const res = await fetch('/api/auth?action=login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.user) {
        setUser(data.user);
        setIsLegacy(false);
        return { ok: true };
      }

      return { ok: false, error: data.error || 'Login gagal' };
    } catch {
      return { ok: false, error: 'Tidak dapat terhubung ke server' };
    }
  }, []);

  // ─── Legacy login with password only ────────────────────────────
  const legacyLogin = useCallback(async (password: string): Promise<LoginResult> => {
    try {
      const res = await fetch('/api/admin-login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      // Handle non-JSON responses
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        return { ok: false, error: 'Server mengembalikan respons tidak valid' };
      }

      if (res.ok && data.success) {
        setUser(null);
        setIsLegacy(true);
        return { ok: true };
      }

      return { ok: false, error: data.error || 'Password salah' };
    } catch {
      return { ok: false, error: 'Tidak dapat terhubung ke server' };
    }
  }, []);

  // ─── Logout ─────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      // Use new auth-logout (clears both Supabase + legacy cookies)
      await fetch('/api/auth?action=logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Also try legacy logout as fallback
      try {
        await fetch('/api/admin-logout', {
          method: 'POST',
          credentials: 'include',
        });
      } catch {
        // ignore
      }
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
    isAdmin: isLegacy || (user?.role === 'admin') || (user?.role === 'superadmin'),
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
