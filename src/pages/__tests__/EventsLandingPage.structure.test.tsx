/**
 * Struktur kartu agenda di `#featured`.
 *
 * Kontrak yang dijaga di sini (audit 003, temuan A-01/A-05/A-07):
 *  1. Satu kartu = satu kontrol. Kartu adalah `<div>`, jadi tombolnya tidak
 *     lagi membungkus seluruh isi kartu.
 *  2. Tidak ada heading di dalam `<button>` — `button` hanya menerima phrasing
 *     content, dan heading di dalamnya tidak terbaca sebagai heading oleh AT.
 *  3. Outline heading: `h2` section → `h3` area → `h4` kartu. Setiap grup area
 *     dibuka `h3` dan hanya berisi `h4` di bawahnya.
 *  4. Subjudul blok "Lokasi Lainnya" menyebut jumlah agenda yang benar-benar
 *     dirender sebagai kartu.
 */
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import { render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { EventArea, EventItem } from '../../types';
import { EventsLandingPage } from '../EventsLandingPage';

vi.mock('../../utils/eventsSchedulePdf', () => ({
  renderEventsSchedulePdfResult: vi.fn(async () => ({ blob: new Blob(['%PDF']), fileName: 'x.pdf' })),
}));

function ev(partial: Partial<EventItem> & Pick<EventItem, 'id' | 'acara'>): EventItem {
  return {
    rowIndex: 0, tanggal: '20 November 2026', dateStr: '2026-11-20', day: 'Jumat',
    jam: '10:00 - 21:00', lokasi: 'Atrium', eo: 'EO', pic: '', phone: '', keterangan: '',
    month: 'November', category: 'Umum', categories: ['Umum'], priority: 'medium',
    eventModel: '', eventNominal: '', eventModelNotes: '', posterUrl: '', status: 'upcoming',
    ...partial,
  };
}

const AREAS: EventArea[] = [
  { id: 'main', name: 'Atrium Utama', description: '', coverPhotoUrl: '', sortOrder: 0, isActive: true },
  { id: 'koridor', name: 'Koridor Selatan', description: '', coverPhotoUrl: '', sortOrder: 1, isActive: true },
  { id: 'parkir', name: 'Parkir Timur', description: '', coverPhotoUrl: '', sortOrder: 2, isActive: true },
];

const EVENTS: EventItem[] = [
  ev({ id: 'hero', acara: 'Event Utama', areaId: 'main' }),
  ev({ id: 'k1', acara: 'Bazar Koridor Selatan', areaId: 'koridor', posterUrl: 'https://cdn/bazar.jpg' }),
  ev({ id: 'k2', acara: 'Kelas Senam Pagi', areaId: 'koridor', dateStr: '2026-11-21' }),
  ev({ id: 'p1', acara: 'Panggung Akustik', areaId: 'parkir', dateStr: '2026-11-22' }),
];

const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6';
/** Selector turunan harus mengulang `button` per level — `button h1, h2, …`
 *  membuat sisanya menjadi selector lepas. */
const HEADINGS_INSIDE_BUTTON =
  'button h1, button h2, button h3, button h4, button h5, button h6';

function renderPage() {
  return render(
    <MemoryRouter>
      <EventsLandingPage
        isDark={false}
        onToggleDark={() => {}}
        events={EVENTS}
        holidays={[]}
        areas={AREAS}
        onDetail={() => {}}
      />
    </MemoryRouter>,
  );
}

function featured() {
  const section = document.getElementById('featured');
  if (!section) throw new Error('#featured tidak dirender');
  return within(section);
}

/** Grup area di blok "Lokasi Lainnya": `h3` area + grid kartunya. Grup pertama
 *  (`Area Utama`) dilewati karena header-nya tidak membungkus grid. */
function otherAreaGroups(): HTMLElement[] {
  const headings = featured().getAllByRole('heading', { level: 3 });
  return headings
    .slice(1)
    .map(heading => heading.parentElement)
    .filter((group): group is HTMLElement => group !== null);
}

describe('EventsLandingPage — struktur kartu agenda', () => {
  it('setiap kartu punya tepat satu tombol dan tidak ada heading di dalam tombol', () => {
    const { container } = renderPage();
    const cards = Array.from(container.querySelectorAll('#featured [data-reveal-item]'));
    expect(cards.length).toBe(EVENTS.length);

    for (const card of cards) {
      const buttons = card.querySelectorAll('button');
      expect(buttons).toHaveLength(1);
      expect(card.querySelector(HEADINGS_INSIDE_BUTTON)).toBeNull();
      // Judul kartu tetap heading yang membungkus tombol, bukan sebaliknya.
      const cardHeading = card.querySelector('h4');
      expect(cardHeading).not.toBeNull();
      expect(cardHeading?.querySelector('button')).not.toBeNull();
    }
  });

  it('judul kartu memakai nama event dan poster tetap berada di dalam kartu', () => {
    const { container } = renderPage();
    const posterCard = Array.from(container.querySelectorAll('#featured [data-reveal-item]')).find(card =>
      card.querySelector('[data-event-poster]'),
    );
    expect(posterCard).toBeDefined();

    const title = within(posterCard as HTMLElement).getByRole('heading', { level: 4 });
    const button = within(title).getByRole('button', { name: 'Bazar Koridor Selatan' });
    expect(button).toHaveAttribute('aria-haspopup', 'dialog');
    // Judul sudah menjadi nama tombol, jadi poster tidak mengulanginya.
    const image = (posterCard as HTMLElement).querySelector('[data-event-poster] img');
    expect(image).toHaveAttribute('alt', '');
  });

  it('outline heading tiap grup area: h3 area lalu h4 kartu saja', () => {
    renderPage();
    const groups = otherAreaGroups();
    expect(groups).toHaveLength(2);

    for (const group of groups) {
      const headings = Array.from(group.querySelectorAll<HTMLElement>(HEADING_SELECTOR));
      expect(headings.length).toBeGreaterThan(0);
      expect(headings[0]?.tagName).toBe('H3');
      for (const heading of headings.slice(1)) {
        expect(heading.tagName).toBe('H4');
        expect(heading.querySelector('h2, h3')).toBeNull();
        expect(heading.closest('h2, h3')).toBeNull();
      }
      // Kartu di grup ini berada setelah judul areanya.
      const firstCard = group.querySelector('h4');
      expect(firstCard).not.toBeNull();
      expect(headings[0]?.compareDocumentPosition(firstCard as HTMLElement) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }

    // Level di bawah h4 tidak dipakai sama sekali di section ini.
    expect(featured().queryByRole('heading', { level: 5 })).toBeNull();
  });

  it('jumlah kartu blok Lokasi Lainnya sama dengan angka di subjudulnya', () => {
    renderPage();
    const subtitle = featured().getByText(/^\d+ agenda di \d+ area$/);
    const agendaCount = Number(/(\d+) agenda/.exec(subtitle.textContent ?? '')?.[1]);
    const cards = otherAreaGroups().flatMap(group =>
      Array.from(group.querySelectorAll('[data-reveal-item]')),
    );

    expect(agendaCount).toBe(3);
    expect(cards).toHaveLength(agendaCount);
    // Jumlah per grup juga konsisten dengan judulnya.
    for (const group of otherAreaGroups()) {
      const label = group.querySelector('h3')?.textContent ?? '';
      const groupCount = /(\d+) agenda/.exec(label)?.[1];
      expect(Number(groupCount)).toBe(group.querySelectorAll('[data-reveal-item]').length);
    }
  });
});
