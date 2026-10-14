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
    proposalFileName: 'proposal.pdf', proposalMimeType: 'application/pdf', proposalFileSize: 1258291,
    status: 'pending', internalNotes: '', createdAt: '2026-10-13T02:00:00Z', updatedAt: '2026-10-13T02:00:00Z',
    ...overrides,
  };
}

const props = {
  proposals: [makeProposal()],
  isLoading: false,
  error: '',
  onRetry: vi.fn(),
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

  it('menyebut tipe dan ukuran lampiran dengan pemisah desimal Indonesia', () => {
    render(<TenantProposalManager {...props} />);

    // 1.258.291 byte = 1,2 MB (koma, bukan titik).
    expect(screen.getByRole('link', { name: /proposal\.pdf/ })).toHaveTextContent('PDF · 1,2 MB');
  });

  it('menampilkan ukuran KB untuk berkas di bawah satu megabyte', () => {
    render(<TenantProposalManager {...props} proposals={[makeProposal({ proposalMimeType: 'image/png', proposalFileSize: 46080 })]} />);

    expect(screen.getByRole('link', { name: /proposal\.pdf/ })).toHaveTextContent('PNG · 45 KB');
  });

  it('membuat nomor WhatsApp dan email bisa ditindaklanjuti langsung', () => {
    render(<TenantProposalManager {...props} />);

    expect(screen.getByRole('link', { name: /08123456789/ })).toHaveAttribute('href', 'tel:08123456789');
    expect(screen.getByRole('link', { name: /rani@example\.com/ })).toHaveAttribute('href', 'mailto:rani@example.com');
  });

  it('memberi setiap tombol status nama yang mengikatnya ke pengajuan', () => {
    render(<TenantProposalManager {...props} />);

    expect(screen.getByRole('button', { name: 'Disetujui - Kopi Kenangan' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ditolak - Kopi Kenangan' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dihubungi - Kopi Kenangan' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hapus - Kopi Kenangan' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Simpan catatan - Kopi Kenangan' })).toBeInTheDocument();
  });

  it('menawarkan status review lain dan meneruskannya tanpa membuat event', async () => {
    const user = userEvent.setup();
    const onReview = vi.fn(async () => true);
    render(<TenantProposalManager {...props} onReview={onReview} />);

    await user.click(screen.getByRole('button', { name: 'Disetujui - Kopi Kenangan' }));

    expect(onReview).toHaveBeenCalledWith('tep-1', 'approved');
    expect(screen.getByText(/Menyetujui pengajuan tidak membuat event/)).toBeInTheDocument();
  });

  it('menyimpan catatan internal hanya setelah diubah', async () => {
    const user = userEvent.setup();
    const onSaveNotes = vi.fn(async () => true);
    render(<TenantProposalManager {...props} proposals={[makeProposal({ internalNotes: 'lama' })]} onSaveNotes={onSaveNotes} />);

    const save = screen.getByRole('button', { name: 'Simpan catatan - Kopi Kenangan' });
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

    await user.click(screen.getByRole('button', { name: 'Hapus - Kopi Kenangan' }));

    expect(onConfirm).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalledWith('tep-1');
  });

  it('tidak menghapus saat konfirmasi ditolak', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn(async () => true);
    render(<TenantProposalManager {...props} onDelete={onDelete} onConfirm={async () => false} />);

    await user.click(screen.getByRole('button', { name: 'Hapus - Kopi Kenangan' }));

    expect(onDelete).not.toHaveBeenCalled();
  });

  it('menyembunyikan seluruh mutasi untuk akun demo (read-only)', () => {
    render(<TenantProposalManager {...props} readOnly />);

    expect(screen.queryByRole('button', { name: 'Disetujui - Kopi Kenangan' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hapus - Kopi Kenangan' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Catatan internal/)).not.toBeInTheDocument();
  });

  it('menyatakan antrean kosong dan error secara eksplisit', () => {
    const { rerender } = render(<TenantProposalManager {...props} proposals={[]} />);
    expect(screen.getByText(/Belum ada pengajuan/)).toBeInTheDocument();

    rerender(<TenantProposalManager {...props} proposals={[]} error="Gagal memuat pengajuan kolaborasi tenant" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Gagal memuat pengajuan kolaborasi tenant');
  });
});

describe('TenantProposalManager — konfirmasi status berkonsekuensi', () => {
  /** Bentuk opsi yang dikirim ke dialog konfirmasi; mock-nya perlu bertipe
   *  agar `mock.calls[0][0]` bisa dibaca di assertion. */
  type ConfirmOptions = { title: string; message: string; confirmLabel?: string };

  it('meminta konfirmasi sebelum menyetujui', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn(async (_options: ConfirmOptions) => true);
    const onReview = vi.fn(async () => true);
    render(<TenantProposalManager {...props} onConfirm={onConfirm} onReview={onReview} />);

    await user.click(screen.getByRole('button', { name: 'Disetujui - Kopi Kenangan' }));

    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ title: 'Setujui pengajuan ini?' }));
    const options = onConfirm.mock.calls[0][0];
    expect(options.message).toContain('Workshop Latte Art');
    expect(options.message).toContain('Kopi Kenangan');
    expect(onReview).toHaveBeenCalledWith('tep-1', 'approved');
  });

  it('meminta konfirmasi sebelum menolak, dan menyebut tenant akan diberi tahu', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn(async (_options: ConfirmOptions) => true);
    const onReview = vi.fn(async () => true);
    render(<TenantProposalManager {...props} onConfirm={onConfirm} onReview={onReview} />);

    await user.click(screen.getByRole('button', { name: 'Ditolak - Kopi Kenangan' }));

    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ title: 'Tolak pengajuan ini?' }));
    expect(onConfirm.mock.calls[0][0].message).toMatch(/diberi tahu/);
    expect(onReview).toHaveBeenCalledWith('tep-1', 'rejected');
  });

  it('tidak mengubah status saat konfirmasi ditolak', async () => {
    const user = userEvent.setup();
    const onReview = vi.fn(async () => true);
    render(<TenantProposalManager {...props} onReview={onReview} onConfirm={async () => false} />);

    await user.click(screen.getByRole('button', { name: 'Disetujui - Kopi Kenangan' }));

    expect(onReview).not.toHaveBeenCalled();
  });

  it('tidak meminta konfirmasi untuk status berlawanan risiko rendah', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn(async () => true);
    const onReview = vi.fn(async () => true);
    render(<TenantProposalManager {...props} onConfirm={onConfirm} onReview={onReview} />);

    await user.click(screen.getByRole('button', { name: 'Dihubungi - Kopi Kenangan' }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onReview).toHaveBeenCalledWith('tep-1', 'contacted');
  });

  it('juga bebas konfirmasi saat mengembalikan status ke Menunggu', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn(async () => true);
    const onReview = vi.fn(async () => true);
    render(
      <TenantProposalManager
        {...props}
        proposals={[makeProposal({ status: 'approved' })]}
        onConfirm={onConfirm}
        onReview={onReview}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Menunggu - Kopi Kenangan' }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onReview).toHaveBeenCalledWith('tep-1', 'pending');
  });
});

