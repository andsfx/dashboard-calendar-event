import '@testing-library/jest-dom'
// Mock komponen `md-*` untuk jsdom (MD3 asli butuh ElementInternals yang tidak
// ada di jsdom). Perilaku md sesungguhnya diverifikasi di Chromium via Playwright.
import './md-setup'

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
