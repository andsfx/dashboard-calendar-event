import { describe, it, expect } from 'vitest';
import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { NavDropdown, type NavDropdownItem } from '../nav/NavDropdown';

// Konfigurasi kategori nyata (cermin NAV_ENTRIES di CommunityLandingPage).
const PROGRAM_ITEMS: NavDropdownItem[] = [
  { label: 'Keuntungan', href: '#benefits' },
  { label: 'Area & Fasilitas', href: '#areas' },
  { label: 'Cara Daftar', href: '#how' },
  { label: 'FAQ', href: '#faq' },
];
const JELAJAHI_ITEMS: NavDropdownItem[] = [
  { label: 'Galeri', href: '#gallery' },
  { label: 'Berita', href: '#news' },
  { label: 'Tenant', href: '/tenants', route: true },
  { label: 'Pameran', href: '/pameran', route: true },
];

/** Harness stateful — meniru pola parent (satu dropdown terbuka pada satu waktu). */
function NavHarness({
  items = PROGRAM_ITEMS,
  label = 'Program',
  pinned = true,
}: {
  items?: NavDropdownItem[];
  label?: string;
  pinned?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <MemoryRouter>
      <NavDropdown label={label} items={items} pinned={pinned} open={open} onOpenChange={setOpen} />
    </MemoryRouter>
  );
}

function TwoMenuHarness() {
  const [open, setOpen] = useState<'Program' | 'Jelajahi' | null>(null);
  return (
    <MemoryRouter>
      <NavDropdown
        label="Program"
        items={PROGRAM_ITEMS}
        pinned
        open={open === 'Program'}
        onOpenChange={(v) => setOpen(v ? 'Program' : null)}
      />
      <NavDropdown
        label="Jelajahi"
        items={JELAJAHI_ITEMS}
        pinned
        open={open === 'Jelajahi'}
        onOpenChange={(v) => setOpen(v ? 'Jelajahi' : null)}
      />
    </MemoryRouter>
  );
}

describe('NavDropdown', () => {
  it('tertutup secara default — trigger punya aria-haspopup + aria-expanded=false', () => {
    render(<NavHarness />);
    const trigger = screen.getByRole('button', { name: /Program/ });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('terbuka saat diklik dan aria-expanded bertukar; panel mengekspos item kategori', async () => {
    const user = userEvent.setup();
    render(<NavHarness />);
    const trigger = screen.getByRole('button', { name: /Program/ });

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const menu = screen.getByRole('menu', { name: 'Program' });
    expect(within(menu).getByRole('menuitem', { name: 'Keuntungan' })).toHaveAttribute('href', '#benefits');
    expect(within(menu).getByRole('menuitem', { name: 'Area & Fasilitas' })).toHaveAttribute('href', '#areas');
    expect(within(menu).getByRole('menuitem', { name: 'Cara Daftar' })).toHaveAttribute('href', '#how');
    expect(within(menu).getByRole('menuitem', { name: 'FAQ' })).toHaveAttribute('href', '#faq');

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('menutup saat Escape dan mengembalikan fokus ke trigger', async () => {
    const user = userEvent.setup();
    render(<NavHarness />);
    const trigger = screen.getByRole('button', { name: /Program/ });

    await user.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });

  it('ArrowDown memindahkan fokus ke item pertama, ArrowDown/ArrowUp bersiklus', async () => {
    const user = userEvent.setup();
    render(<NavHarness />);
    const trigger = screen.getByRole('button', { name: /Program/ });

    await user.click(trigger);
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Keuntungan' })).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Area & Fasilitas' })).toHaveFocus();

    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('menuitem', { name: 'Keuntungan' })).toHaveFocus();

    // Wrap ke item terakhir.
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('menuitem', { name: 'FAQ' })).toHaveFocus();
  });

  it('item route (/tenants, /pameran) dirender sebagai link react-router', async () => {
    const user = userEvent.setup();
    render(<NavHarness label="Jelajahi" items={JELAJAHI_ITEMS} />);
    await user.click(screen.getByRole('button', { name: /Jelajahi/ }));
    const menu = screen.getByRole('menu', { name: 'Jelajahi' });
    expect(within(menu).getByRole('menuitem', { name: 'Galeri' })).toHaveAttribute('href', '#gallery');
    expect(within(menu).getByRole('menuitem', { name: 'Berita' })).toHaveAttribute('href', '#news');
    expect(within(menu).getByRole('menuitem', { name: 'Tenant' })).toHaveAttribute('href', '/tenants');
    expect(within(menu).getByRole('menuitem', { name: 'Pameran' })).toHaveAttribute('href', '/pameran');
  });

  it('menutup saat klik di luar panel', async () => {
    const user = userEvent.setup();
    render(<NavHarness />);
    await user.click(screen.getByRole('button', { name: /Program/ }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.click(document.body);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('hanya satu dropdown terbuka pada satu waktu', async () => {
    const user = userEvent.setup();
    render(<TwoMenuHarness />);

    await user.click(screen.getByRole('button', { name: /Program/ }));
    expect(screen.getByRole('menu', { name: 'Program' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Jelajahi/ }));
    expect(screen.queryByRole('menu', { name: 'Program' })).not.toBeInTheDocument();
    expect(screen.getByRole('menu', { name: 'Jelajahi' })).toBeInTheDocument();
  });
});
