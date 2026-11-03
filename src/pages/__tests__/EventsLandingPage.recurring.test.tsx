/**
 * Rangkaian reguler di /events dirangkum jadi satu kartu.
 *
 * Kontrak: seri reguler (berbagi recurrenceGroupId) tidak membanjiri rail
 * dengan satu kartu per kemunculan — hanya satu kartu berlabel "Setiap hari
 * <Hari>" yang tampil, sementara kalender bulanan tetap menampilkan tiap
 * tanggal kemunculan.
 */
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import { render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { EventItem } from '../../types';
import { EventsLandingPage } from '../EventsLandingPage';

vi.mock('../../utils/eventsSchedulePdf', () => ({
  renderEventsSchedulePdfResult: vi.fn(async () => ({ blob: new Blob(['%PDF']), fileName: 'x.pdf' })),
}));

function ev(partial: Partial<EventItem> & Pick<EventItem, 'id' | 'acara'>): EventItem {
  return {
    rowIndex: 0, tanggal: '3 November 2026', dateStr: '2026-11-03', day: 'Selasa',
    jam: '10.00 - 12.00', lokasi: 'Atrium', eo: 'EO', pic: '', phone: '', keterangan: '',
    month: 'November', category: 'Umum', categories: ['Umum'], priority: 'medium',
    eventModel: '', eventNominal: '', eventModelNotes: '', posterUrl: '', status: 'upcoming',
    ...partial,
  };
}

describe('EventsLandingPage — rangkaian reguler dirangkum', () => {
  it('menampilkan satu kartu "Setiap hari <Hari>" untuk satu seri reguler', () => {
    const events = [
      ev({ id: 'hero', acara: 'Event Utama', posterUrl: 'https://cdn/hero.jpg' }),
      ev({ id: 'a1', acara: 'Angklung Perempuan Indonesia', isRecurring: true, recurrenceGroupId: 'rg-angklung' }),
      ev({ id: 'a2', acara: 'Angklung Perempuan Indonesia', isRecurring: true, recurrenceGroupId: 'rg-angklung', dateStr: '2026-11-10' }),
      ev({ id: 'a3', acara: 'Angklung Perempuan Indonesia', isRecurring: true, recurrenceGroupId: 'rg-angklung', dateStr: '2026-11-17' }),
    ];
    render(
      <MemoryRouter>
        <EventsLandingPage isDark={false} onToggleDark={() => {}} events={events} holidays={[]} onDetail={() => {}} />
      </MemoryRouter>,
    );

    const featured = document.getElementById('featured');
    expect(featured).not.toBeNull();
    const scope = within(featured!);

    // Satu seri → tepat satu kartu, bukan tiga kartu per kemunculan.
    expect(scope.getAllByText('Angklung Perempuan Indonesia')).toHaveLength(1);
    // Label jadwal menggantikan tanggal/countdown per kemunculan.
    expect(scope.getByText('Setiap hari Selasa')).toBeInTheDocument();
  });
});