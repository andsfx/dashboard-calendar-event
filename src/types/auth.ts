export type UserRole = 'superadmin' | 'admin' | 'viewer';

export interface AuthUser {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
}

export interface AuthState {
  /** Current authenticated user (null if not logged in or legacy auth) */
  user: AuthUser | null;
  /** True during initial session check on page load */
  isLoading: boolean;
  /** True if user is authenticated (either Supabase Auth or legacy) */
  isAuthenticated: boolean;
  /** True if user has admin or superadmin role */
  isAdmin: boolean;
  /** True if user has superadmin role */
  isSuperadmin: boolean;
  /** True if using old password-based auth (no user object) */
  isLegacy: boolean;
}

export interface LoginResult {
  ok: boolean;
  error?: string;
}
