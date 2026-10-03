import { describe, expect, it } from 'vitest';
import { getCommandCenterCards, getAllowedDashboardPaths, getWayfindingMap } from '../dashboardNavigation';
import type { Permissions } from '../../../hooks/usePermission';

const adminPermissions: Permissions = {
  canViewDashboard: true,
  canEditEvents: true,
  canDeleteEvents: true,
  canManageThemes: true,
  canManageSurvey: true,
  canViewSurvey: true,
  canViewTenantSurveyResults: false,
  canExportTenantSurveyAnalytics: false,
  canViewRegistrations: true,
  canManageSponsorship: true,
  canManageSettings: true,
  canManageUsers: true,
  canViewActivityLog: true,
  canExport: true,
  isReadOnly: false,
  isEoTenant: false,
  isTenantRelation: false,
  isDemo: false,
  canViewDrafts: true,
  canViewThemes: true,
  canViewExhibitions: true,
  canViewUsers: true,
  canViewSettings: true,
  canViewSponsorship: true,
  canViewTenantSurveys: true,
  canViewInternalSchedule: true,
  role: 'superadmin',
};

const baseParams = {
  totalEvents: 10,
  upcomingEvents: 4,
  ongoingEvents: 1,
  activeDrafts: [],
  annualThemes: [],
  communityRegistrations: [],
  permissions: adminPermissions,
  isSuperadmin: true,
};

describe('rute /insights — Insight Cerdas pindah ke halaman sendiri', () => {
  it('diizinkan dan punya plate wayfinding sendiri, bukan menumpang Pusat Komando', () => {
    expect(getAllowedDashboardPaths(adminPermissions)).toContain('/insights');
    expect(getWayfindingMap('/insights').current).toMatchObject({
      label: 'Insight Cerdas',
      path: '/insights',
    });
  });

  it('tetap dijangkau dari register Pusat Komando', () => {
    const cards = getCommandCenterCards({ ...baseParams });
    const card = cards.find(item => item.id === 'insights');

    expect(card).toBeDefined();
    expect(card!.route).toBe('/dashboard/insights');
  });

  it('tidak diberikan ke akun tenant-relation murni', () => {
    const trPermissions: Permissions = {
      ...adminPermissions,
      canEditEvents: false,
      isTenantRelation: true,
      role: 'tenant_relation',
    };

    expect(getAllowedDashboardPaths(trPermissions)).not.toContain('/insights');
    expect(getCommandCenterCards({ ...baseParams, permissions: trPermissions }).find(item => item.id === 'insights')).toBeUndefined();
  });
});

describe('getCommandCenterCards — kartu Antrian Draft', () => {
  it('menampilkan status gagal saat fetch draft error', () => {
    const cards = getCommandCenterCards({ ...baseParams, draftsError: 'Gagal memuat draft event.' });
    const draftsCard = cards.find(card => card.id === 'drafts');

    expect(draftsCard).toBeDefined();
    expect(draftsCard!.value).toBe('-');
    expect(draftsCard!.subtitle).toBe('Gagal memuat');
  });

  it('menampilkan Antrian kosong saat tidak ada error dan antrian kosong', () => {
    const cards = getCommandCenterCards({ ...baseParams, draftsError: null });
    const draftsCard = cards.find(card => card.id === 'drafts');

    expect(draftsCard).toBeDefined();
    expect(draftsCard!.value).toBe(0);
    expect(draftsCard!.subtitle).toBe('Antrian kosong');
  });
});

describe('getCommandCenterCards — modul Pameran & Aktivasi', () => {
  it('muncul di register agar modul ber-antrian bisa dijangkau dari Pusat Komando', () => {
    const cards = getCommandCenterCards({ ...baseParams });
    const card = cards.find(item => item.id === 'exhibitions');

    expect(card).toBeDefined();
    expect(card!.title).toBe('Pameran & Aktivasi');
    expect(card!.route).toBe('/dashboard/exhibitions');
  });

  it('disembunyikan bila tidak punya izin melihat pameran', () => {
    const cards = getCommandCenterCards({
      ...baseParams,
      permissions: { ...adminPermissions, canViewExhibitions: false },
    });

    expect(cards.find(item => item.id === 'exhibitions')).toBeUndefined();
  });
});
