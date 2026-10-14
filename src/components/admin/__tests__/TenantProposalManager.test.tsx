import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import type { TenantEventProposal } from '../../../types';
import { TenantProposalManager } from '../TenantProposalManager';

function makeProposal(overrides: Partial<TenantEventProposal> = {}): TenantEventProposal {
  return {
    id: 'tep-1', tenantId: '180102223', tenantName: 'Kopi Kenangan', unitNumber: 'GF-12', tenantCategory: 'F&B',
    contactName: 'Rani Putri', phone: '08123456789', email: 'rani@example.com',
    eventTitle: 'Workshop Latte Art', eventType: 'workshop',
    eventDescription: 'Kelas latte art 60 menit untuk 30 peserta.',
    proposedStart: '2026-11-05', proposedEnd: '', preferredArea: 'Main Atrium',
    expectedVisitors: '30 orang', needs: 'Meja, kursi, listrik',
    proposalFileUrl: 'https://cdn.example.com/tenant-proposals/proposal.pdf',
    proposalFileName: 'proposal.pdf', proposalMimeType: 'application/pdf', proposalFileSize: 1024,
    status: 'pending', internalNotes: '', createdAt: '2026-10-13T02:00:00Z', updatedAt: '2026-10-13T02:00:00Z',
    ...overrides,
  };
}

const props = {
  proposals: [makeProposal()],
  isLoading: false,
  error: '',
  onReview: vi.fn(async () => true),
  onSaveNotes: vi.fn(async () => true),
  onDelete: vi.fn(async () => true),
  onConfirm: vi.fn(async () => true),
};

describe('TenantProposalManager', () => {
  it('menampilkan identitas tenant, rencana event, kontak, dan lampiran proposal', () => {
    render(<TenantProposalManager {...props} />);

    expect(screen.getByText('Kopi Kenangan')).toBeInTheDocument();
    expect(screen.getByText(/Workshop Latte Art/)).toBeInTheDocument();
    expect(screen.getByText(/Rani Putri/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /proposal\.pdf/ })).toHaveAttribute(
      'href', 'https://cdn.example.com/tenant-proposals/proposal.pdf',
    );
  });

  it('menandai asal data tenant: tautan master MID atau isi manual', () => {
    const { rerender } = render(<TenantProposalManager {...props} />);
    expect(screen.getByText(/ID tenant 180102223/)).toBeInTheDocument();

    rerender(<TenantProposalManager {...props} proposals={[makeProposal({ tenantId: '' })]} />);
    expect(screen.getByText(/diisi manual/)).toBeInTheDocument();
  });

  it('menghitung pengajuan yang menunggu tinjauan', () => {
    render(<TenantProposalManager {...props} proposals={[makeProposal(), makeProposal({ id: 'tep-2', status: 'approved' })]} />);

    expect(screen.getByText(/1 dari 2 pengajuan menunggu tinjauan/)).toBeInTheDocument();
  });

  it('menawarkan status review lain dan meneruskannya tanpa membuat event', async () => {
    const user = userEvent.setup();
    const onReview = vi.fn(async () => true);
    render(<TenantProposalManager {...props} onReview={onReview} />);

    await user.click(screen.getByRole('button', { name: 'Disetujui' }));

    expect(onReview).toHaveBeenCalledWith('tep-1', 'approved');
    expect(screen.getByText(/Menyetujui pengajuan tidak membuat event/)).toBeInTheDocument();
  });

  it('menyimpan catatan internal hanya setelah diubah', async () => {
    const user = userEvent.setup();
    const onSaveNotes = vi.fn(async () => true);
    render(<TenantProposalManager {...props} proposals={[makeProposal({ internalNotes: 'lama' })]} onSaveNotes={onSaveNotes} />);

    const save = screen.getByRole('button', { name: 'Simpan catatan' });
    expect(save).toBeDisabled();

    await user.type(screen.getByLabelText(/Catatan internal/), ' baru');
    expect(save).toBeEnabled();
    await user.click(save);

    expect(onSaveNotes).toHaveBeenCalledWith('tep-1', 'lama baru');
  });

  it('menghapus hanya setelah konfirmasi disetujui', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn(async () => true);
    const onConfirm = vi.fn(async () => true);
    render(<TenantProposalManager {...props} onDelete={onDelete} onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: 'Hapus' }));

    expect(onConfirm).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalledWith('tep-1');
  });

  it('tidak menghapus saat konfirmasi ditolak', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn(async () => true);
    render(<TenantProposalManager {...props} onDelete={onDelete} onConfirm={async () => false} />);

    await user.click(screen.getByRole('button', { name: 'Hapus' }));

    expect(onDelete).not.toHaveBeenCalled();
  });

  it('menyembunyikan seluruh mutasi untuk akun demo (read-only)', () => {
    render(<TenantProposalManager {...props} readOnly />);

    expect(screen.queryByRole('button', { name: 'Disetujui' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hapus' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Catatan internal/)).not.toBeInTheDocument();
  });

  it('menyatakan antrean kosong dan error secara eksplisit', () => {
    const { rerender } = render(<TenantProposalManager {...props} proposals={[]} />);
    expect(screen.getByText(/Belum ada pengajuan/)).toBeInTheDocument();

    rerender(<TenantProposalManager {...props} proposals={[]} error="Gagal memuat pengajuan kolaborasi tenant" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Gagal memuat pengajuan kolaborasi tenant');
  });
});
