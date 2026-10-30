import { describe, it, expect, vi } from 'vitest';
import type { ReactNode } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { PublicSiteHeader } from '../PublicSiteHeader';
import {
  PUBLIC_PRIMARY_LINKS,
  PUBLIC_SECONDARY_LINKS,
  isPublicNavActive,
} from '../publicNav';

interface RenderOptions {
  path?: string;
  isDark?: boolean;
  actions?: ReactNode;
  sectionLinks?: ReadonlyArray<{ label: string; href: string }>;
  /** Tombol navigasi di luar header: menguji perubahan pathname tanpa klik item panel. */
  withProbe?: boolean;
}

function NavProbe() {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate('/news')}>
      Pindah ke berita
    </button>
  );
}

function renderHeader({
  path = '/gallery',
  isDark = false,
  actions,
  sectionLinks,
  withProbe = false,
}: RenderOptions = {}) {
  const onToggleDark = vi.fn();
  const result = render(
    <MemoryRouter initialEntries={[path]}>
      <PublicSiteHeader
        isDark={isDark}
        onToggleDark={onToggleDark}
        actions={actions}
        sectionLinks={sectionLinks}
      />
      {withProbe && <NavProbe />}
    </MemoryRouter>,
  );
  return { ...result, onToggleDark };
}

async function openPanel(user: UserEvent) {
  await user.click(screen.getByRole('button', { name: 'Buka menu' }));
  return screen.getByRole('navigation', { name: 'Navigasi menu' });
}

