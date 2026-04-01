import { EventItem, AnnualTheme } from '../types';

const today = new Date();
const fmt = (d: Date) => d.toISOString().split('T')[0];
const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };

const DAY_ID = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const MONTH_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

function makeDate(d: Date) {
  return {
    dateStr: fmt(d),
    day: DAY_ID[d.getDay()],
    tanggal: `${d.getDate()} ${MONTH_ID[d.getMonth()]} ${d.getFullYear()}`,
    month: MONTH_ID[d.getMonth()],
  };
}

let idx = 1;
function ev(
  daysOffset: number,
  jam: string,
  acara: string,
  lokasi: string,
  eo: string,
  keterangan: string,
  category: string,
  priority: 'high' | 'medium' | 'low',
  status: 'upcoming' | 'ongoing' | 'past'
): EventItem {
  const d = addDays(today, daysOffset);
  return {
    id: `ev-${idx}`,
    rowIndex: idx++,
    ...makeDate(d),
    jam,
    acara,
    lokasi,
    eo,
    pic: '',
    phone: '',
    keterangan,
    categories: [category],
    category,
    priority,
    status,
    eventModel: '',
    eventNominal: '',
    eventModelNotes: '',
  };
}

export const mockEvents: EventItem[] = [
  // Ongoing
  ev(0,  '09:00 - 21:00', 'Grand Bazaar Ramadan 2025',        'Atrium Utama Lt.1',   'EventPro Indonesia',  'Pameran & bazar produk UMKM lokal selama Ramadan',         'Bazaar',      'high',   'ongoing'),
  ev(0,  '10:00 - 22:00', 'Food Festival Nusantara',          'Food Court Lt.3',     'Nusantara Culinary',  'Festival kuliner dari 34 provinsi Indonesia',               'Festival',    'high',   'ongoing'),

  // Upcoming – this week
  ev(2,  '14:00 - 17:00', 'Workshop Batik Modern',            'Hall A Lt.2',         'Kriya Nusantara',     'Workshop membatik bagi pengunjung umum, kapasitas 50 orang', 'Workshop',    'medium', 'upcoming'),
  ev(3,  '10:00 - 12:00', 'Lomba Mewarnai Anak',              'Kids Zone Lt.1',      'Creative Kids Club',  'Lomba mewarnai untuk usia 3–10 tahun, berhadiah menarik',    'Kompetisi',   'medium', 'upcoming'),
  ev(4,  '15:00 - 18:00', 'Fashion Show Lokal Designer',      'Catwalk Stage Lt.1',  'MM Fashion Week',     'Peragaan busana desainer lokal Bekasi & Jawa Barat',         'Fashion',     'high',   'upcoming'),
  ev(5,  '11:00 - 14:00', 'Talk Show: Digital Marketing 2025','Ruang Seminar Lt.4',  'IDN Media',           'Tips strategi pemasaran digital untuk pelaku UMKM',          'Seminar',     'medium', 'upcoming'),
  ev(6,  '09:00 - 17:00', 'Pameran Otomotif Metropolitan',    'Parkir Basement B1',  'Auto Show ID',        'Pameran kendaraan roda dua dan empat terbaru 2025',          'Pameran',     'high',   'upcoming'),
  ev(8,  '16:00 - 20:00', 'Konser Akustik Indie Night',       'Open Stage Lt.3',     'Soundscape Music',    'Penampilan 10 band indie lokal pilihan',                     'Konser',      'high',   'upcoming'),
  ev(10, '10:00 - 15:00', 'Health & Wellness Expo',           'Atrium Selatan Lt.1', 'HealthFirst ID',      'Pameran produk kesehatan & konsultasi gratis',               'Pameran',     'medium', 'upcoming'),
  ev(12, '13:00 - 16:00', 'Seminar Investasi Properti',       'Ruang Meeting Lt.4',  'PropertyOne',         'Peluang investasi properti di Bekasi & sekitarnya',          'Seminar',     'low',    'upcoming'),
  ev(14, '09:00 - 21:00', 'Toys & Games Fair',                'Hall B Lt.2',         'Playtime Events',     'Pameran mainan edukatif dan board games terlengkap',         'Pameran',     'medium', 'upcoming'),
  ev(15, '14:00 - 17:00', 'Beauty & Skincare Workshop',       'Studio Room Lt.3',    'GlowUp Beauty',       'Workshop perawatan kulit & tutorial makeup profesional',     'Workshop',    'medium', 'upcoming'),
  ev(18, '10:00 - 22:00', 'Anniversary Metropolitan Mall 15th','Semua Area',          'MM Management',       'Perayaan ulang tahun ke-15 MM Bekasi dengan berbagai kejutan','Festival',   'high',   'upcoming'),
  ev(20, '15:00 - 18:00', 'Lomba Robotik Junior',             'Hall Techno Lt.2',    'RoboKids Academy',    'Kompetisi robot line follower untuk pelajar SMP-SMA',        'Kompetisi',   'medium', 'upcoming'),
  ev(22, '11:00 - 13:00', 'CSR: Donor Darah Massal',          'Lobby Utama Lt.1',    'PMI Kota Bekasi',     'Kegiatan donor darah bersama PMI kota Bekasi',               'Sosial',      'low',    'upcoming'),
  ev(25, '09:00 - 17:00', 'Pameran Seni Rupa Kontemporer',    'Gallery Space Lt.4',  'Sanggar Seni Bekasi', 'Pameran lukisan & instalasi seni 30 seniman lokal',          'Seni',        'medium', 'upcoming'),

  // Past
  ev(-2, '10:00 - 14:00', 'Bazar Buku Murah',                 'Hall A Lt.2',         'Gramedia Events',     'Diskon buku hingga 70% dari berbagai penerbit nasional',     'Bazaar',      'low',    'past'),
  ev(-4, '14:00 - 17:00', 'Stand Up Comedy Night',            'Open Stage Lt.3',     'SUCI Management',     'Penampilan 5 komika nasional dan lokal',                     'Hiburan',     'medium', 'past'),
  ev(-6, '09:00 - 16:00', 'Job Fair Metropolitan 2025',       'Atrium Utama Lt.1',   'Karir.com',           '50+ perusahaan membuka lowongan kerja',                      'Karir',       'high',   'past'),
  ev(-8, '13:00 - 15:00', 'Peluncuran Produk Samsung Galaxy', 'Stage Utama Lt.1',    'Samsung Indonesia',   'Peluncuran seri terbaru Samsung Galaxy S25',                 'Produk',      'high',   'past'),
  ev(-10,'10:00 - 12:00', 'Seminar Parenting Modern',         'Ruang Seminar Lt.4',  'ParentCircle ID',     'Tips pengasuhan anak di era digital',                        'Seminar',     'low',    'past'),
  ev(-14,'09:00 - 21:00', 'Chinese New Year Fair',            'Atrium Utama Lt.1',   'MM Events Team',      'Perayaan Tahun Baru Imlek dengan pertunjukan barongsai',     'Festival',    'high',   'past'),
];

export const annualThemes: AnnualTheme[] = [
  {
    id: 'q1-2026',
    name: 'Q1 – Awal Tahun & Perayaan',
    dateStart: '2026-01-01',
    dateEnd: '2026-03-31',
    color: '#6366f1',
  },
  {
    id: 'q2-2026',
    name: 'Q2 – Ramadan & Lebaran',
    dateStart: '2026-04-01',
    dateEnd: '2026-06-30',
    color: '#f59e0b',
  },
  {
    id: 'q3-2026',
    name: 'Q3 – Mid-Year Festival',
    dateStart: '2026-07-01',
    dateEnd: '2026-09-30',
    color: '#10b981',
  },
  {
    id: 'q4-2026',
    name: 'Q4 – Akhir Tahun & Natal',
    dateStart: '2026-10-01',
    dateEnd: '2026-12-31',
    color: '#ef4444',
  },
];

export function recalculateStatuses(events: EventItem[]): EventItem[] {
  // In a real app, recalculate based on current time
  return events;
}
