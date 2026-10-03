import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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

describe('EventInsightsPanel', () => {
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
});
