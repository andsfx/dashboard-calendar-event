import { describe, it, expect } from 'vitest';
import { buildSafeObjectKey, validateExistingKey, validateContentType } from '../r2Key.js';

describe('validateContentType', () => {
  it('allows image mime types', () => {
    expect(validateContentType('image/jpeg').ok).toBe(true);
    expect(validateContentType('image/png; charset=binary').ok).toBe(true);
  });
  it('rejects non-image', () => {
    expect(validateContentType('application/pdf').ok).toBe(false);
    expect(validateContentType('text/html').ok).toBe(false);
  });
});

describe('buildSafeObjectKey', () => {
  it('forces safe prefix and ignores path traversal', () => {
    const r = buildSafeObjectKey({
      folder: '../../etc/',
      originalName: 'evil.jpg',
      contentType: 'image/jpeg',
    });
    expect(r.ok).toBe(true);
    expect(r.key.startsWith('gallery/')).toBe(true);
    expect(r.key.includes('..')).toBe(false);
  });

  it('keeps allowed events/ prefix', () => {
    const r = buildSafeObjectKey({
      folder: 'events/abc/',
      originalName: 'shot.png',
      contentType: 'image/png',
    });
    expect(r.ok).toBe(true);
    expect(r.key.startsWith('events/')).toBe(true);
    expect(r.key.endsWith('.png')).toBe(true);
  });

  it('rejects bad mime', () => {
    const r = buildSafeObjectKey({
      folder: 'gallery/',
      contentType: 'application/x-msdownload',
    });
    expect(r.ok).toBe(false);
  });
});

describe('validateExistingKey', () => {
  it('accepts keys under allowed prefixes', () => {
    expect(validateExistingKey('gallery/foo.jpg').ok).toBe(true);
    expect(validateExistingKey('events/x/y.webp').ok).toBe(true);
  });
  it('rejects traversal and unknown prefixes', () => {
    expect(validateExistingKey('../secret').ok).toBe(false);
    expect(validateExistingKey('etc/passwd').ok).toBe(false);
    expect(validateExistingKey('').ok).toBe(false);
  });
});
