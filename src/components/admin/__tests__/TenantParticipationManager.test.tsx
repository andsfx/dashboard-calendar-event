import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import type { TenantParticipation } from '../../../types';
import { TenantParticipationManager } from '../TenantParticipationManager';

function makeParticipation(overrides: Partial<TenantParticipation> = {}): TenantParticipation {
  return {
    id: 'tpr-1', code: 'TPR-7KQ2MZ',
    tenantId: '180102223', tenantName: 'Kopi Kenangan', unitNumber: 'GF-12', tenantCategory: 'F&B',
    tenantLogo: '', contactName: 'Rani Putri', phone: '08123456789', email: 'rani@example.com',
    eventId: 'evt-9', eventTitle: 'Bazar Kopi Nusantara', eventDate: '2026-11-05', kind: 'both',
    boothArea: 'Atrium Utama', boothStart: '2026-11-05', boothEnd: '2026-11-06',
    boothSize: '2×2 m', boothProducts: 'Kopi kemasan 200gr', boothScheme: 'solo', boothNeeds: 'Listrik 1 titik',
    voucherType: 'discount_percent', voucherTerms: 'Diskon 20% semua menu', voucherQuota: 100, voucherFormat: 'both',
    status: 'pending', internalNotes: '', createdAt: '2026-10-15T02:00:00Z', updatedAt: '2026-10-15T02:00:00Z',
    ...overrides,
  };
}

const props = {
  participations: [makeParticipation()],
  isLoading: false,
  error: '',
  onRetry: vi.fn(),
  onReview: vi.fn(async () => true),
  onSaveNotes: vi.fn(async () => true),
  onSaveCorrection: vi.fn(async () => true),
  onDelete: vi.fn(async () => true),
  onConfirm: vi.fn(async () => true),
};

/** Zona review (status, koreksi, catatan) baru ada setelah kartu dibuka. */
async function expandCard(user: UserEvent, tenantName = 'Kopi Kenangan') {
  await user.click(screen.getByRole('button', { name: `Lihat detail lengkap - ${tenantName}` }));
}

describe('TenantParticipationManager — kartu ringkas', () => {
  it('menampilkan identitas tenant, event, jenis partisipasi, dan kode pengajuan', () => {
    render(<TenantParticipationManager {...props} />);

    expect(screen.getByText('Kopi Kenangan')).toBeInTheDocument();
    expect(screen.getByText(/Bazar Kopi Nusantara/)).toBeInTheDocument();
    expect(screen.getByText('Booth + voucher')).toBeInTheDocument();
    expect(screen.getByText(/TPR-7KQ2MZ/)).toBeInTheDocument();
    // Kebutuhan fasilitas internal ada di zona detail, tidak di kartu ringkas.
    expect(screen.queryByText(/Skema:/)).not.toBeInTheDocument();
  });

  it('menyebut halaman publik saat antrean kosong', () => {
    render(<TenantParticipationManager {...props} participations={[]} />);
    expect(screen.getByText(/partisipasi-tenant/)).toBeInTheDocument();
  });

  it('antrean kosong karena saringan ≠ antrean kosong', async () => {
    const user = userEvent.setup();
    render(<TenantParticipationManager
      {...props}
      participations={[makeParticipation({ id: 'a', status: 'approved' })]}
    />);
    await user.click(screen.getByRole('button', { name: 'Menunggu' }));
    expect(screen.getByText('Tidak ada pengajuan dengan status ini.')).toBeInTheDocument();
  });
});

