import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { DocsPage } from '../DocsPage';
import { DOC_SECTIONS } from '../../data/featureDocs';

/**
 * Regresi visual /docs: `RevealSection` hanya men-tween anak langsung yang
 * ditandai `data-reveal-item` bila stage punya item bertanda. CSS tetap
 * menyembunyikan anak langsung tanpa tanda, jadi campuran keduanya membuat
 * judul section + intro permanen `opacity: 0`. Tes ini menjaga kontrak markup
 * itu tanpa mengunci teks dokumentasi.
 */
describe('DocsPage — reveal section', () => {
  it('setiap anak stage bertanda punya jalur tween, bukan hanya pre-state CSS', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/docs']}>
        <DocsPage isDark={false} onToggleDark={() => undefined} />
      </MemoryRouter>,
    );

    const stages = Array.from(container.querySelectorAll<HTMLElement>('.reveal-stage'));
    expect(stages.length).toBeGreaterThan(0);

    for (const stage of stages) {
      // Stage tanpa item bertanda men-tween semua anak langsung, jadi aman.
      if (!stage.querySelector('[data-reveal-item]')) continue;

      for (const child of Array.from(stage.children)) {
        const reachable =
          child.hasAttribute('data-reveal-item') || child.querySelector('[data-reveal-item]') !== null;
        expect(
          reachable,
          `anak .reveal-stage ini tersembunyi pre-state tetapi tidak pernah di-tween: ${child.outerHTML.slice(0, 120)}`,
        ).toBe(true);
      }
    }

    expect(container.querySelectorAll('h2[data-reveal-item]')).toHaveLength(DOC_SECTIONS.length);
  });
});
