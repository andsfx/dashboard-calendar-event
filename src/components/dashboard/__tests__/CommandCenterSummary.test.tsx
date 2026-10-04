import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { CommandCenterSummary } from '../CommandCenterSummary';
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

const baseProps = {
  totalEvents: 10,
  upcomingEvents: 4,
  ongoingEvents: 1,
  activeDrafts: [],
  annualThemes: [],
  communityRegistrations: [],
  draftsError: null,
  permissions: adminPermissions,
  isSuperadmin: true,
};

function renderGrid(props: Partial<Parameters<typeof CommandCenterSummary>[0]> = {}) {
  return render(
    <MemoryRouter>
      <CommandCenterSummary {...baseProps} {...props} />
    </MemoryRouter>,
  );
}

describe('CommandCenterSummary — Grid Kartu Modul', () => {
  it('merender 5 Dashboard Group sebagai judul grup', () => {
    renderGrid();

    for (const label of ['Ringkasan', 'Kelola Event', 'Interaksi', 'Sistem', 'Konten']) {
      expect(screen.getByRole('heading', { name: new RegExp(label) })).toBeInTheDocument();
    }
  });

  it('tidak merender tautan ke halaman Pusat Komando sendiri', () => {
    renderGrid();

    const links = screen.getAllByRole('link');
    for (const link of links) {
      expect(link).not.toHaveAttribute('href', '/dashboard');
    }
  });

  it('menautkan tiap kartu ke rute modulnya', () => {
    renderGrid();

    expect(screen.getByRole('link', { name: /Jadwal Event/ })).toHaveAttribute('href', '/dashboard/events');
    expect(screen.getByRole('link', { name: /Halaman Landing/ })).toHaveAttribute('href', '/dashboard/content/landing');
  });

  it('menandai kartu yang menunggu tindakan dengan teks, bukan warna saja', () => {
    renderGrid({ activeDrafts: [{ id: 'd1' } as never] });

    const draftsCard = screen.getByRole('link', { name: /Antrian Draft/ });
    expect(within(draftsCard).getByText('Perlu tindakan')).toBeInTheDocument();
  });

  it('menyembunyikan grup Konten untuk role tanpa izin settings/sponsorship', () => {
    renderGrid({
      permissions: { ...adminPermissions, canViewSettings: false, canViewSponsorship: false },
    });

    expect(screen.queryByRole('heading', { name: /Konten/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Halaman Landing/ })).not.toBeInTheDocument();
  });

  it('menandai Buat Surat sebagai sedang diperbaiki', () => {
    renderGrid();

    const suratCard = screen.getByRole('link', { name: /Buat Surat/ });
    expect(within(suratCard).getByText('Sedang diperbaiki')).toBeInTheDocument();
  });

  it('memberi tahu saat tidak ada modul yang menunggu tindakan', () => {
    renderGrid({ ongoingEvents: 0, activeDrafts: [], communityRegistrations: [] });

    expect(screen.getByText(/Tidak ada modul yang menunggu tindakan/)).toBeInTheDocument();
  });

  it('tidak menampilkan pesan antrian kosong saat ada yang menunggu', () => {
    renderGrid({ activeDrafts: [{ id: 'd1' } as never] });

    expect(screen.queryByText(/Tidak ada modul yang menunggu tindakan/)).not.toBeInTheDocument();
  });
});
