import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ConfirmDialog } from '../ConfirmDialog';
import { useConfirmDialog } from '../useConfirmDialog';

describe('ConfirmDialog', () => {
  it('merender judul, pesan, dan subjek', async () => {
    render(
      <ConfirmDialog
        isOpen
        title="Hapus album?"
        message="Semua foto di dalamnya juga akan dihapus."
        subject="Pasar Ramadhan 2026"
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    );
    // ModalWrapper memuat md-dialog dengan React.lazy → render pertama async.
    expect(await screen.findByText('Hapus album?')).toBeInTheDocument();
    expect(screen.getByText(/Semua foto di dalamnya/)).toBeInTheDocument();
    expect(screen.getByText(/Pasar Ramadhan 2026/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Batal/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hapus/ })).toBeInTheDocument();
  });

  it('memanggil onClose saat tombol Batal diklik', () => {
    const onClose = vi.fn();
    render(
      <ConfirmDialog isOpen title="Hapus?" message="x" onClose={onClose} onConfirm={() => {}} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Batal/ }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('memanggil onConfirm saat tombol konfirmasi diklik', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <ConfirmDialog isOpen title="Hapus?" message="x" onClose={() => {}} onConfirm={onConfirm} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Hapus/ }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
  });

  it('label tombol konfirmasi bisa dikustomisasi', () => {
    render(
      <ConfirmDialog isOpen title="Terbitkan?" message="x" confirmLabel="Terbitkan" onClose={() => {}} onConfirm={() => {}} />,
    );
    expect(screen.getByRole('button', { name: /Terbitkan/ })).toBeInTheDocument();
  });

  it('default (tanpa tone) merender bar atas merah destruktif', async () => {
    const { container } = render(
      <ConfirmDialog isOpen title="Hapus?" message="x" onClose={() => {}} onConfirm={() => {}} />,
    );
    expect(await screen.findByText('Hapus?')).toBeInTheDocument();
    // Bar atas dekoratif: asersi via kelas pembedanya.
    expect(container.querySelector('.bg-red-600')).toBeInTheDocument();
    expect(container.querySelector('.bg-\\[var\\(--wf-accent\\)\\]')).not.toBeInTheDocument();
  });

  it("tone 'neutral' merender bar atas tosca dan bukan yang merah", async () => {
    const { container } = render(
      <ConfirmDialog isOpen tone="neutral" title="Setujui pengajuan ini?" message="x" confirmLabel="Setujui" onClose={() => {}} onConfirm={() => {}} />,
    );
    expect(await screen.findByText('Setujui pengajuan ini?')).toBeInTheDocument();
    expect(container.querySelector('.bg-\\[var\\(--wf-accent\\)\\]')).toBeInTheDocument();
    expect(container.querySelector('.bg-red-600')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Setujui/ })).toBeInTheDocument();
  });
});

describe('useConfirmDialog', () => {
  it('confirm() resolve true saat dikonfirmasi, false saat dibatalkan', async () => {
    let capturedConfirm: ((options: { title: string; message: string }) => Promise<boolean>) | null = null;
    function Harness() {
      const { confirm, dialog } = useConfirmDialog();
      capturedConfirm = confirm;
      return <>{dialog}</>;
    }
    render(<Harness />);
    expect(capturedConfirm).toBeTruthy();

    const promise = capturedConfirm!({ title: 'Hapus?', message: 'x' });
    // dialog muncul
    expect(await screen.findByText('Hapus?')).toBeInTheDocument();
    // batal → false
    fireEvent.click(screen.getByRole('button', { name: /Batal/ }));
    await expect(promise).resolves.toBe(false);

    // konfirmasi → true
    const promise2 = capturedConfirm!({ title: 'Hapus lagi?', message: 'y' });
    fireEvent.click(await screen.findByRole('button', { name: /Hapus/ }));
    await expect(promise2).resolves.toBe(true);
  });

  it('dialog menutup setelah dikonfirmasi', async () => {
    let capturedConfirm: ((options: { title: string; message: string }) => Promise<boolean>) | null = null;
    function Harness() {
      const { confirm, dialog } = useConfirmDialog();
      capturedConfirm = confirm;
      return <>{dialog}</>;
    }
    render(<Harness />);
    const promise = capturedConfirm!({ title: 'Hapus?', message: 'x' });
    fireEvent.click(await screen.findByRole('button', { name: /Hapus/ }));
    await expect(promise).resolves.toBe(true);
    await waitFor(() => expect(screen.queryByText('Hapus?')).not.toBeInTheDocument());
  });
});
