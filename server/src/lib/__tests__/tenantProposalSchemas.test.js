/**
 * Regresi audit 2026-10-31: `isoDate` dulu hanya regex `YYYY-MM-DD`, jadi
 * tanggal mustahil (`2099-02-31`) lolos zod lalu baru ditolak Postgres
 * (22008) — pengguna anonim menerima HTTP 500. Sekarang schema memakai
 * `isRealDate` yang sama dengan pengajuan partisipasi tenant.
 *
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest';

import { exhibitionDataSchema } from '../exhibitionSchemas.js';
import { tenantEventProposalSchema } from '../tenantProposalSchemas.js';

const PROPOSAL = {
  tenantName: 'Toko Sepatu Jaya',
  contactName: 'Budi Santoso',
  phone: '081234567890',
  eventTitle: 'Bazar Musim Hujan',
  eventDescription: 'Bazar produk sepatu dengan diskon akhir tahun.',
  proposedStart: '2099-01-10',
};

function proposalIssues(overrides = {}) {
  const result = tenantEventProposalSchema.safeParse({ ...PROPOSAL, ...overrides });
  return result.success ? [] : result.error.issues;
}

const EXHIBITION = {
  title: 'Pameran UMKM',
  dateStart: '2099-03-01',
  dateEnd: '2099-03-05',
};

describe('tenantEventProposalSchema — tanggal harus tanggal kalender nyata', () => {
  it('menerima tanggal valid', () => {
    expect(proposalIssues()).toEqual([]);
    expect(proposalIssues({ proposedEnd: '2099-02-28' })).toEqual([]);
    // 2096 tahun kabisat → 29 Februari sah.
    expect(proposalIssues({ proposedStart: '2096-02-29' })).toEqual([]);
  });

  it.each(['2099-02-31', '2099-02-30', '2099-04-31', '2099-13-01', '2099-00-10'])(
    'menolak proposedStart %s',
    (date) => {
      const issues = proposalIssues({ proposedStart: date });
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(i => i.message.includes('Tanggal tidak valid'))).toBe(true);
    },
  );

  it('menolak proposedEnd mustahil meski opsional', () => {
    const issues = proposalIssues({ proposedEnd: '2099-02-31' });
    expect(issues.some(i => i.path.join('.') === 'proposedEnd')).toBe(true);
  });

  it('proposedEnd kosong tetap boleh (opsional)', () => {
    expect(proposalIssues({ proposedEnd: '' })).toEqual([]);
  });
});

describe('exhibitionDataSchema — dateStart/dateEnd harus tanggal nyata', () => {
  function exhibitionResult(overrides = {}) {
    return exhibitionDataSchema.safeParse({ ...EXHIBITION, ...overrides });
  }

  it('menerima rentang valid', () => {
    expect(exhibitionResult().success).toBe(true);
  });

  it.each(['2099-02-31', '2099-04-31', '2100-02-29'])('menolak dateStart %s', (date) => {
    const result = exhibitionResult({ dateStart: date });
    expect(result.success).toBe(false);
    expect(result.error.issues.some(i => i.message.includes('Tanggal tidak valid'))).toBe(true);
  });

  it('menolak dateEnd mustahil', () => {
    const result = exhibitionResult({ dateEnd: '2099-02-31' });
    expect(result.success).toBe(false);
    expect(result.error.issues.some(i => i.path.join('.') === 'dateEnd')).toBe(true);
  });
});
