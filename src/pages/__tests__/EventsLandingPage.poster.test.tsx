/**
 * Banner poster di kartu /events.
 *
 * Kontrak: poster unggahan tampil sebagai banner 16:10 di kartu rail; hero
 * memilih kandidat ber-poster lebih dulu; cover album dipakai sebagai
 * fallback bila poster belum diunggah.
 */
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { EventItem, PhotoAlbum } from '../../types';
import { EventsLandingPage } from '../EventsLandingPage';

vi.mock('../../utils/eventsSchedulePdf', () => ({
  renderEventsSchedulePdfResult: vi.fn(async () => ({ blob: new Blob(['%PDF']), fileName: 'x.pdf' })),
}));

function ev(partial: Partial<EventItem> & Pick<EventItem, 'id' | 'status' | 'acara'>): EventItem {
  return {
    rowIndex: 0, tanggal: '5 September 2026', dateStr: '2026-09-05', day: 'Sabtu',
    jam: '10:00 - 21:00', lokasi: 'Atrium', eo: 'EO', pic: '', phone: '', keterangan: '',
    month: 'September', category: 'Umum', categories: ['Umum'], priority: 'medium',
    eventModel: '', eventNominal: '', eventModelNotes: '', posterUrl: '',
    ...partial,
  };
}

function album(eventId: string, coverPhotoUrl: string): PhotoAlbum {
  return {
    id: `a-${eventId}`, name: 'Album', slug: 'album', description: '',
    eventDate: '', coverPhotoUrl, sortOrder: 0, eventId, lokasi: '', themeId: '',
  };
}

function renderPage(events: EventItem[], albums: PhotoAlbum[] = []) {
  return render(
    <MemoryRouter>
      <EventsLandingPage
        isDark={false}
        onToggleDark={() => {}}
        events={events}
        holidays={[]}
        albums={albums}
        onDetail={() => {}}
      />
    </MemoryRouter>,
  );
}

describe('EventsLandingPage — banner poster', () => {
  it('menampilkan banner poster pada kartu event di rail', async () => {
    const events = [
      ev({ id: 'hero', status: 'ongoing', acara: 'Event Berjalan', posterUrl: 'https://cdn/hero.jpg' }),
      ev({ id: 'rail', status: 'upcoming', acara: 'Event Rail', posterUrl: 'https://cdn/rail.jpg' }),
    ];
    const { container } = renderPage(events);

    await waitFor(() => expect(screen.getAllByText('Event Rail').length).toBeGreaterThan(0));
    const banners = container.querySelectorAll('[data-event-poster] img');
    const srcs = Array.from(banners).map(img => img.getAttribute('src'));
    expect(srcs).toContain('https://cdn/rail.jpg');
  });

  it('hero memilih event ber-poster meski ada ongoing tanpa poster', async () => {
    const events = [
      ev({ id: 'ongoing', status: 'ongoing', acara: 'Ongoing Tanpa Poster' }),
      ev({ id: 'upcoming', status: 'upcoming', acara: 'Upcoming Berposter', posterUrl: 'https://cdn/pick.jpg' }),
    ];
    renderPage(events);

    const hero = await screen.findByRole('heading', { name: 'Upcoming Berposter' });
    expect(hero).toBeInTheDocument();
  });

  it('memakai cover album sebagai fallback bila poster kosong', async () => {
    const events = [
      ev({ id: 'hero', status: 'ongoing', acara: 'Event Berjalan' }),
      ev({ id: 'rail', status: 'upcoming', acara: 'Event Rail' }),
    ];
    const { container } = renderPage(events, [album('rail', 'https://cdn/album-rail.jpg')]);

    await waitFor(() => expect(screen.getAllByText('Event Rail').length).toBeGreaterThan(0));
    const srcs = Array.from(container.querySelectorAll('[data-event-poster] img'))
      .map(img => img.getAttribute('src'));
    expect(srcs).toContain('https://cdn/album-rail.jpg');
  });

  it('tidak merender banner saat event tidak punya poster maupun album', async () => {
    const events = [ev({ id: 'a', status: 'upcoming', acara: 'Tanpa Gambar' })];
    const { container } = renderPage(events);

    await waitFor(() => expect(screen.getAllByText('Tanpa Gambar').length).toBeGreaterThan(0));
    expect(container.querySelector('[data-event-poster]')).toBeNull();
  });
});
