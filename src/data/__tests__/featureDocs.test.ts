import { describe, it, expect } from 'vitest';
import { DOC_FEATURES, DOC_SECTIONS, type DocAudience } from '../featureDocs';

/**
 * Integritas data dokumentasi /docs.
 *
 * Isi halaman bersumber dari `featureDocs.ts`, jadi kesalahan di data (id ganda,
 * langkah kosong, audiens tak dikenal) langsung tampil ke pengguna. Tes ini
 * menjaga kontrak bentuknya tanpa mengunci teks naratifnya.
 */
describe('featureDocs — struktur', () => {
  it('setiap bagian punya id, label, intro, dan minimal satu grup', () => {
    expect(DOC_SECTIONS.length).toBeGreaterThan(0);
    for (const section of DOC_SECTIONS) {
      expect(section.id).toBeTruthy();
      expect(section.label).toBeTruthy();
      expect(section.intro).toBeTruthy();
      expect(section.groups.length).toBeGreaterThan(0);
    }
  });

  it('setiap fitur punya bentuk yang lengkap', () => {
    expect(DOC_FEATURES.length).toBeGreaterThan(0);
    for (const feature of DOC_FEATURES) {
      expect(feature.id).toBeTruthy();
      expect(feature.name).toBeTruthy();
      expect(feature.summary).toBeTruthy();
      expect(feature.steps.length).toBeGreaterThan(0);
      for (const step of feature.steps) expect(step.trim()).not.toBe('');
      if (feature.notes) for (const note of feature.notes) expect(note.trim()).not.toBe('');
    }
  });

  it('id fitur unik di seluruh dokumen', () => {
    const ids = DOC_FEATURES.map(feature => feature.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('id grup unik di seluruh dokumen', () => {
    const ids = DOC_SECTIONS.flatMap(section => section.groups.map(group => group.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('setiap audiens termasuk himpunan yang dikenal halaman', () => {
    const known: DocAudience[] = [
      'Publik',
      'Semua pengguna',
      'Tenant',
      'Viewer',
      'Admin',
      'Superadmin',
      'Demo',
    ];
    for (const feature of DOC_FEATURES) {
      expect(known, `audiens tak dikenal pada "${feature.id}"`).toContain(feature.audience);
    }
  });

  it('path yang dideklarasikan selalu diawali garis miring', () => {
    for (const feature of DOC_FEATURES) {
      if (feature.path) expect(feature.path.startsWith('/')).toBe(true);
    }
  });
});

describe('featureDocs — cakupan peran', () => {
  it('mendokumentasikan permukaan publik secara memadai', () => {
    expect(DOC_FEATURES.filter(f => f.audience === 'Publik').length).toBeGreaterThanOrEqual(10);
  });

  it('menjelaskan peran Viewer dan Demo secara terpisah', () => {
    expect(DOC_FEATURES.filter(f => f.audience === 'Viewer').length).toBeGreaterThanOrEqual(1);
    expect(DOC_FEATURES.filter(f => f.audience === 'Demo').length).toBeGreaterThanOrEqual(1);
  });

  it('menjelaskan tenant baik sebagai pengisi survey maupun pembaca hasil', () => {
    expect(DOC_FEATURES.filter(f => f.audience === 'Tenant').length).toBeGreaterThanOrEqual(2);
  });
});
