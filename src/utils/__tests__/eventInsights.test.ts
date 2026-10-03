import { describe, it, expect } from 'vitest';
import { buildEventInsights } from '../eventInsights';
import type {
  CommunityRegistration,
  DraftEventItem,
  EventArea,
  EventItem,
  ExhibitionLead,
  InsightSeverity,
  TenantEventSurvey,
} from '../../types';

/** Titik acuan tetap supaya setiap kasus deterministik. */
const NOW = new Date(2026, 5, 1, 9, 0, 0); // 1 Juni 2026

/** Event minimal — hanya field yang dibaca mesin insight. */
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

function ids(result: { insights: Array<{ id: string }> }): string[] {
  return result.insights.map((insight) => insight.id);
}

describe('buildEventInsights', () => {
  it('mengembalikan daftar kosong untuk dataset kosong', () => {
    const result = buildEventInsights({ events: [], activeDrafts: [], registrations: [], areas: [], now: NOW });
    expect(result.insights).toEqual([]);
    expect(result.generatedAt).toBe(NOW.toISOString());
  });

  it('melaporkan antrian draft + pendaftaran pending sebagai peringatan', () => {
    const result = buildEventInsights({
      events: [],
      activeDrafts: [draft({ id: 'd1' }), draft({ id: 'd2' })],
      registrations: [registration({ id: 'r1', status: 'pending' })],
      areas: [],
      now: NOW,
    });
    const insight = result.insights.find((item) => item.id === 'antrian');
    expect(insight?.severity).toBe('peringatan');
    expect(insight?.metric).toBe('3');
    expect(insight?.body).toContain('2 draft');
    expect(insight?.body).toContain('1 pendaftaran');
  });

  it('tidak melaporkan antrian saat draft kosong dan pendaftaran sudah ditinjau', () => {
    const result = buildEventInsights({
      events: [],
      activeDrafts: [],
      registrations: [registration({ id: 'r1', status: 'approved' })],
      areas: [],
      now: NOW,
    });
    expect(ids(result)).not.toContain('antrian');
  });

  it('mendeteksi dua event beririsan di area yang sama', () => {
    const result = buildEventInsights({
      events: [
        event({ id: 'e1', areaId: 'a1', dateStr: '2026-06-10', dateEnd: '2026-06-12' }),
        event({ id: 'e2', areaId: 'a1', dateStr: '2026-06-11', dateEnd: '2026-06-13' }),
      ],
      activeDrafts: [],
      registrations: [],
      areas: [area({ id: 'a1', name: 'Atrium' })],
      now: NOW,
    });
    const insight = result.insights.find((item) => item.id === 'konflik-area-id:a1');
    expect(insight?.severity).toBe('peringatan');
    expect(insight?.scope).toBe('Atrium');
    expect(insight?.metric).toBe('1');
  });

  it('tidak menandai event yang rentangnya terpisah', () => {
    const result = buildEventInsights({
      events: [
        event({ id: 'e1', areaId: 'a1', dateStr: '2026-06-10' }),
        event({ id: 'e2', areaId: 'a1', dateStr: '2026-06-20' }),
      ],
      activeDrafts: [],
      registrations: [],
      areas: [area({ id: 'a1' })],
      now: NOW,
    });
    expect(ids(result).some((id) => id.startsWith('konflik-area'))).toBe(false);
  });

  it('mengabaikan event yang sudah lewat saat mencari konflik', () => {
    const result = buildEventInsights({
      events: [
        event({ id: 'e1', areaId: 'a1', dateStr: '2026-05-10' }),
        event({ id: 'e2', areaId: 'a1', dateStr: '2026-05-11' }),
      ],
      activeDrafts: [],
      registrations: [],
      areas: [area({ id: 'a1' })],
      now: NOW,
    });
    expect(ids(result).some((id) => id.startsWith('konflik-area'))).toBe(false);
  });

  it('melaporkan tren menurun saat basis bulan lalu cukup', () => {
    const previousMonth = [
      event({ id: 'p1', dateStr: '2026-05-05' }),
      event({ id: 'p2', dateStr: '2026-05-12' }),
      event({ id: 'p3', dateStr: '2026-05-19' }),
      event({ id: 'p4', dateStr: '2026-05-26' }),
    ];
    const result = buildEventInsights({
      events: [...previousMonth, event({ id: 'c1', dateStr: '2026-06-08' })],
      activeDrafts: [],
      registrations: [],
      areas: [],
      now: NOW,
    });
    const insight = result.insights.find((item) => item.id === 'tren-bulanan');
    expect(insight?.severity).toBe('saran');
    expect(insight?.title).toBe('Tren event bulan ini menurun');
    expect(insight?.metric).toBe('-3');
  });

  it('tidak melaporkan tren bila basis bulan lalu terlalu kecil', () => {
    const result = buildEventInsights({
      events: [event({ id: 'p1', dateStr: '2026-05-05' }), event({ id: 'c1', dateStr: '2026-06-08' })],
      activeDrafts: [],
      registrations: [],
      areas: [],
      now: NOW,
    });
    expect(ids(result)).not.toContain('tren-bulanan');
  });

  it('menandai satu hari padat dalam dua pekan ke depan', () => {
    const result = buildEventInsights({
      events: [
        event({ id: 'e1', dateStr: '2026-06-05' }),
        event({ id: 'e2', dateStr: '2026-06-05' }),
        event({ id: 'e3', dateStr: '2026-06-05' }),
      ],
      activeDrafts: [],
      registrations: [],
      areas: [],
      now: NOW,
    });
    const insight = result.insights.find((item) => item.id === 'hari-padat');
    expect(insight?.severity).toBe('saran');
    expect(insight?.metric).toBe('3');
    expect(insight?.scope).toBe('2026-06-05');
  });

  it('melaporkan event yang mulai dalam sepekan', () => {
    const result = buildEventInsights({
      events: [event({ id: 'e1', dateStr: '2026-06-04', acara: 'Bazaar Ramadan' })],
      activeDrafts: [],
      registrations: [],
      areas: [],
      now: NOW,
    });
    const insight = result.insights.find((item) => item.id === 'event-dekat');
    expect(insight?.severity).toBe('info');
    expect(insight?.body).toContain('Bazaar Ramadan');
  });

  it('melaporkan area tersibuk dan kategori dominan', () => {
    const result = buildEventInsights({
      events: [
        event({ id: 'e1', areaId: 'a1', category: 'Bazaar', categories: ['Bazaar'] }),
        event({ id: 'e2', areaId: 'a1', category: 'Bazaar', categories: ['Bazaar'] }),
      ],
      activeDrafts: [],
      registrations: [],
      areas: [area({ id: 'a1', name: 'Atrium' })],
      now: NOW,
    });
    const areaRow = result.insights.find((item) => item.id === 'area-tersibuk');
    const categoryRow = result.insights.find((item) => item.id === 'kategori-dominan');
    expect(areaRow?.metric).toBe('2');
    expect(areaRow?.scope).toBe('Atrium');
    expect(categoryRow?.scope).toBe('Bazaar');
  });

  it('mengurutkan peringatan sebelum saran sebelum info', () => {
    const result = buildEventInsights({
      events: [
        event({ id: 'e1', areaId: 'a1', dateStr: '2026-06-10', dateEnd: '2026-06-12', category: 'Bazaar', categories: ['Bazaar'] }),
        event({ id: 'e2', areaId: 'a1', dateStr: '2026-06-11', category: 'Bazaar', categories: ['Bazaar'] }),
        event({ id: 'e3', dateStr: '2026-06-05' }),
        event({ id: 'e4', dateStr: '2026-06-05' }),
        event({ id: 'e5', dateStr: '2026-06-05' }),
      ],
      activeDrafts: [draft({ id: 'd1' })],
      registrations: [],
      areas: [area({ id: 'a1', name: 'Atrium' })],
      now: NOW,
    });
    const order: Record<InsightSeverity, number> = { peringatan: 0, saran: 1, info: 2 };
    const ranks = result.insights.map((insight) => order[insight.severity]);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    expect(result.insights[0]?.severity).toBe('peringatan');
  });

  describe('aksi deep-link', () => {
    it('menyertakan aksi Antrian Draft + Pendaftaran pada insight antrian', () => {
      const result = buildEventInsights({
        events: [],
        activeDrafts: [draft({ id: 'd1' })],
        registrations: [registration({ id: 'r1', status: 'pending' })],
        areas: [],
        now: NOW,
      });
      const insight = result.insights.find((item) => item.id === 'antrian');
      expect(insight?.actions?.map((action) => action.path)).toEqual(['/drafts', '/registrations']);
    });

    it('mengarahkan bentrok area ke Jadwal Event dengan filter pencarian area', () => {
      const result = buildEventInsights({
        events: [
          event({ id: 'e1', areaId: 'a1', dateStr: '2026-06-10', dateEnd: '2026-06-12' }),
          event({ id: 'e2', areaId: 'a1', dateStr: '2026-06-11', dateEnd: '2026-06-13' }),
        ],
        activeDrafts: [],
        registrations: [],
        areas: [area({ id: 'a1', name: 'Atrium' })],
        now: NOW,
      });
      const insight = result.insights.find((item) => item.id === 'konflik-area-id:a1');
      expect(insight?.actions?.[0]).toMatchObject({ path: '/events', filter: { search: 'Atrium' } });
    });
  });

  describe('kelengkapan event', () => {
    it('melaporkan event terdekat tanpa poster/EO/PIC', () => {
      const result = buildEventInsights({
        events: [
          event({ id: 'e1', dateStr: '2026-06-10', posterUrl: undefined, eo: '', pic: '' }),
          event({ id: 'e2', dateStr: '2026-06-12', posterUrl: 'https://cdn/p.jpg', eo: '', pic: '' }),
        ],
        activeDrafts: [],
        registrations: [],
        areas: [],
        now: NOW,
      });
      const insight = result.insights.find((item) => item.id === 'kelengkapan-event');
      expect(insight?.metric).toBe('2');
      expect(insight?.actions?.[0]?.path).toBe('/events');
    });

    it('diam bila event terdekat sudah lengkap', () => {
      const result = buildEventInsights({
        events: [
          event({ id: 'e1', dateStr: '2026-06-10', posterUrl: 'https://cdn/p.jpg', eo: 'EO', pic: 'PIC' }),
          event({ id: 'e2', dateStr: '2026-06-12', posterUrl: 'https://cdn/p.jpg', eo: 'EO', pic: 'PIC' }),
        ],
        activeDrafts: [],
        registrations: [],
        areas: [],
        now: NOW,
      });
      expect(ids(result)).not.toContain('kelengkapan-event');
    });
  });

  describe('jeda kosong', () => {
    it('melaporkan rentang tanpa event di antara dua event terjadwal', () => {
      const result = buildEventInsights({
        events: [
          event({ id: 'e1', dateStr: '2026-06-03' }),
          event({ id: 'e2', dateStr: '2026-06-20' }),
        ],
        activeDrafts: [],
        registrations: [],
        areas: [],
        now: NOW,
      });
      const insight = result.insights.find((item) => item.id === 'jeda-kosong');
      expect(insight?.severity).toBe('info');
      expect(insight?.metric).toMatch(/hari$/);
    });

    it('tidak melaporkan jeda saat kalender benar-benar kosong', () => {
      const result = buildEventInsights({ events: [], activeDrafts: [], registrations: [], areas: [], now: NOW });
      expect(ids(result)).not.toContain('jeda-kosong');
    });
  });

  describe('lonjakan pendaftaran', () => {
    it('melaporkan lonjakan bila pekan ini minimal dua kali pekan sebelumnya', () => {
      const result = buildEventInsights({
        events: [],
        activeDrafts: [],
        registrations: [
          registration({ id: 'a', createdAt: '2026-05-27T09:00:00Z' }),
          registration({ id: 'b', createdAt: '2026-05-30T09:00:00Z' }),
          registration({ id: 'c', createdAt: '2026-05-31T09:00:00Z' }),
          registration({ id: 'd', createdAt: '2026-05-31T10:00:00Z' }),
          registration({ id: 'e', createdAt: '2026-05-31T11:00:00Z' }),
        ],
        areas: [],
        now: NOW,
      });
      const insight = result.insights.find((item) => item.id === 'lonjakan-pendaftaran');
      expect(insight).toBeDefined();
      expect(insight?.actions?.[0]?.path).toBe('/registrations');
    });

    it('diam bila volume pendaftaran rendah', () => {
      const result = buildEventInsights({
        events: [],
        activeDrafts: [],
        registrations: [registration({ id: 'a', createdAt: '2026-05-31T09:00:00Z' })],
        areas: [],
        now: NOW,
      });
      expect(ids(result)).not.toContain('lonjakan-pendaftaran');
    });
  });

  describe('data lintas-modul', () => {
    it('melaporkan tren rating tenant dari survey', () => {
      const survey = (id: string, rating: number, createdAt: string) => ({
        id,
        overall_rating: rating,
        created_at: createdAt,
      } as unknown as TenantEventSurvey);
      const result = buildEventInsights({
        events: [],
        activeDrafts: [],
        registrations: [],
        areas: [],
        surveys: [
          survey('s1', 3.0, '2026-01-10T00:00:00Z'),
          survey('s2', 3.2, '2026-02-10T00:00:00Z'),
          survey('s3', 4.5, '2026-05-10T00:00:00Z'),
          survey('s4', 4.7, '2026-05-20T00:00:00Z'),
        ],
        now: NOW,
      });
      const insight = result.insights.find((item) => item.id === 'tren-rating-tenant');
      expect(insight?.crossModule).toBe(true);
      expect(insight?.severity).toBe('info');
      expect(insight?.actions?.[0]?.path).toBe('/tenant-surveys');
    });

    it('melaporkan pengajuan pameran yang menunggu tinjauan', () => {
      const result = buildEventInsights({
        events: [],
        activeDrafts: [],
        registrations: [],
        areas: [],
        exhibitionLeads: [
          { id: 'l1', status: 'pending' },
          { id: 'l2', status: 'pending' },
          { id: 'l3', status: 'approved' },
        ] as unknown as ExhibitionLead[],
        now: NOW,
      });
      const insight = result.insights.find((item) => item.id === 'pengajuan-pameran');
      expect(insight?.metric).toBe('2');
      expect(insight?.crossModule).toBe(true);
    });

    it('tidak menghasilkan insight lintas-modul bila data tidak diberikan', () => {
      const result = buildEventInsights({ events: [], activeDrafts: [], registrations: [], areas: [], now: NOW });
      expect(ids(result).some((id) => id.startsWith('tren-rating') || id.startsWith('pengajuan'))).toBe(false);
    });
  });
});
