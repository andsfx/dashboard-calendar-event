/**
 * 19 kategori event — satu sumber untuk input admin (`EventFormDetailsFields`)
 * dan peta warna landing (`CATEGORY_COLORS`). Dulu daftar ini hidup dua kali
 * (form + eventUtils) dan hanya kebetulan sinkron: kategori baru yang lupa
 * ditambahkan ke salah satunya membuat kartu landing jatuh ke warna `Umum`.
 */
export const EVENT_CATEGORIES = [
  'Bazaar',
  'Festival',
  'Workshop',
  'Kompetisi',
  'Fashion',
  'Seminar',
  'Pameran',
  'Konser',
  'Sosial',
  'Seni',
  'Hiburan',
  'Karir',
  'Produk',
  'Anak',
  'Kuliner',
  'Olahraga',
  'Teknologi',
  'Kesehatan',
  'Umum',
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];
export const DEFAULT_EVENT_CATEGORY: EventCategory = 'Umum';
