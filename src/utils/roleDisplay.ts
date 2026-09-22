import type { UserRole } from '../types/auth';

/**
 * Nama tampilan peran — satu sumber untuk seluruh permukaan admin.
 *
 * Sebelumnya setiap tempat menuliskan labelnya sendiri, dan pelat peran di
 * rail menulis "Administrator" untuk SEMUA peran selain superadmin — jadi
 * viewer, demo, dan akun tenant pun tampil seolah-olah admin. Rail dan
 * Manajemen Pengguna kini membaca dari tabel ini, sehingga label tidak bisa
 * berbeda cerita lagi.
 *
 * `Record` (bukan `Map`/`Set`) karena ini lookup tabel statis — sesuai aturan
 * repo `ts-set-map`.
 */
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  superadmin: 'Superadmin',
  admin: 'Admin',
  viewer: 'Viewer',
  demo: 'Demo',
  eo_tenant: 'EO/Tenant',
  tenant_relation: 'Tenant Relation',
};
