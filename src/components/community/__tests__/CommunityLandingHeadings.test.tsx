import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import type { EventItem, PhotoAlbum } from '../../../types';

// Jaringan dimatikan: halaman ini menarik Instagram + berita saat mount.
vi.mock('../../../lib/rest', () => ({
  apiGet: vi.fn(() => Promise.resolve({ posts: [] })),
  apiUrl: (p: string) => p,
}));
vi.mock('../../../utils/domainApi', () => ({
  fetchNewsArticles: vi.fn(() => Promise.resolve([])),
  fetchPublicCommunityDirectory: vi.fn(() => Promise.resolve([])),
}));

import { CommunityLandingPage } from '../../../pages/CommunityLandingPage';

/**
 * M3 — urutan heading `/` pernah melompat `h1 → h3 → h4 → h2` (axe:
 * `heading-order`). Urutan heading adalah peta navigasi screen reader, jadi
 * level harus turun monoton tanpa melompati level.
 *
 * Invarian yang dikunci: tepat satu `h1`, dan tidak ada heading yang
 * levelnya naik lebih dari +1 dari heading sebelumnya.
 */

function ev(id: string, status: EventItem['status'], acara: string, pic = 'Andy'): EventItem {
  return {
    id,
    rowIndex: 1,
    tanggal: '2026-09-19',
    dateStr: '2026-09-19',
    day: 'Sabtu',
    jam: '10:00 - 12:00',
    acara,
    lokasi: 'Lantai 3',
    eo: 'EO',
    pic,
    phone: '0800',
    keterangan: 'Keterangan acara.',
    month: 'September 2026',
    category: 'Musik',
    categories: ['Musik'],
    priority: 'medium',
    eventModel: '',
    eventNominal: '',
    eventModelNotes: '',
    status,
  };
}

const ALBUMS: PhotoAlbum[] = [1, 2, 3].map(n => ({
  id: `al${n}`,
  slug: `album-${n}`,
  name: `Album ${n}`,
  eventId: 'e1',
  coverPhotoUrl: `https://example.com/${n}.jpg`,
  photoCount: n,
  eventDate: '2026-01-01',
} as unknown as PhotoAlbum));

/** Semua state yang bisa memunculkan heading: ada event + album. */
const EVENTS = [
  ev('e1', 'ongoing', 'Event Sedang Berlangsung'),
  ev('e2', 'upcoming', 'Event Mendatang Dua'),
  ev('e3', 'upcoming', 'Event Mendatang Tiga'),
  ev('e4', 'past', 'Event Lampau'),
];

function renderLanding(events: EventItem[], albums: PhotoAlbum[] = []) {
  return render(
    <MemoryRouter>
      <CommunityLandingPage
        isDark={false}
        onToggleDark={() => {}}
        onBack={() => {}}
        events={events}
        albums={albums}
        stats={{ completed: 1, total: 4, organizers: 1 }}
      />
    </MemoryRouter>,
  );
}

function headingLevels(container: HTMLElement): number[] {
  return Array.from(container.querySelectorAll('h1,h2,h3,h4,h5,h6')).map(h => Number(h.tagName[1]));
}

function firstJump(levels: number[]): { index: number; from: number; to: number } | null {
  for (let i = 1; i < levels.length; i++) {
    const from = levels[i - 1]!;
    const to = levels[i]!;
    if (to > from + 1) return { index: i, from, to };
  }
  return null;
}

describe('urutan heading beranda komunitas (M3)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('tidak melompati level heading (h1 -> h3 -> h4 dulu melompat)', () => {
    const { container } = renderLanding(EVENTS, ALBUMS);
    const levels = headingLevels(container);

    expect(levels.length).toBeGreaterThan(5);
    expect(firstJump(levels)).toBeNull();
  });

  it('punya tepat satu h1', () => {
    const { container } = renderLanding(EVENTS, ALBUMS);
    const h1s = container.querySelectorAll('h1');
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent('Panggung Gratis untuk Komunitas Bekasi');
  });

  it('heading pertama setelah h1 adalah h2 (dulu h3 dari kartu event)', () => {
    const { container } = renderLanding(EVENTS, ALBUMS);
    const levels = headingLevels(container);
    expect(levels[0]).toBe(1);
    expect(levels[1]).toBe(2);
  });

  it('tidak memakai h4/h5/h6 sama sekali di beranda', () => {
    const { container } = renderLanding(EVENTS, ALBUMS);
    const levels = headingLevels(container);
    expect(levels.filter(l => l >= 4)).toEqual([]);
  });

  it('tetap tidak melompat saat tidak ada album', () => {
    const { container } = renderLanding(EVENTS, []);
    expect(firstJump(headingLevels(container))).toBeNull();
  });

  it('tetap tidak melompat saat tidak ada event (empty state)', () => {
    const { container } = renderLanding([], []);
    expect(firstJump(headingLevels(container))).toBeNull();
  });
});
