import { memo } from 'react';
import { CATEGORY_COLORS } from '../../utils/eventUtils';

/** Luminance relatif WCAG untuk satu kanal 0–255. */
function channelLuminance(value: number): number {
  const s = value / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/**
 * Kontras teks terhadap latar warna kategori. Dihitung, bukan didaftar manual:
 * daftar manual sebelumnya meleset di Bazaar/Fashion/Konser/Sosial, sehingga
 * chip-nya gagal AA (2.49–3.96:1) padahal tampak "sudah diurus".
 */
function relativeLuminance(hex: string): number {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

const INK_DARK = '#0a0f0c';
const INK_LIGHT = '#ffffff';

export const CategoryBadge = memo(function CategoryBadge({ category }: { category: string }) {
  const color = CATEGORY_COLORS[category] ?? '#00918e';
  // Ambang AA teks kecil (chip 12px) = 4.5:1. Ambil tinta dengan kontras
  // TERTINGGI, bukan ambang tetap: ada kategori (Teknologi #0284c7) yang gagal
  // di kedua tinta, jadi memilih "yang lebih baik" lebih aman daripada biner.
  const onLight = contrastRatio(color, INK_LIGHT);
  const onDark = contrastRatio(color, INK_DARK);
  const useDarkText = onDark > onLight;
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: color, color: useDarkText ? INK_DARK : INK_LIGHT }}
    >
      {category}
    </span>
  );
});
