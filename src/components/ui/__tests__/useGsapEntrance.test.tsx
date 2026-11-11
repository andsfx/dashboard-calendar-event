import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import { useRef } from 'react';

// Chunk GSAP digagalkan supaya jalur fail-open yang dipakai: end-state wajib
// dilepas lewat `staticClass`. Yang diuji adalah perilaku "simpul muncul
// belakangan", bukan tween-nya.
vi.mock('../../../lib/gsapMotion', () => ({
  loadGsapMotion: () => Promise.reject(new Error('chunk gagal')),
  isGsapMotionLoaded: () => false,
}));

import { useGsapEntrance } from '../useGsapEntrance';

/** Meniru DashboardShell: anak yang dipegang `ref` baru ada setelah `ready`. */
function DelayedTarget({ ready }: { ready: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useGsapEntrance(ref, { staticClass: 'section-static', build: () => undefined });
  return ready ? <div ref={ref} className="section" /> : <div className="skeleton" />;
}

const staticClassOf = (container: HTMLElement) =>
  container.querySelector('.section')?.className ?? '';

describe('useGsapEntrance — simpul muncul setelah effect pertama', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('melepas pre-state saat simpul baru terpasang setelah loading selesai', async () => {
    const { rerender, container } = render(<DelayedTarget ready={false} />);
    expect(container.querySelector('.section')).toBeNull();

    rerender(<DelayedTarget ready />);

    await waitFor(() => {
      expect(staticClassOf(container)).toContain('section-static');
    });
  });

  it('tetap melepas pre-state setelah tab lama tersembunyi (rAF berhenti, waktu jalan)', async () => {
    // Simulasi tab latar: frame tidak pernah datang, jam dinding tetap maju.
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      frames.push(cb);
      return frames.length;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);

    const { rerender, container } = render(<DelayedTarget ready={false} />);
    // Jauh melewati anggaran lama (2,5 dtk) tanpa satu frame pun.
    await new Promise((resolve) => setTimeout(resolve, 2600));

    // Tab kembali aktif TAPI simpul belum ada (mis. `/auth/me` masih berjalan).
    // Deadline berbasis jam dinding akan menyerah di sini dan berhenti memantau.
    frames.shift()?.(16);

    rerender(<DelayedTarget ready />);
    // Frame berikutnya baru bisa melihat simpul yang kini terpasang.
    frames.shift()?.(32);

    await waitFor(() => {
      expect(staticClassOf(container)).toContain('section-static');
    });
  });

  it('tetap melepas pre-state pada reduced motion tanpa menunggu chunk', () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;

    try {
      const { container } = render(<DelayedTarget ready />);
      expect(staticClassOf(container)).toContain('section-static');
    } finally {
      window.matchMedia = original;
    }
  });
});
