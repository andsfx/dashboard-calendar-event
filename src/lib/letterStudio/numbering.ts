// TypeScript · document numbering per series.
// SKE → `NNN/MMB/MKT.MC/<ROMAN>/<YEAR>` (format resmi gdocs, A13);
// SIK → `NNNA/MMB/MKT.SIKI/<ROMAN>/<YEAR>`. Keduanya tetap menerima
// ekor warisan (`.../MKT.SIKI/2026` tanpa bulan Romawi, SKE tanpa `MKT.MC`).

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

function romanMonth(date: Date): string {
  return ROMAN[date.getMonth()] ?? 'I';
}

function trailingYear(num: string): string | null {
  // Compat: official SIK uses .../2026, SKE/new SIK uses .../VII/2026.
  const withRoman = num.match(/\/([IVX]+)\/(\d{4})\s*$/);
  if (withRoman) return withRoman[2] ?? null;
  const plain = num.match(/\/(\d{4})\s*$/);
  return plain?.[1] ?? null;
}

export function suggestNumber(docType: 'ske' | 'sik', existing: string[], date: Date): string {
  const year = date.getFullYear();
  const roman = romanMonth(date);
  let max = 0;
  for (const raw of existing) {
    if (typeof raw !== 'string') continue;
    if (trailingYear(raw) !== String(year)) continue;
    const lead = raw.match(/^(\d{1,3})A?/);
    if (!lead) continue;
    const n = parseInt(lead[1] ?? '0', 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  const padded = String(max + 1).padStart(3, '0');
  if (docType === 'ske') return `${padded}/MMB/MKT.MC/${roman}/${year}`;
  return `${padded}A/MMB/MKT.SIKI/${roman}/${year}`;
}
