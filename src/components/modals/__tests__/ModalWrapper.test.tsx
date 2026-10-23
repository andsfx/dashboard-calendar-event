import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ModalWrapper } from '../ModalWrapper';
import { ConfirmDialog } from '../ConfirmDialog';
import { useConfirmDialog } from '../useConfirmDialog';

/**
 * ModalWrapper kini adapter tipis di atas `md-dialog`. Perilaku yang dulu
 * diorkestrasi manual — Escape untuk dialog teratas, penutupan sekali per
 * dialog — sekarang berasal dari `<dialog>` bertumpuk (di jsdom: mock
 * md-dialog di `src/test/md-mocks.ts`). Tes ini menjaga kontraknya.
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

describe('ModalWrapper (adapter md-dialog)', () => {
  it('merender children di dalam dialog dan meneruskan aria-labelledby', async () => {
    render(
      <ModalWrapper isOpen onClose={() => {}} ariaLabelledBy="judul-modal">
        <h2 id="judul-modal">Judul</h2>
      </ModalWrapper>,
    );
    // ModalWrapper memuat md-dialog dengan React.lazy → render pertama async.
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', 'judul-modal');
    expect(screen.getByText('Judul')).toBeInTheDocument();
  });

  it('memberi nama aksesibel dari judul yang terlihat, bukan "Dialog" generik', async () => {
    // md-dialog merender <dialog> di shadow root dan hanya memakai
    // aria-labelledby bila ada konten di slot `headline`; judul kita ada di
    // slot `content`, jadi aria-labelledby saja diabaikan dan pembaca layar
    // mengumumkan label generik. MdDialog menurunkan teks judul ke aria-label
    // pada host (mixinDelegatesAria meneruskannya ke shadow).
    render(
      <ModalWrapper isOpen onClose={() => {}} ariaLabelledBy="nama-modal">
        <h2 id="nama-modal">Kelola opsi form partisipasi</h2>
      </ModalWrapper>,
    );
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('aria-label', 'Kelola opsi form partisipasi');
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
    const { container, rerender } = render(
      <ModalWrapper isOpen onClose={onClose} ariaLabelledBy="t">
        <h2 id="t">Judul</h2>
      </ModalWrapper>,
    );
    const dialog = (): Element | null => container.querySelector('md-dialog');
    expect(dialog()).not.toHaveAttribute('hidden');

    rerender(
      <ModalWrapper isOpen={false} onClose={onClose} ariaLabelledBy="t">
        <h2 id="t">Judul</h2>
      </ModalWrapper>,
    );
    await waitFor(() => expect(dialog()).toHaveAttribute('hidden'));
    // Parent sudah tahu dialog ditutup; memanggil onClose di sini akan jadi loop.
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
