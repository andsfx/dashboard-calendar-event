import { describe, expect, it } from 'vitest';
import {
  getCommandCenterCards,
  getAllowedDashboardPaths,
  getDashboardNavGroups,
  getDefaultAppPath,
  getDefaultDashboardPath,
  getWayfindingMap,
} from '../dashboardNavigation';
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
  canViewTenantProposals: true,
  canViewUsers: true,
  canViewSettings: true,
  canViewSponsorship: true,
  canViewTenantSurveys: true,
  canViewInternalSchedule: true,
  role: 'superadmin',
};

const baseParams = {
  activeDrafts: [],
  annualThemes: [],
  communityRegistrations: [],
  exhibitionLeads: [],
  permissions: adminPermissions,
};

describe('rute /insights: Insight Cerdas pindah ke halaman sendiri', () => {
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

describe('Insight Cerdas vs role: demo disembunyikan, viewer & admin tetap', () => {
  // `demo` = akun peragaan bersama. Backend menolak `getInsightNarrative` untuk
  // role ini (endpoint AI berbayar + menulis log), sementara view flag demo
  // menyalakan hampir semua permukaan lain. Viewer TIDAK dibatasi (SPEC §2).
  const demoPermissions: Permissions = {
    ...adminPermissions,
    canEditEvents: false,
    canDeleteEvents: false,
    canManageThemes: false,
    canManageSurvey: false,
    canManageSponsorship: false,
    canManageSettings: false,
    canManageUsers: false,
    canExportSurvey: false,
    canExportTenantSurveyCsv: false,
    isReadOnly: true,
    isDemo: true,
    role: 'demo',
  };

  const viewerPermissions: Permissions = {
    ...adminPermissions,
    canEditEvents: false,
    canDeleteEvents: false,
    canManageThemes: false,
    canManageSurvey: false,
    canManageSponsorship: false,
    canManageSettings: false,
    canManageUsers: false,
    canViewUsers: false,
    canViewSettings: false,
    canViewSponsorship: false,
    canViewDrafts: false,
    canViewThemes: false,
    canViewExhibitions: false,
    canViewTenantSurveys: false,
    canViewInternalSchedule: false,
    canViewActivityLog: false,
    canViewTenantSurveyResults: false,
    isReadOnly: true,
    role: 'viewer',
  };

  const navItemIds = (permissions: Permissions) =>
    getDashboardNavGroups(permissions, {
      onOpenInstagramSettings: () => undefined,
      onOpenAlbumManager: () => undefined,
      onOpenLetterPicker: () => undefined,
      onOpenNewsManager: () => undefined,
      onOpenSponsorManager: () => undefined,
      onOpenEventAreaManager: () => undefined,
    }).flatMap(group => group.items.map(item => item.id));

  it('demo: tidak ada entri insight di rail maupun register, dan default path-nya bukan insight', () => {
    expect(navItemIds(demoPermissions)).not.toContain('insights');
    expect(getCommandCenterCards({ ...baseParams, permissions: demoPermissions }).map(card => card.id)).not.toContain('insights');
    expect(getAllowedDashboardPaths(demoPermissions)).not.toContain('/insights');
    // Default harus Pusat Komando, bukan halaman yang endpoint-nya menolak demo.
    expect(getDefaultDashboardPath(demoPermissions)).toBe('/');
    expect(getDefaultAppPath(demoPermissions)).toBe('/dashboard');
  });

  it('viewer: entri insight tetap tersedia', () => {
    expect(navItemIds(viewerPermissions)).toContain('insights');
    expect(getCommandCenterCards({ ...baseParams, permissions: viewerPermissions }).map(card => card.id)).toContain('insights');
    expect(getAllowedDashboardPaths(viewerPermissions)).toContain('/insights');
  });

  it('admin: entri insight tetap tersedia', () => {
    expect(navItemIds(adminPermissions)).toContain('insights');
    expect(getCommandCenterCards({ ...baseParams }).map(card => card.id)).toContain('insights');
    expect(getAllowedDashboardPaths(adminPermissions)).toContain('/insights');
  });
});

describe('getCommandCenterCards: antrian Antrian Draft', () => {
  it('menampilkan antrian yang gagal dimuat sebagai keadaan gagal, bukan kosong', () => {
    const cards = getCommandCenterCards({ ...baseParams, draftsError: 'Gagal memuat draft event.' });
    const draftsCard = cards.find(card => card.id === 'drafts');

    expect(draftsCard).toBeDefined();
    expect(draftsCard!.queue).toMatchObject({
      state: 'Gagal dimuat',
      error: 'Gagal memuat draft event.',
      action: 'Buka antrian draft',
    });
  });

  it('tidak punya antrian sama sekali saat tidak ada error dan antrian kosong', () => {
    const cards = getCommandCenterCards({ ...baseParams, draftsError: null });
    const draftsCard = cards.find(card => card.id === 'drafts');

    expect(draftsCard).toBeDefined();
    expect(draftsCard!.queue).toBeUndefined();
  });

  it('membawa jumlah draft yang menunggu dipublikasikan', () => {
    const cards = getCommandCenterCards({
      ...baseParams,
      activeDrafts: [{ id: 'd1' }, { id: 'd2' }] as never,
    });

    expect(cards.find(card => card.id === 'drafts')!.queue).toMatchObject({
      count: 2,
      state: 'menunggu dipublikasikan',
    });
  });
});

describe('getCommandCenterCards: modul Pameran & Aktivasi', () => {
  it('muncul di register agar modul ber-antrian bisa dijangkau dari Pusat Komando', () => {
    const cards = getCommandCenterCards({ ...baseParams });
    const card = cards.find(item => item.id === 'exhibitions');

    expect(card).toBeDefined();
    expect(card!.title).toBe('Pameran & Aktivasi');
    expect(card!.route).toBe('/dashboard/exhibitions');
  });

  it('membawa antrian pengajuan yang belum direview', () => {
    const cards = getCommandCenterCards({
      ...baseParams,
      exhibitionLeads: [
        { id: 'l1', status: 'pending' },
        { id: 'l2', status: 'contacted' },
        { id: 'l3', status: 'pending' },
      ] as never,
    });

    expect(cards.find(item => item.id === 'exhibitions')!.queue).toMatchObject({
      count: 2,
      state: 'pengajuan menunggu review',
    });
  });

  it('tidak punya antrian bila tidak ada pengajuan yang menunggu', () => {
    const cards = getCommandCenterCards({
      ...baseParams,
      exhibitionLeads: [{ id: 'l1', status: 'approved' }] as never,
    });

    expect(cards.find(item => item.id === 'exhibitions')!.queue).toBeUndefined();
  });

  it('disembunyikan bila tidak punya izin melihat pameran', () => {
    const cards = getCommandCenterCards({
      ...baseParams,
      permissions: { ...adminPermissions, canViewExhibitions: false },
    });

    expect(cards.find(item => item.id === 'exhibitions')).toBeUndefined();
  });
});

describe('getCommandCenterCards: register Pusat Komando (ADR-009)', () => {
  it('setiap kartu punya Dashboard Group kanonik', () => {
    const cards = getCommandCenterCards({ ...baseParams });
    const allowed: Record<string, true> = {
      Ringkasan: true,
      'Kelola Event': true,
      Interaksi: true,
      Sistem: true,
      Konten: true,
    };

    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      expect(allowed[card.group]).toBe(true);
    }
  });

  it('tidak lagi menyertakan kartu Pusat Komando (hindari self-link)', () => {
    const cards = getCommandCenterCards({ ...baseParams });

    expect(cards.find(card => card.route === '/dashboard')).toBeUndefined();
    expect(cards.find(card => card.id === 'overview')).toBeUndefined();
  });

  it('tidak lagi membawa angka di baris direktori (angka hanya di register antrian)', () => {
    const cards = getCommandCenterCards({
      ...baseParams,
      activeDrafts: [{ id: 'd1' }] as never,
      communityRegistrations: [{ id: 'r1', status: 'pending' }] as never,
    });

    for (const card of cards) {
      expect(card).not.toHaveProperty('value');
      // Modul tanpa antrian hanya boleh menyebut NAMA keadaan, bukan angka.
      if (card.state) expect(card.state).not.toMatch(/\d/);
    }
    expect(cards.find(card => card.id === 'events')!.queue).toBeUndefined();
    expect(cards.find(card => card.id === 'activity-log')!.queue).toBeUndefined();
  });

  it('memakai kalimat wayfinding yang sama dengan plat lokasi tiap modul', () => {
    const cards = getCommandCenterCards({ ...baseParams });
    const byRoute: Array<[string, string]> = [
      ['/dashboard/events', '/events'],
      ['/dashboard/drafts', '/drafts'],
      ['/dashboard/analytics', '/analytics'],
      ['/dashboard/insights', '/insights'],
      ['/dashboard/users', '/users'],
      ['/dashboard/content/landing', '/content/landing'],
    ];

    for (const [route, path] of byRoute) {
      const card = cards.find(item => item.route === route);
      expect(card, `kartu ${route}`).toBeDefined();
      expect(card!.subtitle).toBe(getWayfindingMap(path).current.description);
    }
  });

  it('memuat modul Konten yang sebelumnya tidak ada di register', () => {
    const cards = getCommandCenterCards({ ...baseParams });
    const contentIds = cards.filter(card => card.group === 'Konten').map(card => card.id);

    expect(contentIds).toEqual(
      expect.arrayContaining(['content-landing', 'content-galeri', 'content-foto-area', 'content-surat', 'content-berita', 'content-sponsorship']),
    );
  });

  it('menandai Buat Surat sebagai maintenance', () => {
    const cards = getCommandCenterCards({ ...baseParams });
    const surat = cards.find(card => card.id === 'content-surat');

    expect(surat).toBeDefined();
    expect(surat!.maintenance).toBe(true);
  });

  it('menyembunyikan seluruh grup Konten untuk role tanpa izin settings/sponsorship', () => {
    const cards = getCommandCenterCards({
      ...baseParams,
      permissions: { ...adminPermissions, canViewSettings: false, canViewSponsorship: false },
    });

    expect(cards.filter(card => card.group === 'Konten')).toHaveLength(0);
  });

  it('gate Sponsorship terpisah dari canViewSettings', () => {
    const cards = getCommandCenterCards({
      ...baseParams,
      permissions: { ...adminPermissions, canViewSettings: false, canViewSponsorship: true },
    });
    const konten = cards.filter(card => card.group === 'Konten').map(card => card.id);

    expect(konten).toEqual(['content-sponsorship']);
  });

  it('grup Ringkasan tidak menyertakan Pusat Komando', () => {
    const cards = getCommandCenterCards({ ...baseParams });
    const ringkasan = cards.filter(card => card.group === 'Ringkasan').map(card => card.id);

    expect(ringkasan).toEqual(expect.arrayContaining(['insights', 'analytics']));
    expect(ringkasan).not.toContain('overview');
  });

  it('tidak merender modul yang izinnya tidak dimiliki role, untuk SETIAP predicate', () => {
    const cards = getCommandCenterCards({
      ...baseParams,
      permissions: {
        ...adminPermissions,
        canViewDrafts: false,
        canViewThemes: false,
        canViewExhibitions: false,
        canViewTenantProposals: false,
        canViewRegistrations: false,
        canViewSurvey: false,
        canViewTenantSurveys: false,
        canViewUsers: false,
        canViewActivityLog: false,
        canViewSettings: false,
        canViewSponsorship: false,
      },
    });

    // `events` dan `insights` tidak dijaga predicate izin modul (sama seperti
    // rail: keduanya hanya gugur untuk akun tenant-relation murni).
    expect(cards.map(card => card.id)).toEqual(['events', 'insights']);
  });
});

describe('getCommandCenterCards: modul Kolaborasi Tenant', () => {
  it('muncul di register dengan plat lokasi yang sama', () => {
    const cards = getCommandCenterCards({ ...baseParams });
    const card = cards.find(item => item.id === 'tenant-proposals');

    expect(card).toBeDefined();
    expect(card!.title).toBe('Kolaborasi Tenant');
    expect(card!.route).toBe('/dashboard/tenant-proposals');
    expect(card!.subtitle).toBe(getWayfindingMap('/tenant-proposals').current.description);
  });

  it('membawa antrian pengajuan yang belum direview', () => {
    const cards = getCommandCenterCards({
      ...baseParams,
      tenantProposals: [
        { id: 'p1', status: 'pending' },
        { id: 'p2', status: 'contacted' },
        { id: 'p3', status: 'pending' },
      ] as never,
    });

    expect(cards.find(item => item.id === 'tenant-proposals')!.queue).toMatchObject({
      count: 2,
      state: 'pengajuan menunggu review',
    });
  });

  it('tidak punya antrian bila tidak ada pengajuan yang menunggu', () => {
    const cards = getCommandCenterCards({
      ...baseParams,
      tenantProposals: [{ id: 'p1', status: 'approved' }] as never,
    });

    expect(cards.find(item => item.id === 'tenant-proposals')!.queue).toBeUndefined();
  });

  it('disembunyikan bila role tidak punya izin melihat kolaborasi tenant', () => {
    const cards = getCommandCenterCards({
      ...baseParams,
      permissions: { ...adminPermissions, canViewTenantProposals: false },
    });

    expect(cards.find(item => item.id === 'tenant-proposals')).toBeUndefined();
  });

  it('tersedia di jalur dashboard yang diizinkan', () => {
    expect(getAllowedDashboardPaths(adminPermissions)).toContain('/tenant-proposals');
  });
});
