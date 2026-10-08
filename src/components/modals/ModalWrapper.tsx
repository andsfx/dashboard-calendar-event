import * as React from 'react';

/**
 * `md-dialog` dimuat malas dan baru dipasang setelah modal pertama kali dibuka.
 *
 * Alasan: `ModalWrapper` juga dipakai komponen yang tampil di halaman PUBLIK
 * (mis. `CalendarView` di `/events`). Impor statis `MdDialog` akan menyeret
 * Material Web + Lit ke initial load halaman publik, padahal scope migrasi
 * hanya dashboard admin. Dengan pemasangan malas, MD3 baru diunduh saat
 * pengguna benar-benar membuka sebuah modal.
 */
const MdDialog = React.lazy(() =>
  import('../md/MdDialog').then(m => ({ default: m.MdDialog })),
);

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
 * md-dialog shrink-wrap (`width: fit-content`), jadi `w-full` + `max-w-*` saja
 * tidak menghasilkan lebar yang pasti — lebar harus diberikan eksplisit.
 * Nilai di bawah identik dengan skala `max-w-*` Tailwind.
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
 * Sebelumnya file ini memegang orkestrasi manual (stack modal `openModalStack`,
 * focus trap, scroll lock, timer animasi keluar). Semuanya kini disediakan
 * native oleh `<dialog>` + `showModal()` lewat `md-dialog` — termasuk semantik
 * Escape untuk dialog bersarang (hanya dialog teratas yang menerima Escape).
 * Props publik dipertahankan agar 13 pemanggil tidak perlu diubah.
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
  // Sekali modal pernah dibuka, `MdDialog` tetap terpasang supaya animasi
  // keluar dan event `closed` milik md tetap berjalan (seperti modal persisten
  // pada implementasi lama yang hanya menyembunyikan panel, bukan meng-unmount).
  const [hasOpened, setHasOpened] = React.useState(isOpen);
  React.useEffect(() => {
    if (isOpen) setHasOpened(true);
  }, [isOpen]);

  if (!hasOpened) return null;

  return (
    <React.Suspense fallback={null}>
      <MdDialog open={isOpen} onClose={onClose} labelledBy={ariaLabelledBy} ariaLabel={ariaLabel}>
        <div
          className={`md-dialog-content w-full ${maxWidth} ${className}`}
          style={width ? { width: `min(${width}, calc(100vw - 2rem))`, maxWidth: '100%' } : undefined}
        >
          {children}
        </div>
      </MdDialog>
    </React.Suspense>
  );
}
