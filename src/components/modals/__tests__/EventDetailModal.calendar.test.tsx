import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { EventItem } from '../../../types';

const { downloadBlob } = vi.hoisted(() => ({ downloadBlob: vi.fn() }));
vi.mock('../../../lib/download', () => ({ downloadBlob }));
vi.mock('../../events/EventPhotoGallery', () => ({
  EventPhotoGallery: () => <div data-testid="event-photo-gallery" />,
}));

import { EventDetailModal } from '../EventDetailModal';

function event(partial: Partial<EventItem> = {}): EventItem {
  return {
    id: 'event-1', rowIndex: 0, tanggal: '25 November 2026', dateStr: '2026-11-25',
    day: 'Rabu', jam: '10:00 - 21:00', acara: 'Bazar Kuliner Nusantara', lokasi: 'Atrium',
    eo: 'EO Metmal', pic: '', phone: '', keterangan: '', month: 'November',
    category: 'Kuliner', categories: ['Kuliner'], priority: 'medium', eventModel: '',
    eventNominal: '', eventModelNotes: '', posterUrl: '', status: 'upcoming',
    ...partial,
  };
}

function renderModal(item: EventItem, isAdmin = false) {
  return render(
    <MemoryRouter>
      <EventDetailModal isOpen event={item} onClose={() => {}} isAdmin={isAdmin} />
    </MemoryRouter>,
  );
}

describe('EventDetailModal — aksi tambah ke kalender', () => {
  beforeEach(() => downloadBlob.mockClear());

  it('mengunduh ICS dan mengumumkan konfirmasi yang nyata', async () => {
    renderModal(event());

    fireEvent.click(await screen.findByRole('button', { name: 'Tambah ke kalender' }));

    await waitFor(() => expect(downloadBlob).toHaveBeenCalledTimes(1));
    expect(downloadBlob.mock.calls[0]?.[1]).toBe('bazar-kuliner-nusantara-2026-11-25.ics');
    expect(await screen.findByRole('button', { name: 'Berkas kalender terunduh' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Berkas .ics sudah diunduh.');
  });

  it('tidak menampilkan aksi publik pada modal admin atau event selesai', () => {
    const { rerender } = renderModal(event(), true);
    expect(screen.queryByRole('button', { name: 'Tambah ke kalender' })).toBeNull();

    rerender(
      <MemoryRouter>
        <EventDetailModal isOpen event={event({ status: 'past' })} onClose={() => {}} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('button', { name: 'Tambah ke kalender' })).toBeNull();
  });
});
