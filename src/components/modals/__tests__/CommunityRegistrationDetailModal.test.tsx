/**
 * Test render seksi "Tautkan ke event" pada CommunityRegistrationDetailModal.
 *
 * Seksi hanya dirender saat `registration.status === 'approved'`. Saat modal
 * terbuka dan status approved dan `readOnly=false`, komponen memanggil
 * `fetchAdminEvents()` (POST /api/v1/admin/listEvents lewat adminAction →
 * apiPost, body `{ action: 'listEvents' }`) untuk mengisi dropdown event baru
 * dan daftar event tertaut (events.organization_id === registration.id).
 *
 * Mock fetch global per-URL mengikuti pola src/utils/api/__tests__/
 * registrationLinkApi.test.ts (vi.stubGlobal('fetch', fn)) — tanpa backend.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CommunityRegistrationDetailModal } from '../CommunityRegistrationDetailModal';
import type { CommunityRegistration, RegistrationStatus } from '../../../types';

/** Row DbEvent minimal — field yang dibaca dbEventToEventItem. */
interface DbEventRow {
  id: string;
  date_str: string;
  date_end: string | null;
  day: string;
  tanggal: string;
  jam: string;
  acara: string;
  lokasi: string;
  eo: string;
  pic: string;
  phone: string;
  keterangan: string;
  month: string;
  status: string;
  category: string;
  categories: string[];
  priority: string;
  event_model: string;
  event_nominal: string;
  event_model_notes: string;
  source_draft_id: string;
  is_multi_day: boolean;
  day_time_slots: unknown;
  event_type: string;
  recurrence_group_id: string;
  is_recurring: boolean;
  poster_url: string | null;
  organization_id: string | null;
  area_id: string | null;
}

function dbEvent(overrides: Partial<DbEventRow> = {}): DbEventRow {
  return {
    id: 'evt_default',
    date_str: '2026-12-20',
    date_end: null,
    day: 'Minggu',
    tanggal: '20 Des 2026',
    jam: '10:00 - 12:00',
    acara: 'Acara Default',
    lokasi: 'Atrium Utama',
    eo: 'EO Demo',
    pic: '',
    phone: '',
    keterangan: '',
    month: 'Desember',
    status: 'published',
    category: 'Community',
    categories: ['Community'],
    priority: 'medium',
    event_model: '',
    event_nominal: '',
    event_model_notes: '',
    source_draft_id: '',
    is_multi_day: false,
    day_time_slots: null,
    event_type: 'single',
    recurrence_group_id: '',
    is_recurring: false,
    poster_url: null,
    organization_id: null,
    area_id: null,
    ...overrides,
  };
}

