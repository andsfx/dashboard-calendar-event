import { describe, expect, it } from 'vitest';
import type { ResultsAggregate, ResultsFilter } from '../tenantSurveyResultsAggregate';
import { buildSurveyResultsPdf } from '../../components/pdf/buildSurveyResultsPdf';
import { extractPdfStrings } from '../../test/pdfText';

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

function build(overrides: Partial<Parameters<typeof buildSurveyResultsPdf>[0]> = {}) {
  return buildSurveyResultsPdf({
    aggregate: AGGREGATE,
    filter: FILTER,
    eventLabel: 'Semua Event',
    generatedAt: '3 September 2026',
    ...overrides,
  });
}

describe('buildSurveyResultsPdf', () => {
  it('menghasilkan PDF valid dan memuat seluruh bagian default', () => {
    const doc = build();
    const bytes = new Uint8Array(doc.output('arraybuffer'));
    expect(bytes.length).toBeGreaterThan(1024);
    expect(String.fromCharCode(...bytes.subarray(0, 4))).toBe('%PDF');

    const text = extractPdfStrings(doc);
    expect(text).toContain('Hasil Evaluasi Tenant');
    expect(text).toContain('Distribusi Traffic');
    expect(text).toContain('Top Gerai');
    expect(text).toContain('Cross-tab');
    expect(text).toContain('Cuplikan Feedback');
    expect(text).toContain('tanpa data PIC');
  });

  it('menerjemahkan nilai enum filter ke Bahasa Indonesia', () => {
    // Regresi: dulu tercetak "Status: submitted+reviewed" apa adanya.
    const text = extractPdfStrings(build());
    expect(text).toContain('Terkirim & Ditinjau');
    expect(text).not.toContain('submitted+reviewed');

    const submitted = extractPdfStrings(build({ filter: { ...FILTER, status: 'submitted' } }));
    expect(submitted).toContain('Telah Dikirim');

    const reviewed = extractPdfStrings(build({ filter: { ...FILTER, status: 'reviewed' } }));
    expect(reviewed).toContain('Telah Ditinjau');
  });

  it('hanya menggambar bagian yang dipilih', () => {
    const kpiOnly = extractPdfStrings(build({ sections: ['kpi'] }));
    expect(kpiOnly).toContain('TOTAL SUBMISI');
    expect(kpiOnly).not.toContain('Distribusi Traffic');
    expect(kpiOnly).not.toContain('Cuplikan Feedback');

    const feedbackOnly = extractPdfStrings(build({ sections: ['feedback'] }));
    expect(feedbackOnly).toContain('Cuplikan Feedback');
    expect(feedbackOnly).not.toContain('Distribusi Traffic');
  });

  it('feedback panjang tidak menabrak footer', () => {
    // Regresi: `ensureSpace(y, 40)` dengan cadangan tetap 40 pt padahal
    // satu blok feedback bisa ~145 pt (terukur y1=824 > batas 801.9).
    const shortItems = Array.from({ length: 22 }, (_, i) => ({
      id: `s${i}`, gerai: `G${i}`, event_id: 'e1', text: 'Singkat.', at: 'x',
    }));
    const longItem = {
      id: 'h', gerai: 'GERAI PANJANG', event_id: 'e1',
      text: 'Kalimat panjang untuk menguji overflow vertikal. '.repeat(40), at: 'x',
    };
    const doc = build({ aggregate: { ...AGGREGATE, feedback: [...shortItems, longItem] } });

    const pageHeight = doc.internal.pageSize.getHeight();
    const text = extractPdfStrings(doc);
    const baselines = [...text.matchAll(/-?\d+(?:\.\d+)?\s+(-?\d+(?:\.\d+)?)\s+T[dDm]/g)].map((m) => Number(m[1]));
    // Footer berada di tinggiHalaman - 24; konten harus tetap di atasnya.
    expect(Math.max(...baselines)).toBeLessThan(pageHeight - 24);
  });

  it('tidak memuat data PIC tenant', () => {
    const text = extractPdfStrings(build());
    expect(text).toContain('tanpa data PIC');
  });
});
