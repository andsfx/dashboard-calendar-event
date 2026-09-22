import { describe, it, expect } from 'vitest';
import {
  POSITIVE_SALES_BUCKETS,
  POSITIVE_TRAFFIC_BUCKETS,
  positiveSharePct,
  salesPositivePct,
  trafficPositivePct,
} from '../surveyUtils';
import type { TenantEventSurvey } from '../../types';

/** Survey v3 minimal — hanya field yang dibaca helper yang relevan. */
function survey(overrides: Partial<TenantEventSurvey>): TenantEventSurvey {
  return {
    id: 's', event_id: 'e', tenant_user_id: null,
    tenant_name: '', tenant_organization: '', tenant_email: '', tenant_phone: '',
    business_category: 'other', business_subcategory: '',
    feedback_comment: '', improvement_suggestion: '',
    status: 'submitted', submitted_at: null, reviewed_by: null, reviewed_at: null,
    review_notes: '', created_at: '', updated_at: '',
    kenaikan_traffic: 'Signifikan', kenaikan_sales: '< 10%',
    ...overrides,
  } as TenantEventSurvey;
}

describe('salesPositivePct / trafficPositivePct', () => {
  it('menghitung SEMUA opsi kenaikan sales sebagai positif, termasuk "< 10%"', () => {
    // Regresi: panel Analytics dulu mengabaikan "< 10%" sementara TrendChart
    // menghitungnya — dataset sama, dua angka berbeda.
    const surveys = [
      survey({ kenaikan_sales: '< 10%' }),
      survey({ kenaikan_sales: '10% - 30%' }),
      survey({ kenaikan_sales: 'Tidak ada kenaikan / Sama saja' }),
      survey({ kenaikan_sales: 'Tidak ada kenaikan / Sama saja' }),
    ];
    expect(salesPositivePct(surveys)).toBe(50);
  });

  it('menghitung kedua opsi traffic positif', () => {
    const surveys = [
      survey({ kenaikan_traffic: 'Signifikan' }),
      survey({ kenaikan_traffic: 'Sedikit Naik' }),
      survey({ kenaikan_traffic: 'Menurun' }),
      survey({ kenaikan_traffic: 'Tidak Ada' }),
    ];
    expect(trafficPositivePct(surveys)).toBe(50);
  });

  it('mengembalikan 0 (bukan NaN) untuk daftar kosong', () => {
    expect(salesPositivePct([])).toBe(0);
    expect(trafficPositivePct([])).toBe(0);
  });

  it('mengabaikan survey v2 (tanpa kenaikan_traffic)', () => {
    const v2 = survey({ kenaikan_traffic: '' });
    expect(salesPositivePct([v2])).toBe(0);
    expect(trafficPositivePct([v2])).toBe(0);
  });

  it('100% bila semua responden melaporkan kenaikan', () => {
    const surveys = [survey({ kenaikan_sales: '> 50%' }), survey({ kenaikan_sales: '30% - 50%' })];
    expect(salesPositivePct(surveys)).toBe(100);
  });
});

describe('positiveSharePct', () => {
  it('menjumlahkan bucket yang diberikan saja', () => {
    const row = { sales_lt_10: 1, sales_10_30: 1, sales_30_50: 0, sales_gt_50: 0, sales_none: 2 };
    expect(positiveSharePct(row, POSITIVE_SALES_BUCKETS, 4)).toBe(50);
  });

  it('memperlakukan bucket yang hilang sebagai 0', () => {
    expect(positiveSharePct({ traffic_signifikan: 3 }, POSITIVE_TRAFFIC_BUCKETS, 6)).toBe(50);
  });

  it('mengembalikan 0 untuk total 0 atau negatif (hindari NaN/Infinity)', () => {
    expect(positiveSharePct({ sales_lt_10: 2 }, POSITIVE_SALES_BUCKETS, 0)).toBe(0);
    expect(positiveSharePct({ sales_lt_10: 2 }, POSITIVE_SALES_BUCKETS, -1)).toBe(0);
  });

  it('sepakat dengan versi berbasis label opsi untuk dataset yang sama', () => {
    // 3 dari 4 responden naik (termasuk satu "< 10%"); bucket dan label harus
    // menghasilkan angka yang identik.
    const row = { sales_lt_10: 1, sales_10_30: 1, sales_30_50: 1, sales_gt_50: 0, total_submissions: 4 };
    const surveys = [
      survey({ kenaikan_sales: '< 10%' }),
      survey({ kenaikan_sales: '10% - 30%' }),
      survey({ kenaikan_sales: '30% - 50%' }),
      survey({ kenaikan_sales: 'Tidak ada kenaikan / Sama saja' }),
    ];
    expect(positiveSharePct(row, POSITIVE_SALES_BUCKETS, 4)).toBe(salesPositivePct(surveys));
  });
});
