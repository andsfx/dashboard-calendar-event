import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { CommunityUpcomingEvents } from '../CommunityUpcomingEvents';
import type { EventItem, PhotoAlbum } from '../../../types';

function ev(id: string, jam: string): EventItem {
  return {
    id, rowIndex: 1, tanggal: '2026-12-22', dateStr: '2026-12-22',
    day: 'Selasa', month: 'Desember 2026',
    jam, acara: `Event ${id}`, lokasi: 'Parkir Timur', eo: 'EO', pic: 'PIC',
    phone: '0800', keterangan: '', status: 'upcoming', category: 'Umum',
    categories: ['Umum'], priority: 'medium', eventModel: '',
    eventNominal: '', eventModelNotes: '',
  };
}

function renderTime(jam: string) {
  return render(
    <MemoryRouter>
      <CommunityUpcomingEvents events={[ev('e1', jam)]} albums={[] as PhotoAlbum[]} />
    </MemoryRouter>,
  );
}

describe('formatEventTime (via CommunityUpcomingEvents)', () => {
  it('merapikan rentang kanonik ke titik dan menambah WIB', () => {
    const { container } = renderTime('06:00 - 10:00');
    expect(container.textContent).toContain('06.00 - 10.00 WIB');
    expect(container.textContent).not.toContain('06:00');
  });

  it('merapikan jam tunggal kanonik', () => {
    const { container } = renderTime('13:00');
    expect(container.textContent).toContain('13.00 WIB');
  });

  it('membiarkan prosa tanpa sufiks WIB', () => {
    const { container } = renderTime('Sepanjang hari');
    expect(container.textContent).toContain('Sepanjang hari');
    expect(container.textContent).not.toContain('Sepanjang hari WIB');
  });

  it('membiarkan prosa yang sudah menyebut WIB', () => {
    const { container } = renderTime('11.00 WIB - selesai');
    expect(container.textContent).toContain('11.00 WIB - selesai');
  });
});
