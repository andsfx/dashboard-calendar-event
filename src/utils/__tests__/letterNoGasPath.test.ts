import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * H-002 / ADR 004: product code must not call createLetterRequest or apps-script for letter.
 */
describe('letter product path has no GAS createLetterRequest', () => {
  it('domainApi barrel tidak mengekspor createLetterRequest', () => {
    const src = readFileSync(resolve(__dirname, '../domainApi.ts'), 'utf8');
    expect(src).not.toMatch(/export async function createLetterRequest/);
    expect(src).not.toMatch(/LEGACY_ADMIN_PROXY_URL/);
    expect(src).toMatch(/createGeneratedLetter/);
  });

  it('useDashboardHandlers does not import createLetterRequest', () => {
    const src = readFileSync(resolve(__dirname, '../../hooks/useDashboardHandlers.ts'), 'utf8');
    expect(src).not.toMatch(/createLetterRequest/);
    expect(src).not.toMatch(/handleSubmitLetter/);
  });

  it('folder api/ legacy (GAS proxy dkk) dihapus total — tidak boleh muncul kembali', () => {
    // Cleanup 2026-09-09: seluruh api/*.js legacy dihapus (Opsi B).
    // Jalur GAS migration tidak boleh muncul kembali.
    expect(existsSync(resolve(__dirname, '../../../api'))).toBe(false);
    const barrel = readFileSync(resolve(__dirname, '../domainApi.ts'), 'utf8');
    expect(barrel).not.toMatch(/apps-script|appsScript/);
  });
});
