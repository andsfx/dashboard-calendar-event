/**
 * Modal "Kelola opsi" — kontrol tambah harus sejalan dengan domain server.
 *
 * Server menolak value di luar enum untuk `booth_scheme`, `voucher_type`, dan
 * `voucher_format`; `booth_size` bebas. Sebelum perbaikan, form tambah memakai
 * input teks bebas untuk keempat grup, sehingga value karangan selalu berakhir
 * 400 setelah tombol Tambah ditekan.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';

const api = vi.hoisted(() => ({
  fetchAll: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('../../../utils/domainApi', () => ({
  fetchAllTenantParticipationOptions: api.fetchAll,
  createTenantParticipationOption: api.create,
  updateTenantParticipationOption: api.update,
  deleteTenantParticipationOption: api.remove,
}));

import { TenantParticipationOptionsModal } from '../TenantParticipationOptionsModal';

const EXISTING = [
  { id: 'o1', group: 'booth_scheme' as const, value: 'solo', label: 'Booth sendiri', sortOrder: 10, isActive: true, createdAt: '', updatedAt: '' },
  { id: 'o2', group: 'booth_size' as const, value: '2x2', label: '2 × 2 m', sortOrder: 10, isActive: true, createdAt: '', updatedAt: '' },
];

/** Host `md-*` pembungkus kontrol (mock menaruh kontrol native di dalamnya). */
const hostOf = (el: HTMLElement) => el.closest('md-outlined-select, md-outlined-text-field') ?? el;

async function renderModal() {
  render(<TenantParticipationOptionsModal isOpen onClose={() => {}} onSaved={() => {}} />);
  await waitFor(() => expect(api.fetchAll).toHaveBeenCalled());
  const value = (await screen.findByLabelText('Value (slug)')) as HTMLSelectElement;
  const group = (await screen.findByLabelText('Grup')) as HTMLSelectElement;
  // Form tambah memfilter nilai enum berdasarkan opsi yang SUDAH ada, jadi
  // tunggu baris opsi benar-benar ter-render sebelum menilai pilihannya.
  await waitFor(() => expect(document.querySelector('#opt-label-o1')).toBeInTheDocument());
  return { value, group };
}

describe('TenantParticipationOptionsModal — form tambah', () => {
  beforeEach(() => {
    api.fetchAll.mockReset().mockResolvedValue(EXISTING);
    api.create.mockReset().mockResolvedValue(undefined);
    api.update.mockReset().mockResolvedValue(undefined);
    api.remove.mockReset().mockResolvedValue(undefined);
  });

  it('grup terkunci jadi pilihan, bukan input bebas', async () => {
    const { value } = await renderModal();
    expect(hostOf(value).tagName).toBe('MD-OUTLINED-SELECT');
  });

  it('hanya menawarkan nilai enum yang belum terdaftar', async () => {
    const { value } = await renderModal();
    const values = Array.from(value.options).map((option) => option.value);

    // 'solo' sudah terdaftar, jadi tersisa dua nilai lain dari domain.
    expect(values).toEqual(['joint', 'mall_support']);
    expect(values).not.toContain('solo');
  });

  it('mengirim value enum yang dipilih, bukan teks bebas', async () => {
    const { value } = await renderModal();
    const user = userEvent.setup();

    await user.selectOptions(value, 'joint');
    // Host `md-outlined-text-field` dan `<input>` di dalamnya berbagi id yang
    // sama; ambil elemen INPUT-nya secara eksplisit.
    const labelInput = await waitFor(() => {
      const el = [...document.querySelectorAll('#opt-new-label')].find((node) => node.tagName === 'INPUT');
      if (!el) throw new Error('input label belum ter-render');
      return el as HTMLInputElement;
    });
    await user.type(labelInput, 'Gabungan tenant');
    await user.click(screen.getByRole('button', { name: 'Tambah' }));

    await waitFor(() => expect(api.create).toHaveBeenCalledWith('booth_scheme', 'joint', 'Gabungan tenant'));
  });

  it('grup booth_size tetap memakai input bebas dan tidak membawa slug grup lama', async () => {
    const { group, value } = await renderModal();
    const user = userEvent.setup();

    // Nilai terkunci terisi otomatis ('joint'); pindah grup harus mengosongkannya.
    await user.selectOptions(value, 'joint');
    await user.selectOptions(group, 'booth_size');

    await waitFor(() => {
      expect(document.querySelector('#opt-new-value')?.tagName).toBe('MD-OUTLINED-TEXT-FIELD');
    });
    const input = [...document.querySelectorAll('#opt-new-value')].find((node) => node.tagName === 'INPUT');
    expect((input as HTMLInputElement).value).toBe('');
  });

  it('menjelaskan saat semua nilai grup sudah terdaftar', async () => {
    api.fetchAll.mockResolvedValue([
      ...EXISTING,
      { id: 'o3', group: 'booth_scheme' as const, value: 'joint', label: 'Gabungan', sortOrder: 20, isActive: true, createdAt: '', updatedAt: '' },
      { id: 'o4', group: 'booth_scheme' as const, value: 'mall_support', label: 'Dukungan mall', sortOrder: 30, isActive: true, createdAt: '', updatedAt: '' },
    ]);
    await renderModal();

    expect(await screen.findByText(/Semua nilai untuk grup ini sudah terdaftar/)).toBeInTheDocument();
  });
});
