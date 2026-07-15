import { describe, it, expect } from 'vitest';
import {
  aggregateResults,
  filterSurveys,
  EMPTY_FILTER,
} from '../tenantSurveyResultsAggregate';
import type { TenantEventSurvey } from '../../types';

function row(partial: Partial<TenantEventSurvey>): TenantEventSurvey {
  return {
    id: partial.id || 's1',
    event_id: partial.event_id || 'e1',
    tenant_user_id: null,
    tenant_name: partial.tenant_name || 'Toko A',
    tenant_organization: '',
    tenant_email: '',
    tenant_phone: '',
    business_category: 'other',
    business_subcategory: '',
    feedback_comment: '',
    improvement_suggestion: '',
    status: partial.status || 'submitted',
    submitted_at: partial.submitted_at || '2026-06-01T00:00:00Z',
    reviewed_by: null,
    reviewed_at: null,
    review_notes: '',
    created_at: partial.created_at || '2026-06-01T00:00:00Z',
    updated_at: partial.created_at || '2026-06-01T00:00:00Z',
    nama_gerai: partial.nama_gerai ?? 'Toko A',
    lokasi_zona: partial.lokasi_zona ?? 'Atrium Utama',
    kategori: partial.kategori ?? 'Food & Beverage (F&B)',
    kenaikan_traffic: partial.kenaikan_traffic ?? 'Signifikan',
    kenaikan_sales: partial.kenaikan_sales ?? '10% - 30%',
    feedback_teks: partial.feedback_teks ?? '',
  };
}

describe('tenantSurveyResultsAggregate', () => {
  it('hides draft rows', () => {
    const rows = [
      row({ id: '1', status: 'draft' }),
      row({ id: '2', status: 'submitted' }),
    ];
    const filtered = filterSurveys(rows, EMPTY_FILTER);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe('2');
  });

  it('filters by zona and kategori', () => {
    const rows = [
      row({ id: '1', lokasi_zona: 'Atrium Utama', kategori: 'Food & Beverage (F&B)' }),
      row({ id: '2', lokasi_zona: 'Lantai 1', kategori: 'Fashion & Aksesoris' }),
    ];
    const filtered = filterSurveys(rows, {
      ...EMPTY_FILTER,
      zona: 'Lantai 1',
      kategori: 'Fashion & Aksesoris',
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe('2');
  });

  it('aggregates v3 KPI and zona dist', () => {
    const rows = [
      row({
        id: '1',
        nama_gerai: 'A',
        kenaikan_traffic: 'Signifikan',
        kenaikan_sales: '10% - 30%',
        lokasi_zona: 'Atrium Utama',
        feedback_teks: 'Bagus',
      }),
      row({
        id: '2',
        nama_gerai: 'B',
        kenaikan_traffic: 'Menurun',
        kenaikan_sales: 'Tidak ada kenaikan / Sama saja',
        lokasi_zona: 'Lantai 2',
      }),
    ];
    const agg = aggregateResults(rows);
    expect(agg.total).toBe(2);
    expect(agg.uniqueGerai).toBe(2);
    expect(agg.trafficPosPct).toBe(50);
    expect(agg.salesPosPct).toBe(50);
    expect(agg.zonaDist.counts['Atrium Utama']).toBe(1);
    expect(agg.zonaDist.counts['Lantai 2']).toBe(1);
    expect(agg.feedback).toHaveLength(1);
    expect(agg.topGerai[0]?.nama_gerai).toBe('A');
  });
});
