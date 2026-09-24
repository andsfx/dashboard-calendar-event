const formatter = new Intl.NumberFormat('id-ID');

export function formatCount(n: number): string {
  return formatter.format(n);
}

/**
 * Satu aturan tampilan angka statistik untuk semua permukaan (hero, band
 * kepercayaan, papan data hero).
 *
 * Angka nol tidak pernah dirender sebagai "0+": itu terbaca sebagai bukti
 * sosial nol, bukan sebagai "belum ada data". Sebelumnya hero menampilkan
 * `0+ Event Terlaksana` sementara band di bawahnya menampilkan `-` untuk
 * metrik yang sama — dua representasi untuk satu keadaan.
 */
export function formatStat(value: number): string {
  return value > 0 ? `${formatter.format(value)}+` : '—';
}
