import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MarkdownBody } from '../MarkdownBody';

describe('MarkdownBody linkifikasi', () => {
  it('mengubah domain telanjang jadi tautan https', () => {
    const { container } = render(
      <MarkdownBody content="Kunjungi metmalcommunityspace.web.id/daftar untuk mendaftar." />,
    );
    const a = container.querySelector('a');
    expect(a).not.toBeNull();
    expect(a?.getAttribute('href')).toBe('https://metmalcommunityspace.web.id/daftar');
    expect(a?.getAttribute('target')).toBe('_blank');
  });

  it('tidak merusak URL berskema atau email, dan tidak mengubah angka/satuan', () => {
    const { container } = render(
      <MarkdownBody content={'Pukul 06.30 - 10.00 WIB. Kontak a@b.com, situs https://contoh.id/x.'} />,
    );
    const hrefs = [...container.querySelectorAll('a')].map((el) => el.getAttribute('href'));
    expect(hrefs).toContain('https://contoh.id/x');
    expect(hrefs).not.toContain('https://b.com');
    expect(hrefs).not.toContain('https://06.30');
    expect(container.textContent).toContain('06.30 - 10.00 WIB');
    expect(container.textContent).toContain('a@b.com');
  });

  it('tidak melink-kan teks di dalam tautan markdown', () => {
    const { container } = render(
      <MarkdownBody content="Buka [situs](https://metmalcommunityspace.web.id/daftar) sekarang." />,
    );
    const anchors = container.querySelectorAll('a');
    expect(anchors.length).toBe(1);
    expect(anchors[0]?.getAttribute('href')).toBe('https://metmalcommunityspace.web.id/daftar');
  });
});
