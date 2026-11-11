import * as React from 'react';

import { Dialog, DialogContent, DialogTitle } from '../shadcn/dialog';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** kelas lebar Tailwind, mis. 'max-w-lg' (dipertahankan agar pemanggil tak berubah) */
  maxWidth?: string;
  className?: string;
  ariaLabelledBy?: string;
  ariaLabel?: string;
}

/**
 * Lebar eksplisit per kelas `max-w-*` yang dipakai pemanggil.
 *
 * shadcn `DialogContent` sudah `w-full` + `max-w`, tapi tetap diberikan lebar
 * eksplisit (sama seperti implementasi md-dialog sebelumnya) supaya perilaku
 * antar pemanggil identik: nilai di bawah sama dengan skala `max-w-*` Tailwind.
 * Ini juga menetralkan `sm:max-w-sm` bawaan DialogContent.
 */
const WIDTHS: Record<string, string> = {
  'max-w-sm': '24rem',
  'max-w-md': '28rem',
  'max-w-lg': '32rem',
  'max-w-xl': '36rem',
  'max-w-2xl': '42rem',
  'max-w-3xl': '48rem',
  'max-w-4xl': '56rem',
  'max-w-5xl': '64rem',
  'max-w-6xl': '72rem',
};

/**
 * Container modal admin.
 *
 * Migrasi dari `md-dialog` (Material Web) ke shadcn `Dialog` (Radix). Semua
 * perilaku berat — focus trap, scroll lock, Escape untuk dialog bersarang
 * (hanya dialog teratas yang menerima Escape), penutupan sekali — disediakan
 * Radix lewat `DismissableLayer`/`FocusScope`, menggantikan `<dialog>`
 * native + `showModal()` yang dulu dipakai md-dialog.
 *
 * `hasOpened` tetap dipertahankan: sekali modal dibuka, `Dialog` tetap
 * terpasang supaya animasi keluar Radix ({@link https://www.radix-ui.com
 * data-closed:*}) berjalan penuh. Tanpa persisten, pemanggil yang me-unmount
 * modal saat `isOpen=false` akan memotong animasi keluar. Props publik tidak
 * berubah sehingga semua pemanggil (13 modals + TenantParticipationOptionsModal
 * + UserEditModal) tidak perlu diubah.
 */
export function ModalWrapper({
  isOpen,
  onClose,
  children,
  maxWidth = 'max-w-lg',
  className = '',
  ariaLabelledBy,
  ariaLabel = 'Dialog',
}: Props) {
  const width = WIDTHS[maxWidth];
  const [hasOpened, setHasOpened] = React.useState(isOpen);
  React.useEffect(() => {
    if (isOpen) setHasOpened(true);
  }, [isOpen]);

  if (!hasOpened) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        aria-labelledby={ariaLabelledBy}
        className={`w-full bg-transparent p-0 ring-0 shadow-none outline-none ${maxWidth} sm:${maxWidth} ${className}`}
        style={width ? { width: `min(${width}, calc(100vw - 2rem))`, maxWidth: '100%' } : undefined}
      >
        {!ariaLabelledBy && <DialogTitle className="sr-only">{ariaLabel}</DialogTitle>}
        {children}
      </DialogContent>
    </Dialog>
  );
}