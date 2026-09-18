import { describe, expect, it } from 'vitest';
import { usePermission } from '../usePermission';
import type { AuthUser } from '../../types/auth';
import { renderHook } from '@testing-library/react';

function user(role: AuthUser['role']): AuthUser {
  return { id: 'u1', email: `${role}@test.local`, display_name: role, role };
}

describe('usePermission matrix (SPEC §2.1 / T-004)', () => {
  it('unauthenticated: no dashboard', () => {
    const { result } = renderHook(() => usePermission(null));
    expect(result.current.canViewDashboard).toBe(false);
    expect(result.current.canEditEvents).toBe(false);
    expect(result.current.canManageUsers).toBe(false);
    expect(result.current.role).toBe('');
  });


  it('superadmin: full + manage users', () => {
    const { result } = renderHook(() => usePermission(user('superadmin')));
    expect(result.current.canViewDashboard).toBe(true);
    expect(result.current.canEditEvents).toBe(true);
    expect(result.current.canDeleteEvents).toBe(true);
    expect(result.current.canManageThemes).toBe(true);
    expect(result.current.canManageSurvey).toBe(true);
    expect(result.current.canViewSurvey).toBe(true);
    expect(result.current.canViewTenantSurveyResults).toBe(true);
    expect(result.current.canExportTenantSurveyAnalytics).toBe(true);
    expect(result.current.canViewRegistrations).toBe(true);
    expect(result.current.canManageSponsorship).toBe(true);
    expect(result.current.canManageUsers).toBe(true);
    expect(result.current.canViewActivityLog).toBe(true);
    expect(result.current.canExport).toBe(true);
    expect(result.current.isReadOnly).toBe(false);
    expect(result.current.isEoTenant).toBe(false);
    expect(result.current.isTenantRelation).toBe(false);
  });

  it('admin: ops full, no user management', () => {
    const { result } = renderHook(() => usePermission(user('admin')));
    expect(result.current.canEditEvents).toBe(true);
    expect(result.current.canManageUsers).toBe(false);
    expect(result.current.canViewActivityLog).toBe(true);
    expect(result.current.canManageSettings).toBe(true);
    expect(result.current.isReadOnly).toBe(false);
  });

  it('viewer: read-only dashboard', () => {
    const { result } = renderHook(() => usePermission(user('viewer')));
    expect(result.current.canViewDashboard).toBe(true);
    expect(result.current.canEditEvents).toBe(false);
    expect(result.current.canDeleteEvents).toBe(false);
    expect(result.current.canManageThemes).toBe(false);
    expect(result.current.canViewSurvey).toBe(true);
    expect(result.current.canViewRegistrations).toBe(true);
    expect(result.current.canManageSponsorship).toBe(false);
    expect(result.current.canManageUsers).toBe(false);
    expect(result.current.canViewActivityLog).toBe(false);
    expect(result.current.isReadOnly).toBe(true);
  });

  it('eo_tenant: limited + tenant surveys', () => {
    const { result } = renderHook(() => usePermission(user('eo_tenant')));
    expect(result.current.canViewDashboard).toBe(true);
    expect(result.current.canEditEvents).toBe(false);
    expect(result.current.isEoTenant).toBe(true);
    expect(result.current.canViewSurvey).toBe(true);
    expect(result.current.canViewTenantSurveyResults).toBe(false);
    expect(result.current.canViewRegistrations).toBe(false);
    expect(result.current.canManageSponsorship).toBe(false);
  });

  it('tenant_relation: results only', () => {
    const { result } = renderHook(() => usePermission(user('tenant_relation')));
    expect(result.current.canViewDashboard).toBe(true);
    expect(result.current.canEditEvents).toBe(false);
    expect(result.current.isTenantRelation).toBe(true);
    expect(result.current.canViewTenantSurveyResults).toBe(true);
    expect(result.current.canExportTenantSurveyAnalytics).toBe(true);
    expect(result.current.canViewSurvey).toBe(false);
    expect(result.current.canViewRegistrations).toBe(false);
    expect(result.current.canManageSponsorship).toBe(false);
  });

  it('demo: melihat semua, tidak bisa mengubah apa pun', () => {
    const { result } = renderHook(() => usePermission(user('demo')));
    // Bisa masuk dashboard + melihat semua permukaan
    expect(result.current.canViewDashboard).toBe(true);
    expect(result.current.isDemo).toBe(true);
    expect(result.current.canViewDrafts).toBe(true);
    expect(result.current.canViewThemes).toBe(true);
    expect(result.current.canViewExhibitions).toBe(true);
    expect(result.current.canViewUsers).toBe(true);
    expect(result.current.canViewSettings).toBe(true);
    expect(result.current.canViewSponsorship).toBe(true);
    expect(result.current.canViewTenantSurveys).toBe(true);
    expect(result.current.canViewInternalSchedule).toBe(true);
    expect(result.current.canViewSurvey).toBe(true);
    expect(result.current.canViewRegistrations).toBe(true);
    expect(result.current.canViewActivityLog).toBe(true);
    expect(result.current.canViewTenantSurveyResults).toBe(true);
    // Tidak bisa mengubah apa pun
    expect(result.current.canEditEvents).toBe(false);
    expect(result.current.canDeleteEvents).toBe(false);
    expect(result.current.canManageThemes).toBe(false);
    expect(result.current.canManageSurvey).toBe(false);
    expect(result.current.canManageSponsorship).toBe(false);
    expect(result.current.canManageSettings).toBe(false);
    expect(result.current.canManageUsers).toBe(false);
    expect(result.current.isReadOnly).toBe(true);
  });
});
