import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EventInsightsPanel } from '../EventInsightsPanel';
import type {
  CommunityRegistration,
  DraftEventItem,
  EventArea,
  EventItem,
} from '../../../types';

function event(overrides: Partial<EventItem>): EventItem {
  return {
    id: 'e1',
    rowIndex: 0,
    tanggal: '',
    status: 'upcoming',
    dateStr: '2026-06-10',
    day: 'Rabu',
    jam: '',
    acara: 'Acara',
    lokasi: '',
    eo: '',
    pic: 'PIC',
    phone: '',
    keterangan: '',
    month: 'Juni',
    category: 'Umum',
    categories: [],
    priority: 'medium',
    eventModel: '',
    eventNominal: '',
    eventModelNotes: '',
    ...overrides,
  } as EventItem;
}

function draft(overrides: Partial<DraftEventItem>): DraftEventItem {
  return {
    id: 'd1',
    rowIndex: 0,
    tanggal: '',
    internalNote: '',
    progress: 'draft',
    published: false,
    deleted: false,
    dateStr: '2026-06-20',
    day: 'Sabtu',
    jam: '',
    acara: 'Draft',
    lokasi: '',
    eo: '',
    pic: '',
    phone: '',
    keterangan: '',
    month: 'Juni',
    category: 'Umum',
    categories: [],
    priority: 'medium',
    eventModel: '',
    eventNominal: '',
    eventModelNotes: '',
    ...overrides,
  } as DraftEventItem;
}

function registration(overrides: Partial<CommunityRegistration>): CommunityRegistration {
  return {
    id: 'r1',
    communityName: 'Komunitas',
    communityType: '',
    pic: '',
    phone: '',
    email: '',
    instagram: '',
    description: '',
    preferredDate: '',
    status: 'pending',
    adminNote: '',
    createdAt: '',
    organizationType: 'community',
    organizationName: '',
    typeSpecificData: {},
    proposalFileUrl: '',
    proposalFileName: '',
    proposalFileSize: 0,
    ...overrides,
  } as CommunityRegistration;
}

function area(overrides: Partial<EventArea>): EventArea {
  return {
    id: 'a1',
    name: 'Atrium',
    description: '',
    coverPhotoUrl: '',
    sortOrder: 0,
    isActive: true,
    ...overrides,
  };
}

const emptyProps = { events: [], activeDrafts: [], communityRegistrations: [], areas: [] };

/** Tanggal lokal N hari dari sekarang (bukan UTC — hindari geser hari). */
function inDays(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

describe('EventInsightsPanel', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  it('menampilkan judul panel dan label analisis otomatis', () => {
    render(<EventInsightsPanel {...emptyProps} />);
    expect(screen.getByRole('heading', { name: /Insight Cerdas/ })).toBeInTheDocument();
    expect(screen.getByText(/Analisis otomatis dari data event/)).toBeInTheDocument();
  });

  it('menampilkan pesan kosong saat tidak ada insight', () => {
    render(<EventInsightsPanel {...emptyProps} />);
    expect(screen.getByText(/Belum ada insight/)).toBeInTheDocument();
  });

  it('merender insight antrian dengan label severity teks, bukan hanya warna', () => {
    render(
      <EventInsightsPanel
        events={[]}
        activeDrafts={[draft({ id: 'd1' }), draft({ id: 'd2' })]}
        communityRegistrations={[registration({ id: 'r1', status: 'pending' })]}
        areas={[]}
      />,
    );
    expect(screen.getByText('Antrian menunggu tindakan')).toBeInTheDocument();
    expect(screen.getByText('Perlu perhatian')).toBeInTheDocument();
    expect(screen.getByText(/2 draft menunggu dipublikasikan/)).toBeInTheDocument();
  });

  it('merender insight konflik area beserta metriknya', () => {
    render(
      <EventInsightsPanel
        events={[
          event({ id: 'e1', areaId: 'a1', dateStr: '2099-06-10', dateEnd: '2099-06-12', acara: 'Pameran A' }),
          event({ id: 'e2', areaId: 'a1', dateStr: '2099-06-11', acara: 'Pameran B' }),
        ]}
        activeDrafts={[]}
        communityRegistrations={[]}
        areas={[area({ id: 'a1', name: 'Atrium' })]}
      />,
    );
    expect(screen.getByText('Potensi bentrok jadwal area')).toBeInTheDocument();
    expect(screen.getByText(/Pameran A ↔ Pameran B/)).toBeInTheDocument();
  });

  it('merender tombol aksi dan meneruskan objek aksi ke onAction', () => {
    const onAction = vi.fn();
    render(
      <EventInsightsPanel
        events={[]}
        activeDrafts={[draft({ id: 'd1' })]}
        communityRegistrations={[]}
        areas={[]}
        allowedPaths={['/drafts', '/registrations']}
        onAction={onAction}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Antrian Draft' }));
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ path: '/drafts' }));
  });

  it('menyembunyikan aksi yang jalurnya tidak diizinkan role', () => {
    render(
      <EventInsightsPanel
        events={[]}
        activeDrafts={[draft({ id: 'd1' })]}
        communityRegistrations={[registration({ id: 'r1', status: 'pending' })]}
        areas={[]}
        allowedPaths={['/drafts']}
        onAction={() => undefined}
      />,
    );
    expect(screen.getByRole('button', { name: 'Antrian Draft' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pendaftaran' })).not.toBeInTheDocument();
  });

  it('menyaring insight menurut tingkat kepentingan', () => {
    render(
      <EventInsightsPanel
        events={[event({ id: 'e1', dateStr: inDays(3), acara: 'Acara Dekat' })]}
        activeDrafts={[draft({ id: 'd1' })]}
        communityRegistrations={[]}
        areas={[]}
      />,
    );
    // Ada insight peringatan (antrian) dan info (event dekat).
    expect(screen.getByText('Antrian menunggu tindakan')).toBeInTheDocument();
    expect(screen.getByText('Event dalam 7 hari ke depan')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Perlu perhatian/ }));
    expect(screen.getByText('Antrian menunggu tindakan')).toBeInTheDocument();
    expect(screen.queryByText('Event dalam 7 hari ke depan')).not.toBeInTheDocument();
  });

  it('menyembunyikan insight lalu memulihkannya, tersimpan di localStorage', () => {
    render(
      <EventInsightsPanel
        events={[]}
        activeDrafts={[draft({ id: 'd1' })]}
        communityRegistrations={[]}
        areas={[]}
      />,
    );
    expect(screen.getByText('Antrian menunggu tindakan')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Sembunyikan/ }));
    expect(screen.queryByText('Antrian menunggu tindakan')).not.toBeInTheDocument();
    expect(localStorage.getItem('metmal.insight.dismissed')).toContain('antrian');

    fireEvent.click(screen.getByRole('button', { name: /Tampilkan 1 yang disembunyikan/ }));
    expect(screen.getByText('Antrian menunggu tindakan')).toBeInTheDocument();
  });

  it('menyalin ringkasan insight ke clipboard', () => {
    const writeText = vi.fn();
    Object.assign(navigator, { clipboard: { writeText } });
    render(
      <EventInsightsPanel
        events={[]}
        activeDrafts={[draft({ id: 'd1' })]}
        communityRegistrations={[]}
        areas={[]}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Salin ringkasan/ }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Antrian menunggu tindakan'));
  });
});
