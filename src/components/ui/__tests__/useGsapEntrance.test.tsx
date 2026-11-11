import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import { useEffect, useRef, useState } from 'react';

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

describe('useGsapEntrance — simpul muncul setelah effect pertama', () => {
  afterEach(() => cleanup());

  it('melepas pre-state saat simpul baru terpasang setelah loading selesai', async () => {
    const { rerender, container } = render(<DelayedTarget ready={false} />);
    expect(container.querySelector('.section')).toBeNull();

    rerender(<DelayedTarget ready />);

    await waitFor(() => {
      expect(container.querySelector('.section')?.className).toContain('section-static');
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
      expect(container.querySelector('.section')?.className).toContain('section-static');
    } finally {
      window.matchMedia = original;
    }
  });
});
