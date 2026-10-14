import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent, { type UserEvent } from '@testing-library/user-event';
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

/**
 * Kartu tampil ringkas lebih dulu, jadi apa pun yang hidup di zona review
 * (tombol status, catatan, hint) baru ada setelah kartunya dibuka.
 */
async function expandCard(user: UserEvent, tenantName = 'Kopi Kenangan') {
  await user.click(screen.getByRole('button', { name: `Lihat detail lengkap - ${tenantName}` }));
}

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

  it('memberi setiap tombol status nama yang mengikatnya ke pengajuan', async () => {
    const user = userEvent.setup();
    render(<TenantProposalManager {...props} />);
    await expandCard(user);

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
    await expandCard(user);

    await user.click(screen.getByRole('button', { name: 'Disetujui - Kopi Kenangan' }));

    expect(onReview).toHaveBeenCalledWith('tep-1', 'approved');
    expect(screen.getByText(/Menyetujui pengajuan tidak membuat event/)).toBeInTheDocument();
  });

  it('menyimpan catatan internal hanya setelah diubah', async () => {
    const user = userEvent.setup();
    const onSaveNotes = vi.fn(async () => true);
    render(<TenantProposalManager {...props} proposals={[makeProposal({ internalNotes: 'lama' })]} onSaveNotes={onSaveNotes} />);
    await expandCard(user);

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
    await expandCard(user);

    await user.click(screen.getByRole('button', { name: 'Hapus - Kopi Kenangan' }));

    expect(onConfirm).toHaveBeenCalled();
    expect(onDelete).toHaveBeenCalledWith('tep-1');
  });

  it('tidak menghapus saat konfirmasi ditolak', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn(async () => true);
    render(<TenantProposalManager {...props} onDelete={onDelete} onConfirm={async () => false} />);
    await expandCard(user);

    await user.click(screen.getByRole('button', { name: 'Hapus - Kopi Kenangan' }));

    expect(onDelete).not.toHaveBeenCalled();
  });

  it('menyembunyikan seluruh mutasi untuk akun demo (read-only)', async () => {
    const user = userEvent.setup();
    render(<TenantProposalManager {...props} readOnly />);
    await expandCard(user);

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

describe('TenantProposalManager — saringan status', () => {
  const mixed = [
    makeProposal({ id: 'a', tenantName: 'Kopi Kenangan', status: 'pending' }),
    makeProposal({ id: 'b', tenantName: 'Batik Nusantara', status: 'approved' }),
  ];

  it('menampilkan kelima chip saringan', () => {
    render(<TenantProposalManager {...props} proposals={mixed} />);

    for (const label of ['Semua', 'Menunggu', 'Dihubungi', 'Disetujui', 'Ditolak']) {
      expect(screen.getByRole('button', { name: label }), label).toBeInTheDocument();
    }
  });

  it('menyaring daftar ke satu status saja', async () => {
    const user = userEvent.setup();
    render(<TenantProposalManager {...props} proposals={mixed} />);

    await user.click(screen.getByRole('button', { name: 'Menunggu' }));

    expect(screen.getByText('Kopi Kenangan')).toBeInTheDocument();
    expect(screen.queryByText('Batik Nusantara')).not.toBeInTheDocument();
  });

  it('menandai chip yang aktif lewat aria-pressed', async () => {
    const user = userEvent.setup();
    render(<TenantProposalManager {...props} proposals={mixed} />);

    expect(screen.getByRole('button', { name: 'Semua' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Menunggu' })).toHaveAttribute('aria-pressed', 'false');

    await user.click(screen.getByRole('button', { name: 'Menunggu' }));

    expect(screen.getByRole('button', { name: 'Menunggu' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Semua' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('tetap menghitung pengajuan menunggu dari daftar penuh, bukan hasil saringan', async () => {
    const user = userEvent.setup();
    render(<TenantProposalManager {...props} proposals={mixed} />);

    expect(screen.getByText(/1 dari 2 pengajuan menunggu tinjauan/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Disetujui' }));

    // Satu-satunya baris yang tampil disetujui, tapi header tetap bicara antrean penuh.
    expect(screen.getByText(/1 dari 2 pengajuan menunggu tinjauan/)).toBeInTheDocument();
  });

  it('kembali ke Semua saat chip yang sedang aktif diklik ulang', async () => {
    const user = userEvent.setup();
    render(<TenantProposalManager {...props} proposals={mixed} />);

    await user.click(screen.getByRole('button', { name: 'Menunggu' }));
    expect(screen.queryByText('Batik Nusantara')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Menunggu' }));

    expect(screen.getByText('Batik Nusantara')).toBeInTheDocument();
    expect(screen.getByText('Kopi Kenangan')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Semua' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('membedakan kosong karena saringan dari antrean yang memang kosong', async () => {
    const user = userEvent.setup();
    render(<TenantProposalManager {...props} proposals={mixed} />);

    await user.click(screen.getByRole('button', { name: 'Ditolak' }));

    expect(screen.getByText('Tidak ada pengajuan dengan status ini.')).toBeInTheDocument();
    // Bukan empty state global: pengajuannya ada, hanya tidak ada yang ditolak.
    expect(screen.queryByText(/Belum ada pengajuan/)).not.toBeInTheDocument();
  });
});

describe('TenantProposalManager — kartu ringkas dengan detail yang bisa dibuka', () => {
  it('menyembunyikan deskripsi dan ruang review sampai detail diminta', () => {
    render(<TenantProposalManager {...props} />);

    expect(screen.getByText(/Workshop Latte Art/)).toBeInTheDocument();
    expect(screen.queryByText(/Kelas latte art 60 menit/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Kebutuhan fasilitas/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Catatan internal/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Disetujui - Kopi Kenangan' })).not.toBeInTheDocument();
  });

  it('membuka dan menutup detail dengan label yang sesuai keadaan', async () => {
    const user = userEvent.setup();
    render(<TenantProposalManager {...props} />);

    expect(screen.getByRole('button', { name: 'Lihat detail lengkap - Kopi Kenangan' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sembunyikan detail - Kopi Kenangan' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Lihat detail lengkap - Kopi Kenangan' }));

    expect(screen.getByText(/Kelas latte art 60 menit/)).toBeInTheDocument();
    expect(screen.getByText(/Kebutuhan fasilitas: Meja, kursi, listrik/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sembunyikan detail - Kopi Kenangan' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sembunyikan detail - Kopi Kenangan' }));

    expect(screen.queryByText(/Kelas latte art 60 menit/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lihat detail lengkap - Kopi Kenangan' })).toBeInTheDocument();
  });

  it('membuka kartu secara independen satu sama lain', async () => {
    const user = userEvent.setup();
    render(
      <TenantProposalManager
        {...props}
        proposals={[
          makeProposal({ id: 'a', tenantName: 'Kopi Kenangan' }),
          makeProposal({ id: 'b', tenantName: 'Batik Nusantara', eventDescription: 'Deskripsi batik.' }),
        ]}
      />,
    );

    await expandCard(user, 'Batik Nusantara');

    expect(screen.getByText('Deskripsi batik.')).toBeInTheDocument();
    expect(screen.queryByText(/Kelas latte art 60 menit/)).not.toBeInTheDocument();
  });

  it('mempertahankan kartu yang terbuka saat data disegarkan ulang', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<TenantProposalManager {...props} />);

    await expandCard(user);
    expect(screen.getByText(/Kelas latte art 60 menit/)).toBeInTheDocument();

    // Refetch: objek baris baru, id sama.
    rerender(<TenantProposalManager {...props} proposals={[makeProposal()]} />);

    expect(screen.getByText(/Kelas latte art 60 menit/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sembunyikan detail - Kopi Kenangan' })).toBeInTheDocument();
  });

  it('menutup kartu yang tersaring keluar lalu tampil lagi', async () => {
    const user = userEvent.setup();
    render(
      <TenantProposalManager
        {...props}
        proposals={[makeProposal({ id: 'a', tenantName: 'Kopi Kenangan', status: 'pending' })]}
      />,
    );

    await expandCard(user);
    expect(screen.getByText(/Kelas latte art 60 menit/)).toBeInTheDocument();

    // Pindah ke status lain, lalu kembali: keadaan buka tetap menempel pada id-nya.
    await user.click(screen.getByRole('button', { name: 'Disetujui' }));
    expect(screen.queryByText('Kopi Kenangan')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Menunggu' }));
    expect(screen.getByText(/Kelas latte art 60 menit/)).toBeInTheDocument();
  });

  it('menampilkan catatan internal pada mode baca-saja setelah detail dibuka', async () => {
    const user = userEvent.setup();
    render(<TenantProposalManager {...props} proposals={[makeProposal({ internalNotes: 'Sudah ditelepon.' })]} readOnly />);

    expect(screen.queryByText(/Catatan internal: Sudah ditelepon\./)).not.toBeInTheDocument();

    await expandCard(user);

    expect(screen.getByText(/Catatan internal: Sudah ditelepon\./)).toBeInTheDocument();
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
    await expandCard(user);

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
    await expandCard(user);

    await user.click(screen.getByRole('button', { name: 'Ditolak - Kopi Kenangan' }));

    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ title: 'Tolak pengajuan ini?' }));
    expect(onConfirm.mock.calls[0][0].message).toMatch(/diberi tahu/);
    expect(onReview).toHaveBeenCalledWith('tep-1', 'rejected');
  });

  it('tidak mengubah status saat konfirmasi ditolak', async () => {
    const user = userEvent.setup();
    const onReview = vi.fn(async () => true);
    render(<TenantProposalManager {...props} onReview={onReview} onConfirm={async () => false} />);
    await expandCard(user);

    await user.click(screen.getByRole('button', { name: 'Disetujui - Kopi Kenangan' }));

    expect(onReview).not.toHaveBeenCalled();
  });

  it('tidak meminta konfirmasi untuk status berlawanan risiko rendah', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn(async () => true);
    const onReview = vi.fn(async () => true);
    render(<TenantProposalManager {...props} onConfirm={onConfirm} onReview={onReview} />);
    await expandCard(user);

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
    await expandCard(user);

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
    await expandCard(user);

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
    await expandCard(user);

    await user.type(screen.getByLabelText(/Catatan internal/), 'X');
    rerender(<TenantProposalManager {...props} proposals={[makeProposal({ internalNotes: 'B' })]} onSaveNotes={onSaveNotes} />);

    // Tombol nonaktif → tidak ada cara menyimpan teks basi.
    expect(screen.getByRole('button', { name: 'Simpan catatan - Kopi Kenangan' })).toBeDisabled();
    expect(onSaveNotes).not.toHaveBeenCalled();
  });

  it('melepas draft catatan dan keadaan buka setelah pengajuan dihapus', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn(async () => true);
    const { rerender } = render(
      <TenantProposalManager {...props} proposals={[makeProposal({ internalNotes: 'A' })]} onDelete={onDelete} />,
    );
    await expandCard(user);

    await user.type(screen.getByLabelText(/Catatan internal/), 'X');
    await user.click(screen.getByRole('button', { name: 'Hapus - Kopi Kenangan' }));
    expect(onDelete).toHaveBeenCalledWith('tep-1');

    // Baris yang sama muncul lagi (mis. reload membawa data server): draft lama
    // tidak boleh ikut hidup kembali, dan kartunya kembali ringkas.
    rerender(<TenantProposalManager {...props} proposals={[makeProposal({ internalNotes: 'A' })]} onDelete={onDelete} />);

    expect(screen.getByRole('button', { name: 'Lihat detail lengkap - Kopi Kenangan' })).toBeInTheDocument();
    await expandCard(user);
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
      // sebagai teks tombol dan chip, jadi pencarian teks global ambigu.
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