describe('PublicSiteHeader', () => {
  it('menandai Galeri aktif pada /gallery dan /gallery/:slug, tidak pada /news', () => {
    const gallery = renderHeader({ path: '/gallery' });
    expect(within(screen.getByRole('navigation', { name: 'Navigasi utama' })).getByRole('link', { name: 'Galeri' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    gallery.unmount();

    const album = renderHeader({ path: '/gallery/album-x' });
    expect(within(screen.getByRole('navigation', { name: 'Navigasi utama' })).getByRole('link', { name: 'Galeri' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    album.unmount();

    renderHeader({ path: '/news' });
    expect(within(screen.getByRole('navigation', { name: 'Navigasi utama' })).getByRole('link', { name: 'Galeri' })).not.toHaveAttribute(
      'aria-current',
    );
    expect(within(screen.getByRole('navigation', { name: 'Navigasi utama' })).getByRole('link', { name: 'Berita' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('menandai Jadwal Event aktif pada /events/:id dengan tepat satu aria-current', () => {
    renderHeader({ path: '/events/evt-1' });

    expect(within(screen.getByRole('banner')).getByRole('link', { name: 'Jadwal Event' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    const current = within(screen.getByRole('banner'))
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page');
    expect(current).toHaveLength(1);
  });

  it('merender CTA Daftar Event ke /daftar dan menghilangkannya di /daftar', async () => {
    const user = userEvent.setup();
    const gallery = renderHeader({ path: '/gallery' });
    expect(within(screen.getByRole('banner')).getByRole('link', { name: 'Daftar Event' })).toHaveAttribute(
      'href',
      '/daftar',
    );
    gallery.unmount();

    renderHeader({ path: '/daftar' });
    expect(screen.queryByRole('link', { name: 'Daftar Event' })).toBeNull();

    const panel = await openPanel(user);
    expect(within(panel).queryByRole('link', { name: 'Daftar Event' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Daftar Event' })).toBeNull();
  });

  it('memanggil onToggleDark dan memakai label toggle berbahasa Indonesia', async () => {
    const user = userEvent.setup();
    const light = renderHeader({ path: '/gallery' });

    const toggle = screen.getByRole('button', { name: 'Mode gelap' });
    await user.click(toggle);
    expect(light.onToggleDark).toHaveBeenCalledTimes(1);
    light.unmount();

    renderHeader({ path: '/gallery', isDark: true });
    expect(screen.getByRole('button', { name: 'Mode terang' })).toBeInTheDocument();
  });

  it('membuka panel Menu dengan semua tujuan, Escape menutup dan mengembalikan fokus', async () => {
    const user = userEvent.setup();
    renderHeader({ path: '/gallery' });

    const menuButton = screen.getByRole('button', { name: 'Buka menu' });
    expect(menuButton).toHaveTextContent('Menu');
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    expect(menuButton).toHaveAttribute('aria-controls', 'public-site-nav');

    await user.click(menuButton);

    expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    const panel = screen.getByRole('navigation', { name: 'Navigasi menu' });
    expect(panel).toHaveAttribute('id', 'public-site-nav');

    for (const link of [...PUBLIC_PRIMARY_LINKS, ...PUBLIC_SECONDARY_LINKS]) {
      const item = within(panel).getByRole('link', { name: link.label });
      expect(item).toHaveAttribute('href', link.to);
      // Target sentuh minimum 44 px.
      expect(item).toHaveClass('min-h-11');
    }
    expect(within(panel).getByRole('link', { name: 'Jadwal Event' })).toHaveFocus();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('navigation', { name: 'Navigasi menu' })).toBeNull();
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    expect(menuButton).toHaveFocus();
  });

  it('menutup panel dan dropdown saat pathname berubah', async () => {
    const user = userEvent.setup();
    renderHeader({ path: '/gallery', withProbe: true });

    await openPanel(user);
    await user.click(screen.getByRole('button', { name: /Jelajahi/ }));
    expect(screen.getByRole('group', { name: 'Jelajahi' })).toBeInTheDocument();

    // fireEvent tidak memindahkan fokus, jadi dropdown hanya bisa tertutup oleh
    // perubahan pathname (bukan oleh listener fokus NavDropdown).
    fireEvent.click(screen.getByRole('button', { name: 'Pindah ke berita' }));

    expect(screen.queryByRole('navigation', { name: 'Navigasi menu' })).toBeNull();
    expect(screen.queryByRole('group', { name: 'Jelajahi' })).toBeNull();
  });

  it('merender actions dan sectionLinks sebagai anchor', async () => {
    const user = userEvent.setup();
    renderHeader({
      path: '/events',
      actions: <button type="button">Unduh PDF</button>,
      sectionLinks: [
        { label: 'Sorotan', href: '#featured' },
        { label: 'Kalender', href: '#calendar' },
      ],
    });

    expect(screen.getByRole('button', { name: 'Unduh PDF' })).toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: 'Navigasi utama' })).getByRole('link', { name: 'Sorotan' })).toHaveAttribute(
      'href',
      '#featured',
    );
    expect(within(screen.getByRole('navigation', { name: 'Navigasi utama' })).getByRole('link', { name: 'Kalender' })).toHaveAttribute(
      'href',
      '#calendar',
    );

    const panel = await openPanel(user);
    expect(within(panel).getByText('Di halaman ini')).toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: 'Sorotan' })).toHaveAttribute(
      'href',
      '#featured',
    );
    expect(within(panel).getByRole('link', { name: 'Kalender' })).toHaveAttribute(
      'href',
      '#calendar',
    );
  });

  it('menandai rute sekunder aktif di bar dan di dalam dropdown', async () => {
    const user = userEvent.setup();
    renderHeader({ path: '/sponsor' });

    // Bar desktop: tidak ada link primer yang aktif, jadi lokasi harus terbaca
    // dari trigger `Jelajahi`.
    const trigger = screen.getByRole('button', { name: /Jelajahi/ });
    // Kelas aktif harus EKSKLUSIF: dulu trigger merangkai `text-slate-700` dan
    // `text-[var(--brand-tosca)]` sekaligus sehingga urutan CSS menentukan
    // pemenangnya dan warna aktif tidak pernah terlihat. jsdom tidak punya
    // CSS engine, jadi computed color tidak bisa dipakai di sini.
    expect(trigger.className).toContain('text-[var(--brand-tosca)]');
    expect(trigger.className).not.toContain('text-slate-700');
    expect(
      within(screen.getByRole('navigation', { name: 'Navigasi utama' }))
        .getAllByRole('link')
        .filter((link) => link.getAttribute('aria-current') === 'page'),
    ).toHaveLength(0);

    await user.click(trigger);

    const group = screen.getByRole('group', { name: 'Jelajahi' });
    expect(within(group).getByRole('link', { name: 'Sponsor' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(group).getByRole('link', { name: 'Dokumentasi' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('tidak memuat em dash atau en dash di teks header', async () => {
    const user = userEvent.setup();
    renderHeader({
      path: '/events',
      actions: <button type="button">Unduh PDF</button>,
      sectionLinks: [{ label: 'Sorotan', href: '#featured' }],
    });
    await openPanel(user);

    expect(screen.getByRole('banner').textContent ?? '').not.toMatch(/[\u2013\u2014]/);
  });
});

describe('isPublicNavActive', () => {
  it('memakai exact match untuk beranda', () => {
    expect(isPublicNavActive('/', '/')).toBe(true);
    expect(isPublicNavActive('/events', '/')).toBe(false);
    expect(isPublicNavActive('/gallery', '/')).toBe(false);
  });

  it('menandai rute turunan sebagai milik induknya', () => {
    expect(isPublicNavActive('/events', '/events')).toBe(true);
    expect(isPublicNavActive('/events/evt-1', '/events')).toBe(true);
    expect(isPublicNavActive('/gallery/album-x', '/gallery')).toBe(true);
    expect(isPublicNavActive('/news/judul-berita', '/news')).toBe(true);
    expect(isPublicNavActive('/pameran/p-1', '/pameran')).toBe(true);
  });

  it('tidak mencocokkan tujuan yang hanya mirip', () => {
    expect(isPublicNavActive('/tenant-survey', '/tenants')).toBe(false);
    expect(isPublicNavActive('/tenant-survey/evt-1', '/tenants')).toBe(false);
    expect(isPublicNavActive('/newsletter', '/news')).toBe(false);
    expect(isPublicNavActive('/events-archive', '/events')).toBe(false);
  });
});
