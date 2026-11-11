import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ModalWrapper } from '../ModalWrapper';
import { ConfirmDialog } from '../ConfirmDialog';
import { useConfirmDialog } from '../useConfirmDialog';

/**
 * ModalWrapper kini adapter tipis di atas shadcn `Dialog` (Radix). Perilaku
 * yang dulu diorkestrasi manual — Escape untuk dialog teratas, penutupan sekali
 * per dialog — kini berasal dari `DismissableLayer`/`FocusScope` Radix (bukan
 * `<dialog>` native + `showModal()`). Tes ini menjaga kontrak publiknya.
 */
function Harness({ onCloseOuter, onCloseConfirm }: { onCloseOuter: () => void; onCloseConfirm: () => void }) {
  return (
    <ModalWrapper isOpen onClose={onCloseOuter} ariaLabelledBy="outer-title">
      <div>
        <h2 id="outer-title">Modal Parent</h2>
        <ConfirmDialog isOpen title="Hapus album?" message="Semua foto ikut terhapus." onClose={onCloseConfirm} onConfirm={() => {}} />
      </div>
    </ModalWrapper>
  );
}

describe('ModalWrapper (adapter shadcn Dialog)', () => {
  it('merender children di dalam dialog dan meneruskan aria-labelledby', async () => {
    render(
      <ModalWrapper isOpen onClose={() => {}} ariaLabelledBy="judul-modal">
        <h2 id="judul-modal">Judul</h2>
      </ModalWrapper>,
    );
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', 'judul-modal');
    expect(screen.getByText('Judul')).toBeInTheDocument();
  });

  it('memberi nama aksesibel dari judul yang terlihat, bukan "Dialog" generik', async () => {
    // Radix menautkan `aria-labelledby` ke heading yang terlihat (md-dialog
    // dulu menyalin teks heading ke `aria-label` host karena shadow DOM-nya
    // mengabaikan ID-reference). Nama aksesibel harus tetap nama judul.
    render(
      <ModalWrapper isOpen onClose={() => {}} ariaLabelledBy="nama-modal">
        <h2 id="nama-modal">Kelola opsi form partisipasi</h2>
      </ModalWrapper>,
    );
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAccessibleName('Kelola opsi form partisipasi');
    expect(dialog).not.toHaveAccessibleName('Dialog');
  });

  it('Escape hanya menutup dialog konfirmasi teratas, modal parent tetap terbuka', async () => {
    const onCloseOuter = vi.fn();
    const onCloseConfirm = vi.fn();
    render(<Harness onCloseOuter={onCloseOuter} onCloseConfirm={onCloseConfirm} />);

    expect(screen.getByText('Modal Parent')).toBeInTheDocument();
    expect(screen.getByText('Hapus album?')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(onCloseConfirm).toHaveBeenCalledTimes(1));
    // Modal parent TIDAK ikut tertutup
    expect(onCloseOuter).not.toHaveBeenCalled();
  });

  it('setelah dialog konfirmasi tertutup, Escape berikutnya menutup modal parent', async () => {
    const onCloseOuter = vi.fn();
    const onCloseConfirm = vi.fn();
    const { rerender } = render(<Harness onCloseOuter={onCloseOuter} onCloseConfirm={onCloseConfirm} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(onCloseConfirm).toHaveBeenCalledTimes(1));

    // Dialog konfirmasi hilang — sekarang parent jadi dialog teratas
    rerender(
      <ModalWrapper isOpen onClose={onCloseOuter} ariaLabelledBy="outer-title">
        <div><h2 id="outer-title">Modal Parent</h2></div>
      </ModalWrapper>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(onCloseOuter).toHaveBeenCalledTimes(1));
  });

  it('menutup lewat prop isOpen tidak memanggil onClose (tanpa loop umpan balik)', async () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <ModalWrapper isOpen onClose={onClose} ariaLabelledBy="t">
        <h2 id="t">Judul</h2>
      </ModalWrapper>,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    rerender(
      <ModalWrapper isOpen={false} onClose={onClose} ariaLabelledBy="t">
        <h2 id="t">Judul</h2>
      </ModalWrapper>,
    );
    // Parent sudah tahu dialog ditutup; memanggil onClose di sini akan jadi loop.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(onClose).not.toHaveBeenCalled();
  });

  it('useConfirmDialog: confirm() saat dialog nested resolve false tanpa menutup parent', async () => {
    const onCloseOuter = vi.fn();
    let capturedConfirm: ((options: { title: string; message: string }) => Promise<boolean>) | null = null;
    function HarnessHook() {
      const { confirm, dialog } = useConfirmDialog();
      capturedConfirm = confirm;
      return (
        <ModalWrapper isOpen onClose={onCloseOuter} ariaLabelledBy="outer-title">
          <div>
            <h2 id="outer-title">Modal Parent</h2>
            {dialog}
          </div>
        </ModalWrapper>
      );
    }
    render(<HarnessHook />);
    const promise = capturedConfirm!({ title: 'Hapus foto?', message: 'Permanen.' });
    await screen.findByText('Hapus foto?');
    fireEvent.keyDown(document, { key: 'Escape' });
    await expect(promise).resolves.toBe(false);
    expect(onCloseOuter).not.toHaveBeenCalled();
  });
});