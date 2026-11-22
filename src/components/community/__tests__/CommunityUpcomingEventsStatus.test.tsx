import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { CommunityUpcomingEvents } from '../CommunityUpcomingEvents';
import { filterUpcomingForMonth } from '../upcomingFilter';
import type { EventItem, PhotoAlbum } from '../../../types';

function ev(id: string, acara: string, status: EventItem['status'], dateStr: string): EventItem {
  return {
    id, rowIndex: 1, tanggal: dateStr, dateStr,
    day: 'Sabtu', month: 'November 2026', jam: '10:00 - 12:00',
    acara, lokasi: 'Lt. 3', eo: 'EO', pic: 'PIC', phone: '0800',
    keterangan: '', status, category: 'Umum', categories: ['Umum'],
    priority: 'medium', eventModel: '', eventNominal: '', eventModelNotes: '',
  };
}

const MONTH = '2026-11';

function renderSection(events: EventItem[]) {
  return render(
    <MemoryRouter>
      <CommunityUpcomingEvents events={filterUpcomingForMonth(events, MONTH)} albums={[] as PhotoAlbum[]} />
    </MemoryRouter>,
  );
}

describe('badge status kartu agenda (bukan label tetap)', () => {
  // Regresi: kartu kecil dulu menulis literal "Mendatang" untuk setiap event,
  // sehingga event yang sedang berjalan terbaca sebagai acara mendatang saat
  // ia jatuh di posisi kedua/ketiga (urutan primer: prioritas, lalu status).
  it('event ongoing di kartu kecil tetap berlabel Berlangsung', () => {
    renderSection([
      ev('a', 'Bazaar Komunitas', 'upcoming', '2026-11-24'),
      ev('b', 'Pameran Seni', 'upcoming', '2026-11-26'),
      ev('c', 'Konser Amal', 'ongoing', '2026-11-20'),
    ]);

    const konser = screen.getByText('Konser Amal').closest('button');
    expect(konser).not.toBeNull();
    expect(konser!).toHaveTextContent('Berlangsung');
    expect(konser!).not.toHaveTextContent('Mendatang');
  });

  it('event mendatang di kartu kecil tetap berlabel Mendatang', () => {
    // Dua event upcoming: Bazaar (24 Nov) jadi kartu utama setelah sort,
    // Pameran Seni (26 Nov) jatuh ke kartu kecil — ini yang pernah regresi
    // jadi hardcode "Mendatang".
    renderSection([
      ev('a', 'Bazaar Komunitas', 'upcoming', '2026-11-24'),
      ev('b', 'Pameran Seni', 'upcoming', '2026-11-26'),
    ]);

    const pameran = screen.getByText('Pameran Seni').closest('button');
    expect(pameran).not.toBeNull();
    expect(pameran!).toHaveTextContent('Mendatang');
    expect(pameran!).not.toHaveTextContent('Berlangsung');
  });
});
