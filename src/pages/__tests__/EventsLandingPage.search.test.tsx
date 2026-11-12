/**
 * Kolom cari /events.
 *
 * Kontrak: ketikan disaring di klien setelah 300 ms (debounce) dan ditulis ke
 * `?q=` sebagai satu entri riwayat — bukan satu per huruf. Tombol hapus
 * mengosongkan input sekaligus menghapus parameter, dan nilai awal dihidrasi
 * dari URL supaya deep-link `?q=` bekerja.
 */
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import type { EventItem } from '../../types';
import { EventsLandingPage } from '../EventsLandingPage';

vi.mock('../../utils/eventsSchedulePdf', () => ({
  renderEventsSchedulePdfResult: vi.fn(async () => ({ blob: new Blob(['%PDF']), fileName: 'x.pdf' })),
}));

function ev(partial: Partial<EventItem> & Pick<EventItem, 'id' | 'status' | 'acara'>): EventItem {
  return {
    rowIndex: 0, tanggal: '5 September 2026', dateStr: '2026-09-05', day: 'Sabtu',
    jam: '10:00 - 21:00', lokasi: 'Atrium', eo: 'EO', pic: '', phone: '', keterangan: '',
    month: 'September', category: 'Umum', categories: ['Umum'], priority: 'medium',
    eventModel: '', eventNominal: '', eventModelNotes: '', ...partial,
  };
}

const EVENTS = [
  ev({ id: 'e1', status: 'upcoming', acara: 'Kompetisi Tari Tradisional' }),
  ev({ id: 'e2', status: 'upcoming', acara: 'Bazar Kuliner', dateStr: '2026-09-06' }),
];

/** Kartu di badan halaman hidup di `#featured`; hero punya daftar sendiri
 *  yang sengaja tidak ikut filter, jadi asersi harus di-scope ke sini. */
function featured() {
  const section = document.getElementById('featured');
  if (!section) throw new Error('#featured tidak dirender');
  return within(section);
}

/** Router palsu: `MemoryRouter` tidak menyentuh `window.location`, jadi URL
 *  hasil navigasi dibaca lewat komponen saudara. */
function LocationProbe() {
  const location = useLocation();
  return <output data-testid="lokasi-url">{location.search}</output>;
}

function renderPage(entry = '/events') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <EventsLandingPage
        isDark={false}
        onToggleDark={() => {}}
        events={EVENTS}
        holidays={[]}
        onDetail={() => {}}
      />
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe('EventsLandingPage — kolom cari', () => {
  it('menyaring kartu dan menulis ?q= ke URL setelah jeda ketik', async () => {
    renderPage();

    const input = screen.getByRole('textbox', { name: 'Cari event' });
    expect(input).toHaveValue('');
    fireEvent.change(input, { target: { value: 'tari' } });

    await waitFor(() => expect(screen.getByTestId('lokasi-url')).toHaveTextContent('q=tari'));
    expect(featured().getByText('Kompetisi Tari Tradisional')).toBeInTheDocument();
    expect(featured().queryByText('Bazar Kuliner')).not.toBeInTheDocument();
  });

  it('menghidrasi input dari ?q= pada tautan langsung', async () => {
    renderPage('/events?q=bazar');

    expect(screen.getByRole('textbox', { name: 'Cari event' })).toHaveValue('bazar');
    await waitFor(() => expect(featured().queryByText('Kompetisi Tari Tradisional')).not.toBeInTheDocument());
    expect(featured().getByText('Bazar Kuliner')).toBeInTheDocument();
  });

  it('tombol hapus mengosongkan input dan mencabut parameter', async () => {
    renderPage('/events?q=tari');

    fireEvent.click(screen.getByRole('button', { name: 'Hapus pencarian' }));

    await waitFor(() => expect(screen.getByTestId('lokasi-url')).not.toHaveTextContent('q='));
    expect(screen.getByRole('textbox', { name: 'Cari event' })).toHaveValue('');
    await waitFor(() => expect(featured().getByText('Bazar Kuliner')).toBeInTheDocument());
  });
});
