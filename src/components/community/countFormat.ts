const formatter = new Intl.NumberFormat('id-ID');

/**
 * Satu aturan tampilan angka statistik untuk semua permukaan (hero, band
 * kepercayaan, papan data hero).
 *
 * Angka nol dirender sebagai `0` polos, tidak pernah "0+": "0+" terbaca sebagai
 * bukti sosial nol, bukan sebagai "belum ada data". Sebelumnya hero menampilkan
 * `0+ Event Terlaksana` sementara band di bawahnya menampilkan `-` untuk
 * metrik yang sama, dua representasi untuk satu keadaan.
 */
export function formatStat(value: number): string {
  return value > 0 ? `${formatter.format(value)}+` : '0';
}
