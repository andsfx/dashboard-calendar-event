import { useMemo } from 'react';
import type { AuthUser } from '../types/auth';

export interface Permissions {
  /** Can view admin dashboard */
  canViewDashboard: boolean;
  /** Can create/edit events and drafts */
  canEditEvents: boolean;
  /** Can delete events and drafts */
  canDeleteEvents: boolean;
  /** Can manage themes */
  canManageThemes: boolean;
  /** Can manage survey config */
  canManageSurvey: boolean;
  /** Can view survey results */
  canViewSurvey: boolean;
  /** Tenant Relation analytics page (read-only results) */
  canViewTenantSurveyResults: boolean;
  /** Export tenant survey analytics PDF */
  canExportTenantSurveyAnalytics: boolean;
  /** Can view registrations */
  canViewRegistrations: boolean;
  /** Can manage sponsorship (proposals + leads) — admin only, viewer TIDAK */
  canManageSponsorship: boolean;
  /** Can manage settings (landing page, albums, etc.) */
  canManageSettings: boolean;
  /** Can manage users (superadmin only) */
  canManageUsers: boolean;
  /** Can view activity log */
  canViewActivityLog: boolean;
  /** Can export data */
  canExport: boolean;
  /** Is read-only mode (viewer, demo) */
  isReadOnly: boolean;
  /** Is EO/Tenant with limited view */
  isEoTenant: boolean;
  /** Tenant Relation staff (analytics only) */
  isTenantRelation: boolean;
  /** Akun demo: lihat semua, ubah tidak */
  isDemo: boolean;

  // ── View flags — memisahkan "boleh lihat" dari "boleh kelola" ──
  // Untuk role lama nilainya sama dengan flag *Manage* pasangannya, jadi
  // perilaku tidak berubah. Role `demo` menyalakan semua view, mematikan
  // semua manage.
  /** Can view draft queue */
  canViewDrafts: boolean;
  /** Can view annual themes */
  canViewThemes: boolean;
  /** Can view exhibitions & activation */
  canViewExhibitions: boolean;
  /** Can view user management page */
  canViewUsers: boolean;
  /** Can view content settings (landing, albums, areas, letters, news) */
  canViewSettings: boolean;
  /** Can view sponsorship proposals & leads */
  canViewSponsorship: boolean;
  /** Can view tenant self-assessment */
  canViewTenantSurveys: boolean;
  /** Can see draft/internal events in the schedule */
  canViewInternalSchedule: boolean;
  /** User role */
  role: string;
}

/**
 * usePermission — derives granular permissions from user role.
 *
 * Role hierarchy:
 *   superadmin > admin > viewer > eo_tenant | tenant_relation
 */
export function usePermission(user: AuthUser | null): Permissions {
  return useMemo(() => {
    const role = user?.role || '';

    // Not authenticated
    if (!role) {
      return {
        canViewDashboard: false,
        canEditEvents: false,
        canDeleteEvents: false,
        canManageThemes: false,
        canManageSurvey: false,
        canViewSurvey: false,
        canViewTenantSurveyResults: false,
        canExportTenantSurveyAnalytics: false,
        canViewRegistrations: false,
        canManageSponsorship: false,
        canManageSettings: false,
        canManageUsers: false,
        canViewActivityLog: false,
        canExport: false,
        isReadOnly: false,
        isEoTenant: false,
        isTenantRelation: false,
        isDemo: false,
        canViewDrafts: false,
        canViewThemes: false,
        canViewExhibitions: false,
        canViewUsers: false,
        canViewSettings: false,
        canViewSponsorship: false,
        canViewTenantSurveys: false,
        canViewInternalSchedule: false,
        role: '',
      };
    }

    const isSuperadmin = role === 'superadmin';
    const isAdmin = role === 'admin' || isSuperadmin;
    const isViewer = role === 'viewer';
    const isEoTenant = role === 'eo_tenant';
    const isTenantRelation = role === 'tenant_relation';
    // Demo: boleh MELIHAT seluruh permukaan dashboard, tapi tidak mengubah
    // apa pun. Ditegakkan ulang di backend (server/src/routes/admin.js).
    const isDemo = role === 'demo';

    return {
      canViewDashboard: true,
      // Mutasi — demo selalu false.
      canEditEvents: isAdmin,
      canDeleteEvents: isAdmin,
      canManageThemes: isAdmin,
      canManageSurvey: isAdmin,
      // visitor survey + ops pages — not for TR-only accounts
      canViewSurvey: isAdmin || isViewer || isEoTenant || isDemo,
      canViewTenantSurveyResults: isAdmin || isTenantRelation || isDemo,
      canExportTenantSurveyAnalytics: isAdmin || isTenantRelation || isDemo,
      canViewRegistrations: isAdmin || isViewer || isDemo,
      canManageSponsorship: isAdmin,
      canManageSettings: isAdmin,
      canManageUsers: isSuperadmin,
      canViewActivityLog: isAdmin || isDemo,
      canExport: isAdmin || isViewer || isDemo,
      isReadOnly: isViewer || isTenantRelation || isDemo,
      isEoTenant,
      isTenantRelation,
      isDemo,

      // View flags — untuk role lama identik dengan flag *Manage* pasangannya.
      canViewDrafts: isAdmin || isDemo,
      canViewThemes: isAdmin || isDemo,
      canViewExhibitions: isAdmin || isDemo,
      canViewUsers: isSuperadmin || isDemo,
      canViewSettings: isAdmin || isDemo,
      canViewSponsorship: isAdmin || isDemo,
      canViewTenantSurveys: isAdmin || isEoTenant || isDemo,
      canViewInternalSchedule: isAdmin || isDemo,
      role,
    };
  }, [user]);
}
