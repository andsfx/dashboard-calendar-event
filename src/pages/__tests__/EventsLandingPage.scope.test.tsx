/**
 * Cakupan event /events.
 *
 * Kontrak yang dijaga di sini:
 *  1. Baris filter kategori sudah dihapus total — tidak ada grup "Filter
 *     kategori" maupun tombol "Semua kategori".
 *  2. Tautan warisan `?kategori=X` diabaikan, bukan menyaring dan bukan
 *     membuat halaman gagal.
 *  3. Event berstatus `past` ("Selesai") tidak pernah tampil — tidak di
 *     `#featured`, tidak di panel agenda kalender — sementara `ongoing` dan
 *     `upcoming` tetap tampil.
 *  4. Angka "Total event" di hero hanya menghitung event yang belum selesai.
 *  5. Bila semua event sudah lewat, hero dan `#featured` jatuh ke kondisi
 *     kosong yang sudah ada, tanpa `undefined` dan tanpa kartu setengah jadi.
 */
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { EventArea, EventItem } from '../../types';
import { EventsLandingPage } from '../EventsLandingPage';

vi.mock('../../utils/eventsSchedulePdf', () => ({
  renderEventsSchedulePdfResult: vi.fn(async () => ({ blob: new Blob(['%PDF']), fileName: 'x.pdf' })),
}));

/** Tanggal di bulan berjalan supaya kalender (yang membuka bulan hari ini)
 *  benar-benar memuat fixture-nya. */
const now = new Date();
const THIS_MONTH = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
const dayInThisMonth = (day: string) => `${THIS_MONTH}-${day}`;

function ev(partial: Partial<EventItem> & Pick<EventItem, 'id' | 'status' | 'acara'>): EventItem {
  return {
    rowIndex: 0, tanggal: '5 November 2026', dateStr: dayInThisMonth('05'), day: 'Kamis',
    jam: '10:00 - 21:00', lokasi: 'Atrium', eo: 'EO', pic: '', phone: '', keterangan: '',
    month: 'November', category: 'Umum', categories: ['Umum'], priority: 'medium',
    eventModel: '', eventNominal: '', eventModelNotes: '', posterUrl: '',
    ...partial,
  };
}

const AREAS: EventArea[] = [
  { id: 'main', name: 'Area Utama', description: '', coverPhotoUrl: '', sortOrder: 1, isActive: true },
];

function renderPage(events: EventItem[], entry = '/events') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <EventsLandingPage
        isDark={false}
        onToggleDark={() => {}}
        events={events}
        holidays={[]}
        areas={AREAS}
        onDetail={() => {}}
      />
    </MemoryRouter>,
  );
}

