import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Contrast regression guard for the two colour decisions this task fixed.
 *
 * The axe gate cannot see either of them: axe returns `incomplete` (not a
 * violation) when a background gradient or a 1-character node defeats its
 * background detection. These tests therefore compute the WCAG ratio directly
 * from the real stylesheet / the real token values, so a future edit that
 * re-introduces the failure turns red here even though axe stays silent.
 *
 * Method (deterministic, arithmetic — no screenshots):
 *  1. Parse the hero gradient's actual stops out of `src/styles/gradients.css`.
 *  2. Composite the foreground's alpha over each stop (the step a naive
 *     "white on X" calculation skips).
 *  3. WCAG 2.x relative-luminance ratio against the 4.5:1 small-text floor.
 */

type RGB = [number, number, number];

const channelToLinear = (c: number): number => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

const relativeLuminance = ([r, g, b]: RGB): number =>
  0.2126 * channelToLinear(r) + 0.7152 * channelToLinear(g) + 0.0722 * channelToLinear(b);

const contrastRatio = (a: RGB, b: RGB): number => {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

/** Composite a foreground at `alpha` over an opaque background. */
const over = (fg: RGB, alpha: number, bg: RGB): RGB =>
  [0, 1, 2].map((i) => alpha * fg[i] + (1 - alpha) * bg[i]) as RGB;

const WHITE: RGB = [255, 255, 255];
const SMALL_TEXT_AA = 4.5;

const hexToRgb = (hex: string): RGB => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const gradientsCss = readFileSync(resolve(__dirname, '../../styles/gradients.css'), 'utf8');
const tokensCss = readFileSync(resolve(__dirname, '../../styles/tokens.css'), 'utf8');

/** The `linear-gradient(...)` stop list of a named class, as [fraction, rgb]. */
function readGradientStops(className: string): Array<{ at: number; rgb: RGB }> {
  const block = gradientsCss.match(new RegExp(`\\.${className}\\s*\\{([\\s\\S]*?)\\}`));
  if (!block) throw new Error(`${className} not found in gradients.css`);
  const stops = [...block[1].matchAll(/(#[0-9a-f]{6})\s+([\d.]+)%/gi)].map((m) => ({
    at: Number(m[2]) / 100,
    rgb: hexToRgb(m[1]),
  }));
  if (stops.length < 2) throw new Error(`${className} has no usable stops`);
  return stops;
}

/** Colour of a 180deg linear gradient at vertical fraction `t` (0 = top). */
function sampleLinearGradient(stops: Array<{ at: number; rgb: RGB }>, t: number): RGB {
  const first = stops[0];
  const last = stops[stops.length - 1];
  if (t <= first.at) return first.rgb;
  if (t >= last.at) return last.rgb;
  for (let i = 0; i < stops.length - 1; i += 1) {
    const a = stops[i];
    const b = stops[i + 1];
    if (t >= a.at && t <= b.at) {
      const f = b.at === a.at ? 0 : (t - a.at) / (b.at - a.at);
      return [0, 1, 2].map((k) => a.rgb[k] + f * (b.rgb[k] - a.rgb[k])) as RGB;
    }
  }
  return last.rgb;
}

/**
 * Lowest vertical fraction of the hero box that white copy actually reaches.
 * Measured at 320/375/414/768/1280px against the real rendered hero: the tallest
 * overflow is 86.5% (320px), where the feature chips (text-white/75) sit. Kept a
 * hair below that measurement so the guard fails before the copy reaches the fade.
 */
const HERO_CONTENT_MAX_FRACTION = 0.87;

/** Smallest alpha of white that still reaches AA on the given background. */
function minimumWhiteAlpha(bg: RGB, target = SMALL_TEXT_AA): number {
  for (let alpha = 0; alpha <= 1.0001; alpha += 0.005) {
    if (contrastRatio(over(WHITE, alpha, bg), bg) >= target) return alpha;
  }
  return 1;
}

describe('hero gradient holds AA under the hero copy', () => {
  const stops = readGradientStops('bg-gradient-hero-tosca');

  it('the 8-stop dark→cream seam is preserved', () => {
    expect(stops).toHaveLength(8);
    expect(stops[0].at).toBe(0);
    expect(stops[stops.length - 1].at).toBe(1);
    // Cream end is load-bearing for the seam into the section below the hero.
    expect(stops[stops.length - 1].rgb).toEqual(hexToRgb('#f8f7f0'));
    // Dark tosca opens the hero.
    expect(stops[0].rgb).toEqual(hexToRgb('#003230'));
  });

  it('every sample inside the copy region clears 4.5:1 for white/65 and /75', () => {
    const failures: string[] = [];
    for (let t = 0; t <= HERO_CONTENT_MAX_FRACTION; t += 0.01) {
      const bg = sampleLinearGradient(stops, t);
      const a65 = contrastRatio(over(WHITE, 0.65, bg), bg);
      const a75 = contrastRatio(over(WHITE, 0.75, bg), bg);
      if (a65 < SMALL_TEXT_AA || a75 < SMALL_TEXT_AA) {
        failures.push(`t=${(t * 100).toFixed(0)}% bg=${bg.map(Math.round)} a65=${a65.toFixed(2)} a75=${a75.toFixed(2)}`);
      }
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });

  it('keeps the background dark until the copy ends (no light tail under text)', () => {
    // At the bottom of the copy region the background must still be dark enough
    // that the most transparent white used over the hero (0.65) clears AA.
    const atCopyEnd = sampleLinearGradient(stops, HERO_CONTENT_MAX_FRACTION);
    expect(contrastRatio(over(WHITE, 0.65, atCopyEnd), atCopyEnd)).toBeGreaterThanOrEqual(SMALL_TEXT_AA);
  });

  it('confines the near-white tail to the empty band below the copy', () => {
    // The light stops (>= #99dfde luminance) must not appear before the copy ends.
    const lightStart = stops.find((s) => relativeLuminance(s.rgb) >= relativeLuminance(hexToRgb('#99dfde')));
    expect(lightStart, 'no light stop in the gradient').toBeDefined();
    expect(lightStart!.at).toBeGreaterThan(HERO_CONTENT_MAX_FRACTION);
  });

  it('regression: the pre-fix gradient would have failed this guard', () => {
    const oldStops = [
      { at: 0, rgb: hexToRgb('#003230') },
      { at: 0.35, rgb: hexToRgb('#004a48') },
      { at: 0.6, rgb: hexToRgb('#006260') },
      { at: 0.74, rgb: hexToRgb('#008070') },
      { at: 0.85, rgb: hexToRgb('#33a8a5') },
      { at: 0.93, rgb: hexToRgb('#99dfde') },
      { at: 0.98, rgb: hexToRgb('#d4eee8') },
      { at: 1, rgb: hexToRgb('#f8f7f0') },
    ];
    const atChips = sampleLinearGradient(oldStops, 0.856);
    // The old #33a8a5→#99dfde band under the chips: 2.2:1, i.e. a real failure.
    expect(contrastRatio(over(WHITE, 0.75, atChips), atChips)).toBeLessThan(SMALL_TEXT_AA);
    // And the new gradient is the fix, not a no-op.
    const nowChips = sampleLinearGradient(stops, 0.856);
    expect(contrastRatio(over(WHITE, 0.75, nowChips), nowChips)).toBeGreaterThanOrEqual(SMALL_TEXT_AA);
  });
});

describe('community directory active filter pill count badge', () => {
  const pill = hexToRgb('#007a78'); // brand-primary-600 / --brand-tosca-600

  it('brand-primary-600 is the token the pill actually uses', () => {
    expect(tokensCss).toMatch(/--brand-tosca-600:\s*#007a78/i);
    expect(tokensCss).toMatch(/--brand-tosca-600:.*AA/i);
  });

  it('full white reaches AA on brand-primary-600 (the shipped fix)', () => {
    expect(contrastRatio(WHITE, pill)).toBeGreaterThanOrEqual(SMALL_TEXT_AA);
  });

  it('text-white/70 does NOT reach AA — the regression being prevented', () => {
    expect(contrastRatio(over(WHITE, 0.7, pill), pill)).toBeLessThan(SMALL_TEXT_AA);
  });

  it('minimum passing alpha is 0.90; anything below stays under 4.5:1', () => {
    const min = minimumWhiteAlpha(pill);
    expect(min).toBeGreaterThan(0.85);
    expect(min).toBeLessThan(0.91);
    expect(contrastRatio(over(WHITE, min - 0.05, pill), pill)).toBeLessThan(SMALL_TEXT_AA);
  });
});

describe('events footer copy on the dark reasoning gradient', () => {
  const reasoningStops = readGradientStops('bg-gradient-reasoning-tosca');

  it('parses the reasoning gradient (radial + linear layers)', () => {
    expect(reasoningStops.length).toBeGreaterThanOrEqual(2);
  });

  it('raises the former text-white/50 subtitle to a passing opacity', () => {
    // Worst measured footer background behind the subtitle: rgb(0 65 62).
    const worstBg: RGB = [0, 65, 62];
    expect(contrastRatio(over(WHITE, 0.5, worstBg), worstBg)).toBeLessThan(SMALL_TEXT_AA);
    expect(contrastRatio(over(WHITE, 0.7, worstBg), worstBg)).toBeGreaterThanOrEqual(SMALL_TEXT_AA);
  });

  it('raises the former text-white/60 nav row to a passing opacity', () => {
    // Worst measured footer background behind the nav links: rgb(0 100 96).
    const worstBg: RGB = [0, 100, 96];
    expect(contrastRatio(over(WHITE, 0.6, worstBg), worstBg)).toBeLessThan(SMALL_TEXT_AA);
    expect(contrastRatio(over(WHITE, 0.8, worstBg), worstBg)).toBeGreaterThanOrEqual(SMALL_TEXT_AA);
  });

  it('the reasoning gradient stays dark enough for white/80 at every stop', () => {
    const failures = reasoningStops
      .map((s) => contrastRatio(over(WHITE, 0.8, s.rgb), s.rgb))
      .filter((r) => r < SMALL_TEXT_AA);
    expect(failures).toEqual([]);
  });
});
