import { describe, expect, it } from 'vitest';
import { toTextArray, toJsonb } from '../../../server/src/lib/pgValues.js';

/**
 * Regresi: `events.categories` bertipe TEXT[] — mengirim JSON.stringify(...)
 * ke kolom itu menghasilkan `malformed array literal` di Postgres (22P02),
 * yang tampil ke user sebagai "Gagal memperbarui — Perubahan belum tersimpan".
 */
describe('toTextArray (kolom TEXT[])', () => {
  it('meneruskan array JS apa adanya — node-postgres yang men-serialize', () => {
    expect(toTextArray(['Kompetisi'])).toEqual(['Kompetisi']);
    expect(toTextArray(['Kompetisi', 'Konser'])).toEqual(['Kompetisi', 'Konser']);
  });

  it('TIDAK menghasilkan string JSON (akar bug malformed array literal)', () => {
    const out = toTextArray(['Kompetisi']);
    expect(typeof out).not.toBe('string');
    expect(JSON.stringify(out)).not.toBe(out);
  });

  it('membongkar string JSON array menjadi array', () => {
    expect(toTextArray('["Kompetisi"]')).toEqual(['Kompetisi']);
    expect(toTextArray('[]')).toEqual([]);
  });

  it('membungkus teks biasa menjadi array satu elemen', () => {
    expect(toTextArray('Kompetisi')).toEqual(['Kompetisi']);
  });

  it('mengembalikan null untuk null/undefined', () => {
    expect(toTextArray(null)).toBeNull();
    expect(toTextArray(undefined)).toBeNull();
  });
});

describe('toJsonb (kolom JSONB)', () => {
  it('stringify objek/array', () => {
    expect(toJsonb([{ a: 1 }])).toBe('[{"a":1}]');
  });

  it('mempertahankan string yang sudah JSON', () => {
    expect(toJsonb('{"a":1}')).toBe('{"a":1}');
  });

  it('stringify string non-JSON', () => {
    expect(toJsonb('halo')).toBe('"halo"');
  });

  it('mengembalikan null untuk null/undefined', () => {
    expect(toJsonb(null)).toBeNull();
  });
});
