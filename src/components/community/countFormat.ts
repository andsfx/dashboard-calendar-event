const formatter = new Intl.NumberFormat('id-ID');

export function formatCount(n: number): string {
  return formatter.format(n);
}
