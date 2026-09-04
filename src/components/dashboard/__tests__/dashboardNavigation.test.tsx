import { describe, expect, it } from 'vitest';
import { getCommandCenterCards } from '../dashboardNavigation';
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

describe('getCommandCenterCards — kartu Antrian Draft', () => {
  it('menampilkan status gagal saat fetch draft error', () => {
    const cards = getCommandCenterCards({ ...baseParams, draftsError: 'Gagal memuat draft event.' });
    const draftsCard = cards.find(card => card.id === 'drafts');

    expect(draftsCard).toBeDefined();
    expect(draftsCard!.value).toBe('—');
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
