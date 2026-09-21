import type { Page } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';
import { AXE_TAGS, AXE_RUN_OPTIONS } from './a11y.config';

/**
 * Incomplete-node census — direct pixel measurement.
 *
 * `a11y.spec.ts` records which axe nodes are `incomplete` (neither pass nor
 * fail). "Incomplete" is NOT a pass, so the gate alone leaves them unresolved.
 * This module measures each one and judges it against its WCAG threshold.
 *
 * Method, per node:
 *   1. Resolve the computed colour to sRGB incl. alpha through a canvas.
 *   2. Make only the TEXT transparent (`color: transparent`) — this keeps the
 *      element's own translucent backdrop (e.g. `bg-white/10`) so the sampled
 *      pixels are what the text actually sits on. `visibility: hidden` would
 *      erase that backdrop and under-measure the background.
 *   3. Sample the screenshot at the tight text-line rects
 *      (`Range.getClientRects()`) and take the MEDIAN colour. Sampling the whole
 *      element box is wrong for a tall element over a gradient: the box is
 *      bimodal (dark top, light bottom) while the text sits in one band.
 *   4. Composite the text colour over that background and take the WCAG ratio.
 *
 * Why a screenshot rather than `getComputedStyle`: axe returns these nodes as
 * incomplete precisely because their background is a CSS gradient, and
 * `getComputedStyle(...).backgroundColor` is `rgba(0, 0, 0, 0)` for a
 * gradient-backed element — the DOM does not expose the painted colour. Only
 * pixels do. Also, this Tailwind v4 build emits `oklab()` / `color(srgb …)`
 * for the white-alpha text, so the foreground is resolved through a canvas too.
 *
 * All colour math is the WCAG 2.x relative-luminance ratio. The arithmetic is
 * intentionally parallel to `src/utils/__tests__/heroContrast.test.ts`; that
 * test computes ratios from the stylesheet, this one measures the live DOM.
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

const SMALL_TEXT_AA = 4.5;
const LARGE_TEXT_AA = 3;

/**
 * WCAG 2.x AA threshold for a node: large text (≥18pt, or ≥14pt bold) needs
 * 3:1, everything else 4.5:1. Matches axe's own `boldTextPt: 14` / `largeTextPt: 18`.
 */
function requiredRatio(fontSize: string, fontWeight: string): number {
  const pt = (parseFloat(fontSize) || 0) * (72 / 96);
  const bold = (parseFloat(fontWeight) || 400) >= 700;
  const isLarge = (bold && pt >= 14) || (!bold && pt >= 18);
  return isLarge ? LARGE_TEXT_AA : SMALL_TEXT_AA;
}

/** The CSS class applied while a node's text is made transparent. */
const HIDE_CLASS = 'tmp-census-hide';

const HIDE_STYLE = `.${HIDE_CLASS}, .${HIDE_CLASS} * { color: transparent !important; text-decoration-color: transparent !important; }`;

export interface CensusNode {
  target: string;
  text: string;
  fontSize: string;
  fontWeight: string;
  rawColor: string;
  /** Effective foreground alpha (computed alpha × ancestor opacity). */
  alpha: number;
  /** Modal background colour inside the node's box, sampled from the screenshot. */
  background: RGB;
  /** Foreground composited over `background`. */
  compositedFg: RGB;
  ratio: number;
  /** AA threshold this node is judged against (3 for large text, else 4.5). */
  requiredRatio: number;
  passesAA: boolean;
  /** Pixels sampled for the background; 0 means the box was off-screen. */
  samples: number;
  /** Top background colours by count, for auditing a surprising ratio. */
  histogram: Array<[string, number]>;
}

export interface CensusResult {
  nodes: CensusNode[];
  /** Targets axe reported that could not be measured (must stay empty). */
  skipped: string[];
  axeIncompleteCount: number;
}