function section(id: string) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} tidak dirender`);
  return within(el);
}

describe('EventsLandingPage — filter kategori dihapus', () => {
  it('tidak lagi merender grup filter kategori maupun chip "Semua kategori"', () => {
    renderPage([
      ev({ id: 'u1', status: 'upcoming', acara: 'Bazar Kuliner', areaId: 'main' }),
    ]);

    expect(screen.queryByRole('group', { name: 'Filter kategori' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Semua kategori' })).toBeNull();
    // Strip tetap satu baris: grup filter waktu masih ada.
    expect(screen.getByRole('group', { name: 'Filter waktu' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Cari event' })).toBeInTheDocument();
  });

  it('mengabaikan tautan warisan ?kategori= sehingga semua event tetap tampil', () => {
    renderPage(
      [
        ev({ id: 'u1', status: 'upcoming', acara: 'Pameran Foto Kota', areaId: 'main' }),
        ev({ id: 'u2', status: 'upcoming', acara: 'Bazar Kuliner', areaId: 'main', dateStr: dayInThisMonth('06') }),
      ],
      '/events?kategori=Pameran',
    );

    const featured = section('featured');
    expect(featured.getByText('Pameran Foto Kota')).toBeInTheDocument();
    expect(featured.getByText('Bazar Kuliner')).toBeInTheDocument();
    // Param warisan tidak dihitung sebagai filter aktif.
    expect(featured.queryByText(/acara ditemukan/)).toBeNull();
  });
});

describe('EventsLandingPage — hanya event yang belum selesai', () => {
  const EVENTS = [
    ev({ id: 'o1', status: 'ongoing', acara: 'Festival Berlangsung', areaId: 'main' }),
    ev({ id: 'u1', status: 'upcoming', acara: 'Bazar Mendatang', areaId: 'main', dateStr: dayInThisMonth('12') }),
    ev({ id: 'p1', status: 'past', acara: 'Pameran Selesai', areaId: 'main', dateStr: dayInThisMonth('01') }),
  ];

  it('membuang event past dari kartu, agenda kalender, maupun halaman', () => {
    renderPage(EVENTS);

    // Tidak dirender di mana pun di halaman.
    expect(screen.queryByText('Pameran Selesai')).toBeNull();

    const featured = section('featured');
    expect(featured.getByText('Festival Berlangsung')).toBeInTheDocument();
    expect(featured.getByText('Bazar Mendatang')).toBeInTheDocument();
    expect(featured.queryByText('Pameran Selesai')).toBeNull();

    const calendar = section('calendar');
    expect(calendar.getByText('Festival Berlangsung')).toBeInTheDocument();
    expect(calendar.getByText('Bazar Mendatang')).toBeInTheDocument();
    expect(calendar.queryByText('Pameran Selesai')).toBeNull();
    // Legend titik kalender tidak lagi punya entri "Selesai".
    expect(calendar.queryByText('Selesai')).toBeNull();
  });

  it('tidak menghitung event past di angka "Total event"', () => {
    renderPage(EVENTS);

    const totalTerm = screen.getByText('Total event');
    const totalValue = totalTerm.parentElement?.querySelector('dd');
    expect(totalValue).toHaveTextContent('2');
  });

  it('menampilkan kondisi kosong hero dan #featured saat semua event sudah lewat', () => {
    renderPage([
      ev({ id: 'p1', status: 'past', acara: 'Pameran Selesai', areaId: 'main' }),
      ev({ id: 'p2', status: 'past', acara: 'Bazar Selesai', areaId: 'main', dateStr: dayInThisMonth('02') }),
    ]);

    expect(screen.getByText('Belum ada event')).toBeInTheDocument();
    expect(section('featured').getByText('Lihat kalender untuk jadwal lengkap.')).toBeInTheDocument();
    expect(screen.queryByText('Pameran Selesai')).toBeNull();
    expect(screen.queryByText('Bazar Selesai')).toBeNull();

    const totalValue = screen.getByText('Total event').parentElement?.querySelector('dd');
    expect(totalValue).toHaveTextContent('0');
  });
});

describe('EventsLandingPage — urutan grup kalender', () => {
  it('menampilkan grup Berlangsung sebelum Mendatang', () => {
    renderPage([
      ev({ id: 'o1', status: 'ongoing', acara: 'Festival Berlangsung', areaId: 'main' }),
      ev({ id: 'u1', status: 'upcoming', acara: 'Bazar Mendatang', areaId: 'main', dateStr: dayInThisMonth('20') }),
    ]);

    const calendar = section('calendar');
    const ongoingHeading = calendar.getByText(/^Berlangsung \(\d+\)$/);
    const upcomingHeading = calendar.getByText(/^Mendatang \(\d+\)$/);

    // Urutan grup mengikuti `STATUS_GROUPS`: Berlangsung dulu, lalu Mendatang.
    expect(
      ongoingHeading.compareDocumentPosition(upcomingHeading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});

describe('EventsLandingPage — chrome blok Lokasi Lainnya', () => {
  it('menampilkan badge mingguan non-kontrol dan glif kategori dekoratif di kartu list', () => {
    const { container } = renderPage([
      // Area utama: satu-satunya area terpetakan → jadi blok "Area Utama".
      ev({ id: 'u1', status: 'upcoming', acara: 'Bazar Kuliner', areaId: 'main' }),
      // Tanpa area → masuk bucket "Lokasi Lainnya di Metmal".
      ev({
        id: 'u2', status: 'upcoming', acara: 'Konser Akustik', areaId: null,
        dateStr: dayInThisMonth('09'), categories: ['Konser'], category: 'Konser',
      }),
    ]);

    const badge = screen.getByText('Diperbarui setiap minggu');
    expect(badge.parentElement).toContainElement(screen.getByText('Lokasi Lainnya di Metmal'));
    // Pill status, bukan kontrol: tidak ada peran tombol/link dan tidak fokusable.
    expect(badge.tagName).toBe('SPAN');
    expect(badge.closest('button, a')).toBeNull();
    expect(badge).not.toHaveAttribute('tabindex');

    // Glif kategori: satu per kartu, murni dekoratif.
    const glyphs = container.querySelectorAll('[data-category-glyph] svg');
    expect(glyphs.length).toBeGreaterThanOrEqual(2);
    glyphs.forEach(glyph => expect(glyph).toHaveAttribute('aria-hidden', 'true'));
  });
});
