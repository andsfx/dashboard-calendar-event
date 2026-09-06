import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ModalWrapper } from '../ModalWrapper';
import { ConfirmDialog, useConfirmDialog } from '../ConfirmDialog';

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

describe('ModalWrapper nested (dialog konfirmasi di dalam modal parent)', () => {
  it('Escape hanya menutup dialog konfirmasi teratas, modal parent tetap terbuka', async () => {
    const onCloseOuter = vi.fn();
    const onCloseConfirm = vi.fn();
    render(<Harness onCloseOuter={onCloseOuter} onCloseConfirm={onCloseConfirm} />);

    expect(screen.getByText('Modal Parent')).toBeInTheDocument();
    expect(screen.getByText('Hapus album?')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(onCloseConfirm).toHaveBeenCalledTimes(1), { timeout: 500 });
    // Modal parent TIDAK ikut tertutup
    await waitFor(() => expect(onCloseOuter).not.toHaveBeenCalled(), { timeout: 400 });
  });

  it('setelah dialog konfirmasi tertutup, Escape berikutnya menutup modal parent', async () => {
    const onCloseOuter = vi.fn();
    const onCloseConfirm = vi.fn();
    const { rerender } = render(<Harness onCloseOuter={onCloseOuter} onCloseConfirm={onCloseConfirm} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(onCloseConfirm).toHaveBeenCalledTimes(1), { timeout: 500 });
    // Dialog konfirmasi hilang — sekarang parent jadi modal teratas
    rerender(
      <ModalWrapper isOpen onClose={onCloseOuter} ariaLabelledBy="outer-title">
        <div><h2 id="outer-title">Modal Parent</h2></div>
      </ModalWrapper>,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(onCloseOuter).toHaveBeenCalledTimes(1), { timeout: 500 });
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
    // tunggu dialog ter-render (act flush) sebelum keydown
    await screen.findByText('Hapus foto?');
    fireEvent.keyDown(window, { key: 'Escape' });
    await expect(promise).resolves.toBe(false);
    await waitFor(() => expect(onCloseOuter).not.toHaveBeenCalled(), { timeout: 400 });
  });
});