interface ElementInfo {
  sel: string;
  text: string;
  fontSize: string;
  fontWeight: string;
  rawColor: string;
  fg: RGB;
  alpha: number;
  rect: { left: number; top: number; right: number; bottom: number };
  /** Tight rects around the actual text lines (Range.getClientRects). */
  textRects: Array<{ left: number; top: number; right: number; bottom: number }>;
}

interface Sampled {
  /** Median colour of the element's box with its text hidden = the background. */
  bg: RGB;
  samples: number;
  /** Top colours by count, for diagnosing an implausible background. */
  histogram: Array<[string, number]>;
}

/**
 * Run axe and measure every `incomplete` color-contrast node by pixel
 * compositing. The page must already be navigated and settled.
 *
 * Measured one node at a time: the node is scrolled into view, its text made
 * transparent, and its own box sampled from a screenshot. Batching all nodes
 * into a single screenshot is not possible — they live at different scroll
 * positions down a long page.
 */
export async function censusIncompleteNodes(page: Page): Promise<CensusResult> {
  const results = await new AxeBuilder({ page })
    .withTags([...AXE_TAGS])
    .options(AXE_RUN_OPTIONS)
    .analyze();

  const rule = results.incomplete.find((v) => v.id === 'color-contrast');
  const axeIncompleteCount = rule?.nodes.length ?? 0;
  if (!rule || axeIncompleteCount === 0) {
    return { nodes: [], skipped: [], axeIncompleteCount: 0 };
  }

  const selectors = rule.nodes.map((n) => {
    const first = n.target[0];
    return Array.isArray(first) ? first.join(' ') : String(first);
  });

  const nodes: CensusNode[] = [];
  const skipped: string[] = [];

  // Inject the "text transparent" rule once; nodes opt in via the class below.
  await page.addStyleTag({ content: HIDE_STYLE });

  for (const sel of selectors) {
    // Bring the node on-screen, then read its (now current) geometry + colour.
    const info = await page.evaluate((s: string): ElementInfo | null => {
      const el = document.querySelector(s);
      if (!el) return null;
      el.scrollIntoView({ block: 'center' });

      const resolve = (color: string): { rgb: RGB; a: number } => {
        const cv = document.createElement('canvas');
        cv.width = 1;
        cv.height = 1;
        const ctx = cv.getContext('2d');
        if (!ctx) return { rgb: [0, 0, 0], a: 0 };
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1, 1);
        const d = ctx.getImageData(0, 0, 1, 1).data;
        return { rgb: [d[0] ?? 0, d[1] ?? 0, d[2] ?? 0], a: (d[3] ?? 255) / 255 };
      };

      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      let opacity = 1;
      for (let n: Element | null = el; n; n = n.parentElement) {
        opacity *= Number(getComputedStyle(n).opacity || '1');
      }
      const c = resolve(style.color);

      // Tight boxes around the actual text lines: iterate text nodes and take
      // each client rect. These are where the glyphs sit, so the background
      // sampled from them is the background the text really has.
      const textRects: Array<{ left: number; top: number; right: number; bottom: number }> = [];
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const range = document.createRange();
      let node = walker.nextNode();
      while (node) {
        if ((node.textContent || '').trim().length > 0) {
          range.selectNodeContents(node);
          for (const r of Array.from(range.getClientRects())) {
            if (r.width > 1 && r.height > 1) {
              textRects.push({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
            }
          }
        }
        node = walker.nextNode();
      }
      // Fallback: the element's own box (e.g. a text node inside a nested span).
      if (textRects.length === 0) {
        textRects.push({ left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom });
      }

      return {
        sel: s,
        text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60),
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        rawColor: style.color,
        fg: c.rgb,
        alpha: c.a * opacity,
        rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
        textRects,
      };
    }, sel);

    if (!info) {
      skipped.push(sel);
      continue;
    }

    // Hide this node's text (colour only — keeps its own translucent backdrop,
    // which is what the text actually sits on), then sample the background from
    // the tight text-line rects: the pixels the glyphs actually occupy. Sampling
    // the whole element box would average in padding/edge bands the text never
    // touches (e.g. the top/bottom of a tall button over a gradient).
    await page.evaluate(
      ({ s, cls }: { s: string; cls: string }) => document.querySelector(s)?.classList.add(cls),
      { s: sel, cls: HIDE_CLASS },
    );
    const hiddenShot = (await page.screenshot()).toString('base64');
    await page.evaluate(
      ({ s, cls }: { s: string; cls: string }) => document.querySelector(s)?.classList.remove(cls),
      { s: sel, cls: HIDE_CLASS },
    );

    const sampled = await page.evaluate(
      async ({ b64, boxes }): Promise<Sampled> => {
        const empty: Sampled = { bg: [0, 0, 0], samples: 0, histogram: [] };
        const img = new Image();
        img.src = `data:image/png;base64,${b64}`;
        await img.decode();
        const cv = document.createElement('canvas');
        cv.width = img.naturalWidth;
        cv.height = img.naturalHeight;
        const ctx = cv.getContext('2d');
        if (!ctx) return empty;
        ctx.drawImage(img, 0, 0);
        const { data } = ctx.getImageData(0, 0, cv.width, cv.height);

        const sx = cv.width / window.innerWidth;
        const sy = cv.height / window.innerHeight;
        const lin = (c: number) => {
          const s = c / 255;
          return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        };
        const luma = (r: number, g: number, b: number) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
        const px = (x: number, y: number): RGB => {
          const cx = Math.max(0, Math.min(cv.width - 1, Math.round(x * sx)));
          const cy = Math.max(0, Math.min(cv.height - 1, Math.round(y * sy)));
          const i = (cy * cv.width + cx) * 4;
          return [data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0];
        };

        const counts = new Map<string, number>();
        const pixels: Array<{ rgb: RGB; l: number }> = [];
        for (const b of boxes) {
          const y0 = Math.max(0, Math.ceil(b.top));
          const y1 = Math.min(window.innerHeight - 1, Math.floor(b.bottom));
          const x0 = Math.max(0, Math.ceil(b.left));
          const x1 = Math.min(window.innerWidth - 1, Math.floor(b.right));
          const stepX = Math.max(1, Math.floor((x1 - x0) / 16) || 1);
          const stepY = Math.max(1, Math.floor((y1 - y0) / 3) || 1);
          for (let y = y0; y <= y1; y += stepY) {
            for (let x = x0; x <= x1; x += stepX) {
              const rgb = px(x, y);
              pixels.push({ rgb, l: luma(rgb[0], rgb[1], rgb[2]) });
              const key = rgb.join(',');
              counts.set(key, (counts.get(key) ?? 0) + 1);
            }
          }
        }
        if (pixels.length === 0) return empty;

        pixels.sort((a, b) => a.l - b.l);
        const median = pixels[Math.floor(pixels.length / 2)]!.rgb;
        const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
        return { bg: median, samples: pixels.length, histogram: top };
      },
      { b64: hiddenShot, boxes: info.textRects },
    );

    if (sampled.samples === 0) {
      skipped.push(sel);
      continue;
    }

    const bg = sampled.bg;
    const compositedFg = info.fg.map((v, k) => info.alpha * v + (1 - info.alpha) * bg[k]) as RGB;
    const ratio = contrastRatio(compositedFg, bg);
    const required = requiredRatio(info.fontSize, info.fontWeight);
    nodes.push({
      target: info.sel,
      text: info.text,
      fontSize: info.fontSize,
      fontWeight: info.fontWeight,
      rawColor: info.rawColor,
      alpha: Number(info.alpha.toFixed(3)),
      background: bg,
      compositedFg: compositedFg.map((v) => Math.round(v)) as RGB,
      ratio: Number(ratio.toFixed(2)),
      requiredRatio: required,
      passesAA: ratio >= required,
      samples: sampled.samples,
      histogram: sampled.histogram,
    });
  }

  return { nodes, skipped, axeIncompleteCount };
}
