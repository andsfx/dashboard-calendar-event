import { describe, expect, it } from 'vitest';
import { isSurveyPromoted } from '../api/surveysApi';

describe('isSurveyPromoted — aturan legacy-safe', () => {
  it('menampilkan CTA saat status belum terbaca (null)', () => {
    expect(isSurveyPromoted(null)).toBe(true);
  });

  it('menampilkan CTA saat event belum pernah diatur admin', () => {
    expect(isSurveyPromoted({ is_active: false, has_config: false })).toBe(true);
  });

  it('menampilkan CTA saat admin menandai aktif', () => {
    expect(isSurveyPromoted({ is_active: true, has_config: true })).toBe(true);
  });

  it('menyembunyikan CTA hanya saat admin menonaktifkan', () => {
    expect(isSurveyPromoted({ is_active: false, has_config: true })).toBe(false);
  });
});
