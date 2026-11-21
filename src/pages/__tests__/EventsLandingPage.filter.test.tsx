/**
 * Filter waktu `/events` sebagai satu kontrol satu-of.
 *
 * Kontrak:
 *  1. Sentinel default berlabel "Aktif" — halaman hanya memuat event yang
 *     belum selesai, jadi "Semua" akan menjanjikan arsip yang tidak dirender.
 *  2. Tepat satu segmen tercentang pada satu waktu; memilih preset menulis
 *     `?waktu=` dan menyaring kartu.
 *  3. Memilih sentinel lagi mengembalikan URL ke tanpa parameter, bukan
 *     meninggalkan nilai mati di URL.
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

const now = new Date();
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const TODAY = iso(now);
const tomorrow = new Date(now);
tomorrow.setDate(tomorrow.getDate() + 1);
const TOMORROW = iso(tomorrow);

function ev(partial: Partial<EventItem> & Pick<EventItem, 'id' | 'acara' | 'dateStr'>): EventItem {
  return {
    rowIndex: 0, tanggal: '20 November 2026', day: 'Jumat',
    jam: '10:00 - 21:00', lokasi: 'Atrium', eo: 'EO', pic: '', phone: '', keterangan: '',
    month: 'November', category: 'Umum', categories: ['Umum'], priority: 'medium',
    eventModel: '', eventNominal: '', eventModelNotes: '', posterUrl: '', status: 'upcoming',
    ...partial,
  };
}

const EVENTS = [
  ev({ id: 'today', acara: 'Bazar Hari Ini', dateStr: TODAY }),
  ev({ id: 'tomorrow', acara: 'Kelas Besok', dateStr: TOMORROW }),
];

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="lokasi-url">{location.search}</output>;
}

function renderPage(entry = '/events') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <EventsLandingPage isDark={false} onToggleDark={() => {}} events={EVENTS} holidays={[]} onDetail={() => {}} />
      <LocationProbe />
    </MemoryRouter>,
  );
}

function featured() {
  const section = document.getElementById('featured');
  if (!section) throw new Error('#featured tidak dirender');
  return within(section);
}

describe('EventsLandingPage — filter waktu satu-of', () => {
  it('mencentang "Aktif" secara default dan tidak mengirim parameter waktu', () => {
    renderPage();
    const group = screen.getByRole('radiogroup', { name: 'Filter waktu' });
    expect(within(group).getByRole('radio', { name: 'Aktif' })).toHaveAttribute('aria-checked', 'true');
    expect(within(group).getByRole('radio', { name: 'Hari ini' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByTestId('lokasi-url')).not.toHaveTextContent('waktu=');
  });

  it('memilih "Hari ini" menulis ?waktu=hari-ini dan menyaring kartu', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('radio', { name: 'Hari ini' }));

    await waitFor(() => expect(screen.getByTestId('lokasi-url')).toHaveTextContent('waktu=hari-ini'));
    await waitFor(() => expect(featured().getByText('Bazar Hari Ini')).toBeInTheDocument());
    expect(featured().queryByText('Kelas Besok')).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Hari ini' })).toHaveAttribute('aria-checked', 'true');
  });

  it('memilih kembali "Aktif" mencabut parameter waktu', async () => {
    renderPage('/events?waktu=besok');
    expect(screen.getByRole('radio', { name: 'Besok' })).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(screen.getByRole('radio', { name: 'Aktif' }));

    await waitFor(() => expect(screen.getByTestId('lokasi-url')).not.toHaveTextContent('waktu='));
    // Tanpa filter aktif, hero memegang event terdekat dan rail memuat sisanya.
    await waitFor(() => expect(featured().getByText('Kelas Besok')).toBeInTheDocument());
    expect(screen.getAllByText('Bazar Hari Ini').length).toBeGreaterThan(0);
  });
});
