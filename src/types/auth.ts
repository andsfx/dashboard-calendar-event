export type UserRole = 'superadmin' | 'admin' | 'demo' | 'viewer' | 'eo_tenant' | 'tenant_relation';

export interface AuthUser {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  /**
   * ID event yang ditugaskan ke akun `eo_tenant` (dari `/auth/me`).
   * Dipakai untuk membatasi daftar event per-event di dashboard; akun staf
   * tidak memakai field ini. Tidak ada = tidak ada penugasan.
   */
  assigned_events?: string[];
}

export interface AuthState {
  /** Current authenticated user (null if not logged in) */
  user: AuthUser | null;
  /** True during initial session check on page load */
  isLoading: boolean;
  /** True if user is authenticated */
  isAuthenticated: boolean;
  /** True if user has admin or superadmin role */
  isAdmin: boolean;
  /** True if user has superadmin role */
  isSuperadmin: boolean;
}

export interface LoginResult {
  ok: boolean;
  error?: string;
}
