import type { Page } from '@playwright/test';

/**
 * Primitif pengukuran audit dashboard — bukti terukur, bukan dugaan.
 * Dipakai oleh `e2e/audit-dashboard.spec.ts` (lihat ADR-006).
 *
 * Semua fungsi mengembalikan daftar temuan dengan selector + angka, supaya
 * klaim di laporan bisa ditelusuri balik ke DOM ter-render.
 */

// ─── Navigasi & settle ───────────────────────────────────────────

/**
 * Tunggu sampai URL berhenti berubah. Rute dashboard memakai redirect
 * client-side (mis. eo_tenant di /dashboard/* → /dashboard/tenant-surveys);
 * mengukur saat redirect berlangsung melempar "Execution context was
 * destroyed". Ini menstabilkan URL dulu sebelum pengukuran.
 */
export async function settleNavigation(page: Page, maxMs = 3000): Promise<void> {
  const start = Date.now();
  let prev = '';
  while (Date.now() - start < maxMs) {
    const cur = page.url();
    if (cur === prev) return;
    prev = cur;
    await page.waitForTimeout(250);
  }
}

// ─── Target sentuh (WCAG 2.5.8 min 24; DESIGN 44) ────────────────

export interface TouchTargetFinding {
  selector: string;
  width: number;
  height: number;
  text: string;
}

/** Kontrol interaktif yang lebih kecil dari ambang, mengabaikan tautan dalam paragraf. */
export async function measureTouchTargets(
  page: Page,
  minSize = 44,
): Promise<TouchTargetFinding[]> {
  return await page.evaluate((min) => {
    const describe = (el: Element): string => {
      let out = el.tagName.toLowerCase();
      if (el.id) out += `#${el.id}`;
      const cls = (el.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).slice(0, 3);
      if (cls.length) out += `.${cls.join('.')}`;
      return out;
    };
    const visible = (el: Element): boolean => {
      if (el.closest('[aria-hidden="true"]')) return false;
      // Drawer sidebar tertutup ber-`inert` (AdminSidebar): tidak dapat
      // di-tap, jadi bukan target sentuh — tanpa ini, rel nav mobile penuh
      // false positive.
      if (el.closest('[inert]')) return false;
      // Elemen sr-only (skip-link, label tersembunyi) sengaja 1×1 — bukan
      // target sentuh; abaikan supaya audit tidak penuh false positive.
      if (el.classList.contains('sr-only') || el.closest('.sr-only')) return false;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      if (style.clipPath === 'inset(50%)' || style.clip === 'rect(0px, 0px, 0px, 0px)') return false;
      if (Number(style.opacity) === 0) return false;
      return el.getClientRects().length > 0;
    };

    const selectors = 'a[href], button, [role="button"], input[type="checkbox"], input[type="radio"], summary, select';
    const findings: Array<{ selector: string; width: number; height: number; text: string }> = [];
    for (const el of Array.from(document.querySelectorAll(selectors))) {
      if (!visible(el)) continue;
      // Tautan yang mengalir di dalam prosa dikecualikan (WCAG 2.5.8 inline exception).
      const style = getComputedStyle(el);
      if (el.tagName === 'A' && style.display.startsWith('inline') && el.closest('p,li')) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < min || rect.height < min) {
        findings.push({
          selector: describe(el),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40),
        });
      }
    }
    return findings;
  }, minSize);
}

// ─── Lantai tipografi (DESIGN: min 12px) ─────────────────────────

export interface TextFloorFinding {
  selector: string;
  fontSize: number;
  text: string;
}

/** Teks terlihat yang font-size-nya di bawah lantai (default 12px). */
export async function measureTextFloor(page: Page, floor = 12): Promise<TextFloorFinding[]> {
  return await page.evaluate((min) => {
    const describe = (el: Element): string => {
      let out = el.tagName.toLowerCase();
      if (el.id) out += `#${el.id}`;
      const cls = (el.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).slice(0, 3);
      if (cls.length) out += `.${cls.join('.')}`;
      return out;
    };
    const out: Array<{ selector: string; fontSize: number; text: string }> = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text) continue;
      const el = node.parentElement;
      if (!el) continue;
      if (el.closest('[aria-hidden="true"]') || el.closest('[inert]')) continue;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) continue;
      if (!el.getClientRects().length) continue;
      const size = parseFloat(style.fontSize);
      if (size < min) out.push({ selector: describe(el), fontSize: Math.round(size * 10) / 10, text: text.slice(0, 40) });
    }
    return out.slice(0, 40);
  }, floor);
}

// ─── Affordance dua baris & konten terpotong ─────────────────────

export interface ClippedFinding {
  selector: string;
  text: string;
  scrollHeight: number;
  clientHeight: number;
  kind: 'clipped' | 'wrapped';
}

