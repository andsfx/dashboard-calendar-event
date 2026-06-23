export const SURVEY_OPTIONS = {
  lokasi_zona: ['Atrium Utama', 'Pintu Utara 2', 'Lantai Dasar', 'Lantai 1', 'Lantai 2', 'Lantai 3'],
  kategori: [
    'Food & Beverage (F&B)',
    'Fashion & Aksesoris',
    'Lifestyle & Hobi',
    'Hiburan / Mainan Anak',
    'Servis / Jasa',
    'Supermarket / Department Store',
  ],
  kenaikan_traffic: ['Signifikan', 'Sedikit Naik', 'Tidak Ada', 'Menurun'],
  kenaikan_sales: [
    'Tidak ada kenaikan / Sama saja',
    '< 10%',
    '10% - 30%',
    '30% - 50%',
    '> 50%',
  ],
} as const;

export type SurveyOptionKey = keyof typeof SURVEY_OPTIONS;