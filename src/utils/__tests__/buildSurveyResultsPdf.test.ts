import { describe, expect, it } from 'vitest';
import type { ResultsAggregate, ResultsFilter } from '../../utils/tenantSurveyResultsAggregate';
import { buildSurveyResultsPdf } from '../../components/pdf/buildSurveyResultsPdf';

const FILTER: ResultsFilter = {
  eventId: 'all',
  dateFrom: '2026-08-01',
  dateTo: '2026-08-31',
  zona: 'all',
  kategori: 'F&B',
  status: 'all',
};

const AGGREGATE: ResultsAggregate = {
  rows: [],
  total: 10,
  uniqueGerai: 4,
  trafficPosPct: 60,
  salesPosPct: 40,
  trafficDist: { labels: ['Naik', 'Turun'], counts: { Naik: 6, Turun: 4 } },
  salesDist: { labels: ['> 50%'], counts: { '> 50%': 4 } },
  kategoriDist: { labels: ['F&B'], counts: { 'F&B': 10 } },
  zonaDist: { labels: ['Lantai 1'], counts: { 'Lantai 1': 10 } },
  topGerai: [{ nama_gerai: 'Kopi A', count: 3, trafficPos: 2, salesPos: 1, score: 3 }],
  crossTab: [
    { kategori: 'F&B', sales: '> 50%', count: 2 },
    { kategori: 'F&B', sales: '10% - 30%', count: 1 },
  ],
  feedback: [
    { id: 'f1', gerai: 'Kopi A', event_id: 'e1', text: 'Pelayanan baik', at: '2026-08-02T00:00:00Z' },
  ],
};

describe('buildSurveyResultsPdf', () => {
  it('PDF valid dengan cross-tab sesuai fixture (lastAutoTable body)', () => {
    const doc = buildSurveyResultsPdf({
      aggregate: AGGREGATE,
      filter: FILTER,
      eventLabel: 'Semua Event',
      generatedAt: '3 September 2026',
    });
    const bytes = new Uint8Array(doc.output('arraybuffer'));
    expect(bytes.length).toBeGreaterThan(1024);
    expect(String.fromCharCode(...bytes.subarray(0, 4))).toBe('%PDF');

    // Tabel terakhir = cross-tab (feedback bukan tabel)
    const last = doc.lastAutoTable;
    expect(last.body).toHaveLength(2);
    expect(last.body[0]?.raw).toContain('F&B');
  });

  it('teks filter & footer internal ada di stream', () => {
    const doc = buildSurveyResultsPdf({
      aggregate: AGGREGATE,
      filter: FILTER,
      eventLabel: 'Semua Event',
      generatedAt: '3 September 2026',
      generatedBy: 'TR Admin',
    });
    const text = new TextDecoder('latin1').decode(doc.output('arraybuffer'));
    expect(text).toContain('Hasil Evaluasi Tenant');
    expect(text).toContain('tanpa data PIC');
    expect(text).toContain('Cuplikan Feedback');
  });
});