/** Mock fetch global: POST /admin/listEvents → { success:true, data } . */
function mockListEvents(events: DbEventRow[]): Mock {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : String(input);
    if (!url.endsWith('/admin/listEvents')) {
      return { ok: false, status: 404, json: () => Promise.resolve({}) } as Response;
    }
    const body = { success: true, data: events };
    return {
      ok: true,
      status: 200,
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(JSON.stringify(body)),
    } as unknown as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** Mock fetch global yang juga melayani POST /admin/linkRegistrationToEvent. */
function mockListEventsWithLink(events: DbEventRow[], linkResponse: unknown = { success: true }): Mock {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : String(input);
    if (url.endsWith('/admin/listEvents')) {
      const body = { success: true, data: events };
      return {
        ok: true,
        status: 200,
        json: () => Promise.resolve(body),
        text: () => Promise.resolve(JSON.stringify(body)),
      } as unknown as Response;
    }
    if (url.endsWith('/admin/linkRegistrationToEvent')) {
      return {
        ok: true,
        status: 200,
        json: () => Promise.resolve(linkResponse),
        text: () => Promise.resolve(JSON.stringify(linkResponse)),
      } as unknown as Response;
    }
    return { ok: false, status: 404, json: () => Promise.resolve({}), text: () => Promise.resolve('{}') } as unknown as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** Body JSON dari setiap panggilan ke aksi linkRegistrationToEvent. */
function sentLinkBodies(fetchMock: Mock): Array<Record<string, unknown>> {
  return fetchMock.mock.calls
    .map(([, init]) => JSON.parse(String((init as RequestInit)?.body ?? '{}')))
    .filter((body) => body.action === 'linkRegistrationToEvent');
}

function makeRegistration(status: RegistrationStatus): CommunityRegistration {
  return {
    id: 'crg_1',
    communityName: 'Komunitas Demo',
    communityType: 'Musik',
    pic: 'Budi',
    phone: '081234567890',
    email: '',
    instagram: '',
    description: '',
    preferredDate: '',
    status,
    adminNote: '',
    createdAt: '2026-11-01T00:00:00Z',
    organizationType: 'community',
    organizationName: 'Komunitas Demo',
    typeSpecificData: {},
    proposalFileUrl: '',
    proposalFileName: '',
    proposalFileSize: 0,
  };
}

function renderModal(registration: CommunityRegistration, readOnly = false) {
  render(
    <CommunityRegistrationDetailModal
      isOpen
      onClose={vi.fn()}
      registration={registration}
      onUpdateStatus={vi.fn()}
      readOnly={readOnly}
    />,
  );
}

/** Campuran: satu tertaut ke registrasi, satu milik org lain, satu draft. */
const MIXED_EVENTS = [
  dbEvent({ id: 'evt_linked', acara: 'Acara Komunitas Demo', organization_id: 'crg_1' }),
  dbEvent({ id: 'evt_other', acara: 'Acara Organisasi Lain', organization_id: 'other_org' }),
  dbEvent({ id: 'evt_draft', acara: 'Draft Tersembunyi', status: 'draft', organization_id: '' }),
];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CommunityRegistrationDetailModal — seksi "Tautkan ke event"', () => {
  it('status approved + readOnly=false: render seksi, event tertaut, tombol Tautkan & Lepas tautan', async () => {
    mockListEvents(MIXED_EVENTS);
    renderModal(makeRegistration('approved'));

    // Menunggu fetch listEvents selesai (findByText/waitFor).
    expect(await screen.findByText(/Tautkan ke event/)).toBeInTheDocument();
    expect(screen.getByText('Tertaut ke')).toBeInTheDocument();
    expect(screen.getByText('Acara Komunitas Demo', { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tautkan/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lepas tautan/ })).toBeInTheDocument();
  });

  it('status approved + readOnly=true: judul seksi tetap render tanpa kontrol taut/lepas', async () => {
    mockListEvents(MIXED_EVENTS);
    renderModal(makeRegistration('approved'), true);

    expect(await screen.findByText(/Tautkan ke event/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Lepas tautan/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Tautkan/ })).not.toBeInTheDocument();
    expect(screen.queryByText('Pilih event')).not.toBeInTheDocument();
  });

  it('status pending: seksi "Tautkan ke event" tidak dirender sama sekali', async () => {
    mockListEvents([]);
    renderModal(makeRegistration('pending'));

    await screen.findByText('Detail Pendaftaran');
    expect(screen.queryByText(/Tautkan ke event/)).toBeNull();
  });

  it('tombol "Lepas tautan" memanggil unlinkRegistrationFromEvent dengan id event baris itu (bukan massal)', async () => {
    const fetchMock = mockListEventsWithLink(MIXED_EVENTS);
    renderModal(makeRegistration('approved'));

    await screen.findByText('Acara Komunitas Demo', { exact: false });
    fireEvent.click(screen.getByRole('button', { name: /Lepas tautan/ }));

    await waitFor(() => {
      expect(sentLinkBodies(fetchMock)).toHaveLength(1);
    });
    expect(sentLinkBodies(fetchMock)[0]).toEqual({
      action: 'linkRegistrationToEvent',
      registrationId: 'crg_1',
      eventId: null,
      unlinkEventId: 'evt_linked',
    });
  });

  it('memilih event milik organisasi lain menampilkan peringatan lalu konfirmasi sebelum menautkan', async () => {
    const fetchMock = mockListEventsWithLink(MIXED_EVENTS);
    renderModal(makeRegistration('approved'));

    // Buka dropdown event dan pilih event milik organisasi lain.
    fireEvent.click(await screen.findByRole('combobox', { name: 'Pilih event' }));
    fireEvent.click(await screen.findByRole('option', { name: /Acara Organisasi Lain/ }));

    // Peringatan overwrite muncul (bukan guard 400 — overwrite tetap sah).
    expect(await screen.findByText(/sudah tertaut ke organisasi lain/)).toBeInTheDocument();

    // Klik Tautkan → dialog konfirmasi muncul.
    fireEvent.click(screen.getByRole('button', { name: 'Tautkan' }));
    expect(await screen.findByText(/Pindahkan tautan event\?/)).toBeInTheDocument();

    // Konfirmasi pindah tautan → request link dikirim untuk event itu.
    fireEvent.click(screen.getByRole('button', { name: /Pindahkan tautan/ }));

    await waitFor(() => {
      const bodies = sentLinkBodies(fetchMock);
      expect(bodies.some((b) => b.eventId === 'evt_other' && b.unlinkEventId === undefined)).toBe(true);
    });
  });
});
