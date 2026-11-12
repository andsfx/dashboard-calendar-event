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
  canViewTenantProposals: true,
  canViewUsers: true,
  canViewSettings: true,
  canViewSponsorship: true,
  canViewTenantSurveys: true,
  canViewInternalSchedule: true,
  role: 'superadmin',
};

const baseProps = {
  activeDrafts: [],
  annualThemes: [],
  communityRegistrations: [],
  exhibitionLeads: [],
  draftsError: null,
  permissions: adminPermissions,
};

function renderRegister(props: Partial<Parameters<typeof CommandCenterSummary>[0]> = {}) {
  return render(
    <MemoryRouter>
      <CommandCenterSummary {...baseProps} {...props} />
    </MemoryRouter>,
  );
}

describe('CommandCenterSummary: register "Perlu tindakan"', () => {
  it('hanya memuat modul yang punya antrian manusia', () => {
    renderRegister({ activeDrafts: [{ id: 'd1' } as never] });

    const register = screen.getByRole('region', { name: 'Perlu tindakan' });
    expect(within(register).getByRole('link', { name: /Antrian draft/ })).toBeInTheDocument();
    // Modul pasif tidak boleh naik ke register antrian.
    expect(within(register).queryByRole('link', { name: /Log aktivitas/ })).not.toBeInTheDocument();
    expect(within(register).queryByRole('link', { name: /Jadwal event/ })).not.toBeInTheDocument();
  });

  it('menyebut angka, keadaan, dan aksi untuk modul yang menunggu', () => {
    renderRegister({ activeDrafts: [{ id: 'd1' } as never, { id: 'd2' } as never] });

    const row = screen.getByRole('link', { name: /Antrian draft/ });
    expect(row).toHaveAttribute('href', '/dashboard/drafts');
    expect(within(row).getByText('2')).toBeInTheDocument();
    expect(within(row).getByText('menunggu penerbitan')).toBeInTheDocument();
    expect(within(row).getByText('Buka antrian draft')).toBeInTheDocument();
  });

  it('memakai angka antrian, bukan total pendaftaran', () => {
    renderRegister({
      communityRegistrations: [
        { id: 'r1', status: 'pending' },
        { id: 'r2', status: 'approved' },
        { id: 'r3', status: 'approved' },
      ] as never,
    });

    const row = screen.getByRole('link', { name: /Pendaftaran/ });
    expect(within(row).getByText('1')).toBeInTheDocument();
    expect(within(row).getByText('menunggu tinjauan')).toBeInTheDocument();
  });

  it('memasukkan pengajuan pameran yang menunggu tinjauan', () => {
    renderRegister({
      exhibitionLeads: [
        { id: 'l1', status: 'pending' },
        { id: 'l2', status: 'approved' },
      ] as never,
    });

    const row = screen.getByRole('link', { name: /Pameran dan aktivasi/ });
    expect(row).toHaveAttribute('href', '/dashboard/exhibitions');
    expect(within(row).getByText('1')).toBeInTheDocument();
    expect(within(row).getByText('pengajuan menunggu tinjauan')).toBeInTheDocument();
  });

  it('tidak menganggap antrian draft yang gagal dimuat sebagai kosong', () => {
    renderRegister({ draftsError: 'Gagal memuat draft event.' });

    const row = screen.getByRole('link', { name: /Antrian draft/ });
    expect(within(row).getByText('—')).toBeInTheDocument();
    expect(within(row).getByText(/Antrian gagal dimuat: Gagal memuat draft event\./)).toBeInTheDocument();
    expect(screen.queryByText(/Tidak ada modul yang menunggu tindakan/)).not.toBeInTheDocument();
  });

  it('menyatakan antrian kosong saat tidak ada modul yang menunggu', () => {
    renderRegister();

    expect(screen.getByText(/Tidak ada modul yang menunggu tindakan\./)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Antrian draft/ })).not.toBeInTheDocument();
  });

  it('tidak merender modul yang tidak boleh dibuka role', () => {
    renderRegister({
      activeDrafts: [{ id: 'd1' } as never],
      communityRegistrations: [{ id: 'r1', status: 'pending' }] as never,
      permissions: { ...adminPermissions, canViewDrafts: false, canViewRegistrations: false },
    });

    expect(screen.queryByRole('link', { name: /Antrian draft/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Pendaftaran/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Tidak ada modul yang menunggu tindakan/)).toBeInTheDocument();
  });
});
