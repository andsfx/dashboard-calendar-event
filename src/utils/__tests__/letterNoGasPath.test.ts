import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * H-002 / ADR 004: product code must not call createLetterRequest or apps-script for letter.
 */
describe('letter product path has no GAS createLetterRequest', () => {
  it('supabaseApi does not export createLetterRequest', () => {
    const src = readFileSync(resolve(__dirname, '../supabaseApi.ts'), 'utf8');
    expect(src).not.toMatch(/export async function createLetterRequest/);
    expect(src).not.toMatch(/LEGACY_ADMIN_PROXY_URL/);
    expect(src).toMatch(/createGeneratedLetter/);
  });

  it('useDashboardHandlers does not import createLetterRequest', () => {
    const src = readFileSync(resolve(__dirname, '../../hooks/useDashboardHandlers.ts'), 'utf8');
    expect(src).not.toMatch(/createLetterRequest/);
    expect(src).not.toMatch(/handleSubmitLetter/);
  });

  it('api/apps-script-admin.js (legacy GAS proxy) removed — migration selesai (H-003)', () => {
    // Function dihapus: deploy Hobby plan batas 12 function (H-003).
    // Jalur GAS migration tidak boleh muncul kembali.
    const entries = readdirSync(resolve(__dirname, '../../../api'));
    expect(entries).not.toContain('apps-script-admin.js');
    const barrel = readFileSync(resolve(__dirname, '../supabaseApi.ts'), 'utf8');
    expect(barrel).not.toMatch(/apps-script|appsScript/);
  });
});
