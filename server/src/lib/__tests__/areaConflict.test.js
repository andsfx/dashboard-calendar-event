/**
 * Predikat SQL guard bentrok area (`server/src/lib/areaConflict.js`).
 *
 * Yang dijaga di sini adalah PARITAS gerbang visibilitas publik: predikat harus
 * memakai `status <> 'draft'` (sama dengan `public.js`), bukan `= 'published'`.
 * Kalau guard memakai `= 'published'`, baris berlabel temporal basi
 * (`upcoming/ongoing/past`) tetap TAMPIL di halaman publik tetapi tak terlihat
 * guard → double-booking tanpa peringatan.
 *
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest';
import { areaConflictPredicate, isIsoDateString } from '../areaConflict.js';

/** Evaluasi klausa status yang dihasilkan predikat untuk status baris uji. */
function statusCounted(where, status) {
  const clause = where.match(/e\.status <>/);
  expect(clause).toBeTruthy();
  const excluded = where.match(/e\.status <> '([^']+)'/)[1];
  return status !== excluded;
}

describe('areaConflictPredicate — gerbang status', () => {
  it('memakai `status <> \'draft\'` seperti kanal publik, bukan `= \'published\'`', () => {
    const conflict = areaConflictPredicate('era_stage', '2026-07-12', null, null);

    expect(conflict.where).toContain("e.status <> 'draft'");
    expect(conflict.where).not.toContain("e.status = 'published'");
  });

  it('event draft TIDAK dihitung, status selain draft (mis. upcoming) DIHITUNG', () => {
    const { where } = areaConflictPredicate('era_stage', '2026-07-12', null, null);

    expect(statusCounted(where, 'draft')).toBe(false);
    expect(statusCounted(where, 'published')).toBe(true);
    expect(statusCounted(where, 'upcoming')).toBe(true);
    expect(statusCounted(where, 'ongoing')).toBe(true);
    expect(statusCounted(where, 'past')).toBe(true);
  });

  it('rentang tetap [date_str, date_end ?? date_str] dan mengecualikan event sendiri', () => {
    const conflict = areaConflictPredicate('era_stage', '2026-07-10', '2026-07-12', 'evt_1');

    expect(conflict.params).toEqual(['era_stage', '2026-07-10', '2026-07-12', 'evt_1']);
    expect(conflict.where).toContain('e.id <> $4');
  });
});

describe('areaConflictPredicate — input tidak valid', () => {
  it('tanpa area → guard dilewati', () => {
    expect(areaConflictPredicate(null, '2026-07-12', null, null)).toBeNull();
  });

  it('tanggal non-ISO → guard dilewati (bukan query yang melempar 22007)', () => {
    expect(areaConflictPredicate('era_stage', '12 Juli 2026', null, null)).toBeNull();
    expect(areaConflictPredicate('era_stage', '2026-07-12', '12 Juli 2026', null)).toBeNull();
  });

  it('isIsoDateString menolak tanggal mustahil dan bukan string', () => {
    expect(isIsoDateString('2026-13-01')).toBe(false);
    expect(isIsoDateString('2026-07-12')).toBe(true);
    expect(isIsoDateString(null)).toBe(false);
  });
});
