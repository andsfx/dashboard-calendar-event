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
  /** Can manage settings (landing page, albums, etc.) */
  canManageSettings: boolean;
  /** Can manage users (superadmin only) */
  canManageUsers: boolean;
  /** Can view activity log */
  canViewActivityLog: boolean;
  /** Can export data */
  canExport: boolean;
  /** Is read-only mode (viewer) */
  isReadOnly: boolean;
  /** Is EO/Tenant with limited view */
  isEoTenant: boolean;
  /** Tenant Relation staff (analytics only) */
  isTenantRelation: boolean;
  /** User role */
  role: string;
}

/**
 * usePermission — derives granular permissions from user role.
 *
 * Role hierarchy:
 *   superadmin > admin > viewer > eo_tenant | tenant_relation
 */
export function usePermission(user: AuthUser | null, isLegacy: boolean): Permissions {
  return useMemo(() => {
    const role = user?.role || (isLegacy ? 'admin' : '');

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
        canManageSettings: false,
        canManageUsers: false,
        canViewActivityLog: false,
        canExport: false,
        isReadOnly: false,
        isEoTenant: false,
        isTenantRelation: false,
        role: '',
      };
    }

    const isSuperadmin = role === 'superadmin';
    const isAdmin = role === 'admin' || isSuperadmin;
    const isViewer = role === 'viewer';
    const isEoTenant = role === 'eo_tenant';
    const isTenantRelation = role === 'tenant_relation';

    return {
      canViewDashboard: true,
      canEditEvents: isAdmin,
      canDeleteEvents: isAdmin,
      canManageThemes: isAdmin,
      canManageSurvey: isAdmin,
      // visitor survey + ops pages — not for TR-only accounts
      canViewSurvey: isAdmin || isViewer || isEoTenant,
      canViewTenantSurveyResults: isAdmin || isTenantRelation,
      canExportTenantSurveyAnalytics: isAdmin || isTenantRelation,
      canViewRegistrations: isAdmin || isViewer,
      canManageSettings: isAdmin,
      canManageUsers: isSuperadmin,
      canViewActivityLog: isAdmin,
      canExport: isAdmin || isViewer,
      isReadOnly: isViewer || isTenantRelation,
      isEoTenant,
      isTenantRelation,
      role,
    };
  }, [user, isLegacy]);
}
