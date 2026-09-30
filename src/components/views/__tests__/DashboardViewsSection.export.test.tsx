import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { EventItem } from '../../../types';
import { DashboardViewsSection } from '../DashboardViewsSection';

const downloadMock = vi.hoisted(() => vi.fn(async () => {}));
// Hanya unduhannya yang di-stub; penyaring draft tetap memakai implementasi
// asli supaya pemilih diuji terhadap perilaku produksi.
vi.mock('../../../utils/eventsSchedulePdf', async () => {
  const actual = await vi.importActual<typeof import('../../../utils/eventsSchedulePdf')>(
    '../../../utils/eventsSchedulePdf',
  );
  return { ...actual, downloadEventsSchedulePdf: downloadMock };
});

function ev(partial: Partial<EventItem> & Pick<EventItem, 'id' | 'status' | 'acara'>): EventItem {
  return {
    rowIndex: 0, tanggal: '5 September 2026', dateStr: '2026-09-05', day: 'Sabtu',
    jam: '10:00 - 21:00', lokasi: 'Atrium', eo: 'EO', pic: '', phone: '', keterangan: '',
    month: 'September', category: 'Umum', categories: ['Umum'], priority: 'medium',
    eventModel: '', eventNominal: '', eventModelNotes: '', ...partial,
  };
}

const EVENTS = [
  ev({ id: 'e1', status: 'upcoming', acara: 'Pameran Foto Kota' }),
  ev({ id: 'e2', status: 'ongoing', acara: 'Grand Sale Metropolitan' }),
];

function renderSection(canExport: boolean) {
  render(
    <MemoryRouter>
      <DashboardViewsSection
        viewMode="table"
        isAdmin
        canExportSchedulePdf={canExport}
        visibleEvents={EVENTS}
        visibleStats={{ total: EVENTS.length }}
        holidays={[]}
        error={null}
        searchQuery=""
        setSearchQuery={() => {}}
        activeFilter="Semua"
        setActiveFilter={() => {}}
        activeCategory="Semua"
        setActiveCategory={() => {}}
        activePriority="Semua"
        setActivePriority={() => {}}
        activeMonth="Semua"
        setActiveMonth={() => {}}
        visibleCategories={['Umum']}
        visibleMonths={['September']}
        onDetail={() => {}}
      />
    </MemoryRouter>,
  );
}

describe('DashboardViewsSection — ekspor PDF', () => {
  it('menyembunyikan tombol ekspor tanpa izin', () => {
    renderSection(false);
    expect(screen.queryByRole('button', { name: /Unduh jadwal event sebagai PDF/i })).not.toBeInTheDocument();
  });

  it('membuka pemilih bagian sebelum mengunduh', async () => {
    renderSection(true);
    fireEvent.click(screen.getByRole('button', { name: /Unduh jadwal event sebagai PDF/i }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/2 event sesuai filter aktif/)).toBeInTheDocument();
    expect(downloadMock).not.toHaveBeenCalled();
  });

  it('meneruskan bagian terpilih ke generator', async () => {
    renderSection(true);
    fireEvent.click(screen.getByRole('button', { name: /Unduh jadwal event sebagai PDF/i }));
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('checkbox', { name: /Agenda per Area/ }));
    fireEvent.click(screen.getByRole('button', { name: /Unduh PDF/ }));

    await waitFor(() => expect(downloadMock).toHaveBeenCalledTimes(1));
    const [, options] = downloadMock.mock.calls[0] as unknown as [EventItem[], { sections: string[] }];
    expect(options).toEqual({ sections: ['summary', 'table', 'areas'] });
  });
});
