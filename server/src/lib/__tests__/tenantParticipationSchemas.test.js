/**
 * Kontrak validasi partisipasi tenant yang tidak terlihat dari UI:
 *   - domain value opsi dinamis harus sejalan dengan jalur tulis (z.enum +
 *     CHECK), kecuali `booth_size` yang memang bebas;
 *   - tanggal harus tanggal kalender nyata, bukan sekadar berformat ISO.
 *
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest';

import {
  tenantParticipationSchema,
  TENANT_PARTICIPATION_ACTION_SCHEMAS,
  TENANT_PARTICIPATION_OPTION_ACTION_SCHEMAS,
  isRealDate,
} from '../tenantParticipationSchemas.js';

const BASE = {
  tenantName: 'Kopi Uji',
  contactName: 'Budi',
  phone: '081234567890',
  eventId: 'ev1',
  kind: 'booth',
  boothArea: 'Atrium',
  boothStart: '2026-11-01',
  boothProducts: 'kopi',
};

const createOption = (group, value) =>
  TENANT_PARTICIPATION_OPTION_ACTION_SCHEMAS.createTenantParticipationOption.safeParse({
    action: 'createTenantParticipationOption',
    group,
    value,
    label: 'Label uji',
  });

describe('opsi dinamis: domain value per grup', () => {
  it('menolak value di luar enum untuk tiga grup tertutup', () => {
    for (const group of ['booth_scheme', 'voucher_type', 'voucher_format']) {
      const result = createOption(group, 'outdoor');
      expect(result.success, `${group} seharusnya menolak 'outdoor'`).toBe(false);
      expect(result.error.issues[0].path).toEqual(['value']);
      expect(result.error.issues[0].message).toContain('harus salah satu dari');
    }
  });

  it('menerima value enum yang dikenal', () => {
    expect(createOption('booth_scheme', 'joint').success).toBe(true);
    expect(createOption('voucher_type', 'free_item').success).toBe(true);
    expect(createOption('voucher_format', 'fisik').success).toBe(true);
  });

  it('membiarkan booth_size bebas karena kolomnya tanpa constraint', () => {
    expect(createOption('booth_size', '5x5').success).toBe(true);
    expect(createOption('booth_size', 'custom').success).toBe(true);
  });
});

describe('tanggal kalender', () => {
  it('isRealDate menolak tanggal yang tidak ada', () => {
    expect(isRealDate('2026-02-31')).toBe(false);
    expect(isRealDate('2026-13-01')).toBe(false);
    expect(isRealDate('2026-11-31')).toBe(false);
  });

  it('isRealDate menerima tanggal nyata dan 29 Februari kabisat', () => {
    expect(isRealDate('2026-11-01')).toBe(true);
    expect(isRealDate('2028-02-29')).toBe(true);
  });

  it('submit publik menolak tanggal mustahil dengan pesan validasi, bukan lolos ke Postgres', () => {
    const result = tenantParticipationSchema.safeParse({ ...BASE, boothStart: '2026-02-31' });
    expect(result.success).toBe(false);
    expect(result.error.issues.map((issue) => issue.message)).toContain('Tanggal tidak valid');
  });

  it('submit publik masih menerima tanggal kosong untuk booth_end', () => {
    expect(tenantParticipationSchema.safeParse({ ...BASE, boothEnd: '' }).success).toBe(true);
  });

  it('koreksi admin memakai aturan tanggal yang sama', () => {
    const result = TENANT_PARTICIPATION_ACTION_SCHEMAS.updateTenantParticipation.safeParse({
      action: 'updateTenantParticipation',
      id: 'tpr_1',
      boothStart: '2026-02-31',
    });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].path).toEqual(['boothStart']);
  });
});
