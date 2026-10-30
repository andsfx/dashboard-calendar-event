/**
 * Sumber tunggal tujuan navigasi publik.
 *
 * Header bersama (`PublicSiteHeader`) membaca daftar ini; halaman tidak boleh
 * menulis ulang label atau path sendiri. Tidak ada entri ke `/`: logo yang
 * menanganinya.
 */

export interface PublicNavLink {
  label: string;
  to: string;
}

/** Tujuan utama yang tampil di bar desktop dan di panel menu. */
export const PUBLIC_PRIMARY_LINKS: readonly PublicNavLink[] = [
  { label: 'Jadwal Event', to: '/events' },
  { label: 'Galeri', to: '/gallery' },
  { label: 'Berita', to: '/news' },
  { label: 'Pameran', to: '/pameran' },
  { label: 'Tenant', to: '/tenants' },
];

/**
 * Tujuan pendukung. Di bar desktop dirender sebagai dropdown `Jelajahi`; di
 * panel menu menjadi kelompok berjudul `Jelajahi`.
 */
export const PUBLIC_SECONDARY_LINKS: readonly PublicNavLink[] = [
  { label: 'Direktori Komunitas', to: '/community' },
  { label: 'Sponsor', to: '/sponsor' },
  { label: 'Kolaborasi Tenant', to: '/kolaborasi-tenant' },
  { label: 'Booth & Voucher', to: '/partisipasi-tenant' },
  { label: 'Ajukan Event', to: '/ajukan-event' },
  { label: 'Dokumentasi', to: '/docs' },
];

/** Satu-satunya CTA konversi header; label dan tujuan tidak boleh bercabang. */
export const PUBLIC_CTA: PublicNavLink = { label: 'Daftar Event', to: '/daftar' };

/**
 * Status aktif sebuah tujuan navigasi.
 *
 * Rute turunan dipegang induknya, dan hanya satu link boleh aktif:
 * `/events/:id` oleh `Jadwal Event`, `/gallery/:slug` oleh `Galeri`,
 * `/news/:slug` oleh `Berita`, `/pameran/:id` oleh `Pameran`. Prefix diuji
 * dengan `to + '/'` supaya tujuan yang hanya mirip tidak ikut cocok:
 * `/tenant-survey` bukan `/tenants`, `/newsletter` bukan `/news`. `/` selalu
 * exact match.
 */
export function isPublicNavActive(pathname: string, to: string): boolean {
  if (to === '/') return pathname === '/';
  return pathname === to || pathname.startsWith(to + '/');
}
