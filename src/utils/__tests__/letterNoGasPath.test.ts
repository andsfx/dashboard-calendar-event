import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
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

  it('apps-script-admin allowlist is migration-only', () => {
    const src = readFileSync(resolve(__dirname, '../../../api/apps-script-admin.js'), 'utf8');
    // Allowlist must not include product letter action
    expect(src).not.toMatch(/'createLetterRequest'/);
    expect(src).toMatch(/'bootstrapEventSheet'/);
    expect(src).toMatch(/'migrateLegacyEvents'/);
    expect(src).toMatch(/'migrateStableIds'/);
  });
});
