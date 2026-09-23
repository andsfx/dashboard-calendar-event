import { describe, it, expect } from 'vitest';
import { useState } from 'react';
import { render, screen, within, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { NavDropdown, type NavDropdownItem } from '../NavDropdown';

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
  withTargets = false,
}: {
  items?: NavDropdownItem[];
  label?: string;
  pinned?: boolean;
  /** Sediakan section target fokusable (id sama dengan href) untuk uji fokus pasca-aktivasi. */
  withTargets?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <MemoryRouter>
      {withTargets && (
        <>
          <div id="benefits" tabIndex={-1} data-testid="target-benefits" />
          <div id="areas" tabIndex={-1} data-testid="target-areas" />
        </>
      )}
      <NavDropdown label={label} items={items} pinned={pinned} open={open} onOpenChange={setOpen} />
      <button type="button">Luar</button>
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

/** Panel disclosure: `role="group"` berlabel (bukan `role="menu"`). */
function panel(name: string) {
  return screen.getByRole('group', { name });
}
function queryPanel(name: string) {
  return screen.queryByRole('group', { name });
}
function triggerFor(name: string) {
  return screen.getByRole('button', { name: new RegExp(name) });
}

describe('NavDropdown', () => {
  it('tertutup secara default — trigger pakai aria-expanded, tanpa aria-haspopup="menu"', () => {
    render(<NavHarness />);
    const trigger = triggerFor('Program');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    // Disclosure pattern: bukan menu-button.
    expect(trigger).not.toHaveAttribute('aria-haspopup', 'menu');
    expect(queryPanel('Program')).not.toBeInTheDocument();
  });

  it('terbuka saat diklik, aria-expanded bertukar, aria-controls menunjuk panel', async () => {
    const user = userEvent.setup();
    render(<NavHarness />);
    const trigger = triggerFor('Program');

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const group = panel('Program');
    // aria-controls harus menunjuk id panel yang benar-benar dirender.
    expect(trigger).toHaveAttribute('aria-controls', group.id);

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(queryPanel('Program')).not.toBeInTheDocument();
  });

  it('item diumumkan sebagai LINK dan mengekspos kategori Program', async () => {
    const user = userEvent.setup();
    render(<NavHarness />);
    await user.click(triggerFor('Program'));

    const group = panel('Program');
    // Semantik link dipertahankan (bukan role="menuitem").
    expect(within(group).queryByRole('menuitem')).not.toBeInTheDocument();
    expect(within(group).getByRole('link', { name: 'Keuntungan' })).toHaveAttribute('href', '#benefits');
    expect(within(group).getByRole('link', { name: 'Area & Fasilitas' })).toHaveAttribute('href', '#areas');
    expect(within(group).getByRole('link', { name: 'Cara Daftar' })).toHaveAttribute('href', '#how');
    expect(within(group).getByRole('link', { name: 'FAQ' })).toHaveAttribute('href', '#faq');
  });

  it('item route (/tenants, /pameran) dirender sebagai link react-router', async () => {
    const user = userEvent.setup();
    render(<NavHarness label="Jelajahi" items={JELAJAHI_ITEMS} />);
    await user.click(triggerFor('Jelajahi'));

    const group = panel('Jelajahi');
    expect(within(group).getByRole('link', { name: 'Galeri' })).toHaveAttribute('href', '#gallery');
    expect(within(group).getByRole('link', { name: 'Berita' })).toHaveAttribute('href', '#news');
    expect(within(group).getByRole('link', { name: 'Tenant' })).toHaveAttribute('href', '/tenants');
    expect(within(group).getByRole('link', { name: 'Pameran' })).toHaveAttribute('href', '/pameran');
  });

  it('menutup saat Escape dan mengembalikan fokus ke trigger', async () => {
    const user = userEvent.setup();
    render(<NavHarness />);
    const trigger = triggerFor('Program');

    await user.click(trigger);
    expect(panel('Program')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(queryPanel('Program')).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });

  it('ArrowDown dari trigger TERTUTUP membuka panel dan memfokuskan item pertama', async () => {
    const user = userEvent.setup();
    render(<NavHarness />);
    const trigger = triggerFor('Program');

    trigger.focus();
    expect(queryPanel('Program')).not.toBeInTheDocument();

    await user.keyboard('{ArrowDown}');
    expect(panel('Program')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Keuntungan' })).toHaveFocus();
  });

  it('ArrowDown/ArrowUp/Home/End menavigasi item (progressive enhancement)', async () => {
    const user = userEvent.setup();
    render(<NavHarness />);

    await user.click(triggerFor('Program'));
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('link', { name: 'Keuntungan' })).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('link', { name: 'Area & Fasilitas' })).toHaveFocus();

    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('link', { name: 'Keuntungan' })).toHaveFocus();

    // Wrap ke item terakhir.
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('link', { name: 'FAQ' })).toHaveFocus();

    // Home / End.
    await user.keyboard('{Home}');
    expect(screen.getByRole('link', { name: 'Keuntungan' })).toHaveFocus();
    await user.keyboard('{End}');
    expect(screen.getByRole('link', { name: 'FAQ' })).toHaveFocus();
  });

  it('menutup saat klik di luar panel', async () => {
    const user = userEvent.setup();
    render(<NavHarness />);
    await user.click(triggerFor('Program'));
    expect(panel('Program')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Luar' }));
    expect(queryPanel('Program')).not.toBeInTheDocument();
  });

  it('mengaktifkan item menutup panel', async () => {
    const user = userEvent.setup();
    render(<NavHarness />);
    await user.click(triggerFor('Program'));

    await user.click(screen.getByRole('link', { name: 'FAQ' }));
    expect(queryPanel('Program')).not.toBeInTheDocument();
    expect(triggerFor('Program')).toHaveAttribute('aria-expanded', 'false');
  });

  it('fokus pindah ke section target (fokusable) setelah item anchor dipilih', async () => {
    const user = userEvent.setup();
    render(<NavHarness withTargets />);
    await user.click(triggerFor('Program'));

    await user.click(screen.getByRole('link', { name: 'Keuntungan' }));
    expect(queryPanel('Program')).not.toBeInTheDocument();
    // Fokus tidak boleh jatuh ke <body>.
    expect(document.activeElement).not.toBe(document.body);
    expect(screen.getByTestId('target-benefits')).toHaveFocus();
  });

  it('fokus balik ke trigger bila section target tidak fokusable / tidak ada', async () => {
    const user = userEvent.setup();
    render(<NavHarness />); // tanpa target sections
    const trigger = triggerFor('Program');
    await user.click(trigger);

    await user.click(screen.getByRole('link', { name: 'Keuntungan' }));
    expect(queryPanel('Program')).not.toBeInTheDocument();
    expect(document.activeElement).not.toBe(document.body);
    expect(trigger).toHaveFocus();
  });

  it('membuka lewat hover lalu menutup saat pointer pergi', async () => {
    const user = userEvent.setup();
    render(<NavHarness />);
    const trigger = triggerFor('Program');

    await user.hover(trigger);
    await waitFor(() => expect(panel('Program')).toBeInTheDocument());

    await user.unhover(trigger);
    await waitFor(() => expect(queryPanel('Program')).not.toBeInTheDocument());
  });

  it('menu yang dibuka lewat hover ikut tertutup saat fokus keluar container (Tab)', async () => {
    const user = userEvent.setup();
    render(<NavHarness />);
    const trigger = triggerFor('Program');

    await user.hover(trigger);
    await waitFor(() => expect(panel('Program')).toBeInTheDocument());
    // Fokus tidak pernah masuk container (dibuka hover) — jalur inilah yang dulu bocor.
    expect(containerOf(trigger)).not.toContain(document.activeElement);

    fireEvent.focusIn(screen.getByRole('button', { name: 'Luar' }));
    await waitFor(() => expect(queryPanel('Program')).not.toBeInTheDocument());
  });

  it('hanya satu dropdown terbuka pada satu waktu', async () => {
    const user = userEvent.setup();
    render(<TwoMenuHarness />);

    await user.click(triggerFor('Program'));
    expect(panel('Program')).toBeInTheDocument();

    await user.click(triggerFor('Jelajahi'));
    expect(queryPanel('Program')).not.toBeInTheDocument();
    expect(panel('Jelajahi')).toBeInTheDocument();
  });
});

/** Container pembungkus dropdown (parent dari trigger) — untuk cek containment. */
function containerOf(trigger: HTMLElement): HTMLElement {
  const parent = trigger.parentElement;
  if (!parent) throw new Error('trigger tanpa parent');
  return parent;
}
