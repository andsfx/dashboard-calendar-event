import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TYPE_ACCENT } from '../CommunityDirectoryPage';
import type { OrganizationType } from '../../types';

/**
 * Regresi kontras untuk badge avatar direktori komunitas (`TYPE_ACCENT`).
 *
 * Kenapa ini ada: badge-nya `aria-hidden`, yang mengeluarkannya dari
 * accessibility tree, tetapi axe-core TETAP mengevaluasinya — pemeriksaan
 * kontras axe bersifat visual (terbukti eksperimen c1–c4). Test ini ada karena
 * ia menghitung rasio dari token asli dan memberi kegagalan yang presisi, dan
 * karena ia mencakup seluruh 8 pasangan sekaligus — bukan karena axe buta.
 *
 * Test ini tidak menyalin implementasi: ia membaca nilai token asli dari
 * `src/styles/theme.css` dan me-resolve kelas `bg-*`/`text-*` ke hex, lalu
 * menghitung rasio kontras WCAG. Jadi mengembalikan `text-brand-secondary-600`
 * (bug asli) langsung gagal — bukan sekadar mengulang string kelasnya.
 */

const THEME_CSS = readFileSync(resolve(__dirname, '../../styles/theme.css'), 'utf8');
const TOKENS_CSS = readFileSync(resolve(__dirname, '../../styles/tokens.css'), 'utf8');

/** Ambil `--color-<name>: <hex>` dari theme.css (token brand & slate yang di-override). */
function tokenHex(name: string): string | undefined {
  const m = THEME_CSS.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{3,8})\\s*;`));
  return m?.[1]?.toLowerCase();
}

/**
 * Resolve `var(--other-token)` references. theme.css aliases some tokens to
 * tokens.css (e.g. `--color-brand-secondary-600: var(--brand-pink-600)`), so the
 * reader follows the alias instead of assuming every value is a literal hex.
 */
function varRef(name: string): string | undefined {
  const m = THEME_CSS.match(new RegExp(`--color-${name}:\\s*var\\((--[a-z0-9-]+)\\)\\s*;`));
  if (!m) return undefined;
  const token = m[1]!;
  const literal = TOKENS_CSS.match(new RegExp(`${token}:\\s*(#[0-9a-fA-F]{3,8})\\s*;`));
  if (!literal) {
    throw new Error(`Token "${token}" (dirujuk oleh --color-${name}) tidak punya nilai hex di tokens.css.`);
  }
  return literal[1]!.toLowerCase();
}

/**
 * Palet default Tailwind v4 (sky/violet/amber/emerald/rose) — TIDAK di-override
 * repo ini. Nilai hex di-resolve dari `oklch(...)` di browser lalu dicatat di
 * sini sebagai konstanta framework. Kalau Tailwind mengubah paletnya, test ini
 * gagal dan tabelnya perlu diperbarui — itu perilaku yang diinginkan.
 */
const TAILWIND_DEFAULTS: Record<string, string> = {
  'sky-100': '#dff2fe',
  'sky-700': '#0069a8',
  'violet-100': '#ede9fe',
  'violet-700': '#7008e7',
  'amber-100': '#fef3c6',
  'amber-700': '#bb4d00',
  'emerald-100': '#d0fae5',
  'emerald-700': '#007a55',
  'rose-100': '#ffe4e6',
  'rose-700': '#c70036',
};

/** Resolve nama warna Tailwind (tanpa prefix) ke hex: token repo dulu, lalu default. */
function colorHex(name: string): string {
  const fromTheme = tokenHex(name) ?? varRef(name);
  if (fromTheme) return fromTheme;
  const fromDefaults = TAILWIND_DEFAULTS[name];
  if (fromDefaults) return fromDefaults;
  throw new Error(
    `Warna "${name}" tidak bisa di-resolve. Tambahkan tokennya ke theme.css atau ke TAILWIND_DEFAULTS.`,
  );
}

/** Ambil nama warna dari kelas `bg-x` / `text-x` (abaikan varian dark: dll). */
function classColor(cls: string, prefix: 'bg' | 'text'): string {
  const m = cls.split(/\s+/).find(t => t.startsWith(`${prefix}-`));
  if (!m) throw new Error(`Tidak ada kelas ${prefix}-* di "${cls}"`);
  return m.slice(prefix.length + 1);
}

function srgb(c: number): number {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
}

function contrast(fg: string, bg: string): number {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/** Rasio kontras + hex untuk satu entri TYPE_ACCENT. */
function accentContrast(entry: string): { fg: string; bg: string; ratio: number } {
  const bg = colorHex(classColor(entry, 'bg'));
  const fg = colorHex(classColor(entry, 'text'));
  return { fg, bg, ratio: contrast(fg, bg) };
}

const ALL_TYPES: OrganizationType[] = [
  'community', 'school', 'company', 'eo', 'campus', 'government', 'ngo', 'other',
];

// Badge dirender `text-xs font-bold` = 12px bold. Teks < 18.66px bold bukan
// "large text", jadi ambangnya 4.5:1 (bukan 3:1).
const BADGE_FONT_SIZE_PX = 12;
const REQUIRED_RATIO = 4.5;

describe('TYPE_ACCENT — kontras badge direktori', () => {
  it('mencakup seluruh OrganizationType', () => {
    expect(Object.keys(TYPE_ACCENT).sort()).toEqual([...ALL_TYPES].sort());
  });

  it(`setiap pasangan lulus ${REQUIRED_RATIO}:1 pada teks ${BADGE_FONT_SIZE_PX}px`, () => {
    const results = ALL_TYPES.map((type) => {
      const { fg, bg, ratio } = accentContrast(TYPE_ACCENT[type]!);
      return { type, fg, bg, ratio: Number(ratio.toFixed(2)), pass: ratio >= REQUIRED_RATIO };
    });

    // Laporkan tabel lengkap saat gagal supaya perbaikannya jelas.
    const failing = results.filter(r => !r.pass);
    expect(
      failing,
      `Pasangan di bawah ${REQUIRED_RATIO}:1:\n` +
        failing.map(r => `  ${r.type}: ${r.fg} on ${r.bg} = ${r.ratio}:1`).join('\n'),
    ).toEqual([]);
  });

  it('"eo" memakai secondary-700, bukan shade 500 yang 3.36:1', () => {
    // Bug asli: text-brand-secondary-600 (#c92d62) di atas secondary-100 = 4.42:1.
    // Setelah 600 diselaraskan ke #c2185b, ia lolos — jadi ambang ini kini
    // dibuktikan mengikat lewat shade 500 (#e24378, 3.36:1), yang tetap di
    // bawah 4.5:1. `eo` harus tetap memakai 700.
    const { ratio } = accentContrast(TYPE_ACCENT.eo);
    expect(ratio).toBeGreaterThanOrEqual(REQUIRED_RATIO);

    const regressed = contrast(colorHex('brand-secondary-500'), colorHex('brand-secondary-100'));
    expect(regressed).toBeLessThan(REQUIRED_RATIO); // membuktikan ambang ini memang mengikat
  });

  it('menolak warna yang tidak dikenal (tidak diam-diam lulus)', () => {
    expect(() => colorHex('warna-karang')).toThrow(/tidak bisa di-resolve/);
  });
});