describe('TenantParticipationManager — jenis partisipasi menentukan blok data', () => {
  it('kind voucher tidak menampilkan data booth', async () => {
    const user = userEvent.setup();
    render(<TenantParticipationManager
      {...props}
      participations={[makeParticipation({ kind: 'voucher', boothArea: '', boothProducts: '' })]}
    />);
    await expandCard(user);
    expect(screen.getByText('Diskon 20% semua menu')).toBeInTheDocument();
    expect(screen.queryByText(/Skema:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Kebutuhan:/)).not.toBeInTheDocument();
  });

  it('kind booth tidak menampilkan blok voucher', async () => {
    const user = userEvent.setup();
    render(<TenantParticipationManager
      {...props}
      participations={[makeParticipation({ kind: 'booth', voucherTerms: '' })]}
    />);
    await expandCard(user);
    expect(screen.getByText(/Kopi kemasan 200gr/)).toBeInTheDocument();
    expect(screen.queryByText(/Diskon 20%/)).not.toBeInTheDocument();
  });
});

describe('TenantParticipationManager — review dan koreksi', () => {
  it('menyetujui meminta konfirmasi lalu memanggil onReview', async () => {
    const user = userEvent.setup();
    const onReview = vi.fn(async () => true);
    render(<TenantParticipationManager {...props} onReview={onReview} />);
    await expandCard(user);

    await user.click(screen.getByRole('button', { name: 'Disetujui - Kopi Kenangan' }));

    expect(props.onConfirm).toHaveBeenCalledWith(expect.objectContaining({ title: 'Setujui partisipasi ini?' }));
    expect(onReview).toHaveBeenCalledWith('tpr-1', 'approved');
  });

  it('konfirmasi ditolak → tidak ada mutasi', async () => {
    const user = userEvent.setup();
    const onReview = vi.fn(async () => true);
    render(<TenantParticipationManager
      {...props}
      onReview={onReview}
      onConfirm={vi.fn(async () => false)}
    />);
    await expandCard(user);

    await user.click(screen.getByRole('button', { name: 'Disetujui - Kopi Kenangan' }));
    expect(onReview).not.toHaveBeenCalled();
  });

  it('koreksi isian mengirim patch field yang berubah saja', async () => {
    const user = userEvent.setup();
    const onSaveCorrection = vi.fn(async () => true);
    render(<TenantParticipationManager {...props} onSaveCorrection={onSaveCorrection} />);
    await expandCard(user);

    await user.click(screen.getByText('Koreksi isian tenant'));
    const area = await screen.findByLabelText('Area booth');
    await user.clear(area);
    await user.type(area, 'Pintu Utara 2');
    await user.click(screen.getByRole('button', { name: 'Simpan koreksi - Kopi Kenangan' }));

    expect(onSaveCorrection).toHaveBeenCalledTimes(1);
    const call = onSaveCorrection.mock.calls.at(0);
    expect(call?.[0]).toBe('tpr-1');
    expect(call?.[1]).toEqual({ boothArea: 'Pintu Utara 2' });
  });

  it('tombol simpan koreksi mati selama belum ada perubahan', async () => {
    const user = userEvent.setup();
    render(<TenantParticipationManager {...props} />);
    await expandCard(user);
    await user.click(screen.getByText('Koreksi isian tenant'));

    expect(screen.getByRole('button', { name: 'Simpan koreksi - Kopi Kenangan' })).toBeDisabled();
  });
});

describe('TenantParticipationManager — read-only (demo/viewer)', () => {
  it('menyembunyikan tombol mutasi dan menampilkan catatan internal', async () => {
    const user = userEvent.setup();
    render(<TenantParticipationManager {...props} readOnly participations={[makeParticipation({ internalNotes: 'Tunggu konfirmasi area' })]} />);
    await expandCard(user);

    expect(screen.getByText(/Catatan internal: Tunggu konfirmasi area/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Disetujui - Kopi Kenangan' })).not.toBeInTheDocument();
    expect(screen.queryByText('Koreksi isian tenant')).not.toBeInTheDocument();
  });
});

describe('TenantParticipationManager — kegagalan muat', () => {
  it('menampilkan pesan error dan tombol coba lagi', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<TenantParticipationManager {...props} error="Gagal memuat pengajuan partisipasi tenant" onRetry={onRetry} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Gagal memuat pengajuan partisipasi tenant');
    await user.click(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(onRetry).toHaveBeenCalled();
  });
});
