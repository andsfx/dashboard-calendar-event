import { vi } from 'vitest';

import { registerMdMockElements } from './md-mocks';

/**
 * Di jsdom, modul `@material/web/*` asli tidak bisa dipakai: konstruktornya
 * menginisialisasi `ElementInternals` (`setFormValue`) dan `adoptedStyleSheets`
 * yang tidak disediakan jsdom, dan melempar saat elemen dibuat (sudah
 * diverifikasi). Selain itu modul asli mendefinisikan ulang tag `md-*`, yang
 * bentrok dengan mock di bawah.
 *
 * Wrapper kita meng-import modul md hanya untuk efek samping (registrasi custom
 * element), jadi cukup di-stub; elemennya digantikan mock light-DOM dari
 * `md-mocks.ts` sehingga kueri role/label Testing Library tetap bekerja.
 *
 * Panggilan `vi.mock` ditulis literal satu per satu (bukan dari loop) karena
 * factory-nya di-hoist ke atas modul dan tidak boleh menutup variabel luar.
 */
vi.mock('@material/web/button/filled-button.js', () => ({}));
vi.mock('@material/web/button/outlined-button.js', () => ({}));
vi.mock('@material/web/button/text-button.js', () => ({}));
vi.mock('@material/web/iconbutton/icon-button.js', () => ({}));
vi.mock('@material/web/iconbutton/filled-icon-button.js', () => ({}));
vi.mock('@material/web/iconbutton/outlined-icon-button.js', () => ({}));
vi.mock('@material/web/textfield/outlined-text-field.js', () => ({}));
vi.mock('@material/web/select/outlined-select.js', () => ({}));
vi.mock('@material/web/select/select-option.js', () => ({}));
vi.mock('@material/web/checkbox/checkbox.js', () => ({}));
vi.mock('@material/web/switch/switch.js', () => ({}));
vi.mock('@material/web/radio/radio.js', () => ({}));
vi.mock('@material/web/chips/filter-chip.js', () => ({}));
vi.mock('@material/web/tabs/tabs.js', () => ({}));
vi.mock('@material/web/tabs/primary-tab.js', () => ({}));
vi.mock('@material/web/progress/linear-progress.js', () => ({}));
vi.mock('@material/web/progress/circular-progress.js', () => ({}));
vi.mock('@material/web/dialog/dialog.js', () => ({}));

if (typeof customElements !== 'undefined') {
  registerMdMockElements();

  // `ModalWrapper` dan `useConfirmDialog` memuat komponennya dengan `React.lazy`
  // (supaya Material Web tidak masuk jalur boot/publik). Di jsdom, import dinamis
  // itu resolve di microtask, sehingga kueri sinkron tepat setelah `render()`
  // bisa mendahuluinya. Modul-modul ini di-preload di sini agar promise-nya sudah
  // selesai saat tes berjalan; efek sampingnya tidak ada (mock `md-*` sudah
  // terdaftar dan modulnya hanya mengembalikan komponen).
  void import('../components/md/MdDialog');
  void import('../components/modals/ConfirmDialog');
}
