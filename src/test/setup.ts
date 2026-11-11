import '@testing-library/jest-dom'
// Preload dialog `React.lazy` (ModalWrapper/useConfirmDialog) supaya kueri
// sinkron tepat setelah `render()` tidak mendahului import dinamisnya.
import './lazy-modal-setup'

// `setupFiles` dijalankan juga untuk tes ber-environment `node` (mis. uji
// kripto JWT server). Guard di bawah membuat file ini aman di kedua
// lingkungan: jsdom (mayoritas tes UI) dan node (tes server yang butuh
// TextEncoder/instanceof asli dari realm yang sama).
if (typeof window !== 'undefined') {
  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {}, // deprecated
      removeListener: () => {}, // deprecated
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    }),
  })
}

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null
  readonly rootMargin: string = ''
  readonly thresholds: ReadonlyArray<number> = []
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
  unobserve() {}
}

if (typeof URL !== 'undefined') {
  // jsdom tidak mengimplementasikan object URL. Tanpa stub ini, komponen yang
  // menampilkan pratinjau PDF (iframe blob:) melempar TypeError di lingkungan tes.
  URL.createObjectURL = () => 'blob:test'
  URL.revokeObjectURL = () => {}
}

// jsdom tidak mengimplementasikan API pointer-capture yang dibaca Radix
// (Select/DropdownMenu) saat menutup portal setelah klik opsi. Stub no-op
// mencegah `TypeError: target.hasPointerCapture is not a function`.
if (typeof window !== 'undefined' && !Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.setPointerCapture = () => {}
  Element.prototype.releasePointerCapture = () => {}
}
if (typeof window !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

// jsdom tidak mengimplementasikan `ResizeObserver`. Radix `@radix-ui/react-use-size`
// (dipakai shadcn `Checkbox`/`Switch`/`Select`) membacanya saat mount, sehingga
// tanpanya render melempar `ReferenceError: ResizeObserver is not defined`.
// Stub no-op cukup: ukuran nyata tidak dipakai logika komponen kita.
if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverStub implements ResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver
}