/**
 * Kontrol yang teksnya melipat jadi dua baris (affordance tidak muat) atau
 * kontennya terpotong (overflow hidden tanpa scroll). Elemen dengan
 * `truncate`/`line-clamp` dikecualikan karena pemotongan itu disengaja.
 */
export async function measureClippedControls(page: Page): Promise<ClippedFinding[]> {
  return await page.evaluate(() => {
    const describe = (el: Element): string => {
      let out = el.tagName.toLowerCase();
      if (el.id) out += `#${el.id}`;
      const cls = (el.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).slice(0, 3);
      if (cls.length) out += `.${cls.join('.')}`;
      return out;
    };
    const intentional = (el: Element): boolean =>
      /truncate|line-clamp|overflow-ellipsis/.test(el.getAttribute('class') || '') ||
      /truncate|line-clamp/.test((el.parentElement?.getAttribute('class') || ''));

    const out: Array<{ selector: string; text: string; scrollHeight: number; clientHeight: number; kind: 'clipped' | 'wrapped' }> = [];
    for (const el of Array.from(document.querySelectorAll('button, a[href], [role="button"], .ui-btn-primary, .ui-btn-secondary'))) {
      if (el.closest('[inert]')) continue;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      if (!el.getClientRects().length) continue;
      if (intentional(el)) continue;
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text) continue;
      const scrollH = el.scrollHeight;
      const clientH = el.clientHeight;
      // Terpotong vertikal tanpa scroll.
      const overflowY = style.overflowY;
      if (overflowY === 'hidden' && scrollH > clientH + 2) {
        out.push({ selector: describe(el), text: text.slice(0, 40), scrollHeight: scrollH, clientHeight: clientH, kind: 'clipped' });
        continue;
      }
      // Melipat: hitung baris dari rect TEXT NODE saja (bukan selectNodeContents
      // yang ikut menghitung ikon — ikon punya `top` berbeda sehingga tombol
      // satu baris terlihat "melipat"). Ini metode yang sama dengan
      // `e2e/__admin-chrome-port.spec.ts`.
      const textRects: DOMRect[] = [];
      el.childNodes.forEach((n) => {
        if (n.nodeType !== 3 || !n.textContent?.trim()) return;
        const r = document.createRange();
        r.selectNodeContents(n);
        textRects.push(...Array.from(r.getClientRects()));
      });
      const lineTops = new Set(textRects.map((r) => Math.round(r.top)));
      if (lineTops.size > 1) {
        out.push({ selector: describe(el), text: text.slice(0, 40), scrollHeight: scrollH, clientHeight: clientH, kind: 'wrapped' });
      }
    }
    return out.slice(0, 40);
  });
}

// ─── Empty-state census ──────────────────────────────────────────

export interface EmptyStateFinding {
  selector: string;
  text: string;
}

/** Node daun yang teksnya menandakan keadaan kosong (untuk audit empty state). */
export async function measureEmptyStates(page: Page): Promise<EmptyStateFinding[]> {
  return await page.evaluate(() => {
    const describe = (el: Element): string => {
      let out = el.tagName.toLowerCase();
      if (el.id) out += `#${el.id}`;
      const cls = (el.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).slice(0, 3);
      if (cls.length) out += `.${cls.join('.')}`;
      return out;
    };
    return Array.from(document.querySelectorAll('*'))
      .filter((e) => e.children.length === 0 && /belum ada|tidak ada|kosong|gagal dimuat|belum tersedia/i.test((e.textContent || '').trim()))
      .map((e) => ({ selector: describe(e), text: (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60) }))
      .slice(0, 12);
  });
}

// ─── Landmark & dialog ───────────────────────────────────────────

export interface ShellMetrics {
  overflow: number;
  h1Count: number;
  h1Texts: string[];
  dialogs: number;
  landmarks: { main: number; header: number; nav: number; footer: number };
  bodyScrollLocked: boolean;
}

/** Ringkasan struktur shell: overflow, h1 tunggal, landmark, dialog. */
export async function measureShell(page: Page): Promise<ShellMetrics> {
  return await page.evaluate(() => {
    const de = document.documentElement;
    const count = (sel: string) => document.querySelectorAll(sel).length;
    return {
      overflow: Math.max(0, de.scrollWidth - de.clientWidth),
      h1Count: count('h1'),
      h1Texts: Array.from(document.querySelectorAll('h1')).map((e) => (e.textContent || '').replace(/\s+/g, ' ').trim()),
      dialogs: count('[role="dialog"]'),
      // Landmark dihitung per ROLE, bukan per elemen: `<header>` di dalam kartu
      // bukan banner, jadi `body > header` / `[role=banner]` yang benar.
      landmarks: {
        main: count('main, [role="main"]'),
        header: count('body > header, [role="banner"]'),
        nav: count('nav, [role="navigation"]'),
        footer: count('body > footer, [role="contentinfo"]'),
      },
      bodyScrollLocked: getComputedStyle(document.body).overflow === 'hidden',
    };
  });
}