describe('TenantProposalManager — pemulihan setelah gagal muat', () => {
  it('menyediakan tombol coba lagi yang memanggil onRetry', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<TenantProposalManager {...props} proposals={[]} error="Gagal memuat pengajuan kolaborasi tenant" onRetry={onRetry} />);

    await user.click(screen.getByRole('button', { name: 'Coba lagi' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('tidak menampilkan tombol coba lagi saat tidak ada error', () => {
    render(<TenantProposalManager {...props} />);

    expect(screen.queryByRole('button', { name: 'Coba lagi' })).not.toBeInTheDocument();
  });
});

describe('TenantProposalManager — draft catatan tidak menimpa catatan server', () => {
  it('membuang draft basi saat catatan server berubah di bawahnya', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<TenantProposalManager {...props} proposals={[makeProposal({ internalNotes: 'A' })]} />);

    const textarea = screen.getByLabelText(/Catatan internal/);
    await user.type(textarea, 'X');
    expect(screen.getByRole('button', { name: 'Simpan catatan - Kopi Kenangan' })).toBeEnabled();

    // Reload latar membawa catatan server yang berbeda: draft lama tidak boleh menang.
    rerender(<TenantProposalManager {...props} proposals={[makeProposal({ internalNotes: 'B' })]} />);

    expect(screen.getByLabelText(/Catatan internal/)).toHaveValue('B');
    expect(screen.getByRole('button', { name: 'Simpan catatan - Kopi Kenangan' })).toBeDisabled();
  });

  it('menyimpan nilai server saat draft basi tersimpan, bukan teks lama', async () => {
    const user = userEvent.setup();
    const onSaveNotes = vi.fn(async () => true);
    const { rerender } = render(
      <TenantProposalManager {...props} proposals={[makeProposal({ internalNotes: 'A' })]} onSaveNotes={onSaveNotes} />,
    );

    await user.type(screen.getByLabelText(/Catatan internal/), 'X');
    rerender(<TenantProposalManager {...props} proposals={[makeProposal({ internalNotes: 'B' })]} onSaveNotes={onSaveNotes} />);

    // Tombol nonaktif → tidak ada cara menyimpan teks basi.
    expect(screen.getByRole('button', { name: 'Simpan catatan - Kopi Kenangan' })).toBeDisabled();
    expect(onSaveNotes).not.toHaveBeenCalled();
  });

  it('melepas draft catatan setelah pengajuan dihapus', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn(async () => true);
    const { rerender } = render(
      <TenantProposalManager {...props} proposals={[makeProposal({ internalNotes: 'A' })]} onDelete={onDelete} />,
    );

    await user.type(screen.getByLabelText(/Catatan internal/), 'X');
    await user.click(screen.getByRole('button', { name: 'Hapus - Kopi Kenangan' }));
    expect(onDelete).toHaveBeenCalledWith('tep-1');

    // Baris yang sama muncul lagi (mis. reload membawa data server): draft lama
    // tidak boleh ikut hidup kembali.
    rerender(<TenantProposalManager {...props} proposals={[makeProposal({ internalNotes: 'A' })]} onDelete={onDelete} />);

    expect(screen.getByLabelText(/Catatan internal/)).toHaveValue('A');
  });
});

describe('TenantProposalManager — kunci status terbaca', () => {
  it('memberi setiap status nada yang berbeda, bukan kelas nilai terukur', () => {
    const cases: Array<[TenantEventProposal['status'], string]> = [
      ['pending', 'wf-key--action'],
      ['contacted', 'wf-key--accent'],
      ['approved', 'wf-key--live'],
      ['rejected', 'wf-key--idle'],
    ];

    for (const [status, tone] of cases) {
      // Kueri langsung ke elemen kunci di dalam kartu: label status juga muncul
      // sebagai teks tombol, jadi pencarian teks global ambigu.
      const { container, unmount } = render(<TenantProposalManager {...props} proposals={[makeProposal({ status })]} />);
      const key = container.querySelector('.wf-key');
      expect(key, status).not.toBeNull();
      expect(key, status).toHaveClass(tone);
      expect(key, status).not.toHaveClass('wf-code');
      expect(key, status).toHaveTextContent(/^(Menunggu|Dihubungi|Disetujui|Ditolak)$/);
      unmount();
    }
  });
});
