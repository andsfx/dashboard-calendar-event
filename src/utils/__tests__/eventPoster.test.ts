import { describe, expect, it } from 'vitest';
import type { EventItem, PhotoAlbum } from '../../types';
import { resolveEventPoster } from '../eventPoster';

function ev(partial: Partial<EventItem>): EventItem {
  return {
    id: 'e1', rowIndex: 0, dateStr: '2026-09-05', dateEnd: '', day: 'Sabtu',
    tanggal: '5 September 2026', month: 'September', jam: '', acara: 'Acara',
    lokasi: '', areaId: null, eo: '', pic: '', phone: '', keterangan: '',
    status: 'upcoming', category: 'Umum', categories: ['Umum'], priority: 'medium',
    eventModel: '', eventNominal: '', eventModelNotes: '', isMultiDay: false,
    dayTimeSlots: [], eventType: 'single', recurrenceGroupId: '', isRecurring: false,
    posterUrl: '', organizationId: '',
    ...partial,
  };
}

function album(eventId: string, coverPhotoUrl: string): PhotoAlbum {
  return {
    id: `a-${eventId}`, name: 'Album', slug: 'album', description: '',
    eventDate: '', coverPhotoUrl, sortOrder: 0, eventId, lokasi: '', themeId: '',
  };
}

describe('resolveEventPoster', () => {
  it('mengutamakan poster unggahan di atas cover album', () => {
    const event = ev({ id: 'e1', posterUrl: 'https://cdn/poster.jpg' });
    expect(resolveEventPoster(event, [album('e1', 'https://cdn/album.jpg')]))
      .toBe('https://cdn/poster.jpg');
  });

  it('jatuh ke cover album event yang sama bila poster kosong', () => {
    const event = ev({ id: 'e1' });
    expect(resolveEventPoster(event, [album('e1', 'https://cdn/album.jpg')]))
      .toBe('https://cdn/album.jpg');
  });

  it('mengabaikan cover album milik event lain', () => {
    const event = ev({ id: 'e1' });
    expect(resolveEventPoster(event, [album('e2', 'https://cdn/lain.jpg')])).toBe('');
  });

  it('mengembalikan string kosong bila tidak ada poster maupun album', () => {
    expect(resolveEventPoster(ev({ id: 'e1' }), [])).toBe('');
  });

  it('aman untuk event null', () => {
    expect(resolveEventPoster(null, [album('e1', 'https://cdn/album.jpg')])).toBe('');
  });
});
