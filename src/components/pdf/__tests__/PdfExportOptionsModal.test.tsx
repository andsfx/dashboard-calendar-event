import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PdfExportOptionsModal, type PdfSectionOption } from '../PdfExportOptionsModal';

const SECTIONS: PdfSectionOption[] = [
  { id: 'summary', label: 'Ringkasan', hint: 'Kartu jumlah' },
  { id: 'table', label: 'Tabel Jadwal', hint: 'Daftar lengkap' },
  { id: 'areas', label: 'Agenda per Area', hint: 'Per lokasi' },
];

function renderModal(overrides: Partial<Parameters<typeof PdfExportOptionsModal>[0]> = {}) {
  const onGenerate = vi.fn(async () => {});
  const onClose = vi.fn();
  render(
    <PdfExportOptionsModal
      isOpen
      onClose={onClose}
      title="Export Jadwal"
      description="2 event"
      sections={SECTIONS}
      defaultSelected={['summary', 'table']}
      onGenerate={onGenerate}
      {...overrides}
    />,
  );
  return { onGenerate, onClose };
}

describe('PdfExportOptionsModal', () => {
  it('menampilkan seluruh bagian dan memilih default', () => {
    renderModal();
    expect(screen.getByText('Ringkasan')).toBeInTheDocument();
    expect(screen.getByText('Tabel Jadwal')).toBeInTheDocument();
    expect(screen.getByText('Agenda per Area')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Ringkasan/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Agenda per Area/ })).not.toBeChecked();
  });

  it('mengirim bagian yang dipilih saat generate', async () => {
    const { onGenerate, onClose } = renderModal();
    fireEvent.click(screen.getByRole('checkbox', { name: /Agenda per Area/ }));
    fireEvent.click(screen.getByRole('button', { name: /Unduh PDF/ }));

    await vi.waitFor(() => expect(onGenerate).toHaveBeenCalledWith(['summary', 'table', 'areas']));
    await vi.waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('bagian wajib tidak bisa dimatikan', () => {
    renderModal({ requiredSections: ['table'] });
    const required = screen.getByRole('checkbox', { name: /Tabel Jadwal/ });
    expect(required).toBeChecked();
    expect(required).toBeDisabled();
    expect(screen.getByText('Selalu disertakan')).toBeInTheDocument();
  });

  it('menonaktifkan tombol saat tidak ada bagian dipilih', () => {
    renderModal({ defaultSelected: [] });
    expect(screen.getByRole('button', { name: /Unduh PDF/ })).toBeDisabled();
  });

  it('Pilih semua / Kosongkan bekerja pada bagian yang bisa diubah', () => {
    renderModal({ requiredSections: ['table'] });
    fireEvent.click(screen.getByRole('button', { name: /Pilih semua/ }));
    expect(screen.getByRole('checkbox', { name: /Ringkasan/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Agenda per Area/ })).toBeChecked();

    fireEvent.click(screen.getByRole('button', { name: /Kosongkan/ }));
    expect(screen.getByRole('checkbox', { name: /Ringkasan/ })).not.toBeChecked();
    // Bagian wajib tetap aktif.
    expect(screen.getByRole('checkbox', { name: /Tabel Jadwal/ })).toBeChecked();
  });

  it('menampilkan pesan galat bila generate gagal', async () => {
    const onGenerate = vi.fn(async () => {
      throw new Error('Gagal membuat PDF.');
    });
    renderModal({ onGenerate });
    fireEvent.click(screen.getByRole('button', { name: /Unduh PDF/ }));
    expect(await screen.findByText('Gagal membuat PDF.')).toBeInTheDocument();
  });

  it('tidak merender apa pun saat tertutup', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
